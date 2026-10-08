// Module: E-ten-one.js — frames 7 (fTen, 18–22 s) and 8 (fOne, 22–25 s). Overrides tileFace, fTen, fOne.
// A far wall of 40×22 screens, each a different take of the chair shot, switched on in a wave from the point where the
// band strikes; then every take is pulled into the one that survives, which grows into the shot itself.
// Everything else is prefixed E_ because all modules share one global scope. fTen and fOne share one camera clock
// (seconds since 18 s) so the cut between them is seamless.

const E_IMPACT = { x: 0.34, y: 0.47 };                      // where the band hits the wall, as fractions of W, H
const E_N_TAKES = 220;                                      // distinct take renderings in the atlas; flip + exposure vary per tile
const E_SURVIVOR = { i: 21, j: 10 };                        // the take that becomes the shot
const E_FLIGHT = 0.15;                                      // a tile's flight to the survivor, in p of fOne (0.45 s = 13.5 frames)
let E_LAYOUT = null, E_ATLAS = null, E_NOISE = null, E_SCAN = null, E_SURV = null, E_LIVE = null, E_DIG = {};
const E_LIVE_W = 512, E_LIVE_H = 288;                       // the offscreen for the live take while it is still boxed (it is 474 px wide when the lift ends)

// ---------- small helpers ----------
function E_rgb(c, m) { return `rgb(${Math.min(255, c[0] * m) | 0},${Math.min(255, c[1] * m) | 0},${Math.min(255, c[2] * m) | 0})`; }
function E_fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
// the camera push over the whole 7 s: the tile layer moves more than the backdrop, with a touch of x drift
function E_view(W, t) { const e = ease.inOut(clamp(t / 7, 0, 1)); return { zt: 1 + 0.12 * e, zb: 1 + 0.05 * e, dx: -W * 0.006 * e }; }
function E_tileSize(a, W, H) {
  const tw = W / GRID.cols, th = H / GRID.rows; let w, h;
  if (a < 0.42) { w = tw * 0.88; h = w * 9 / 16; } else if (a < 0.57) { w = tw * 0.92; h = w / 2.39; } else if (a < 0.8) { w = h = Math.min(tw, th) * 0.66; } else { h = th * 0.88; w = h * 9 / 16; }
  return [w, h];
}

// ---------- one take, drawn as vectors into a w×h box (height-normalised units) ----------
function E_miniChair(ctx, cx, yb, hc, color, alpha, ghost) {
  // a side-on timber chair: seat, raked back post, two rails, two near legs, a stretcher; far-side legs darker and offset
  const P = [[-0.28, -0.44, 0.58, 0.05], [-0.29, -1.0, 0.045, 0.58], [-0.29, -0.9, 0.24, 0.035], [-0.29, -0.7, 0.24, 0.03], [-0.28, -0.42, 0.045, 0.42], [0.25, -0.42, 0.045, 0.42], [-0.26, -0.2, 0.55, 0.028]];
  ctx.save(); ctx.globalAlpha = alpha;
  const draw = (ox, oy, m) => { ctx.fillStyle = E_rgb(color, m); for (const [x, y, w, h] of P) ctx.fillRect(cx + (x + ox) * hc, yb + (y + oy) * hc, w * hc, h * hc); };
  if (ghost) { for (let g = 3; g >= 1; g--) { ctx.globalAlpha = alpha * 0.12 * (4 - g) / 3; draw(-0.1 * g * ghost, 0, 0.9); } ctx.globalAlpha = alpha; }
  draw(0.075, -0.045, 0.55); draw(0, 0, 1);
  ctx.restore();
}
function tileFace(ctx, x, y, w, h, v, k) {
  const r = PR.rng(k * 7919 + 101);
  const tint = v < 0.34 ? [40, 46, 56] : v < 0.66 ? [52, 44, 34] : v < 0.96 ? [42, 42, 42] : [56, 20, 18];    // cool steel, warm wood, neutral, deep red
  const expo = 0.75 + r() * 0.55, lx = 0.12 + r() * 0.76, floorT = 0.7 + r() * 0.75, chx = 0.26 + r() * 0.5, chs = 0.82 + r() * 0.4, hz = 0.56 + r() * 0.1;
  const ghost = r() < 0.3 ? 0.6 + r() : 0, lit = 0.72 + 0.5 * (1 - Math.abs(lx - chx)) * expo, poolR = 0.6 + r() * 0.5;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); ctx.scale(h, h); const ar = w / h;
  let g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, E_rgb(tint, 0.45 * expo)); g.addColorStop(1, E_rgb(tint, 1.15 * expo)); ctx.fillStyle = g; ctx.fillRect(0, 0, ar, hz);
  g = ctx.createLinearGradient(0, hz, 0, 1); g.addColorStop(0, E_rgb(tint, 1.35 * floorT * expo)); g.addColorStop(1, E_rgb(tint, 0.45 * floorT * expo)); ctx.fillStyle = g; ctx.fillRect(0, hz, ar, 1 - hz);
  g = ctx.createRadialGradient(lx * ar, hz * 0.92, 0, lx * ar, hz * 0.92, poolR); g.addColorStop(0, `rgba(239,233,222,${(0.3 * expo).toFixed(3)})`); g.addColorStop(0.45, `rgba(239,233,222,${(0.09 * expo).toFixed(3)})`); g.addColorStop(1, 'rgba(239,233,222,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, ar, 1);
  ctx.fillStyle = `rgba(239,233,222,${(0.14 * expo).toFixed(3)})`; ctx.fillRect(0, hz, ar, 0.012);
  const hc = 0.3 * chs, cxp = chx * ar, yb = hz + 0.3;
  ctx.save(); ctx.translate(cxp + (cxp - lx * ar) * 0.5, yb + 0.01); ctx.scale(1, 0.22);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, hc * 0.55); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(-hc, -hc, hc * 2, hc * 2); ctx.restore();
  ctx.save(); ctx.translate(0, yb); ctx.scale(1, -0.45); ctx.translate(0, -yb); E_miniChair(ctx, cxp, yb, hc, [201, 162, 107], 0.2 * lit, 0); ctx.restore();
  E_miniChair(ctx, cxp, yb, hc, [201 * lit, 162 * lit, 107 * lit], 1, ghost ? 1 : 0);
  g = ctx.createLinearGradient(0, 0, ar * 0.5, 0.6); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, ar, 1);
  ctx.restore();
}

// ---------- caches: tile layout, take atlas, grain and scanline patterns ----------
function E_layout(W, H) {
  if (E_LAYOUT && E_LAYOUT.W === W && E_LAYOUT.H === H) return E_LAYOUT;
  const { cols, rows } = GRID, tw = W / cols, th = H / rows, ix = E_IMPACT.x * W, iy = E_IMPACT.y * H;
  const scx = (E_SURVIVOR.i + 0.5) * tw, scy = (E_SURVIVOR.j + 0.5) * th, tiles = []; let dmax = 0, dsmax = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i, r = PR.rng(k * 48271 + 11), cx = (i + 0.5) * tw, cy = (j + 0.5) * th;
    const t = { i, j, k, cx, cy, d: Math.hypot(cx - ix, cy - iy), ds: Math.hypot(cx - scx, cy - scy), variant: Math.floor(r() * E_N_TAKES), flip: r() < 0.5, expo: 0.8 + r() * 0.2, jit: r(), ph: r() * 6.283, swirl: 1, h2: r(), survivor: i === E_SURVIVOR.i && j === E_SURVIVOR.j };
    // the tile's initial bearing toward the survivor, folded to ±90° once here so a flat screen never flips over in flight
    t.bear = Math.atan2(scy - t.cy, scx - t.cx); if (t.bear > Math.PI / 2) t.bear -= Math.PI; else if (t.bear < -Math.PI / 2) t.bear += Math.PI;
    tiles.push(t); dmax = Math.max(dmax, t.d); dsmax = Math.max(dsmax, t.ds);
  }
  let tFull = 0, tOne = 0;
  for (const t of tiles) {
    t.tOn = 0.02 + 0.74 * (1 - Math.pow(1 - t.d / dmax, 1 / 1.6)) + 0.035 * t.jit; tFull = Math.max(tFull, t.tOn + 0.015);
    t.t0 = 0.02 + 0.17 * (t.ds / dsmax) + 0.05 * t.h2; if (!t.survivor) tOne = Math.max(tOne, t.t0 + E_FLIGHT);
  }
  const [sw, sh] = E_tileSize(0, W, H);
  E_LAYOUT = { W, H, tw, th, tiles, dmax, ix, iy, tFull, tOne, S: { cx: scx, cy: scy, w: sw, h: sh } }; return E_LAYOUT;
}
function E_atlas(W, H) {
  if (E_ATLAS && E_ATLAS.W === W && E_ATLAS.H === H) return E_ATLAS;
  const cell = Math.ceil(1.5 * Math.max(W / GRID.cols, H / GRID.rows)) + 4, per = Math.floor(4096 / cell);
  const c = document.createElement('canvas'); c.width = per * cell; c.height = Math.ceil(E_N_TAKES / per) * cell; const o = c.getContext('2d');
  const entries = [];
  for (let k = 0; k < E_N_TAKES; k++) {
    const r = PR.rng(k * 10007 + 3), v = r(), a = r(), [w, h] = E_tileSize(a, W, H);
    const sx = (k % per) * cell + 2, sy = Math.floor(k / per) * cell + 2, sw = Math.round(w * 1.5), sh = Math.round(h * 1.5);
    tileFace(o, sx, sy, sw, sh, v, k); entries.push({ sx, sy, sw, sh, w, h });
  }
  E_ATLAS = { W, H, c, entries }; return E_ATLAS;
}
function E_grain(ctx, W, H, amount, frame) {
  if (!E_NOISE) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const o = c.getContext('2d'), im = o.createImageData(256, 256), d = im.data, r = PR.rng(4242);
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() + r() - 1) * 120; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    o.putImageData(im, 0, 0); E_NOISE = c;
  }
  const r = PR.rng(frame * 7 + 1), ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount; ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(E_NOISE, 'repeat'); ctx.fillRect(ox, oy, W, H); ctx.restore();
}
function E_scan(ctx, W, H, alpha) {
  if (alpha <= 0) return;
  if (!E_SCAN) { const c = document.createElement('canvas'); c.width = 1; c.height = 3; const o = c.getContext('2d'); o.fillStyle = 'rgba(0,0,0,0.6)'; o.fillRect(0, 2, 1, 1); E_SCAN = c; }
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(E_SCAN, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------- the wall ----------
function E_backdrop(ctx, W, H, V, front, glowA, L) {
  const pad = W * 0.12;
  ctx.save(); ctx.translate(W / 2 + V.dx * 0.5, H / 2); ctx.scale(V.zb, V.zb); ctx.translate(-W / 2, -H / 2);
  let g = ctx.createLinearGradient(0, -pad, 0, H + pad); g.addColorStop(0, '#0E1012'); g.addColorStop(0.5, '#0A0B0C'); g.addColorStop(1, '#060607'); ctx.fillStyle = g; ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
  if (glowA > 0) { g = ctx.createRadialGradient(L.ix, L.iy, 0, L.ix, L.iy, front * 1.25 + 1); g.addColorStop(0, `rgba(239,233,222,${(0.11 * glowA).toFixed(3)})`); g.addColorStop(0.6, `rgba(239,233,222,${(0.04 * glowA).toFixed(3)})`); g.addColorStop(1, 'rgba(239,233,222,0)'); ctx.fillStyle = g; ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2); }
  ctx.beginPath(); for (let j = 0; j <= GRID.rows; j += 2) { ctx.moveTo(-pad, j * L.th); ctx.lineTo(W + pad, j * L.th); } for (let i = 0; i <= GRID.cols; i += 4) { ctx.moveTo(i * L.tw, -pad); ctx.lineTo(i * L.tw, H + pad); }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = 'rgba(239,233,222,0.03)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function E_dead(ctx, L, A, alpha) {
  // the screens themselves, switched off: dark glass with a hairline top highlight
  ctx.globalAlpha = alpha;
  for (const t of L.tiles) {
    const e = t.survivor ? L.S : A.entries[t.variant], x = t.cx - e.w / 2, y = t.cy - e.h / 2;
    ctx.fillStyle = '#121416'; ctx.fillRect(x, y, e.w, e.h); ctx.fillStyle = 'rgba(239,233,222,0.06)'; ctx.fillRect(x, y, e.w, 1);
  }
  ctx.globalAlpha = 1;
}
function E_blit(ctx, A, t, x, y, w, h, alpha) {
  const e = A.entries[t.variant]; ctx.globalAlpha = alpha;
  if (t.flip) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(A.c, e.sx, e.sy, e.sw, e.sh, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(A.c, e.sx, e.sy, e.sw, e.sh, x, y, w, h);
}
// a tile in flight: one blit stretched back along its velocity (the motion blur) plus a crisper head
function E_blitSmear(ctx, A, t, cx, cy, w, h, ang, trail, turn, alpha) {
  const e = A.entries[t.variant], sx = t.flip ? -1 : 1;
  if (trail > 0.5) {   // the smear follows the true velocity; it trails behind on the -x side of the rotated frame
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(sx, 1); ctx.globalAlpha = alpha * 0.55;
    ctx.drawImage(A.c, e.sx, e.sy, e.sw, e.sh, t.flip ? -w / 2 : -w / 2 - trail, -h / 2, w + trail, h); ctx.restore();
    alpha *= 0.6;
  }
  // the head turns into the airflow as it speeds up, about the bearing fixed at layout (folded there), so it never flips
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.bear * turn); ctx.scale(sx, 1); ctx.globalAlpha = alpha;
  ctx.drawImage(A.c, e.sx, e.sy, e.sw, e.sh, -w / 2, -h / 2, w, h); ctx.restore();
}
// the survivor is always the real shot: fChair at its chosen moment, drawn live into the tile's box (never copied).
// lift (0..1) brightens it to sit among the wall's takes (fChair's room is near-black at 44 px): a 'lighter' pass of the same
// picture (+60%, contrast kept) and a small bone wash, both scaled by lift, so it fades out as the take grows into the real frame.
// The 'lighter' pass needs a source: the 4x cache on the wall, or a small offscreen while the live take is still boxed.
function E_survivorTake(ctx, x, y, w, h, W, H, darken, live, lift) {
  const k = lift > 0 ? 0.6 * lift : 0;
  ctx.save(); ctx.globalAlpha = 1;
  if (!live) {
    if (!E_SURV || E_SURV.W !== W) { const S = E_layout(W, H).S, c = document.createElement('canvas'); c.width = Math.round(S.w * 4); c.height = Math.round(S.h * 4); const o = c.getContext('2d'); E_survivorTake(o, 0, 0, c.width, c.height, W, H, 0, true, 0); E_SURV = { W, c }; }
    ctx.drawImage(E_SURV.c, x, y, w, h);
    if (k > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.drawImage(E_SURV.c, x, y, w, h); }
  } else if (k > 0 && w <= E_LIVE_W && h <= E_LIVE_H) {
    if (!E_LIVE) { E_LIVE = document.createElement('canvas'); E_LIVE.width = E_LIVE_W; E_LIVE.height = E_LIVE_H; }
    const o = E_LIVE.getContext('2d'); o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, E_LIVE_W, E_LIVE_H); o.beginPath(); o.rect(0, 0, w, h); o.clip(); o.scale(w / W, h / H); fChair(o, 0.95, W, H, true); o.restore();
    ctx.drawImage(E_LIVE, 0, 0, w, h, x, y, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.drawImage(E_LIVE, 0, 0, w, h, x, y, w, h);
  } else { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); ctx.scale(w / W, h / H); fChair(ctx, 0.95, W, H, true); }
  ctx.restore();
  if (darken > 0) { ctx.save(); ctx.globalAlpha = darken; ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); ctx.restore(); }
  if (lift > 0) { ctx.save(); ctx.globalAlpha = 0.06 * lift; ctx.fillStyle = C.bone; ctx.fillRect(x, y, w, h); ctx.restore(); }
}
// a screen switching on: a bright line that opens into the picture, an overexposed flash, a dip, a settle; later, rare dips
function E_takeState(t, tsec) {
  const f = (tsec / 4 - t.tOn) * 120; if (f < 0) return null;
  let a = t.expo, flash = 0, band = 1;
  if (f < 1.6) { band = ease.out(f / 1.6); flash = 0.75 * (1 - band); a = 1; }
  else if (f < 3.6) flash = 0.5 * (1 - (f - 1.6) / 2);
  else if (f < 4.6) a *= 1 - 0.35 * (f - 3.6);
  else if (f < 6.6) a *= 0.65 + 0.35 * (f - 4.6) / 2;
  else if (f < 8.6) flash = 0.1 * (1 - (f - 6.6) / 2);
  const dip = clamp((Math.sin(tsec * 7.7 + t.ph) * Math.sin(tsec * 4.3 + t.ph * 1.7) - 0.985) / 0.015, 0, 1); a *= 1 - 0.2 * dip;
  return { a, flash, band };
}
function E_drawTake(ctx, A, L, t, tsec, W, H, baseA) {
  const st = E_takeState(t, tsec); if (!st) return;
  const e = t.survivor ? L.S : A.entries[t.variant], w = e.w, h = e.h, x = t.cx - w / 2, y = t.cy - h / 2;
  if (st.band < 1) {
    const hb = lerp(1, h / 2, st.band); ctx.save(); ctx.beginPath(); ctx.rect(x, t.cy - hb, w, hb * 2); ctx.clip();
    if (t.survivor) E_survivorTake(ctx, x, y, w, h, W, H, 0, false, 1); else E_blit(ctx, A, t, x, y, w, h, baseA);
    ctx.globalAlpha = st.flash * baseA; ctx.fillStyle = C.bone; ctx.fillRect(x, t.cy - hb, w, hb * 2); ctx.restore(); return;
  }
  if (t.survivor) E_survivorTake(ctx, x, y, w, h, W, H, 0, false, 1); else E_blit(ctx, A, t, x, y, w, h, st.a * baseA);   // the hit never dims
  if (st.flash > 0) { ctx.globalAlpha = st.flash * baseA; ctx.fillStyle = C.bone; ctx.fillRect(x, y, w, h); }
}

// ---------- the counter strip ----------
function E_digits(ctx, size) {
  if (!E_DIG[size]) { ctx.save(); PR.numeral(ctx, size, 700); let m = 0; for (let d = 0; d < 10; d++) m = Math.max(m, ctx.measureText(String(d)).width); E_DIG[size] = { cell: m, comma: ctx.measureText(',').width * 1.1 }; ctx.restore(); }
  return E_DIG[size];
}
function E_counter(ctx, n, xr, y, size, color, alpha, scale) {
  const D = E_digits(ctx, size), s = E_fmt(n);
  ctx.save(); PR.numeral(ctx, size, 700); ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.globalAlpha = alpha;
  if (scale && scale !== 1) { ctx.translate(xr, y); ctx.scale(scale, scale); ctx.translate(-xr, -y); }
  let x = xr;
  for (let i = s.length - 1; i >= 0; i--) { const ch = s[i], cw = ch === ',' ? D.comma : D.cell; x -= cw; ctx.fillText(ch, x + cw / 2, y); }
  ctx.restore(); return D;
}
// nf is the count as a float so the label and glow track the numeral's width smoothly; the numeral shows Math.round(nf)
function E_strip(ctx, W, H, nf, frac, alpha, pulse) {
  if (alpha <= 0) return;
  const y0 = H * 0.775, h = H - y0, y = y0 + h * 0.47, size = Math.max(24, Math.round(W * 0.085)), xr = W * 0.955, n = Math.round(nf);
  ctx.save(); ctx.globalAlpha = alpha;
  let g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(8,8,8,0.8)'); g.addColorStop(1, 'rgba(8,8,8,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, h);
  ctx.fillStyle = 'rgba(239,233,222,0.13)'; ctx.fillRect(0, y0, W, 1);
  ctx.restore();
  const D = E_digits(ctx, size), lg = Math.log10(Math.max(1, nf));
  const nw = D.cell * lerp(1, 5, clamp(lg / 4, 0, 1)) + D.comma * clamp(lg - 3, 0, 1);   // the numeral's width, continuous in the count
  if (pulse > 0) PR.glow(ctx, xr - nw / 2, y, H * 0.38, 'rgba(231,39,34,0.75)', 0.85 * pulse * alpha);
  E_counter(ctx, n, xr, y, size, C.red, alpha, 1 + 0.05 * pulse);
  const xl = xr - nw - W * 0.028;
  PR.label(ctx, 'TAKES', xl, y + size * 0.02, C.bone, Math.max(12, Math.round(W * 0.016)), 'right', 0.92 * alpha);
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = C.red; ctx.fillRect(xl - W * 0.055, y0 - 1, (xr - xl + W * 0.055) * clamp(frac, 0, 1), 2); ctx.restore();
}
function E_edgeGlow(ctx, x, y, w, h, spread, rgb, alpha) {
  if (alpha <= 0 || spread <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const side = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(${rgb},0.45)`); g.addColorStop(0.35, `rgba(${rgb},0.14)`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); };
  side(0, y, 0, y - spread, x - spread, y - spread, w + spread * 2, spread);
  side(0, y + h, 0, y + h + spread, x - spread, y + h, w + spread * 2, spread);
  side(x, 0, x - spread, 0, x - spread, y, spread, h);
  side(x + w, 0, x + w + spread, 0, x + w, y, spread, h);
  ctx.restore();
}
function E_title(ctx, parts, cx, y, size, tr, reveal, alpha) {
  ctx.save(); PR.font(ctx, size, 600); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const chars = []; for (const pt of parts) for (const ch of Array.from(pt.text)) chars.push([ch, pt.color]);
  const widths = chars.map(c => ctx.measureText(c[0]).width), total = widths.reduce((a, w) => a + w + tr, -tr), n = chars.length, soft = 5;
  let x = cx - total / 2;
  for (let i = 0; i < n; i++) {
    const a = clamp((reveal * (n + soft) - i) / soft, 0, 1);
    if (a > 0) { ctx.globalAlpha = alpha * a; ctx.fillStyle = chars[i][1]; ctx.fillText(chars[i][0], x, y + (1 - a) * size * 0.1); }
    x += widths[i] + tr;
  }
  ctx.restore();
}

// ---------- frame 7: TEN THOUSAND TAKES ----------
function fTen(ctx, p, W, H) {
  const L = E_layout(W, H), A = E_atlas(W, H), tsec = p * 4, V = E_view(W, tsec), fr = Math.floor(p * 300);
  const front = L.dmax * (1 - Math.pow(1 - clamp((p - 0.02) / 0.74, 0, 1), 1.6));
  let lit = 0; for (const t of L.tiles) lit += clamp((p - t.tOn) / 0.015, 0, 1); lit /= L.tiles.length;
  E_backdrop(ctx, W, H, V, front, lit, L);
  ctx.save(); ctx.translate(W / 2 + V.dx, H / 2); ctx.scale(V.zt, V.zt); ctx.translate(-W / 2, -H / 2);
  E_dead(ctx, L, A, 1);
  for (const t of L.tiles) E_drawTake(ctx, A, L, t, tsec, W, H, 1);
  ctx.globalAlpha = 1;
  const hit = 1 - ease.out(win(p, 0, 0.14));
  if (hit > 0) { const wash = 1 - win(p, 0, 0.06); if (wash > 0) { ctx.save(); ctx.globalAlpha = 0.16 * wash; ctx.fillStyle = C.red; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore(); } PR.glow(ctx, L.ix, L.iy, H * 0.45, 'rgba(231,39,34,0.65)', 0.8 * hit); PR.slash(ctx, L.ix, L.iy, GEO.ang, H * 0.035, H * 0.42 * (0.7 + 0.3 * (1 - hit)), C.red, 0.3 * hit, 0.95 * hit, 2); }
  const ring = (1 - win(p, 0.02, 0.5)) * 0.6;
  if (ring > 0 && front > 1) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.globalAlpha = ring; ctx.beginPath(); ctx.arc(L.ix, L.iy, front, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = ring * 0.35; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(L.ix, L.iy, front * 0.97, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  ctx.restore();
  E_scan(ctx, W, H, 0.5);
  const pulse = p < L.tFull ? 0 : 1 - ease.out(win(p, L.tFull, L.tFull + 0.1));
  const q = win(p, 0.02, L.tFull);                                         // the count roughly tracks the wave but keeps rolling (~55/frame) until it stops dead on 10,000 at tFull
  E_strip(ctx, W, H, 10000 * q * (1.5 - 0.5 * q), q, 1, pulse);
  PR.vignette(ctx, W, H, 0.5); E_grain(ctx, W, H, 0.28, fr);
}

// ---------- frame 8: ONE ----------
function E_flightPos(t, S, u) {
  const e = Math.pow(u, 1.9), dx = S.cx - t.cx, dy = S.cy - t.cy, sw = Math.sin(Math.PI * u) * 0.14 * t.swirl;
  return [t.cx + dx * e - dy * sw, t.cy + dy * e + dx * sw, e];
}
function fOne(ctx, p, W, H) {
  const L = E_layout(W, H), A = E_atlas(W, H), tsec = 4 + p * 3, V = E_view(W, tsec), fr = 300 + Math.floor(p * 300), S = L.S;
  const g = ease.inOut(win(p, 0.54, 0.8)), N = L.tiles.length - 1;
  const sx0 = W / 2 + V.dx + (S.cx - S.w / 2 - W / 2) * V.zt, sy0 = H / 2 + (S.cy - S.h / 2 - H / 2) * V.zt, sw0 = S.w * V.zt, sh0 = S.h * V.zt;
  const rx = lerp(sx0, 0, g), ry = lerp(sy0, 0, g), rw = lerp(sw0, W, g), rh = lerp(sh0, H, g);
  let gone = 0, arrive = 0;
  for (const t of L.tiles) { if (t.survivor) continue; const u = win(p, t.t0, t.t0 + E_FLIGHT); gone += u; arrive += Math.sin(Math.PI * clamp((u - 0.7) / 0.3, 0, 1)); }
  gone /= N; const arr = clamp(arrive / 45, 0, 1);
  if (g < 1) {
    E_backdrop(ctx, W, H, V, L.dmax, 1 - gone, L);
    ctx.save(); ctx.translate(W / 2 + V.dx, H / 2); ctx.scale(V.zt, V.zt); ctx.translate(-W / 2, -H / 2);
    E_dead(ctx, L, A, 1);
    for (const t of L.tiles) {
      if (t.survivor) continue;
      const u = win(p, t.t0, t.t0 + E_FLIGHT), e = A.entries[t.variant];
      if (u <= 0) { E_drawTake(ctx, A, L, t, tsec, W, H, 1); continue; }
      if (u >= 1) continue;
      const [x, y, ee] = E_flightPos(t, S, u), s = 1 - 0.6 * ee, [px, py] = E_flightPos(t, S, Math.max(0, u - 1 / (E_FLIGHT * 90)));   // one frame earlier (0.15 of p = 13.5 frames)
      const vx = x - px, vy = y - py, v = Math.hypot(vx, vy), trail = v * 1.2;                                               // shutter: ~1.2 frames of travel
      E_blitSmear(ctx, A, t, x, y, e.w * s, e.h * s, v > 0.01 ? Math.atan2(vy, vx) : 0, trail, ease.inOut(clamp((v - 1) / 14, 0, 1)), t.expo * Math.pow(1 - ee, 0.7));
    }
    ctx.globalAlpha = 1; ctx.restore();
    E_scan(ctx, W, H, 0.5 * (1 - g));
  }
  // the arrivals light the survivor's edges; then it grows into the frame
  const sel = ease.out(win(p, 0.02, 0.1)) * (1 - win(p, 0.74, 0.8));
  E_edgeGlow(ctx, rx, ry, rw, rh, lerp(26, 140, g) + arr * 30, '231,39,34', 0.5 * arr * (1 - g) + 0.5 * Math.sin(Math.PI * g));
  E_survivorTake(ctx, rx, ry, rw, rh, W, H, 0, g > 0, 1 - win(p, 0.54, 0.64));   // the lift fades as the hit grows into the frame
  if (sel > 0) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.globalAlpha = sel; ctx.strokeRect(rx - 1, ry - 1, rw + 2, rh + 2); ctx.restore(); }
  const pulse = p < L.tOne ? 0 : 1 - ease.out(win(p, L.tOne, L.tOne + 0.1));
  E_strip(ctx, W, H, 1 + 9999 * (1 - gone), 1 - gone, 1 - win(p, 0.54, 0.62), pulse);
  const lift = Math.sin(Math.PI * win(p, 0.76, 0.86)) * 0.08; if (lift > 0) { ctx.save(); ctx.globalAlpha = lift; ctx.fillStyle = C.bone; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  const band = win(p, 0.72, 0.82);
  if (band > 0) { const bg = ctx.createLinearGradient(0, H * 0.6, 0, H); bg.addColorStop(0, 'rgba(11,11,11,0)'); bg.addColorStop(0.45, 'rgba(11,11,11,0.6)'); bg.addColorStop(1, 'rgba(11,11,11,0.94)'); ctx.save(); ctx.globalAlpha = band; ctx.fillStyle = bg; ctx.fillRect(0, H * 0.6, W, H * 0.4); ctx.restore(); }
  const size = Math.max(11, Math.round(W * 0.026)), tr = size * lerp(0.17, 0.3, ease.out(win(p, 0.76, 1)));
  E_title(ctx, [{ text: 'TEN THOUSAND TAKES. ', color: C.bone }, { text: 'ONE HIT.', color: C.red }], W / 2, H * 0.905, size, tr, win(p, 0.76, 0.93), 1);
  PR.vignette(ctx, W, H, 0.35 * (1 - g) + 0.15); E_grain(ctx, W, H, 0.28 - 0.06 * g, fr);
}

// base.js captured fTen and fOne by reference when it built DRAW and CUTS, so the overrides must be rebound.
DRAW[7] = fTen; DRAW[8] = fOne; for (const E_f of CUTS.full) { if (E_f.n === 7) E_f.draw = fTen; if (E_f.n === 8) E_f.draw = fOne; }
