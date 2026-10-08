// Frame harness: renders chosen frames at chosen p values to PNG at 1920x1080, plus a contact strip, and reports draw time.
// usage: node harness.mjs --module modules/C-chair.js [--module ...] --frame 5 [--frame 6] --p 0,0.1,0.25,0.5,0.75,1 --out out/f05
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2); const get = (k, all) => { const v = []; for (let i = 0; i < args.length; i++) if (args[i] === k) v.push(args[++i]); return all ? v : v[0]; };
const modules = get('--module', true), frames = get('--frame', true).map(Number), ps = (get('--p') || '0,0.2,0.4,0.6,0.8,1').split(',').map(Number), out = get('--out') || 'out/harness';
fs.mkdirSync(out, { recursive: true });
const page_html = path.join(out, 'page.html');
execFileSync(process.execPath, [path.join(here, 'build.mjs'), page_html, ...modules], { stdio: 'inherit' });
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve(page_html)); await page.evaluate(() => window.readyPromise);
const files = [];
for (const n of frames) for (const p of ps) {
  try { const { png, ms } = await page.evaluate(([n, p]) => window.renderFrameP(n, p), [n, p]);
    const f = path.join(out, `f${String(n).padStart(2, '0')}_p${p.toFixed(2)}.png`); fs.writeFileSync(f, Buffer.from(png.slice(png.indexOf(',') + 1), 'base64')); files.push(f); console.log(`frame ${n} p=${p.toFixed(2)} ${ms.toFixed(0)} ms`); }
  catch (e) { errors.push(`frame ${n} p=${p}: ${e.message}`); }
}
await browser.close();
if (files.length) { const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols); const strip = path.join(out, 'strip.png');
  try { execFileSync(process.env.FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-pattern_type', 'glob', '-i', path.join(out, 'f*_p*.png'), '-vf', `scale=480:-1,tile=${cols}x${rows}`, '-frames:v', '1', strip]); console.log('strip:', strip); } catch (e) { console.log('strip failed:', e.message); } }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('no page errors');
