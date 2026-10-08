// Assembles render.html from template.html + base.js + the modules given (in order). usage: node build.mjs out.html [module.js ...]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [out, ...mods] = process.argv.slice(2);
const uri = p => 'data:image/png;base64,' + fs.readFileSync(path.join(here, p)).toString('base64');
const modules = mods.map(m => `<script>\n// ===== ${path.basename(m)} =====\n${fs.readFileSync(m, 'utf8')}\n</script>`).join('\n');
const html = fs.readFileSync(path.join(here, 'template.html'), 'utf8')
  .replace('%%FONTS%%', fs.readFileSync(path.join(here, 'fonts.css'), 'utf8'))
  .replace('%%BASE%%', fs.readFileSync(path.join(here, 'base.js'), 'utf8'))
  .replace('%%MODULES%%', modules)
  .replace('%%LOGO%%', uri('assets/lockup-dark.png')).replace('%%TAG%%', uri('assets/tagline-dark.png'));
fs.writeFileSync(out, html); console.log('built', out, html.length, 'bytes', mods.length, 'modules');
