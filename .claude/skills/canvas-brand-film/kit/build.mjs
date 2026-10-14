// build.mjs: assembles one self-contained HTML page (config, kit, every shot, fonts and images inlined as data URIs).
// Inlining keeps the canvas untainted, so toDataURL works from file://. usage: node build.mjs [out.html]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WORK, loadFilm } from './lib/node.mjs';

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

// assets/fonts/<Family_Name>-<weight | min_max>[-italic].woff2  →  @font-face rules plus a list the page waits on
function fontFaces() {
  const dir = path.join(ROOT, 'assets', 'fonts'); if (!fs.existsSync(dir)) return { css: '', faces: [] };
  const faces = [], css = [];
  for (const f of fs.readdirSync(dir).filter(f => /\.(woff2|woff|ttf|otf)$/i.test(f)).sort()) {
    const m = f.match(/^(.+?)-(\d+)(?:_(\d+))?(-italic)?\.(woff2|woff|ttf|otf)$/i);
    if (!m) throw new Error(`font file "${f}" must be named <Family_Name>-<weight>[_<maxweight>][-italic].woff2`);
    const [, fam, w0, w1, it, ext] = m, family = fam.replace(/_/g, ' '), style = it ? 'italic' : 'normal';
    const fmt = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[ext.toLowerCase()];
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    css.push(`@font-face{font-family:'${family}';font-style:${style};font-weight:${w1 ? `${w0} ${w1}` : w0};src:url(data:font/${fmt};base64,${b64}) format('${fmt}');}`);
    faces.push({ family, style, probe: Number(w0), file: f });
  }
  return { css: css.join('\n'), faces };
}

function images(film) {
  const out = {};
  for (const [name, rel] of Object.entries(film.images || {})) {
    const p = path.join(ROOT, rel), mime = MIME[path.extname(p).toLowerCase()];
    if (!fs.existsSync(p)) throw new Error(`image "${name}" not found at ${rel} (listed in film.config.cjs images)`);
    if (!mime) throw new Error(`image "${name}": unsupported type ${path.extname(p)}`);
    out[name] = `data:${mime};base64,` + fs.readFileSync(p).toString('base64');
  }
  return out;
}

export function build(outFile = path.join(WORK, 'film.html')) {
  const film = loadFilm();
  const shotFiles = fs.readdirSync(path.join(ROOT, 'shots')).filter(f => f.endsWith('.js')).sort();
  if (!shotFiles.length) throw new Error('no shots/*.js files');
  const { css, faces } = fontFaces();
  const shots = shotFiles.map(f => `<script>\n// ===== shots/${f} =====\n${read(path.join('shots', f))}\n</script>`).join('\n');
  const parts = {
    TITLE: film.name, W: String(film.width), H: String(film.height), FONTS: css,
    CONFIG: read('film.config.cjs'), IMAGES: JSON.stringify(images(film)), FACES: JSON.stringify(faces),
    CORE: read('lib/core.js'), SHOTS: shots, PAGE: read('lib/page.js'),
  };
  // A function replacer, so `$&`, `$1` and friends inside source code are inserted literally.
  const html = read('template.html').replace(/%%([A-Z]+)%%/g, (m, k) => { if (!(k in parts)) throw new Error('template has unknown slot ' + m); return parts[k]; });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  return { file: outFile, bytes: html.length, shots: shotFiles, fonts: faces.map(f => f.file), images: Object.keys(film.images || {}) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log(`built ${path.relative(ROOT, r.file)} · ${(r.bytes / 1024).toFixed(0)} KB · shots ${r.shots.join(', ')} · fonts ${r.fonts.length} · images ${r.images.join(', ') || 'none'}`);
}
