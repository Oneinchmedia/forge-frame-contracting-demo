// preview.mjs: render chosen moments of the WHOLE film (every shot loaded, exactly as the final render draws them) to PNG,
// plus a contact strip of just this run, and report each frame's real cost (draw + rasterise).
//
//   node preview.mjs --t 1.9,2.0,2.033            film times in seconds
//   node preview.mjs --frames 58-64,120            frame numbers (ranges allowed)
//   node preview.mjs --shot slide --p 0,0.25,0.5,1  points inside one shot
//   node preview.mjs --cue land --around 3         the cue's frame and 3 frames either side
//   node preview.mjs --sheet                       every shot at 0, 0.5 and the end, in one strip
//   options: --out <dir> (default out/preview; emptied first)  --no-blur (fast draft)  --determinism (render twice, compare)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, ff, args, loadFilm, launchBrowser, openFilm, savePng } from './lib/node.mjs';
import { build } from './build.mjs';

const a = args(), film = loadFilm(), fps = film.fps, dt = 1 / fps, total = Math.round(film.duration * fps);
const outDir = path.resolve(ROOT, a.out || path.join('out', 'preview'));
const list = v => String(v).split(',').map(x => x.trim()).filter(Boolean);

// Resolve the request to a list of { n (frame), t (film time) }. Frame-exact unless --t or --shot asks for in-between times.
let req = [];
if (a.frames) for (const part of list(a.frames)) { const [x, y] = part.split('-').map(Number); for (let n = x; n <= (y ?? x); n++) req.push({ n, t: n * dt }); }
if (a.t) for (const t of list(a.t).map(Number)) req.push({ n: Math.floor(t * fps + 1e-6), t });
if (a.shot) {
  const sh = film.shots.find(x => x.name === a.shot); if (!sh) throw new Error(`no shot "${a.shot}"; shots: ${film.shots.map(x => x.name).join(', ')}`);
  for (const p of list(a.p || '0,0.25,0.5,0.75,1').map(Number)) { const t = Math.min(sh.start + p * (sh.end - sh.start), sh.end - dt); req.push({ n: Math.floor(t * fps + 1e-6), t }); }
}
if (a.cue) {
  const c = film.cues[a.cue]; if (!c) throw new Error(`no cue "${a.cue}"; cues: ${Object.keys(film.cues).join(', ')}`);
  const k = Number(a.around ?? 2), c0 = Math.round(c.t * fps); for (let n = c0 - k; n <= c0 + k; n++) req.push({ n, t: n * dt });
}
if (a.sheet) for (const sh of film.shots) for (const p of [0, 0.5, 1]) { const n = Math.min(Math.round((sh.start + p * (sh.end - sh.start)) * fps), Math.round(sh.end * fps) - 1); req.push({ n, t: n * dt }); }
req = req.filter(r => r.n >= 0 && r.n < total);
if (!req.length) { console.log('nothing to render: pass --t, --frames, --shot, --cue or --sheet'); process.exit(2); }

// the page is built into the run's own folder, so agents previewing in parallel (each with its own --out) never share a file
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
const html = path.join(outDir, 'page.html'); build(html);
const browser = await launchBrowser();
const { page, errors, ready } = await openFilm(browser, html, film);
const opts = { noBlur: !!a['no-blur'] };
const files = [], hashes = [];
for (const r of req) {
  const exact = Math.abs(r.t - r.n * dt) < 1e-9;
  const res = await page.evaluate(([r, o, exact]) => exact ? FILMPAGE.drawFrame(r.n, o) : FILMPAGE.drawTime(r.t, o), [r, opts, exact]);
  const png = await page.evaluate(() => FILMPAGE.png());
  const f = path.join(outDir, `${String(files.length).padStart(3, '0')}_t${r.t.toFixed(3)}_f${String(r.n).padStart(4, '0')}_${res.shot}.png`);
  savePng(png, f); files.push(f); hashes.push(crypto.createHash('sha1').update(png).digest('hex'));
  console.log(`t ${r.t.toFixed(3)}s  frame ${String(r.n).padStart(4)}  ${res.shot.padEnd(10)} ${res.ms.toFixed(0).padStart(4)} ms${files.length === 1 ? '  (includes one-time setup: caches, grain tiles)' : ''}`);
}
if (a.determinism) { // render the same moments again in reverse order; any difference is a determinism bug (random, time, or order-dependent state)
  const diffs = [];
  for (let i = req.length - 1; i >= 0; i--) {
    const r = req[i], exact = Math.abs(r.t - r.n * dt) < 1e-9;
    await page.evaluate(([r, o, exact]) => exact ? FILMPAGE.drawFrame(r.n, o) : FILMPAGE.drawTime(r.t, o), [r, opts, exact]);
    const h = crypto.createHash('sha1').update(await page.evaluate(() => FILMPAGE.png())).digest('hex');
    if (h !== hashes[i]) diffs.push(`t ${r.t.toFixed(3)}`);
  }
  console.log(diffs.length ? `DETERMINISM FAILED at ${diffs.join(', ')}` : `determinism: ${req.length}/${req.length} frames identical on a second, reversed pass`);
  if (diffs.length) process.exitCode = 1;
}
await browser.close();
const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols), strip = path.join(outDir, 'strip.png');
const listFile = path.join(outDir, 'strip.txt'); fs.writeFileSync(listFile, files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
ff(['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-vf', `scale=480:-1,tile=${cols}x${rows}:padding=4:color=0x333333`, '-frames:v', '1', '-update', '1', strip], { quiet: true });
fs.rmSync(listFile);
console.log(`\n${files.length} frames in ${path.relative(ROOT, outDir)}/ · strip: ${path.relative(ROOT, strip)} · fonts ${ready.fonts} · images ${ready.images.join(', ') || 'none'}`);
if (errors.length) { console.log('PAGE ERRORS:\n  ' + errors.join('\n  ')); process.exitCode = 1; } else console.log('no page errors');
