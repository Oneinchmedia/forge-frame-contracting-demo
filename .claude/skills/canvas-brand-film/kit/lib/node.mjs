// lib/node.mjs: shared Node helpers for build, preview, render, score and qc.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'out');
export const WORK = path.join(OUT, 'work');
export const FFMPEG = process.env.FFMPEG || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE || 'ffprobe';

const require = createRequire(import.meta.url);
export function loadFilm() {
  const p = path.join(ROOT, 'film.config.cjs');
  delete require.cache[require.resolve(p)];
  const film = require(p);
  checkFilm(film);
  return film;
}

// The config is a contract; refuse to build from a broken one.
export function checkFilm(film) {
  const errs = [], warn = [], fps = film.fps, onGrid = t => Math.abs(t * fps - Math.round(t * fps)) < 1e-6;
  if (!film.shots?.length) errs.push('no shots');
  let t = 0;
  for (const s of film.shots || []) {
    if (Math.abs(s.start - t) > 1e-9) errs.push(`shot "${s.name}" starts at ${s.start}, expected ${t} (shots must be contiguous)`);
    if (!(s.end > s.start)) errs.push(`shot "${s.name}" has no length`);
    if (!onGrid(s.start) || !onGrid(s.end)) warn.push(`shot "${s.name}" boundaries are not on the frame grid`);
    t = s.end;
  }
  if (Math.abs(t - film.duration) > 1e-9) errs.push(`duration ${film.duration} does not match the last shot's end ${t}`);
  for (const [k, c] of Object.entries(film.cues || {})) {
    if (!(c.t >= 0 && c.t <= film.duration)) errs.push(`cue "${k}" at ${c.t} is outside the film`);
    if (c.sync && !onGrid(c.t)) errs.push(`sync cue "${k}" at ${c.t} is not on a frame; wrap it in F()`);
    if (c.sync && !['both', 'audio'].includes(c.sync)) errs.push(`cue "${k}" has unknown sync "${c.sync}"`);
  }
  for (const w of warn) console.warn('config warning:', w);
  if (errs.length) throw new Error('film.config.cjs:\n  ' + errs.join('\n  '));
}

export const ff = (args, opts = {}) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: opts.quiet ? 'pipe' : 'inherit', maxBuffer: 2 ** 30 });
// Run ffmpeg and return stderr text (for filters that report there, like ebur128).
export function ffReport(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-800)}`);
  return r.stderr;
}
// Run ffmpeg and return stdout bytes (decoded frames or samples).
export function ffRaw(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { maxBuffer: 2 ** 31 - 1 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr).slice(-800)}`);
  return r.stdout;
}
export function probe(file) {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', file], { encoding: 'utf8', maxBuffer: 1 << 26 });
  return JSON.parse(out);
}
// Integrated loudness (LUFS) and true peak (dBTP) via the EBU R128 meter.
export function loudness(file) {
  const s = ffReport(['-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const sum = s.slice(s.lastIndexOf('Summary:'));
  const I = parseFloat((sum.match(/I:\s+(-?[\d.]+|-inf) LUFS/) || [])[1]);
  const LRA = parseFloat((sum.match(/LRA:\s+(-?[\d.]+) LU/) || [])[1]);
  const pk = (sum.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/) || [])[1];
  return { I, LRA, TP: pk === '-inf' ? -Infinity : parseFloat(pk) };
}
export const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const versionOf = (bin, args = ['-version']) => { try { return execFileSync(bin, args, { encoding: 'utf8' }).split('\n')[0]; } catch { return 'unknown'; } };

// Playwright: the project's own pinned copy first, then PLAYWRIGHT=/path/to/playwright/index.mjs, then common global installs.
export let playwrightSource = 'not loaded';
const pwVersion = indexFile => { try { return JSON.parse(fs.readFileSync(path.join(path.dirname(indexFile), 'package.json'), 'utf8')).version; } catch { return '?'; } };
export async function importPlaywright() {
  const tries = [];
  try { const m = await import('playwright'); playwrightSource = `node_modules ${pwVersion(require.resolve('playwright'))}`; return m; } catch (e) { tries.push('playwright (node_modules): ' + e.message.split('\n')[0]); }
  for (const p of [process.env.PLAYWRIGHT, '/opt/node22/lib/node_modules/playwright/index.mjs', '/usr/local/lib/node_modules/playwright/index.mjs', '/usr/lib/node_modules/playwright/index.mjs'].filter(Boolean)) {
    try { if (fs.existsSync(p)) { const m = await import(pathToFileURL(p).href); playwrightSource = `${p} ${pwVersion(p)}`; return m; } } catch (e) { tries.push(p + ': ' + e.message.split('\n')[0]); }
  }
  throw new Error('Playwright not found. Run `npm install` in the project, or set PLAYWRIGHT=/path/to/playwright/index.mjs.\n  ' + tries.join('\n  '));
}
export async function launchBrowser() {
  const pw = await importPlaywright(), exe = process.env.CHROMIUM_PATH;
  try { return await pw.chromium.launch(exe ? { executablePath: exe } : {}); }
  catch (e) {
    // fall back to any Chromium already on the machine under PLAYWRIGHT_BROWSERS_PATH
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH; if (exe || !base || !fs.existsSync(base)) throw e;
    const cand = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse().map(d => path.join(base, d, 'chrome-linux', 'chrome')).find(f => fs.existsSync(f));
    if (!cand) throw e;
    console.warn(`browser: falling back to ${cand}`);
    return await pw.chromium.launch({ executablePath: cand });
  }
}
// Open the built film page; collect every page error; wait for fonts and images.
export async function openFilm(browser, htmlFile, film) {
  const page = await browser.newPage({ viewport: { width: film.width, height: film.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(htmlFile).href);
  const ready = await page.evaluate(() => window.FILMPAGE.ready);
  return { page, errors, ready };
}
export const savePng = (dataUrl, file) => fs.writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
export function args(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; } }
    else o._.push(a);
  }
  return o;
}
