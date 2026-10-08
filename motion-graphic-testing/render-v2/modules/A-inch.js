// Module: A-inch.js. Frames 1-3 (fCut, fInch, fBreath). Function declarations here override base.js by name.
// Every helper is prefixed A_ so nothing collides with other modules sharing the global scope.

const A_ST = { tile: null };
const A_RED = '231,39,34', A_BONE = '239,233,222', A_RED_DK = '122,20,18';
const A_READ_Y = 0.9, A_READ_S = 0.017;   // the mono readout's y and size (fractions of H and W), pinned across the fInch -> fBreath cut

function A_rgba(c, a) { return 'rgba(' + c + ',' + (a < 0 ? 0 : a > 1 ? 1 : a) + ')'; }

// ---------- film grain: one deterministic noise tile built once, drawn as a pattern at a p-driven offset ----------
function A_tile() {
  if (A_ST.tile) return A_ST.tile;
  const s = 512, cv = document.createElement('canvas'); cv.width = s; cv.height = s;
  const c = cv.getContext('2d'), img = c.createImageData(s, s), d = img.data, r = PR.rng(4242);
  for (let i = 0; i < s * s; i++) { const g = Math.floor((r() + r() + r()) * 85); const o = i * 4; d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255; }
  c.putImageData(img, 0, 0); A_ST.tile = cv; return cv;
}
function A_grain(ctx, W, H, amount, p, salt) {
  const tile = A_tile(), r = PR.rng(9001 + Math.floor(p * 300) * 131 + (salt || 0));
  const ox = Math.floor(r() * 512), oy = Math.floor(r() * 512);
  ctx.save(); ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount * 2.4; ctx.fillRect(ox, oy, W, H);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amount * 0.55; ctx.fillRect(ox, oy, W, H);
  ctx.restore();
}

// ---------- soft elliptical glow (radial gradient under a non-uniform scale) ----------
function A_eglow(ctx, cx, cy, rx, ry, rot, col, alpha, soft) {
  if (alpha <= 0.002 || rx < 0.3 || ry < 0.2) return;
  ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  if (soft) { g.addColorStop(0, A_rgba(col, alpha)); g.addColorStop(0.3, A_rgba(col, alpha * 0.5)); g.addColorStop(0.65, A_rgba(col, alpha * 0.14)); g.addColorStop(1, A_rgba(col, 0)); }
  else { g.addColorStop(0, A_rgba(col, alpha)); g.addColorStop(0.5, A_rgba(col, alpha * 0.35)); g.addColorStop(1, A_rgba(col, 0)); }
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
// a band of light perpendicular to x in the current frame, soft across its width
function A_band(ctx, len, hw, col, a) {
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, A_rgba(col, 0)); g.addColorStop(0.25, A_rgba(col, a * 0.28)); g.addColorStop(0.5, A_rgba(col, a)); g.addColorStop(0.75, A_rgba(col, a * 0.28)); g.addColorStop(1, A_rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-len, -hw, len * 2, hw * 2);
}

// ================================================================ fCut (0-3 s)
function fCut(ctx, p, W, H) {
  const cx = W / 2, cy = H / 2, Lmax = H * 0.78;
  // the black is not quite flat: a barely-there radial lift that breathes in over the first frames
  const bgA = ease.out(win(p, 0, 0.3));
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 1.05);
  bg.addColorStop(0, A_rgba('26,26,29', bgA)); bg.addColorStop(0.45, A_rgba('14,14,16', bgA)); bg.addColorStop(1, A_rgba('4,4,4', bgA));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const lenAt = q => { const t = win(q, 0.1, 0.72); return Lmax * (0.55 * ease.outExpo(t) + 0.45 * ease.out(t)); };
  const L = lenAt(p), vel = L - lenAt(p - 1 / 90);        // px each tip travels in one frame (3 s = 90 frames)
  const velN = clamp(vel / 24, 0, 1);
  const a = ease.out(win(p, 0.1, 0.2));
  const fl = 1 + 0.03 * Math.sin(p * 97) + 0.02 * Math.sin(p * 233 + 1);      // photographic flicker
  const swell = 1 + 0.5 * ease.inOut(win(p, 0.8, 1));                         // exposure rises into the cut
  const ca = Math.cos(GEO.ang), sa = Math.sin(GEO.ang);
  // the spark where the blade first touches
  const sp = win(p, 0.08, 0.32);
  if (sp > 0 && sp < 1) { const d = (1 - sp) * (1 - sp); A_eglow(ctx, cx, cy, H * 0.05 * (0.3 + sp), H * 0.05 * (0.3 + sp), 0, A_RED, 0.6 * d, true); A_eglow(ctx, cx, cy, W * 0.09 * (0.4 + sp), 2.2, 0, A_RED, 0.5 * d, false); A_eglow(ctx, cx, cy, W * 0.03 * (0.4 + sp), 1, 0, A_BONE, 0.25 * d, false); }
  if (L > 0.5) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(GEO.ang);
    A_eglow(ctx, 0, 0, L + H * 0.08, H * 0.05 * swell, 0, A_RED, 0.24 * a * fl, true);
    A_eglow(ctx, 0, 0, L + H * 0.02, H * 0.016 * swell, 0, A_RED, 0.6 * a * fl, true);
    A_eglow(ctx, 0, 0, H * 0.16, H * 0.07 * swell, 0, A_RED, 0.12 * a * fl, true);
    const ext = vel * 1.6 + 4, T = L + ext, e = ext / (2 * T);    // motion-blur tail beyond each tip
    const lg = ctx.createLinearGradient(-T, 0, T, 0);
    lg.addColorStop(0, A_rgba(A_RED, 0)); lg.addColorStop(e, A_rgba(A_RED, 0.95 * a * fl)); lg.addColorStop(1 - e, A_rgba(A_RED, 0.95 * a * fl)); lg.addColorStop(1, A_rgba(A_RED, 0));
    ctx.fillStyle = lg; ctx.fillRect(-T, -0.8, 2 * T, 1.6);
    const hg = ctx.createLinearGradient(-L, 0, L, 0);
    hg.addColorStop(0, A_rgba(A_BONE, 0)); hg.addColorStop(0.15, A_rgba(A_BONE, 0.38 * a)); hg.addColorStop(0.85, A_rgba(A_BONE, 0.38 * a)); hg.addColorStop(1, A_rgba(A_BONE, 0));
    ctx.fillStyle = hg; ctx.fillRect(-L, -0.5, 2 * L, 1);
    ctx.restore();
    // anamorphic streaks at the tips: horizontal in camera space, bright while the tips move, a faint glint after
    const sl = W * (0.025 + 0.085 * velN), sA = a * (0.16 + 0.75 * velN) * fl;
    for (const s of [-1, 1]) {
      const tx = cx + s * L * ca, ty = cy + s * L * sa;
      A_eglow(ctx, tx, ty, sl, 2.6, 0, A_RED, sA, false);
      A_eglow(ctx, tx, ty, sl * 0.45, 1.1, 0, A_BONE, sA * 0.5, false);
      A_eglow(ctx, tx, ty, H * 0.012, H * 0.012, 0, A_RED, sA * 0.6, true);
    }
  }
  A_grain(ctx, W, H, 0.05, p, 1);
}

// ================================================================ fInch (3-7 s)
// brushed steel: base shading, anisotropic highlight bands that slide with the push-in, two layers of brush strokes
// bevelX / outerX: where the chamfer sits and where the frame's outer edge is (at z = 1), for the slab's light falloff
function A_steel(ctx, x, y, w, h, slide, seed, bevelX, outerX) {
  const base = ctx.createLinearGradient(0, y, 0, y + h);
  base.addColorStop(0, '#191C20'); base.addColorStop(0.2, '#2E3237'); base.addColorStop(0.42, '#555B62'); base.addColorStop(0.58, '#3B4046'); base.addColorStop(0.78, '#4E545B'); base.addColorStop(1, '#121416');
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  const bands = [[0.30, 0.10, 0.40, 1.0], [0.47, 0.035, 0.18, 0.6], [0.66, 0.07, 0.26, 1.4], [0.83, 0.02, 0.12, 0.8]];
  for (const [c, hw, a, k] of bands) {
    const g = ctx.createLinearGradient(0, y + slide * k, 0, y + h + slide * k);
    g.addColorStop(c - hw, 'rgba(206,211,217,0)'); g.addColorStop(c - hw * 0.5, A_rgba('206,211,217', a * 0.45)); g.addColorStop(c, A_rgba('206,211,217', a)); g.addColorStop(c + hw * 0.5, A_rgba('206,211,217', a * 0.45)); g.addColorStop(c + hw, 'rgba(206,211,217,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  const r = PR.rng(seed); ctx.fillStyle = '#D4D8DD';
  for (let i = 0; i < 220; i++) { const ly = y + r() * h, lx = x + r() * w * 0.7, lw = w * (0.2 + r() * 0.8); ctx.globalAlpha = 0.02 + r() * 0.07; ctx.fillRect(lx, ly, lw, 1); }
  ctx.fillStyle = '#000';
  for (let i = 0; i < 200; i++) { const ly = y + r() * h, lx = x + r() * w * 0.7, lw = w * (0.2 + r() * 0.8); ctx.globalAlpha = 0.04 + r() * 0.12; ctx.fillRect(lx, ly, lw, 1); }
  ctx.globalAlpha = 1;
  // form: the slab falls off ~30% toward the frame edge and dips ~10% just before the chamfer, so the bevel reads as the lit edge
  const fo = ctx.createLinearGradient(outerX, 0, bevelX, 0);
  fo.addColorStop(0, 'rgb(178,180,183)'); fo.addColorStop(0.45, 'rgb(232,233,235)'); fo.addColorStop(0.85, 'rgb(255,255,255)'); fo.addColorStop(1, 'rgb(229,230,232)');
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = fo; ctx.fillRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over';
  // one low-frequency modulation along the brush direction so the highlight bands are not ruler-straight
  const lo = ctx.createLinearGradient(outerX, 0, bevelX, 0);
  for (let k = 0; k <= 16; k++) { const u = k / 16, v = 0.5 + 0.5 * Math.sin(u * 2.7 * Math.PI + seed * 1.3); lo.addColorStop(u, A_rgba('206,211,217', 0.065 * v)); }
  ctx.fillStyle = lo; ctx.fillRect(x, y, w, h);
}
// the chamfer on a blade's inner edge; dir = +1 when the steel lies left of the edge, -1 when right
function A_bevel(ctx, edge, dir, y0, y1, bw, hitY, bi, H) {
  const inner = edge - dir * bw, x = Math.min(inner, edge), hh = y1 - y0;
  const g = ctx.createLinearGradient(inner, 0, edge, 0);
  g.addColorStop(0, 'rgba(170,176,182,0)'); g.addColorStop(0.55, 'rgba(170,176,182,0.16)'); g.addColorStop(1, 'rgba(205,210,216,0.5)');
  ctx.fillStyle = g; ctx.fillRect(x, y0, bw, hh);
  const rg = ctx.createLinearGradient(0, hitY - H * 0.32, 0, hitY + H * 0.32);
  rg.addColorStop(0, A_rgba(A_RED, 0)); rg.addColorStop(0.3, A_rgba(A_RED, 0.22 * bi)); rg.addColorStop(0.5, A_rgba(A_RED, 0.6 * bi)); rg.addColorStop(0.7, A_rgba(A_RED, 0.22 * bi)); rg.addColorStop(1, A_rgba(A_RED, 0));
  ctx.fillStyle = rg; ctx.fillRect(x, y0, bw, hh);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(dir > 0 ? inner - 1 : inner, y0, 1, hh);
  ctx.fillStyle = 'rgba(239,233,222,0.12)'; ctx.fillRect(dir > 0 ? inner : inner - 1, y0, 1, hh);
  ctx.fillStyle = A_rgba(A_BONE, 0.72); ctx.fillRect(dir > 0 ? edge - 2 : edge, y0, 2, hh);
}
// the ruler cut into the steel: dark groove, bright lower edge; ticks likewise; 0 and 1 engraved beside the edges
function A_engravedRuler(ctx, gx0, gx1, inch, y, X0, X1) {
  const sub = inch / 8;
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(X0, y - 1, gx0 - X0, 2); ctx.fillRect(gx1, y - 1, X1 - gx1, 2);
  ctx.fillStyle = 'rgba(239,233,222,0.42)'; ctx.fillRect(X0, y + 1, gx0 - X0, 1); ctx.fillRect(gx1, y + 1, X1 - gx1, 1);
  for (let k = -48; k <= 56; k++) {
    if (k > 0 && k < 8) continue; const x = gx0 + k * sub; if (x < X0 || x > X1) continue;
    const m = ((k % 8) + 8) % 8, h = m === 0 ? inch * 0.12 : m === 4 ? inch * 0.075 : m % 2 === 0 ? inch * 0.05 : inch * 0.03, w = m === 0 ? 2.5 : m === 4 ? 2 : 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = 'rgba(239,233,222,0.4)'; ctx.fillRect(x + w / 2, y - h, 1, h);
  }
  const fs = Math.max(11, inch * 0.085); PR.numeral(ctx, fs, 700); ctx.textBaseline = 'alphabetic';
  const ty = y - inch * 0.16, ins = sub * 0.8;
  for (const [t, x, al] of [['0', gx0 - ins, 'right'], ['1', gx1 + ins, 'left']]) {
    ctx.textAlign = al; ctx.fillStyle = 'rgba(239,233,222,0.45)'; ctx.fillText(t, x + 1.2, ty + 1.4);
    ctx.fillStyle = 'rgba(10,11,12,0.92)'; ctx.fillText(t, x, ty);
  }
}
// dust in three depth layers inside the gap, lit where it crosses the beam
function A_dust(ctx, p, W, H, gx0, gx1, bi, sa, ca) {
  const cx = W / 2, cy = H / 2, bw = H * 0.075;
  const lit = (x, y) => { const d = -(x - cx) * sa + (y - cy) * ca; return Math.exp(-(d * d) / (bw * bw)) * bi; };
  const Y0 = -H * 0.3, span = H * 1.6, r = PR.rng(33);
  ctx.save();
  for (let i = 0; i < 120; i++) {   // far: tiny, slow
    const bx = gx0 + r() * (gx1 - gx0), by = Y0 + r() * span, s = r(), ph = r() * 6.28;
    const x = bx + Math.sin(p * 2.5 + ph) * 2.5, y = by - p * H * 0.035 * (0.4 + s);
    const l = lit(x, y); ctx.globalAlpha = (0.12 + 0.3 * s) * (0.25 + 0.75 * l); ctx.fillStyle = C.bone; ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 70; i++) {    // mid
    const bx = gx0 + r() * (gx1 - gx0), by = Y0 + r() * span, s = r(), ph = r() * 6.28;
    const x = bx + Math.sin(p * 4 + ph) * 6, y = by - p * H * 0.09 * (0.5 + s) + Math.cos(p * 3 + ph) * 3;
    const l = lit(x, y), sz = 1.4 + s * 1.2, a = (0.25 + 0.45 * s) * (0.2 + 0.8 * l);
    if (l > 0.15) { ctx.globalAlpha = a * l * 0.6; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, y, sz * 1.8, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = a; ctx.fillStyle = C.bone; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {    // near: large, soft, fast, smeared along their drift
    const bx = gx0 - 30 + r() * (gx1 - gx0 + 60), by = Y0 + r() * span, s = r(), ph = r() * 6.28;
    const posAt = q => [bx + Math.sin(q * 3 + ph) * W * 0.018 * (0.5 + s), by - q * H * 0.26 * (0.4 + s) + Math.cos(q * 2.2 + ph) * H * 0.01];
    const [x, y] = posAt(p), [x1, y1] = posAt(p - 1 / 120);
    const l = lit(x, y), rad = 2.5 + s * 3.5, a = (0.08 + 0.16 * s) * (0.3 + 0.7 * l);
    if (l > 0.1) { ctx.strokeStyle = C.red; ctx.globalAlpha = a * l * 0.8; ctx.lineWidth = rad * 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.strokeStyle = C.bone; ctx.globalAlpha = a * 0.35; ctx.lineWidth = rad * 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = a; ctx.lineWidth = rad * 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
  }
  ctx.restore();
}
function fInch(ctx, p, W, H, zoomFrom, zoomTo) {
  const zf = zoomFrom == null ? 1 : zoomFrom, zt = zoomTo == null ? 1.25 : zoomTo;
  const breathe = 0.005 * (1 - Math.cos(p * Math.PI * 2));                 // 1% slow breathing, zero at both ends
  const z = lerp(zf, zt, ease.in(p)) * (1 + breathe);
  const inch = W * 0.22, gx0 = W / 2 - inch / 2, gx1 = W / 2 + inch / 2;
  const ang = GEO.ang, ca = Math.cos(ang), sa = Math.sin(ang), tn = Math.tan(ang);
  const hitL = H / 2 + (gx0 - W / 2) * tn, hitR = H / 2 + (gx1 - W / 2) * tn;   // where the beam lands on each face
  const bi = 1 + 0.03 * Math.sin(p * 70) + 0.02 * Math.sin(p * 150 + 2);        // beam flicker
  const slide = -(z - 1) * H * 0.5;                                              // parallax of the highlight bands
  const X0 = -W * 0.3, X1 = W * 1.3, Y0 = -H * 0.3, Y1 = H * 1.3, bw = W * 0.014, yR = H * 0.78;   // ruler high enough that at z = 1.3 (cutdown) it still clears the pinned readout
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.save(); A_steel(ctx, X0, Y0, gx0 - X0, Y1 - Y0, slide, 21, gx0, 0); A_steel(ctx, gx1, Y0, X1 - gx1, Y1 - Y0, slide * 0.85, 22, gx1, W); ctx.restore();
  // everything that belongs on the steel: engraving, the beam's spill, the bevels
  ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, gx0 - X0, Y1 - Y0); ctx.rect(gx1, Y0, X1 - gx1, Y1 - Y0); ctx.clip();
  A_engravedRuler(ctx, gx0, gx1, inch, yR, X0, X1);
  A_eglow(ctx, gx0, hitL, W * 0.085, H * 0.26, 0, A_RED, 0.2 * bi, true);
  A_eglow(ctx, gx1, hitR, W * 0.085, H * 0.26, 0, A_RED, 0.2 * bi, true);
  A_bevel(ctx, gx0, 1, Y0, Y1, bw, hitL, bi, H); A_bevel(ctx, gx1, -1, Y0, Y1, bw, hitR, bi, H);
  A_eglow(ctx, gx0, hitL, bw * 1.6, H * 0.07, 0, A_RED, 0.8 * bi, true);
  A_eglow(ctx, gx1, hitR, bw * 1.6, H * 0.07, 0, A_RED, 0.8 * bi, true);
  ctx.restore();
  // the inch of air: a volumetric beam at the slash angle, dust in three depths
  ctx.save(); ctx.beginPath(); ctx.rect(gx0, Y0, inch, Y1 - Y0); ctx.clip();
  const gb = ctx.createLinearGradient(gx0, 0, gx1, 0); gb.addColorStop(0, '#030303'); gb.addColorStop(0.5, '#0C0C0E'); gb.addColorStop(1, '#030303');
  ctx.fillStyle = gb; ctx.fillRect(gx0, Y0, inch, Y1 - Y0);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang);
  const LB = W, S = 480;
  A_band(ctx, LB, H * 0.17, A_RED, 0.2 * bi); A_band(ctx, LB, H * 0.065, A_RED, 0.42 * bi);
  const sr = PR.rng(77);     // light shafts drifting along the beam
  for (let i = 0; i < 14; i++) {
    const oy = (sr() * 2 - 1) * H * 0.11, th = 1.5 + sr() * 5, a = (0.05 + sr() * 0.09) * bi, f1 = 1.5 + sr() * 3, f2 = 4 + sr() * 6, ph = sr() * 6.28, dr = (sr() * 2 - 1) * 2.5;
    const g = ctx.createLinearGradient(-S, 0, S, 0);
    for (let k = 0; k <= 48; k++) { const u = k / 48; const v = (0.5 + 0.5 * Math.sin(u * f1 * 6.28 + ph + p * dr)) * (0.5 + 0.5 * Math.sin(u * f2 * 6.28 - ph * 2 + p * dr * 1.7)); g.addColorStop(u, A_rgba(A_RED, a * v)); }
    ctx.fillStyle = g; ctx.fillRect(-S, oy - th / 2, S * 2, th);
  }
  A_band(ctx, LB, H * 0.014, A_RED, 0.75 * bi);
  ctx.globalAlpha = 0.95 * bi; ctx.fillStyle = C.red; ctx.fillRect(-LB, -0.8, LB * 2, 1.6);
  ctx.globalAlpha = 0.32 * bi; ctx.fillStyle = C.bone; ctx.fillRect(-LB, -0.5, LB * 2, 1);
  ctx.restore();
  A_dust(ctx, p, W, H, gx0, gx1, bi, sa, ca);
  ctx.restore();
  // where the beam meets the faces: a hot spot and a small anamorphic glint across the edge
  for (const [ex, ey] of [[gx0, hitL], [gx1, hitR]]) {
    A_eglow(ctx, ex, ey, W * 0.07, 2.4, 0, A_RED, 0.55 * bi, false);
    A_eglow(ctx, ex, ey, W * 0.025, 1, 0, A_BONE, 0.3 * bi, false);
    A_eglow(ctx, ex, ey, H * 0.03, H * 0.03, 0, A_RED, 0.5 * bi, true);
  }
  // the dimension across the gap
  const rev = ease.out(win(p, 0.1, 0.4));
  const dl = (inch / 2 - 4) * rev, ta = win(rev, 0.85, 1);
  ctx.save(); ctx.globalAlpha = 0.55 * Math.min(1, rev * 3); ctx.fillStyle = C.red; ctx.fillRect(W / 2 - dl, yR, dl * 2, 1); ctx.globalAlpha = 0.55 * ta; ctx.fillRect(gx0 + 4, yR - 5, 1, 11); ctx.fillRect(gx1 - 5, yR - 5, 1, 11); ctx.restore();
  ctx.restore();
  PR.label(ctx, '1.000 in', W / 2, H * A_READ_Y, C.red, Math.max(10, W * A_READ_S), 'center', rev);   // fixed in screen space: fBreath opens with it in the same place
  PR.vignette(ctx, W, H, 0.55); A_grain(ctx, W, H, 0.04, p, 2);
}

// ================================================================ fBreath (7-9 s)
// one blade face seen from inside the inch, between x0 and x1: base shading, brush strokes attached to `edge`, the ring's red bounce
function A_facePaint(ctx, side, edge, x0, x1, alpha, W, H, env, seed) {
  if (x1 - x0 < 0.3 || alpha <= 0.003) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, -1, x1 - x0, H + 2); ctx.clip(); ctx.globalAlpha = alpha;
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#1A1D20'); base.addColorStop(0.35, '#2F3337'); base.addColorStop(0.5, '#383C41'); base.addColorStop(0.7, '#2A2D31'); base.addColorStop(1, '#131517');
  ctx.fillStyle = base; ctx.fillRect(x0, 0, x1 - x0, H);
  if (seed) {
    const r = PR.rng(seed); ctx.fillStyle = '#C9CED3';
    for (let i = 0; i < 150; i++) { const ly = r() * H, len = W * (0.1 + r() * 0.5), lx = side > 0 ? edge - r() * W * 0.1 - len : edge + r() * W * 0.1; ctx.globalAlpha = alpha * (0.02 + r() * 0.06); ctx.fillRect(lx, ly, len, 1); }
    ctx.fillStyle = '#000';
    for (let i = 0; i < 130; i++) { const ly = r() * H, len = W * (0.1 + r() * 0.5), lx = side > 0 ? edge - r() * W * 0.1 - len : edge + r() * W * 0.1; ctx.globalAlpha = alpha * (0.04 + r() * 0.1); ctx.fillRect(lx, ly, len, 1); }
    ctx.globalAlpha = alpha;
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.65);   // red bounce from the ring
  g.addColorStop(0, A_rgba(A_RED, 0.16 + 0.22 * env)); g.addColorStop(0.45, A_rgba(A_RED, (0.16 + 0.22 * env) * 0.3)); g.addColorStop(1, A_rgba(A_RED, 0));
  ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H);
  ctx.restore();
}
// the machined edge itself: chamfer gradient, its dark inner crease and the 2 px bone specular, all on `edge`, at strength k
function A_faceDetail(ctx, side, edge, W, H, k) {
  if (k <= 0.003) return;
  const bw = W * 0.012, inner = edge - side * bw;
  ctx.save(); ctx.globalAlpha = k;
  const bg = ctx.createLinearGradient(inner, 0, edge, 0); bg.addColorStop(0, 'rgba(150,156,162,0)'); bg.addColorStop(0.6, 'rgba(150,156,162,0.14)'); bg.addColorStop(1, 'rgba(190,196,202,0.42)');
  ctx.fillStyle = bg; ctx.fillRect(Math.min(inner, edge), 0, bw, H);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(side > 0 ? inner - 1 : inner, 0, 1, H);
  ctx.fillStyle = A_rgba(A_BONE, 0.72); ctx.fillRect(side > 0 ? edge - 2 : edge, 0, 2, H);
  ctx.restore();
}
// a face whose edge sits at `edge` and travelled `smear` px during the shutter: solid where it covered the whole exposure,
// alpha slices across the sweep so the background shows through, and the chamfer + specular crossfading from crisp to smeared
function A_innerFace(ctx, side, edge, smear, W, H, env, seed) {
  const far = side > 0 ? 0 : W, trail = edge - side * smear;
  const crisp = clamp(1 - (smear - 3) / 16, 0, 1);   // machined below 3 px of smear, fully streaked by 19; wide enough that the knee at p = 0.75 resolves over three frames
  A_facePaint(ctx, side, edge, Math.min(far, trail), Math.max(far, trail), 1, W, H, env, seed);
  if (smear >= 0.5) {
    const N = Math.min(16, Math.max(3, Math.ceil(smear / 3)));
    for (let k = 0; k < N; k++) {
      const xa = lerp(trail, edge, k / N), xb = lerp(trail, edge, (k + 1) / N);
      A_facePaint(ctx, side, edge, Math.min(xa, xb), Math.max(xa, xb), 1 - (k + 0.5) / N, W, H, env, 0);
    }
    // the specular and chamfer smeared across the sweep: brightest where the face has settled, fading toward the leading edge
    const bw = W * 0.012, sm = Math.sqrt(1 - crisp);   // the two specular layers crossfade in sqrt so their energies sum evenly through the handover
    const a0 = Math.min(trail, edge) - (side > 0 ? bw : 0), a1 = Math.max(trail, edge) + (side > 0 ? 0 : bw);
    const sg = ctx.createLinearGradient(side > 0 ? a0 : a1, 0, side > 0 ? a1 : a0, 0);
    sg.addColorStop(0, A_rgba(A_BONE, 0)); sg.addColorStop(bw / (bw + smear), A_rgba(A_BONE, 0.5 * sm)); sg.addColorStop(1, A_rgba(A_BONE, 0.3 * sm));
    ctx.save(); ctx.fillStyle = sg; ctx.fillRect(a0, 0, a1 - a0, H);
    ctx.fillStyle = A_rgba(A_BONE, 0.22 * sm); ctx.fillRect(side > 0 ? edge - 1 : edge, 0, 1, H); ctx.restore();
  }
  A_faceDetail(ctx, side, edge, W, H, Math.sqrt(crisp));   // drawn last and never clipped away; the root keeps the machined edge reading through the handover
}
function fBreath(ctx, p, W, H) {
  const closeAt = q => q < 0.75 ? lerp(0, 0.35, ease.in(q / 0.75)) : lerp(0.35, 0.5, (q - 0.75) / 0.25);
  const close = closeAt(p);
  // the faces sit a chamfer-width (plus a hair) inside the frame at p = 0, so the machined edge is in shot from the first frame, and meet at centre at p = 1
  const edgeAt = c => lerp(26, W / 2 + 2.5, c * 2), gx0 = edgeAt(close), gx1 = W - gx0;
  // motion blur: a 180-degree shutter on the face velocity averaged over three frames, so the knee in closeAt at p = 0.75 sharpens over 3 frames, not 1
  const qa = Math.max(0, p - 2 / 60), qb = p + 1 / 60, smear = 0.5 * Math.abs(edgeAt(closeAt(qb)) - edgeAt(closeAt(qa))) / ((qb - qa) * 60);
  const cx = W / 2, cy = H / 2;
  const beats = [0.125, 0.75]; let env = 0;    // 48 bpm: one beat every 1.25 s
  for (const b of beats) { const q = p - b; if (q < 0) continue; env = Math.max(env, q < 0.06 ? ease.out(q / 0.06) : 1 - ease.inOut(win(q, 0.06, 0.6))); }
  const open = ease.out(win(p, 0, 0.16)), r0 = H * 0.1 * open * (1 + 0.22 * env);
  const fl = 1 + 0.02 * Math.sin(p * 120) + 0.015 * Math.sin(p * 260 + 2);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.9);
  bg.addColorStop(0, '#111113'); bg.addColorStop(0.5, '#0A0A0B'); bg.addColorStop(1, '#040404');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  A_eglow(ctx, cx, cy, H * 0.42, H * 0.42, 0, A_RED, (0.16 + 0.3 * env) * fl, true);
  // motes hanging in the air, faint trails, lit where the ring passes them
  const r = PR.rng(33); ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 170; i++) {
    const bx = r() * W, by = r() * H, s = r(), ph = r() * 6.28, dx = r() - 0.5;
    const posAt = q => [bx + Math.sin(q * 2.4 + ph) * H * 0.014 * s + q * H * 0.02 * dx, by - q * H * 0.05 * (0.3 + s) + Math.cos(q * 1.9 + ph) * H * 0.006];
    const [x, y] = posAt(p), [mx, my] = posAt(p - 0.07), [tx, ty] = posAt(p - 0.14);
    const d = Math.hypot(x - cx, y - cy), ringLit = Math.exp(-Math.pow((d - r0) / (H * 0.045), 2)) * (0.3 + 0.7 * env), cLit = Math.exp(-d / (H * 0.35)) * (0.2 + 0.5 * env);
    const a = (0.15 + 0.5 * s) * fl, sz = 1 + s * 1.6;
    ctx.strokeStyle = C.bone; ctx.lineWidth = 1;
    ctx.globalAlpha = a * 0.1; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(mx, my); ctx.stroke();
    ctx.globalAlpha = a * 0.24; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x, y); ctx.stroke();
    const l = ringLit + cLit; if (l > 0.05) { ctx.fillStyle = C.red; ctx.globalAlpha = Math.min(1, l) * a * 0.9; ctx.beginPath(); ctx.arc(x, y, sz * 2.2, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = C.bone; ctx.globalAlpha = a * (0.5 + 0.5 * ringLit); ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
  }
  ctx.restore();
  // the ring breathes; each beat throws a ripple with a chromatic double
  ctx.save();
  if (r0 > 1) {
    ctx.lineWidth = 10 + 10 * env; ctx.strokeStyle = A_rgba(A_RED, 0.12 + 0.15 * env); ctx.beginPath(); ctx.arc(cx, cy, r0, 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = A_rgba(A_BONE, 0.15 * open); ctx.beginPath(); ctx.arc(cx, cy, r0 * 1.02 + 1, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = A_rgba(A_RED_DK, 0.55); ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r0 * 0.98 - 1), 0, 6.2832); ctx.stroke();
    ctx.lineWidth = 2.2 + 1.8 * env; ctx.strokeStyle = A_rgba(A_RED, (0.62 + 0.38 * env) * fl); ctx.beginPath(); ctx.arc(cx, cy, r0, 0, 6.2832); ctx.stroke();
  }
  for (const b of beats) {
    const q = win(p, b, b + 0.6); if (q <= 0 || q >= 1) continue;
    const rr = lerp(r0, H * 0.4, ease.out(q)), a = Math.pow(1 - q, 1.7) * 0.8, sh = rr * 0.03 * q + 1;
    ctx.lineWidth = 1; ctx.strokeStyle = A_rgba(A_BONE, a * 0.3); ctx.beginPath(); ctx.arc(cx, cy, rr + sh, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = A_rgba(A_RED_DK, a * 0.6); ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, rr - sh), 0, 6.2832); ctx.stroke();
    ctx.lineWidth = lerp(2.6, 1, q); ctx.strokeStyle = A_rgba(A_RED, a); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.stroke();
  }
  ctx.restore();
  A_innerFace(ctx, 1, gx0, smear, W, H, env, 41); A_innerFace(ctx, -1, gx1, smear, W, H, env, 42);
  PR.label(ctx, Math.max(0, 1 - close * 2).toFixed(3) + ' in', W / 2, H * A_READ_Y, C.red, Math.max(10, W * A_READ_S), 'center');
  PR.vignette(ctx, W, H, 0.55); A_grain(ctx, W, H, 0.045, p, 3);
}

// base.js captured fCut/fBreath by reference when it built DRAW and CUTS (only frame 2 is wrapped in a late-bound arrow),
// so the overrides above must be rebound for the harness and the drawAt() pipeline to see them.
DRAW[1] = fCut; DRAW[3] = fBreath;
for (const A_f of CUTS.full) { if (A_f.n === 1) A_f.draw = fCut; if (A_f.n === 3) A_f.draw = fBreath; }
for (const A_f of CUTS.short) { if (A_f.n === 3) A_f.draw = fBreath; }
