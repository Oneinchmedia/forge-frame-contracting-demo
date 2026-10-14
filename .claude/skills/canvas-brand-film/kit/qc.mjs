// qc.mjs: delivery checks on a finished file, measured, never assumed.
//   format: H.264 yuv420p, BT.709 colour tags, the right frame count and rate, AAC 48 kHz, audio and video the same length, faststart
//   loudness: integrated LUFS and true peak against film.audio
//   sync: for every cue with sync 'both' or 'audio', the audio onset (and for 'both' the picture change) must land within one frame of the cue
//   ending: the last frame is black when deliver.endOnBlack is set
// usage: node qc.mjs [file.mp4 ...]   (default: the delivery files in out/). Writes out/qc.json. Exit code 1 if anything fails.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, loadFilm, probe, loudness, ffRaw } from './lib/node.mjs';

// top-level MP4 boxes in order: faststart means moov comes before mdat
function boxOrder(file) {
  const fd = fs.openSync(file, 'r'), size = fs.fstatSync(fd).size, order = [], hdr = Buffer.alloc(16);
  let pos = 0;
  while (pos < size && order.length < 50) {
    fs.readSync(fd, hdr, 0, 16, pos);
    let len = hdr.readUInt32BE(0); const type = hdr.toString('latin1', 4, 8);
    if (len === 1) len = Number(hdr.readBigUInt64BE(8)); else if (len === 0) len = size - pos;
    order.push(type); if (len < 8) break; pos += len;
  }
  fs.closeSync(fd); return order;
}

// Audio onsets: the biggest rise in short-term level within ±window of the cue (1 ms hops, level against the preceding ~10 ms)
function audioOnset(x, sr, t, window = 0.25) {
  const hop = Math.round(sr / 1000), k0 = Math.max(12, Math.floor((t - window) * 1000)), k1 = Math.min(Math.floor(x.length / hop) - 1, Math.ceil((t + window) * 1000));
  const e = k => { let s = 0; for (let i = k * hop; i < (k + 1) * hop; i++) s += x[i] * x[i]; return Math.sqrt(s / hop); };
  const env = []; for (let k = k0 - 12; k <= k1; k++) env.push(e(k));
  let best = -Infinity, bestK = null; const peak = Math.max(...env);
  for (let k = k0; k <= k1; k++) {
    const i = k - (k0 - 12), now = env[i]; if (now < peak * 0.08) continue;
    let prev = 0; for (let j = i - 12; j <= i - 3; j++) prev += env[j]; prev /= 10;
    const rise = 20 * Math.log10((now + 1e-9) / (prev + 1e-9)); if (rise > best) { best = rise; bestK = k; }
  }
  return bestK == null ? null : { t: bestK / 1000, rise: best };
}
// Picture events: the first frame within ±window frames whose change from the previous frame is at least half the window's largest change
function pictureEvent(diff, f, window = 8) {
  const a = Math.max(1, f - window), b = Math.min(diff.length - 1, f + window); let m = 0;
  for (let i = a; i <= b; i++) m = Math.max(m, diff[i]);
  if (m < 2) return null;
  for (let i = a; i <= b; i++) if (diff[i] >= 0.5 * m) return { f: i, change: diff[i] };
  return null;
}

export function runQC(file, film = loadFilm()) {
  const fps = film.fps, frames = Math.round(film.duration * fps), checks = [], add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
  const p = probe(file), v = p.streams.find(s => s.codec_type === 'video'), au = p.streams.find(s => s.codec_type === 'audio');

  // ── format ──
  add('video codec', v?.codec_name === 'h264' && v?.pix_fmt === 'yuv420p', `${v?.codec_name} ${v?.profile} ${v?.pix_fmt} level ${v?.level}`);
  const tags = [v?.color_space, v?.color_primaries, v?.color_transfer];
  add('colour tags BT.709', tags.every(x => x === 'bt709') && v?.color_range === 'tv', `matrix ${tags[0]}, primaries ${tags[1]}, transfer ${tags[2]}, range ${v?.color_range}`);
  const [rn, rd] = (v?.r_frame_rate || '0/1').split('/').map(Number), nf = Number(v?.nb_read_frames || v?.nb_frames);
  add('frame rate and count', Math.abs(rn / rd - fps) < 1e-6 && nf === frames, `${(rn / rd).toFixed(3)} fps, ${nf} frames (expected ${frames})`);
  add('audio codec', au?.codec_name === 'aac' && Number(au?.sample_rate) === film.audio.sampleRate && au?.channels === 2, `${au?.codec_name} ${au?.sample_rate} Hz ${au?.channels} ch`);
  const vd = Number(v?.duration), ad = Number(au?.duration);
  add('audio and video length', Math.abs(vd - ad) <= 1 / fps && Math.abs(vd - film.duration) <= 1 / fps, `video ${vd.toFixed(3)} s, audio ${ad.toFixed(3)} s, film ${film.duration.toFixed(3)} s`);
  const order = boxOrder(file);
  add('faststart (moov before mdat)', order.indexOf('moov') > -1 && order.indexOf('moov') < order.indexOf('mdat'), order.join(' '));

  // ── loudness ──
  const L = loudness(file), tgt = film.audio;
  add(`loudness ${tgt.lufs} LUFS ±1`, Math.abs(L.I - tgt.lufs) <= 1, `${L.I.toFixed(1)} LUFS integrated, LRA ${L.LRA.toFixed(1)} LU`);
  add(`true peak ≤ ${tgt.truePeak} dBTP`, L.TP <= tgt.truePeak + 1e-9, `${L.TP.toFixed(2)} dBTP`);

  // ── sync ──
  const sr = 48000, pcm = ffRaw(['-i', file, '-map', '0:a:0', '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-']);
  const x = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4));
  const w = 160, h = 90, raw = ffRaw(['-i', file, '-map', '0:v:0', '-vf', `scale=${w}:${h}:flags=area,format=rgb24`, '-f', 'rawvideo', '-']);
  const fsz = w * h * 3, nfr = Math.floor(raw.length / fsz), luma = new Float32Array(nfr * w * h);
  for (let f = 0; f < nfr; f++) for (let i = 0; i < w * h; i++) { const o = f * fsz + i * 3; luma[f * w * h + i] = 0.2126 * raw[o] + 0.7152 * raw[o + 1] + 0.0722 * raw[o + 2]; }
  const diff = new Float32Array(nfr); for (let f = 1; f < nfr; f++) { let s = 0; for (let i = 0; i < w * h; i++) s += Math.abs(luma[f * w * h + i] - luma[(f - 1) * w * h + i]); diff[f] = s / (w * h); }
  const sync = [];
  for (const [name, c] of Object.entries(film.cues)) {
    if (!c.sync) continue;
    const ao = audioOnset(x, sr, c.t), cf = Math.round(c.t * fps);
    const aOff = ao ? ao.t - c.t : null, aOk = ao && Math.abs(aOff) <= 1 / fps + 0.002;
    let pe = null, pOk = true, pOff = null;
    if (c.sync === 'both') { pe = pictureEvent(diff, cf); pOff = pe ? pe.f - cf : null; pOk = pe && Math.abs(pOff) <= 1; }
    sync.push({ cue: name, t: c.t, audio: ao?.t ?? null, audioOffsetMs: aOff == null ? null : Math.round(aOff * 1000), pictureFrame: pe?.f ?? null, cueFrame: cf, pictureOffsetFrames: pOff });
    add(`sync ${name} @ ${c.t.toFixed(3)} s`, aOk && pOk,
      `audio ${ao ? `${(aOff * 1000).toFixed(0)} ms` : 'no onset found'}` + (c.sync === 'both' ? `, picture ${pe ? `${pOff >= 0 ? '+' : ''}${pOff} frames` : 'no visible change'}` : ''));
  }

  // ── ending ──
  if (film.deliver?.endOnBlack) {
    let m = 0; for (let i = 0; i < w * h; i++) m = Math.max(m, luma[(nfr - 1) * w * h + i]);
    add('ends on black', m <= 3, `brightest pixel in the last frame: ${m.toFixed(1)}/255`);
  }
  return { file: path.relative(ROOT, file), ok: checks.every(c => c.ok), checks, sync, loudness: L, format: { boxes: order } };
}

export function printQC(r, log = console.log) {
  log(`\nQC ${r.file}: ${r.ok ? 'PASS' : 'FAIL'}`);
  for (const c of r.checks) log(`  ${c.ok ? 'ok  ' : 'FAIL'}  ${c.name.padEnd(34)} ${c.detail}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const film = loadFilm();
  const files = process.argv.slice(2).length ? process.argv.slice(2).map(f => path.resolve(f))
    : ['', '-web'].map(s => path.join(OUT, `${film.name}${s}.mp4`)).filter(f => fs.existsSync(f));
  if (!files.length) { console.log('no files to check; render first or pass a path'); process.exit(2); }
  const results = files.map(f => runQC(f, film)); results.forEach(r => printQC(r));
  fs.writeFileSync(path.join(OUT, 'qc.json'), JSON.stringify(results, null, 1));
  if (!results.every(r => r.ok)) process.exitCode = 1;
}
