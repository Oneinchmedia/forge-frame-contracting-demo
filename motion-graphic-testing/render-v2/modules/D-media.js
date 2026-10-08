// Module: D-media.js. Frame 6, THROUGH EVERY MEDIUM (13-18 s). Only fMedia overrides base.js; every helper is prefixed D_.
// A dolly right along a studio floor past four media on stands. One-point perspective: the camera's eye line is the horizon hy,
// the panels stand on a floor plane at depth Z0 (world units = screen px at that depth), the far wall sits at 3.2 Z0 so it
// drifts at a third of the panels' speed. Panel faces are painted into offscreen canvases so the glossy floor can mirror them.

const D_RED = '231,39,34', D_BONE = '239,233,222', D_WOOD = '201,162,107', D_STEEL = '140,147,155';
const D_ST = { key: '', pan: [], sm: [], face: null, shade: null, shade2: null, shade3: null, tile: null };
const D_TILE = 256;

function D_rgba(c, a) { return 'rgba(' + c + ',' + (a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(4)) + ')'; }
function D_hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function D_mix(a, b, t) { const A = D_hex(a), B = D_hex(b); t = clamp(t, 0, 1); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
function D_cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function D_ensure(pw, ph) {
  const key = Math.round(pw) + 'x' + Math.round(ph); if (D_ST.key === key) return; D_ST.key = key;
  D_ST.pan = [0, 1, 2].map(() => D_cv(pw, ph)); D_ST.sm = [0, 1, 2].map(() => D_cv(pw / 2, ph / 2)); D_ST.face = D_cv(pw, ph); D_ST.shade = D_cv(pw / 6, ph / 6); D_ST.shade2 = D_cv(pw / 16, ph / 16); D_ST.shade3 = D_cv(pw / 32, ph / 32);
}
// film grain: one deterministic noise tile, drawn as a pattern at a p-driven offset (overlay for texture, a little screen for lift)
function D_tile() {
  if (D_ST.tile) return D_ST.tile;
  const s = D_TILE, cv = D_cv(s, s), c = cv.getContext('2d'), img = c.createImageData(s, s), d = new Uint32Array(img.data.buffer), r = PR.rng(6161);
  const le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1; // pixel packing follows the platform's byte order
  for (let i = 0; i < s * s; i++) { const g = Math.round(128 + (r() + r() - 1) * 104); d[i] = le ? (0xFF000000 | (g << 16) | (g << 8) | g) : ((g << 24) | (g << 16) | (g << 8) | 0xFF); }
  c.putImageData(img, 0, 0); D_ST.tile = cv; return cv;
}
function D_grain(ctx, W, H, amount, p) {
  const r = PR.rng(6000 + Math.floor(p * 300) * 97); const ox = Math.floor(r() * D_TILE), oy = Math.floor(r() * D_TILE);
  ctx.save(); ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(D_tile(), 'repeat');
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount * 2.4; ctx.fillRect(ox, oy, W, H);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = amount * 0.5; ctx.fillRect(ox, oy, W, H);
  ctx.restore();
}
function D_eglow(ctx, cx, cy, rx, ry, col, alpha, op) {
  if (alpha <= 0.002) return;
  ctx.save(); if (op) ctx.globalCompositeOperation = op; ctx.translate(cx, cy); ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, D_rgba(col, alpha)); g.addColorStop(0.35, D_rgba(col, alpha * 0.45)); g.addColorStop(0.7, D_rgba(col, alpha * 0.1)); g.addColorStop(1, D_rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
function D_poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }

// ---------- the slash as a volume of red light: wide bloom, saturated mid band, hot core with a short motion smear ----------
function D_band(ctx, x, cy, W, H, layer) {
  const len = H * 1.7, stops = [[0, 0], [0.12, 0.06], [0.3, 0.32], [0.5, 1], [0.7, 0.32], [0.88, 0.06], [1, 0]];
  const strip = (hw, a, col) => { const g = ctx.createLinearGradient(0, -hw, 0, hw); for (const [t, k] of stops) g.addColorStop(t, D_rgba(col, a * k)); ctx.fillStyle = g; ctx.fillRect(-len, -hw, len * 2, hw * 2); };
  if (layer === 'back') { ctx.save(); ctx.translate(x, cy); ctx.rotate(GEO.ang); ctx.globalCompositeOperation = 'lighter'; strip(W * 0.13, 0.09, D_RED); ctx.restore(); return; }
  ctx.save(); ctx.translate(x, cy); ctx.rotate(GEO.ang); ctx.globalCompositeOperation = 'lighter'; strip(W * 0.08, 0.2, D_RED); strip(W * 0.028, 0.34, D_RED); strip(W * 0.009, 0.3, '255,120,110'); ctx.restore();
  for (let k = 3; k >= 0; k--) { // the core, smeared a few px behind its direction of travel
    const a = k === 0 ? 1 : [0, 0.42, 0.2, 0.08][k];
    ctx.save(); ctx.translate(x - k * 6, cy); ctx.rotate(GEO.ang); ctx.globalAlpha = a;
    ctx.fillStyle = D_rgba(D_RED, 0.9); ctx.fillRect(-len, -1.8 - k * 0.4, len * 2, 3.6 + k * 0.8);
    ctx.fillStyle = 'rgba(255,224,218,0.95)'; ctx.fillRect(-len, -0.7, len * 2, 1.4);
    ctx.restore();
  }
}
// dust hanging in the studio air; a mote lights up when the blade passes through it
function D_dust(ctx, o, camX, waveX, W, H, p) {
  const r = PR.rng(601), nx = -Math.sin(GEO.ang), ny = Math.cos(GEO.ang), bw = W * 0.06;
  ctx.save();
  for (let i = 0; i < 380; i++) {
    const Xw = r() * W * 2.4 - W * 0.7, Y = (r() - 0.55) * H * 1.3, Z = o.Z0 * (0.5 + r() * 2.4), sz = r(), ph0 = r() * 6.283, sp = 0.5 + r();
    const k = o.Z0 / Z;
    const sx = W / 2 + (Xw - camX + Math.sin(p * 4 * sp + ph0) * W * 0.012) * k, sy = o.hy + (Y - p * H * 0.045 * sp + Math.cos(p * 3 * sp + ph0) * H * 0.01) * k;
    if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
    const d = Math.abs((sx - waveX) * nx + (sy - H / 2) * ny), lit = Math.exp(-(d * d) / (bw * bw));
    const a = lit * (0.45 + 0.5 * sz) + 0.05 * sz; if (a < 0.03) continue;
    const t = Math.min(1, lit * 1.4); ctx.fillStyle = 'rgb(' + Math.round(231 + 24 * t) + ',' + Math.round(39 + 170 * t) + ',' + Math.round(34 + 170 * t) + ')';
    ctx.globalAlpha = a; const s = (1.2 + sz * 1.2) * Math.min(1.4, k); ctx.beginPath(); ctx.arc(sx, sy, s / 2, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}

// ---------- panel 0: a photograph on foam board. The still comes alive: colour returns, the sun arcs, clouds drift, a lens flares ----------
function D_photo(g, w, h, tf, p, live) {
  const te = ease.inOut(tf); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.fillStyle = '#D6CFC1'; g.fillRect(0, 0, w, h);
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, 'rgba(255,255,255,0.09)'); bg.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const ix = w * 0.07, iy = h * 0.06, iw = w * 0.86, ih = h * 0.72;
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(ix + 1.5, iy + 2.5, iw, ih);
  g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip(); g.translate(ix, iy);
  const sky = g.createLinearGradient(0, 0, 0, ih); sky.addColorStop(0, '#171B21'); sky.addColorStop(0.5, '#3E444B'); sky.addColorStop(0.78, '#7E6A4E'); sky.addColorStop(1, '#C9A26B'); g.fillStyle = sky; g.fillRect(0, 0, iw, ih);
  // the sun on its arc
  const u = 0.12 + 0.66 * te + 0.08 * p * tf, a = Math.PI * (1 - u), sx = iw * 0.5 + Math.cos(a) * iw * 0.42, sy = ih * 0.8 - Math.sin(a) * ih * 0.58, sr = iw * 0.05;
  D_eglow(g, sx, sy, iw * 0.42, iw * 0.42, D_WOOD, 0.55);
  D_eglow(g, sx, sy, sr * 2.4, sr * 2.4, D_BONE, 0.6);
  g.fillStyle = '#F6F1E6'; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
  // clouds: three banks, lit from the sun side, drifting once the picture is alive
  const cr = PR.rng(77);
  for (let c = 0; c < 3; c++) {
    const bx = iw * (0.12 + c * 0.33) + iw * 0.16 * te + iw * 0.12 * p * tf, by = ih * (0.14 + c * 0.11), n = 3 + (c % 2);
    for (let e = 0; e < n; e++) { const ex = bx + (e - n / 2) * iw * 0.07 + cr() * iw * 0.02, ey = by + (cr() - 0.5) * ih * 0.03, rx = iw * (0.06 + cr() * 0.05), ry = ih * (0.016 + cr() * 0.014); D_eglow(g, ex, ey, rx * 1.3, ry * 1.5, D_BONE, 0.3 + cr() * 0.25); }
  }
  // ridges: a far one in haze, a near one in silhouette
  g.fillStyle = '#4A4E54'; g.beginPath(); g.moveTo(0, ih * 0.68); g.lineTo(iw * 0.18, ih * 0.5); g.lineTo(iw * 0.36, ih * 0.6); g.lineTo(iw * 0.55, ih * 0.44); g.lineTo(iw * 0.78, ih * 0.58); g.lineTo(iw, ih * 0.5); g.lineTo(iw, ih); g.lineTo(0, ih); g.closePath(); g.fill();
  g.fillStyle = '#1C1F23'; g.beginPath(); g.moveTo(0, ih * 0.82); g.lineTo(iw * 0.3, ih * 0.52); g.lineTo(iw * 0.5, ih * 0.68); g.lineTo(iw * 0.72, ih * 0.46); g.lineTo(iw, ih * 0.8); g.lineTo(iw, ih); g.lineTo(0, ih); g.closePath(); g.fill();
  // lens flare along the sun to centre line
  if (te > 0.01) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const vx = iw / 2 - sx, vy = ih / 2 - sy;
    for (const [t, rr, al, col] of [[0.3, 0.03, 0.14, D_BONE], [0.62, 0.05, 0.1, D_RED], [0.95, 0.025, 0.16, D_BONE], [1.35, 0.07, 0.08, D_BONE], [1.7, 0.04, 0.1, D_RED]]) { g.fillStyle = D_rgba(col, al * te); g.beginPath(); g.arc(sx + vx * t, sy + vy * t, iw * rr, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = D_rgba(D_RED, 0.22 * te); g.lineWidth = 1.5; g.beginPath(); g.arc(sx + vx * 1.1, sy + vy * 1.1, iw * 0.11, 0, Math.PI * 2); g.stroke();
    const st = g.createLinearGradient(sx - iw * 0.6, 0, sx + iw * 0.6, 0); st.addColorStop(0, D_rgba(D_BONE, 0)); st.addColorStop(0.5, D_rgba(D_BONE, 0.7 * te)); st.addColorStop(1, D_rgba(D_BONE, 0));
    g.fillStyle = st; g.fillRect(sx - iw * 0.6, sy - 0.8, iw * 1.2, 1.6); g.globalAlpha = 0.35; g.fillRect(sx - iw * 0.6, sy - 5, iw * 1.2, 10);
    g.restore();
  }
  // the still: desaturated and faded; colour comes back with te
  if (te < 0.999) {
    g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = 1 - te; g.fillStyle = '#808080'; g.fillRect(0, 0, iw, ih);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.3 * (1 - te); g.fillStyle = '#9A9A95'; g.fillRect(0, 0, iw, ih); g.restore();
  }
  // viewfinder brackets as it becomes a live picture
  if (te > 0.01) {
    g.strokeStyle = D_rgba(D_BONE, 0.85 * te); g.lineWidth = 1.5; const m = iw * 0.05, L = iw * 0.06; g.beginPath();
    for (const [cx, cy, dx, dy] of [[m, m, 1, 1], [iw - m, m, -1, 1], [m, ih - m, 1, -1], [iw - m, ih - m, -1, -1]]) { g.moveTo(cx, cy + dy * L); g.lineTo(cx, cy); g.lineTo(cx + dx * L, cy); }
    g.stroke();
  }
  g.restore();
  const rec = win(tf, 0.35, 0.8); // tiny REC dot: lit the moment it appears, then blinking on the live clock
  if (rec > 0) { const on = Math.floor(live * 5) % 2 === 0 ? 1 : 0.25; g.fillStyle = D_rgba(D_RED, rec * on); g.beginPath(); g.arc(w * 0.1, h * 0.885, Math.max(2.5, w * 0.009), 0, Math.PI * 2); g.fill(); PR.label(g, 'REC', w * 0.13, h * 0.885, '#4A453C', Math.max(13, w * 0.036), 'left', rec * 0.9); }
}

// ---------- panel 1: a flat vinyl wordmark on a dark wall panel lifts into extruded metal with a specular sweep ----------
function D_word(g, w, h, tf, p) {
  const te = ease.inOut(tf); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.fillStyle = '#16181B'; g.fillRect(0, 0, w, h);
  const pg = g.createRadialGradient(w * 0.3, h * 0.15, 0, w * 0.3, h * 0.15, w * 1.2); pg.addColorStop(0, 'rgba(255,255,255,0.075)'); pg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = pg; g.fillRect(0, 0, w, h);
  const sz = w * 0.115, y1 = h * 0.45, y2 = h * 0.6, lift = te * h * 0.045, D = te * sz * 0.3, dx = 0.5, dy = 0.87, N = 12;
  const o1 = { weight: 600 }, o2 = { weight: 500 };
  // lifted shadow: a soft dark halo well below the type with no readable letter edges (three chained downscales, one upscale)
  if (te > 0.01) {
    const sc = D_ST.shade, c6 = sc.getContext('2d'), k = sc.width / w; c6.clearRect(0, 0, sc.width, sc.height); c6.save(); c6.scale(k, k); PR.title(c6, 'ONE INCH', w / 2, y1, sz, '#000', o1); PR.title(c6, 'MEDIA', w / 2, y2, sz * 0.72, '#000', o2); c6.restore();
    const s2 = D_ST.shade2, c16 = s2.getContext('2d'); c16.clearRect(0, 0, s2.width, s2.height); c16.drawImage(sc, 0, 0, s2.width, s2.height);
    const s3 = D_ST.shade3, c32 = s3.getContext('2d'); c32.clearRect(0, 0, s3.width, s3.height); c32.drawImage(s2, 0, 0, s3.width, s3.height);
    g.save(); g.translate(te * sz * 0.3, lift * 1.8 + te * sz * 0.3); g.globalAlpha = 0.46 * te; g.drawImage(s3, -4, -4, w + 8, h + 8); g.restore();
  }
  // extrusion, darkest at the back, stepping toward the face
  if (D > 0.2) for (let k = N; k >= 1; k--) { const t = k / N, ox = t * D * dx, oy = t * D * dy; PR.title(g, 'ONE INCH', w / 2 + ox, y1 - lift + oy, sz, D_mix('#B4BBC2', '#363B41', t), o1); PR.title(g, 'MEDIA', w / 2 + ox, y2 - lift + oy, sz * 0.72, D_mix('#A8231E', '#3A0E0C', t), o2); }
  // the faces: bone and red, flat vinyl at rest, brushed metal when lifted; the specular is masked to the glyphs
  const f = D_ST.face, fc = f.getContext('2d'); fc.clearRect(0, 0, f.width, f.height);
  const m1 = fc.createLinearGradient(0, y1 - lift - sz * 0.5, 0, y1 - lift + sz * 0.5); m1.addColorStop(0, D_mix(C.bone, '#FFFFFA', te)); m1.addColorStop(0.46, C.bone); m1.addColorStop(0.54, D_mix(C.bone, '#C4BCAE', te)); m1.addColorStop(1, D_mix(C.bone, '#A69D8F', te));
  const m2 = fc.createLinearGradient(0, y2 - lift - sz * 0.36, 0, y2 - lift + sz * 0.36); m2.addColorStop(0, D_mix(C.red, '#FF6B62', te)); m2.addColorStop(0.46, C.red); m2.addColorStop(0.54, D_mix(C.red, '#B81E1A', te)); m2.addColorStop(1, D_mix(C.red, '#8E1512', te));
  PR.title(fc, 'ONE INCH', w / 2, y1 - lift, sz, m1, o1); PR.title(fc, 'MEDIA', w / 2, y2 - lift, sz * 0.72, m2, o2);
  if (te > 0.01) {
    fc.save(); fc.globalCompositeOperation = 'source-atop';
    const pos = lerp(-w * 0.55, w * 1.55, ease.inOut(win(tf, 0.22, 1))); fc.translate(pos, h / 2); fc.rotate(GEO.ang);
    const sg = fc.createLinearGradient(-w * 0.12, 0, w * 0.12, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * te).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    fc.fillStyle = sg; fc.fillRect(-w * 0.12, -h, w * 0.24, h * 2);
    const sg2 = fc.createLinearGradient(-w * 0.4, 0, w * 0.4, 0); sg2.addColorStop(0, 'rgba(255,255,255,0)'); sg2.addColorStop(0.5, 'rgba(255,255,255,' + (0.18 * te).toFixed(3) + ')'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
    fc.fillStyle = sg2; fc.fillRect(-w * 0.4, -h, w * 0.8, h * 2); fc.restore();
  }
  g.save(); g.globalAlpha = lerp(0.62, 1, te); g.drawImage(f, 0, 0); g.restore();
}

// ---------- panel 2: a printed page. Its lines lift off as soft floating fragments while a live waveform plays beneath ----------
function D_page(g, w, h, tf, p, live) {
  const te = ease.inOut(tf); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.fillStyle = '#EFE9DE'; g.fillRect(0, 0, w, h);
  const pg = g.createLinearGradient(0, 0, w, h); pg.addColorStop(0, 'rgba(255,255,255,0.25)'); pg.addColorStop(1, 'rgba(0,0,0,0.06)'); g.fillStyle = pg; g.fillRect(0, 0, w, h);
  const r = PR.rng(303), r2 = PR.rng(304), frags = []; // r lays the page out; r2 gives each fragment its own drift, so the layout is untouched
  const addLine = (y, x0, wid, th, parts) => { let x = x0; const cuts = parts === 1 ? [1] : parts === 2 ? [0.42, 0.58] : [0.3, 0.34, 0.36]; for (const c of cuts) { const fw = wid * c - w * 0.018; const lifts = r() < 0.62; frags.push({ x, y, w: fw, h: th, lifts, a: (x / w) * 0.3 + r() * 0.3, rise: h * (0.05 + r() * 0.1), dx: (r() - 0.5) * w * 0.07, sc: 1 + r() * 0.12, ph: r2() * 6.2832, vy: 0.5 + r2() }); x += wid * c; } };
  addLine(h * 0.1, w * 0.12, w * 0.5, h * 0.03, 1); addLine(h * 0.155, w * 0.12, w * 0.3, h * 0.013, 1);
  const widths = [0.76, 0.72, 0.74, 0.6, 0.75, 0.7, 0.73, 0.5, 0.74, 0.71, 0.66, 0.4];
  for (let i = 0; i < 12; i++) addLine(h * 0.235 + i * h * 0.042, w * 0.12, w * widths[i], h * 0.012, i % 3 === 0 ? 3 : 2);
  // shadows on the page first, then the fragments
  const drift = f => [Math.sin(live * 5 + f.ph) * w * 0.006, -live * h * 0.035 * f.vy]; // a slow float once the blade has passed, scaled by lf so late lifters do not pop
  for (const f of frags) { const lf = f.lifts ? ease.out(win(te, f.a, f.a + 0.4)) : 0; if (lf <= 0) continue; const b = lf * 5 * (1 + 0.6 * live), ox = f.x + lf * (f.dx * 0.5 + 5 + drift(f)[0] * 0.5), oy = f.y + lf * h * 0.028; for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(40,36,30,' + (0.06 * lf * (1 - 0.3 * live)).toFixed(3) + ')'; g.fillRect(ox - b * k, oy - b * k * 0.6, f.w + b * k * 2, f.h + b * k * 1.2); } }
  for (const f of frags) {
    const lf = f.lifts ? ease.out(win(te, f.a, f.a + 0.4)) : 0;
    if (lf <= 0) { g.fillStyle = 'rgba(42,40,36,0.9)'; g.fillRect(f.x, f.y, f.w, f.h); continue; }
    const [ddx, ddy] = drift(f), sc = 1 + (f.sc - 1) * lf, cx = f.x + f.w / 2 + lf * (f.dx + ddx), cy = f.y + f.h / 2 - lf * f.rise + lf * ddy, fw = f.w * sc, fh = f.h * sc;
    const al = 0.9 * (1 - 0.35 * lf) * (1 - 0.25 * live), b = lf * 3 * (1 + 0.5 * live); // a soft edge stands in for blur: five nested slabs
    for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(42,40,36,' + (al * [0.4, 0.22, 0.16, 0.12, 0.08][k]).toFixed(3) + ')'; const e = b * (k - 1.5) * 0.5; g.fillRect(cx - fw / 2 - e, cy - fh / 2 - e * 0.7, fw + 2 * e, fh + 1.4 * e); }
  }
  // the waveform
  if (te > 0.005) {
    const x0 = w * 0.1, x1 = w * 0.9, yc = h * 0.86, A = h * 0.065 * te, ph = p * 58; const n = 96; const ys = [];
    for (let i = 0; i <= n; i++) { const t = i / n, env = Math.pow(Math.sin(Math.PI * t), 0.6); const s = Math.sin(t * 31 + ph) * 0.5 + Math.sin(t * 73 - ph * 1.7) * 0.3 + Math.sin(t * 157 + ph * 2.3) * 0.2; ys.push(A * env * (0.18 + 0.82 * Math.abs(s))); }
    g.save(); g.beginPath(); for (let i = 0; i <= n; i++) g.lineTo(x0 + (x1 - x0) * i / n, yc - ys[i]); for (let i = n; i >= 0; i--) g.lineTo(x0 + (x1 - x0) * i / n, yc + ys[i]); g.closePath();
    g.fillStyle = D_rgba(D_RED, 0.3 * te); g.fill(); g.strokeStyle = D_rgba(D_RED, 0.9 * te); g.lineWidth = 1.2; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = D_rgba(D_RED, 0.5 * te); g.fillRect(x0, yc - 0.5, x1 - x0, 1);
    const px = lerp(x0, x1, live); g.fillStyle = D_rgba('42,40,36', 0.8 * te); g.fillRect(px - 0.75, yc - A - h * 0.02, 1.5, A * 2 + h * 0.04);
    g.restore();
  }
}

// ---------- the model: a cube on a glossy plinth, wireframe at rest, shaded solid once the blade has passed ----------
function D_cubeGeom(cX, cY, cZ, s, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), h = s / 2;
  const rot = (x, y, z) => { const x1 = x * cy - z * sy, z1 = x * sy + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; }; // yaw about Y, then pitch about X
  const V = []; for (let i = 0; i < 8; i++) { const r = rot(i & 1 ? h : -h, i & 2 ? h : -h, i & 4 ? h : -h); V.push([cX + r[0], cY + r[1], cZ + r[2]]); }
  const F = [[0, 2, 3, 1, [0, 0, -1]], [5, 7, 6, 4, [0, 0, 1]], [4, 6, 2, 0, [-1, 0, 0]], [1, 3, 7, 5, [1, 0, 0]], [0, 1, 5, 4, [0, -1, 0]], [2, 6, 7, 3, [0, 1, 0]]];
  return { V, cz: cZ, s, faces: F.map(([a, b, c, d, n]) => ({ idx: [a, b, c, d], n: rot(n[0], n[1], n[2]), z: (V[a][2] + V[b][2] + V[c][2] + V[d][2]) / 4 })) };
}
// wireA: the red wire; solidA: the shaded faces; lightX: which side the blade is on; bandStr: how strongly it lights the model;
// mirrorY: draw the model mirrored in a horizontal plane at that Y (for the gloss of the plinth top); squash compresses that mirror image
// toward the plane, the way a brushed gloss smears a reflection, so it lands on a top seen at a grazing angle
function D_drawCube(ctx, o, geo, wireA, solidA, lightX, bandStr, mirrorY, squash) {
  const proj = v => { const Y = mirrorY == null ? v[1] : mirrorY + (mirrorY - v[1]) * (squash || 1); const k = o.Z0 / v[2]; return [o.W / 2 + v[0] * k, o.hy + Y * k]; };
  const P = geo.V.map(proj);
  const L = [-0.42, -0.78, -0.46], Ll = Math.hypot(...L); for (let i = 0; i < 3; i++) L[i] /= Ll;
  const Lb = [lightX, -0.35, -0.3], Lbl = Math.hypot(...Lb); for (let i = 0; i < 3; i++) Lb[i] /= Lbl;
  const Hv = [L[0], L[1], L[2] - 1], Hl = Math.hypot(...Hv);
  const order = geo.faces.slice().sort((a, b) => b.z - a.z);
  const facing = q => { const area = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]); return (mirrorY == null ? area : -area) < 0; };
  if (solidA > 0.003) for (const f of order) {
    const q = f.idx.map(i => P[i]); if (!facing(q)) continue;
    const n = mirrorY == null ? f.n : [f.n[0], -f.n[1], f.n[2]];
    const dk = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), db = Math.max(0, n[0] * Lb[0] + n[1] * Lb[1] + n[2] * Lb[2]);
    const spec = Math.pow(Math.max(0, (n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]) / Hl), 24) * 0.6;
    const sh = 0.3 + 0.7 * dk; const R = Math.min(255, 140 * sh + 239 * spec + 231 * db * bandStr), G = Math.min(255, 147 * sh + 233 * spec + 39 * db * bandStr), B = Math.min(255, 155 * sh + 222 * spec + 34 * db * bandStr);
    ctx.fillStyle = 'rgba(' + Math.round(R) + ',' + Math.round(G) + ',' + Math.round(B) + ',' + solidA.toFixed(3) + ')'; D_poly(ctx, q); ctx.fill();
    let y0 = Infinity, y1 = -Infinity; for (const v of q) { y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); }
    if (y1 - y0 > 2) { const gg = ctx.createLinearGradient(0, y0, 0, y1); gg.addColorStop(0, 'rgba(255,255,255,' + (0.08 * solidA).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(0,0,0,' + (0.28 * solidA).toFixed(3) + ')'); ctx.fillStyle = gg; ctx.fill(); }
  }
  if (wireA > 0.003) {
    const E = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (const [a, b] of E) { const depth = (geo.V[a][2] + geo.V[b][2]) / 2, back = clamp((depth - geo.cz) / (geo.s * 0.9) + 0.5, 0, 1); ctx.strokeStyle = D_rgba(D_RED, wireA * (1 - 0.6 * back)); ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); ctx.stroke(); }
  }
  if (solidA > 0.003) { ctx.strokeStyle = D_rgba(D_BONE, 0.2 * solidA); ctx.lineWidth = 1; ctx.lineJoin = 'round'; for (const f of order) { const q = f.idx.map(i => P[i]); if (!facing(q)) continue; D_poly(ctx, q); ctx.stroke(); } }
}

function fMedia(ctx, p, W, H) {
  // ---- camera and world ----
  const hy = H * 0.44, E = H * 0.3, fy = hy + E, Z0 = 1200, ZW = Z0 * 3.2, o = { W, hy, Z0 };
  const pw = Math.round(W * 0.2), ph = Math.round(H * 0.42), dT = 30, gap = W * 0.32, left0 = W * 0.15; // integral, so the offscreen painters cover every row
  const dollyOf = q => W * 0.47 * (q - 0.03 * Math.sin(Math.PI * 2 * q)), dolly = dollyOf(p), camX = W / 2 + dolly;
  const waveOf = q => lerp(-W * 0.32, W * 1.36, q), waveX = waveOf(p);
  const midY = fy - ph * 0.5, tanK = Math.cos(GEO.ang) / Math.sin(GEO.ang); // along the blade, x per y
  const crossOf = (q, y) => waveOf(q) + (y - H / 2) * tanK;
  const centreOf = (i, q) => left0 + i * gap + pw / 2 - dollyOf(q);
  const tfOf = (i, q) => clamp((crossOf(q, midY) - centreOf(i, q)) / (pw * 0.7) + 0.5, 0, 1);
  const pc = [0, 1, 2, 3].map(i => { let a = 0, b = 1; for (let k = 0; k < 28; k++) { const m = (a + b) / 2; if (tfOf(i, m) < 0.5) a = m; else b = m; } return (a + b) / 2; });
  D_ensure(pw, ph);
  const zoom = lerp(1, 1.035, p);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);

  // ---- far wall (parallax at Z0/ZW) and floor ----
  const wallBase = hy + E * Z0 / ZW, kW = Z0 / ZW;
  const wall = ctx.createLinearGradient(0, 0, 0, wallBase); wall.addColorStop(0, '#0E0F10'); wall.addColorStop(0.7, '#1A1C1E'); wall.addColorStop(1, '#232527'); ctx.fillStyle = wall; ctx.fillRect(-W * 0.05, -H * 0.05, W * 1.1, wallBase + H * 0.05);
  const key = ctx.createRadialGradient(W * 0.46, -H * 0.1, 0, W * 0.46, -H * 0.1, W * 0.75); key.addColorStop(0, D_rgba(D_BONE, 0.11)); key.addColorStop(1, D_rgba(D_BONE, 0)); ctx.fillStyle = key; ctx.fillRect(-W * 0.05, -H * 0.05, W * 1.1, wallBase + H * 0.05);
  ctx.save(); ctx.fillStyle = D_rgba(D_BONE, 0.065);
  for (let k = -2; k < 8; k++) { const x = W / 2 + (k * W * 0.96 - dolly) * kW; ctx.fillRect(x, 0, 1, wallBase); } ctx.restore();
  const floor = ctx.createLinearGradient(0, wallBase, 0, H); floor.addColorStop(0, '#2A2D31'); floor.addColorStop(0.35, '#1E2024'); floor.addColorStop(1, '#0E0F11'); ctx.fillStyle = floor; ctx.fillRect(-W * 0.05, wallBase, W * 1.1, H * 1.05 - wallBase);
  ctx.save(); ctx.fillStyle = D_rgba(D_BONE, 0.12); ctx.fillRect(-W * 0.05, wallBase, W * 1.1, 1); ctx.restore();
  const ao = ctx.createLinearGradient(0, wallBase, 0, wallBase + H * 0.05); ao.addColorStop(0, 'rgba(0,0,0,0.35)'); ao.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ao; ctx.fillRect(-W * 0.05, wallBase, W * 1.1, H * 0.05);
  // floor tape marks at two depths give the floor its parallax
  ctx.save(); ctx.fillStyle = D_rgba(D_BONE, 0.2); ctx.globalAlpha = 0.8;
  for (let i = -1; i < 6; i++) { const x = left0 + i * gap - pw * 0.08 - dolly, y = fy + 6; ctx.fillRect(x - 10, y, 20, 2); ctx.fillRect(x - 1, y, 2, 10); }
  ctx.restore();
  const floorCol = t => D_mix(t < 0.35 ? '#2A2D31' : '#1E2024', t < 0.35 ? '#1E2024' : '#0E0F11', t < 0.35 ? t / 0.35 : (t - 0.35) / 0.65);
  const floorFade = ctx.createLinearGradient(0, fy, 0, fy + ph); const fT = y => clamp((y - wallBase) / (H - wallBase), 0, 1);
  for (const [t, a] of [[0, 0], [0.25, 0.3], [0.5, 0.62], [0.75, 0.88], [1, 1]]) floorFade.addColorStop(t, floorCol(fT(fy + ph * t)).replace('rgb(', 'rgba(').replace(')', ',' + a + ')'));

  D_band(ctx, waveX, H / 2, W, H, 'back');

  // ---- the four stands ----
  const proj = (X, Y, Z) => { const k = Z0 / Z; return [W / 2 + X * k, hy + Y * k]; };
  const bandAt = y => waveX + (y - H / 2) * tanK;
  // painted back to front by distance from the camera axis: side faces recede toward the vanishing point, so the stand farther from centre goes first
  const order = [0, 1, 2, 3].sort((a, b) => Math.abs(left0 + b * gap + pw / 2 - camX) - Math.abs(left0 + a * gap + pw / 2 - camX));
  for (const i of order) {
    const tf = tfOf(i, p), live = win(p, pc[i], 1), XL = left0 + i * gap - camX, XR = XL + pw, cxs = W / 2 + XL + pw / 2;
    const prox = Math.exp(-Math.pow((bandAt(midY) - cxs) / (W * 0.3), 2)), side = bandAt(midY) > cxs ? 1 : -1;
    if (i < 3) {
      if (cxs < -pw || cxs > W + pw) continue;
      const g = D_ST.pan[i].getContext('2d');
      if (i === 0) D_photo(g, pw, ph, tf, p, live); else if (i === 1) D_word(g, pw, ph, tf, p); else D_page(g, pw, ph, tf, p, live);
      // the blade's light on the face: a red wash from its side, strongest as it arrives
      if (prox > 0.01) { const lg = g.createLinearGradient(side > 0 ? pw : 0, 0, side > 0 ? 0 : pw, 0); lg.addColorStop(0, D_rgba(D_RED, 0.26 * prox)); lg.addColorStop(1, D_rgba(D_RED, 0.03 * prox)); g.fillStyle = lg; g.fillRect(0, 0, pw, ph); }
      const vg = g.createLinearGradient(0, 0, 0, ph); vg.addColorStop(0, 'rgba(255,255,255,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.14)'); g.fillStyle = vg; g.fillRect(0, 0, pw, ph);
      const yt = E - ph, x0 = W / 2 + XL, y0 = fy - ph;
      // contact shadow on the floor
      const cs = ctx.createLinearGradient(0, fy - 3, 0, fy + H * 0.035); cs.addColorStop(0, 'rgba(0,0,0,0.55)'); cs.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = cs; ctx.fillRect(x0 - 14, fy - 3, pw + 28, H * 0.035);
      // floor reflection: the face flipped, softened through a half-size pass, sinking into the floor with distance
      const sm = D_ST.sm[i], smc = sm.getContext('2d'); smc.drawImage(D_ST.pan[i], 0, 0, sm.width, sm.height);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, fy, pw, ph); ctx.clip(); ctx.globalAlpha = 0.5; ctx.translate(x0, fy + ph); ctx.scale(1, -1); ctx.drawImage(sm, 0, 0, pw, ph); ctx.restore();
      ctx.fillStyle = floorFade; ctx.fillRect(x0, fy, pw, ph);
      // thickness: the side face that turns toward the camera, and its mirror
      const sx = XL > 0 ? XL : XR < 0 ? XR : null, sideCol = i === 2 ? '#B8B1A4' : i === 0 ? '#A8A194' : '#1E2125'; // only the side that actually turns toward the camera
      if (sx != null && Math.abs(sx) > 2) {
        const q = [proj(sx, yt, Z0), proj(sx, E, Z0), proj(sx, E, Z0 + dT), proj(sx, yt, Z0 + dT)];
        const sg = ctx.createLinearGradient(0, y0, 0, fy); sg.addColorStop(0, D_mix(sideCol, '#FFFFFF', 0.12)); sg.addColorStop(1, D_mix(sideCol, '#000000', 0.18)); ctx.fillStyle = sg; D_poly(ctx, q); ctx.fill();
        const qm = [proj(sx, E, Z0), proj(sx, 2 * E - yt, Z0), proj(sx, 2 * E - yt, Z0 + dT), proj(sx, E, Z0 + dT)]; ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = sideCol; D_poly(ctx, qm); ctx.fill(); ctx.restore();
      }
      ctx.drawImage(D_ST.pan[i], x0, y0);
      // crisp edges and the blade's rake across the frame
      const flash = Math.exp(-Math.pow((bandAt(midY) - cxs) / (pw * 0.5), 2));
      ctx.save(); ctx.strokeStyle = D_rgba(D_BONE, 0.14 + 0.5 * flash); ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, pw - 1, ph - 1); ctx.restore();
    } else {
      // the plinth and the model hovering over its glossy top
      const bw = W * 0.15, PL = XL + (pw - bw) / 2, PRr = PL + bw, hP = E * 0.42, Yt = E - hP, dP = Z0 * 0.32, pcx = PL + bw / 2;
      if (W / 2 + pcx < -bw * 2 || W / 2 + pcx > W + bw * 2) continue;
      const te = ease.inOut(tf), s = H * 0.16, hover = H * 0.018 + H * 0.018 * ease.outBack(win(tf, 0.25, 1)) + H * 0.005 * Math.sin(p * 9);
      const cZ = Z0 + dP * 0.5, yaw = 0.4 + p * 1.6 + te * 0.7, pitch = 0.5, cY = Yt - s * 0.8 - hover;
      const geo = D_cubeGeom(pcx, cY, cZ, s, yaw, pitch);
      const cxsP = W / 2 + pcx * Z0 / cZ, cys = hy + cY * Z0 / cZ, bandStr = 0.9 * Math.exp(-Math.pow((bandAt(cys) - cxsP) / (W * 0.28), 2)), lightX = bandAt(cys) > cxsP ? 0.9 : -0.9;
      // floor reflection of the plinth, then its contact shadow
      const fr = ctx.createLinearGradient(0, fy, 0, fy + hP); fr.addColorStop(0, 'rgba(62,66,72,0.45)'); fr.addColorStop(1, 'rgba(40,43,48,0)'); ctx.fillStyle = fr; ctx.fillRect(W / 2 + PL, fy, bw, hP);
      const psx = PL > 0 ? PL : PRr < 0 ? PRr : null, sideOn = psx != null && Math.abs(psx) > 2;
      if (sideOn) { const qm = [proj(psx, E, Z0), proj(psx, E + hP, Z0), proj(psx, E + hP, Z0 + dP), proj(psx, E, Z0 + dP)]; ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#2A2D31'; D_poly(ctx, qm); ctx.fill(); ctx.restore(); }
      const cs = ctx.createLinearGradient(0, fy - 3, 0, fy + H * 0.04); cs.addColorStop(0, 'rgba(0,0,0,0.6)'); cs.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = cs; ctx.fillRect(W / 2 + PL - 16, fy - 3, bw + 32, H * 0.04);
      // the block: side, front, glossy top
      if (sideOn) { const q = [proj(psx, Yt, Z0), proj(psx, E, Z0), proj(psx, E, Z0 + dP), proj(psx, Yt, Z0 + dP)]; const sg = ctx.createLinearGradient(0, hy + Yt, 0, fy); sg.addColorStop(0, '#1C1F22'); sg.addColorStop(1, '#0F1113'); ctx.fillStyle = sg; D_poly(ctx, q); ctx.fill(); }
      const ff = ctx.createLinearGradient(0, hy + Yt, 0, fy); ff.addColorStop(0, '#2E3236'); ff.addColorStop(1, '#141618'); ctx.fillStyle = ff; ctx.fillRect(W / 2 + PL, hy + Yt, bw, hP);
      if (prox > 0.01) { const lg = ctx.createLinearGradient(side > 0 ? W / 2 + PRr : W / 2 + PL, 0, side > 0 ? W / 2 + PL : W / 2 + PRr, 0); lg.addColorStop(0, D_rgba(D_RED, 0.2 * prox)); lg.addColorStop(1, D_rgba(D_RED, 0)); ctx.fillStyle = lg; ctx.fillRect(W / 2 + PL, hy + Yt, bw, hP); }
      const top = [proj(PL, Yt, Z0), proj(PRr, Yt, Z0), proj(PRr, Yt, Z0 + dP), proj(PL, Yt, Z0 + dP)];
      const tg = ctx.createLinearGradient(0, top[0][1], 0, top[2][1]); tg.addColorStop(0, '#42474E'); tg.addColorStop(1, '#23272B'); ctx.fillStyle = tg; D_poly(ctx, top); ctx.fill();
      ctx.save(); D_poly(ctx, top); ctx.clip();
      // the model's mirror image in the gloss, dying with distance from the contact point like the floor reflections; then the blade's light and the soft shadow
      const sp = proj(pcx, Yt, cZ), sk = Z0 / cZ, rx = s * 0.78 * sk * (1 + hover / s), ry = rx * 0.2;
      D_drawCube(ctx, o, geo, 0.3 * (1 - te), 0.55 * te, lightX, bandStr, Yt, 0.3);
      const tA = clamp((sp[1] - top[0][1]) / (top[2][1] - top[0][1]), 0, 1), fg = ctx.createLinearGradient(0, sp[1], 0, top[0][1]);
      fg.addColorStop(0, D_mix('#42474E', '#23272B', tA).replace('rgb(', 'rgba(').replace(')', ',0)')); fg.addColorStop(1, 'rgba(66,71,78,0.85)');
      ctx.fillStyle = fg; ctx.fillRect(top[3][0] - 50, top[2][1] - 2, top[1][0] - top[3][0] + 100, top[0][1] - top[2][1] + 4);
      if (prox > 0.01) { ctx.fillStyle = D_rgba(D_RED, 0.16 * prox); ctx.fillRect(top[3][0] - 50, top[2][1], top[1][0] - top[3][0] + 100, top[0][1] - top[2][1] + 2); }
      D_eglow(ctx, sp[0], sp[1], rx, ry, '0,0,0', 0.55 * (0.3 + 0.7 * te) / (1 + hover / (s * 0.6)));
      ctx.restore();
      ctx.save(); ctx.strokeStyle = D_rgba(D_BONE, 0.25 + 0.45 * Math.exp(-Math.pow((bandAt(hy + Yt) - cxsP) / (bw * 0.6), 2))); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1] + 0.5); ctx.lineTo(top[1][0], top[1][1] + 0.5); ctx.stroke(); ctx.restore();
      // the model
      D_drawCube(ctx, o, geo, 0.95 * (1 - te) + 0.1 * te, te, lightX, bandStr, null);
    }
  }

  const kN = 1.45, yN = hy + E * kN; ctx.save(); ctx.fillStyle = D_rgba(D_BONE, 0.12);
  for (let i = -2; i < 6; i++) { const x = W / 2 + (i * W * 0.5 + W * 0.33 - W / 2 - dolly) * kN; ctx.fillRect(x - 14, yN, 28, 3); ctx.fillRect(x - 1.5, yN, 3, 14); } ctx.restore();
  D_dust(ctx, o, camX, waveX, W, H, p);
  D_band(ctx, waveX, H / 2, W, H, 'front');
  // the blade's light pooling where it meets the floor
  D_eglow(ctx, bandAt(fy + 4), fy + 4, W * 0.14, H * 0.04, D_RED, 0.3, 'lighter');
  ctx.restore();
  PR.vignette(ctx, W, H, 0.55); D_grain(ctx, W, H, 0.03, p);
}

// base.js captured fMedia by reference when it built DRAW and CUTS, so the override must be rebound for the harness and drawAt().
DRAW[6] = fMedia; for (const D_f of CUTS.full) { if (D_f.n === 6) D_f.draw = fMedia; }
