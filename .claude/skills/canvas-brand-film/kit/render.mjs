// render.mjs: the whole pipeline, end to end.
//   1 build the page · 2 capture every frame with Playwright (stops on any page error) · 3 synthesise the score
//   4 master the audio to the loudness and true-peak targets, verified after AAC encoding · 5 encode every deliverable from the
//   PNG frames (one generation each), BT.709-tagged, faststart · 6 poster and contact sheet from the PNGs (exact colour)
//   7 QC every deliverable · 8 render.log with tool versions and checksums
// usage: node render.mjs [--reuse-frames] [--keep-frames] [--prores] [--no-blur]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, WORK, FFMPEG, ff, args, loadFilm, launchBrowser, openFilm, savePng, loudness, sha256, versionOf, playwrightSource } from './lib/node.mjs';
import { build } from './build.mjs';
import { score } from './score.mjs';
import { runQC, printQC } from './qc.mjs';

const a = args(), film = loadFilm(), fps = film.fps, total = Math.round(film.duration * fps);
const FRAMES = path.join(WORK, 'frames'), name = film.name;
const logLines = []; const log = (...m) => { const s = m.join(' '); logLines.push(s); console.log(s); };
const t0 = Date.now(), el = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
fs.mkdirSync(WORK, { recursive: true });

// ── 1 + 2: build and capture ──
const html = path.join(WORK, 'film.html'), b = build(html);
log(`build: ${b.shots.length} shots, ${b.fonts.length} font files, images: ${b.images.join(', ') || 'none'}`);
const haveFrames = () => fs.existsSync(FRAMES) && fs.readdirSync(FRAMES).filter(f => f.endsWith('.png')).length === total;
let browserVersion = 'not launched';
if (a['reuse-frames'] && haveFrames()) log(`frames: reusing ${total} frames in ${path.relative(ROOT, FRAMES)}`);
else {
  fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
  const browser = await launchBrowser(); browserVersion = browser.version();
  const { page, errors, ready } = await openFilm(browser, html, film);
  log(`page ready: ${ready.fonts} fonts, images ${ready.images.join(', ') || 'none'}, ${ready.frames} frames`);
  const BATCH = 10, slow = []; let worst = 0;
  for (let i = 0; i < total; i += BATCH) {
    const ns = []; for (let n = i; n < Math.min(total, i + BATCH); n++) ns.push(n);
    const res = await page.evaluate(([ns, o]) => ns.map(n => { const r = FILMPAGE.drawFrame(n, o); return { ...r, png: FILMPAGE.png() }; }), [ns, { noBlur: !!a['no-blur'] }]);
    res.forEach((r, j) => { savePng(r.png, path.join(FRAMES, `f${String(ns[j]).padStart(5, '0')}.png`)); worst = Math.max(worst, r.ms); if (r.ms > 250) slow.push(ns[j]); });
    if (errors.length) { log('PAGE ERRORS, stopping before anything is encoded:\n  ' + errors.join('\n  ')); await browser.close(); process.exit(1); }
    if (i % (fps * 2) === 0) log(`frames ${i}/${total} · ${el()}`);
  }
  await browser.close();
  log(`frames: ${total} captured · worst frame ${worst.toFixed(0)} ms (draw + raster) · ${slow.length} over 250 ms · ${el()}`);
}

// ── 3: score ──
const sc = score(path.join(WORK, 'score.wav'));
log(`score: ${sc.duration}s at ${sc.sampleRate} Hz; placed ${sc.placed.map(([t, w]) => `${w} ${t.toFixed(3)}`).join(' · ')}`);

// ── 4: master the audio, then verify on the AAC itself (encoding adds inter-sample overshoot) ──
const tgt = film.audio, raw = loudness(sc.file), m4a = path.join(WORK, 'audio.m4a'), masterWav = path.join(WORK, 'master.wav');
let gainDb = tgt.lufs - raw.I, ceiling = tgt.truePeak - 0.5, got = null;
for (let pass = 1; pass <= 6; pass++) {
  const lim = Math.pow(10, ceiling / 20);
  // 4x oversampled lookahead limiting approximates a true-peak limiter; latency=true keeps the audio in sync with the picture
  ff(['-y', '-i', sc.file, '-af', `volume=${gainDb.toFixed(3)}dB,aresample=${tgt.sampleRate * 4},alimiter=limit=${lim.toFixed(5)}:level=false:latency=true:attack=1:release=60,aresample=${tgt.sampleRate}`, '-c:a', 'pcm_f32le', masterWav], { quiet: true });
  ff(['-y', '-i', masterWav, '-c:a', 'aac', '-b:a', '256k', '-ar', String(tgt.sampleRate), m4a], { quiet: true });
  got = loudness(m4a);
  log(`audio pass ${pass}: gain ${gainDb.toFixed(2)} dB, ceiling ${ceiling.toFixed(2)} dBFS → ${got.I.toFixed(2)} LUFS, ${got.TP.toFixed(2)} dBTP`);
  const loudOk = Math.abs(got.I - tgt.lufs) <= 0.5, peakOk = got.TP <= tgt.truePeak;
  if (loudOk && peakOk) break;
  if (!peakOk) ceiling -= (got.TP - tgt.truePeak) + 0.2;
  if (!loudOk) gainDb += tgt.lufs - got.I;
}
const limiting = raw.TP + gainDb - ceiling;
log(`audio: raw mix ${raw.I.toFixed(1)} LUFS / ${raw.TP.toFixed(1)} dBTP → ${got.I.toFixed(1)} LUFS / ${got.TP.toFixed(2)} dBTP; the limiter takes up to ${Math.max(0, limiting).toFixed(1)} dB off the loudest peaks`
  + (limiting > 8 ? ' (a lot: the hits will sound squashed; lower the beds or raise the strike in the mix)' : ''));

// ── 5: encode every deliverable straight from the PNG frames ──
const BT709 = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
const vf = (w, h) => `${w === film.width && h === film.height ? '' : `scale=${w}:${h}:flags=lanczos,`}scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`;
function encode(file, { w = film.width, h = film.height, crf, tune, level, x264 = 'aq-mode=3' }) {
  ff(['-y', '-framerate', String(fps), '-i', path.join(FRAMES, 'f%05d.png'), '-i', m4a, '-map', '0:v', '-map', '1:a', '-c:a', 'copy',
    '-vf', vf(w, h), '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), ...(tune ? ['-tune', tune] : []), '-profile:v', 'high', ...(level ? ['-level:v', level] : []),
    '-g', String(fps * 2), '-x264-params', x264, ...BT709, '-movflags', '+faststart', '-t', film.duration.toFixed(6), file], { quiet: true });
  log(`encoded ${path.relative(ROOT, file)} · ${(fs.statSync(file).size / 1e6).toFixed(1)} MB · ${el()}`);
  return file;
}
const deliver = path.join(OUT, `${name}.mp4`), master = path.join(OUT, `${name}-master.mp4`), web = path.join(OUT, `${name}-web.mp4`);
encode(master, { crf: 12 });
encode(deliver, { crf: 18, level: film.height <= 1080 && fps <= 30 ? '4.1' : undefined });
encode(web, { w: Math.round(film.width * 720 / film.height / 2) * 2, h: 720, crf: 20, tune: 'grain', level: '4.0' });
if (a.prores) {
  const mov = path.join(OUT, `${name}-prores.mov`);
  ff(['-y', '-framerate', String(fps), '-i', path.join(FRAMES, 'f%05d.png'), '-i', masterWav, '-map', '0:v', '-map', '1:a', '-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...BT709, '-c:a', 'pcm_s24le', mov], { quiet: true });
  log(`encoded ${path.relative(ROOT, mov)} (ProRes 422 HQ, for editing) · ${(fs.statSync(mov).size / 1e6).toFixed(1)} MB`);
}

// ── 6: poster and contact sheet, from the PNG frames themselves (no YUV round trip, so the colour is exact) ──
const posterN = Math.min(total - 1, Math.round((film.deliver?.poster ?? film.duration / 2) * fps));
const posterPng = path.join(OUT, `${name}-poster.png`); fs.copyFileSync(path.join(FRAMES, `f${String(posterN).padStart(5, '0')}.png`), posterPng);
ff(['-y', '-i', posterPng, '-q:v', '2', path.join(OUT, `${name}-poster.jpg`)], { quiet: true });
const every = Math.max(1, Math.round(total / 20)), sheet = path.join(OUT, `${name}-contact.png`);
ff(['-y', '-framerate', String(fps), '-i', path.join(FRAMES, 'f%05d.png'), '-vf', `select='not(mod(n\\,${every}))',scale=384:-1,tile=5x4:padding=4:color=0x333333`, '-frames:v', '1', '-update', '1', sheet], { quiet: true });
log(`poster: frame ${posterN} (${(posterN / fps).toFixed(2)} s) · contact sheet: every ${every} frames`);

// ── 7: QC every deliverable ──
const results = [deliver, web, master].map(f => runQC(f, film));
results.forEach(r => printQC(r, log));
fs.writeFileSync(path.join(OUT, 'qc.json'), JSON.stringify(results, null, 1));

// ── 8: provenance ──
log(`\ntools: node ${process.version} · playwright ${playwrightSource} · chromium ${browserVersion} · ${versionOf(FFMPEG)}`);
for (const f of fs.readdirSync(OUT).filter(f => /\.(mp4|mov|png|jpg)$/.test(f)).sort()) log(`sha256 ${sha256(path.join(OUT, f)).slice(0, 16)}  ${f}`);
fs.writeFileSync(path.join(OUT, 'render.log'), logLines.join('\n') + '\n');
if (!a['keep-frames'] && !a['reuse-frames']) fs.rmSync(FRAMES, { recursive: true, force: true });
log(`\n${results.every(r => r.ok) ? 'ALL QC PASSED' : 'QC FAILED: fix the failures above before delivering'} · ${el()}`);
if (!results.every(r => r.ok)) process.exitCode = 1;
