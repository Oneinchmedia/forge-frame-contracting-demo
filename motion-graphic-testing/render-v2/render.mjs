// ONE INCH v2 · render pipeline. Assembles render.html from base.js + modules, captures every frame with Playwright, encodes with FFmpeg,
// generates the score, muxes, and pulls a contact sheet. usage: node render.mjs | node render.mjs sheet | node render.mjs build
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); process.chdir(here);
const FPS = 30, W = 1920, H = 1080, OUT = 'out', FRAMES = path.join(OUT, 'frames');
const MODULES = ['A-inch', 'B-hit-lockup', 'C-chair', 'D-media', 'E-ten-one'].map(m => path.join('modules', m + '.js')).filter(f => fs.existsSync(f));
const FF = process.env.FFMPEG || 'ffmpeg';
const ff = args => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const final = path.join(OUT, 'one-inch-v2.mp4'), sheet = path.join(OUT, 'contact-sheet.png');
fs.mkdirSync(OUT, { recursive: true });
function build() { execFileSync(process.execPath, ['build.mjs', 'render.html', ...MODULES], { stdio: 'inherit' }); }
function contactSheet() { ff(['-y', '-i', final, '-vf', `select='not(mod(n\\,${FPS * 1.5}))',scale=384:-1,tile=5x4`, '-frames:v', '1', sheet]); console.log('contact sheet:', sheet); }
if (process.argv[2] === 'sheet') { contactSheet(); process.exit(0); }
if (process.argv[2] === 'build') { build(); process.exit(0); }
build();
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto('file://' + path.join(here, 'render.html'));
console.log('ready:', await page.evaluate(() => window.readyPromise));
const duration = await page.evaluate(() => window.DURATION), total = Math.round(duration * FPS), BATCH = 15; let slow = 0;
const t0 = Date.now();
for (let i = 0; i < total; i += BATCH) {
  const ts = []; for (let k = i; k < Math.min(total, i + BATCH); k++) ts.push(k / FPS);
  const res = await page.evaluate(ts => ts.map(t => { const ms = window.drawAt(t); return { png: document.getElementById('c').toDataURL('image/png'), ms }; }), ts);
  res.forEach((r, j) => { if (r.ms > 60) slow++; fs.writeFileSync(path.join(FRAMES, `f${String(i + j).padStart(4, '0')}.png`), Buffer.from(r.png.slice(r.png.indexOf(',') + 1), 'base64')); });
  if (i % 150 === 0) console.log(`frames ${i}/${total} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close(); console.log(`frames done: ${total} in ${((Date.now() - t0) / 1000).toFixed(0)}s · ${slow} frames over 60 ms`);
const video = path.join(OUT, 'video.mp4');
ff(['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
const scoreScript = fs.existsSync('score.mjs') ? 'score.mjs' : path.join('..', 'render', 'score.mjs');
execFileSync(process.execPath, [scoreScript, path.join(OUT, 'score.wav')], { stdio: 'inherit' });
ff(['-y', '-i', video, '-i', path.join(OUT, 'score.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final]);
console.log('final:', final);
if (!process.argv.includes('--keep-frames')) fs.rmSync(FRAMES, { recursive: true, force: true });
// web delivery: 1280x720 at a size a page can carry; the 1080p file above is the master
const web = path.join(OUT, 'one-inch-v2-web.mp4');
ff(['-y', '-i', final, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', web]);
console.log('web:', web);
contactSheet();
