// ONE INCH · render pipeline. Playwright draws every frame from render.html, FFmpeg encodes, score.mjs makes the sound, FFmpeg muxes and pulls a contact sheet.
// usage: node render.mjs            (full run)
//        node render.mjs sheet      (contact sheet only, from out/one-inch.mp4)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); process.chdir(here);
const FPS = 30, W = 1920, H = 1080, OUT = 'out', FRAMES = path.join(OUT, 'frames');
const FF = process.env.FFMPEG || 'ffmpeg';
const ff = args => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const final = path.join(OUT, 'one-inch.mp4'), sheet = path.join(OUT, 'contact-sheet.png');
function contactSheet() { ff(['-y', '-i', final, '-vf', `select='not(mod(n\\,${FPS * 1.5}))',scale=384:-1,tile=5x4`, '-frames:v', '1', sheet]); console.log('contact sheet:', sheet); }
if (process.argv[2] === 'sheet') { contactSheet(); process.exit(0); }

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
await page.goto('file://' + path.join(here, 'render.html'));
const ready = await page.evaluate(() => window.readyPromise); console.log('ready:', ready);
const duration = await page.evaluate(() => window.DURATION), total = Math.round(duration * FPS), BATCH = 15;
const t0 = Date.now();
for (let i = 0; i < total; i += BATCH) {
  const ts = []; for (let k = i; k < Math.min(total, i + BATCH); k++) ts.push(k / FPS);
  const urls = await page.evaluate(ts => window.renderBatch(ts), ts);
  urls.forEach((u, j) => fs.writeFileSync(path.join(FRAMES, `f${String(i + j).padStart(4, '0')}.png`), Buffer.from(u.slice(u.indexOf(',') + 1), 'base64')));
  if (i % 150 === 0) console.log(`frames ${i}/${total} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close(); console.log(`frames done: ${total} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

const video = path.join(OUT, 'video.mp4');
ff(['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
console.log('video:', video);
execFileSync(process.execPath, ['score.mjs', path.join(OUT, 'score.wav')], { stdio: 'inherit' });
ff(['-y', '-i', video, '-i', path.join(OUT, 'score.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final]);
console.log('final:', final);
if (!process.argv.includes('--keep-frames')) fs.rmSync(FRAMES, { recursive: true, force: true });
contactSheet();
