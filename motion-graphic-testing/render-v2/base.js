

// ---------- drawing primitives ----------
const PR = (function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = {
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    outBack: t => { const c = 1.70158, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const win = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const SANS = 'Montserrat, "Helvetica Neue", Arial, sans-serif';
  const DIDONE = '"Bodoni Moda", "Didot", "Bodoni 72", Georgia, serif';
  const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
  function font(ctx, size, weight) { ctx.font = `${weight || 700} ${size}px ${SANS}`; }
  function numeral(ctx, size, weight) { ctx.font = `${weight || 700} ${size}px ${DIDONE}`; }
  function mono(ctx, size) { ctx.font = `500 ${size}px ${MONO}`; }
  function vignette(ctx, W, H, strength) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength == null ? 0.6 : strength})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  function grain(ctx, W, H, amount, seed) {
    const r = rng(seed || 7); ctx.save(); ctx.globalAlpha = amount || 0.05; ctx.fillStyle = '#fff';
    const n = Math.floor(W * H / 1100);
    for (let i = 0; i < n; i++) ctx.fillRect(r() * W, r() * H, 1, 1);
    ctx.restore();
  }
  function ruler(ctx, x0, x1, y, inch, color, alpha, labelStart, below) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    const sub = inch / 8; let k = 0;
    for (let x = x0; x <= x1 + 0.5; x += sub, k++) {
      const h = k % 8 === 0 ? inch * 0.12 : k % 4 === 0 ? inch * 0.075 : k % 2 === 0 ? inch * 0.05 : inch * 0.03;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
      if (labelStart != null && k % 8 === 0) { const v = k / 8 + labelStart; if (v === 0 || v === 1) { numeral(ctx, Math.max(11, inch * 0.085)); ctx.textAlign = 'center'; if (below) { ctx.textBaseline = 'top'; ctx.fillText(String(v), x, y + inch * 0.04); } else { ctx.textBaseline = 'alphabetic'; ctx.fillText(String(v), x, y - inch * 0.16); } } }
    }
    ctx.restore();
  }
  function shockwave(ctx, cx, cy, p, maxR, color, width, count) {
    const n = count || 1;
    for (let i = 0; i < n; i++) {
      const q = clamp(p - i * 0.12, 0, 1); if (q <= 0) continue;
      const r = maxR * ease.outExpo(q);
      ctx.save(); ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = color; ctx.lineWidth = (width || 6) * (1 - q * 0.8) + 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }
  function burst(ctx, cx, cy, p, n, maxR, color, seed, size) {
    const r = rng(seed || 3); ctx.save(); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, sp = 0.4 + r() * 0.6, s = (size || 3) * (0.5 + r());
      const d = maxR * sp * ease.outExpo(p), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + p * p * 60 * r();
      ctx.globalAlpha = (1 - p) * 0.9; ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  }
  // wide-tracked caps in the wordmark's manner; reveal clips left to right
  function title(ctx, text, x, y, size, color, opts) {
    const o = opts || {}; ctx.save(); font(ctx, size, o.weight || 600); ctx.fillStyle = color; ctx.textBaseline = 'middle';
    const chars = Array.from(text); const tr = o.tracking == null ? size * 0.28 : o.tracking;
    const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width + tr, -tr);
    const left = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.reveal != null && o.reveal < 1) { ctx.beginPath(); ctx.rect(left - 4, y - size, (w + 8) * o.reveal, size * 2); ctx.clip(); }
    ctx.textAlign = 'left'; let cx = left; for (const ch of chars) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + tr; }
    ctx.restore();
  }
  function bigNumber(ctx, text, x, y, size, color, opts) {
    const o = opts || {}; ctx.save(); numeral(ctx, size, 700); ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = o.align || 'center'; if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.fillText(text, x, y); ctx.restore();
  }
  function label(ctx, text, x, y, color, size, align, alpha) {
    ctx.save(); mono(ctx, size || 11); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; if (alpha != null) ctx.globalAlpha = alpha; ctx.fillText(text, x, y); ctx.restore();
  }
  function glow(ctx, cx, cy, r, color, alpha) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.5 : alpha; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
  }
  function speedlines(ctx, cx, cy, p, n, color, seed, W, H) {
    const r = rng(seed || 9); ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, r0 = H * 0.12 + r() * H * 0.2, len = H * 0.1 + r() * Math.max(W, H) * p; ctx.globalAlpha = (0.1 + r() * 0.4) * (1 - p); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); ctx.stroke(); }
    ctx.restore();
  }
  // the brand's slash: a translucent band plus a crisp line, rotated to the mark's angle, centered on (cx, cy)
  function slash(ctx, cx, cy, ang, bandW, len, color, bandAlpha, lineAlpha, lineW) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    if (bandAlpha > 0) { const g = ctx.createLinearGradient(0, -bandW, 0, bandW); g.addColorStop(0, 'rgba(231,39,34,0)'); g.addColorStop(0.5, `rgba(231,39,34,${bandAlpha})`); g.addColorStop(1, 'rgba(231,39,34,0)'); ctx.fillStyle = g; ctx.fillRect(-len, -bandW, len * 2, bandW * 2); }
    if (lineAlpha > 0) { ctx.globalAlpha = lineAlpha; ctx.fillStyle = color; ctx.fillRect(-len, -(lineW || 1.5) / 2, len * 2, lineW || 1.5); }
    ctx.restore();
  }
  return { clamp, lerp, ease, rng, win, font, numeral, mono, vignette, grain, ruler, shockwave, burst, title, bigNumber, label, glow, speedlines, slash };
})();

// ---------- the film's palette (fixed; the page theme does not change the screen) ----------
const C = { screen: '#0B0B0B', bone: '#EFE9DE', red: '#E72722', steel: '#8C939B', steelDark: '#2B2E32', steelMid: '#4A4F55', wood: '#C9A26B' };
const GEO = { hw: 0.82958, markCy: 0.26295, tagLeft: 0.047845, tagW: 0.90431, tagTop: 0.89838, tagH: 0.035192, ang: -42 * Math.PI / 180 };
const { ease, win, clamp, lerp } = PR;
const LOGO = new Image(), TAG = new Image();
const ready = img => img.complete && img.naturalWidth > 0;

// ---------- frames ----------
function fCut(ctx, p, W, H) {
  const len = ease.out(win(p, 0.1, 0.65)) * H * 0.78, a = ease.out(win(p, 0.1, 0.3));
  PR.slash(ctx, W / 2, H / 2, GEO.ang, H * 0.03, len, C.red, 0.12 * a, 0.95 * a, 1.5);
  PR.grain(ctx, W, H, 0.035, 1);
}
function fInch(ctx, p, W, H, zoomFrom, zoomTo) {
  const z = lerp(zoomFrom == null ? 1 : zoomFrom, zoomTo == null ? 1.25 : zoomTo, ease.in(p));
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const inch = W * 0.22, gx0 = W / 2 - inch / 2, gx1 = W / 2 + inch / 2, top = H * 0.1, bh = H * 0.8;
  const g = ctx.createLinearGradient(0, top, 0, top + bh); g.addColorStop(0, '#24272B'); g.addColorStop(0.45, C.steelMid); g.addColorStop(1, '#17191C');
  ctx.fillStyle = g; ctx.fillRect(-W * 0.3, top, gx0 + W * 0.3, bh); ctx.fillRect(gx1, top, W * 1.3 - gx1, bh);
  ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = '#A3A9AF'; ctx.lineWidth = 1; const r = PR.rng(21);
  for (let i = 0; i < 70; i++) { const y = top + r() * bh; ctx.beginPath(); ctx.moveTo(-W * 0.3, y); ctx.lineTo(gx0, y); ctx.moveTo(gx1, y); ctx.lineTo(W * 1.3, y); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.fillStyle = C.bone; ctx.globalAlpha = 0.5; ctx.fillRect(gx0 - 2, top, 2, bh); ctx.fillRect(gx1, top, 2, bh); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(gx0, 0, inch, H); ctx.clip();
  PR.slash(ctx, W / 2, H / 2, GEO.ang, H * 0.12, W, C.red, 0.32, 0.9, 1.5);
  const rr = PR.rng(33); ctx.fillStyle = C.bone;
  for (let i = 0; i < 70; i++) { const bx = gx0 + rr() * inch, by = rr() * H, s = rr(); const x = bx + Math.sin(p * 6 + i) * 6 * s, y = by - p * 40 * s; ctx.globalAlpha = 0.25 + 0.6 * s; ctx.fillRect(x, y, 1 + s * 1.5, 1 + s * 1.5); }
  ctx.restore();
  PR.ruler(ctx, gx0 - inch * 2, gx1 + inch * 2, H * 0.9, inch, C.bone, 0.85, -2);
  ctx.restore();
  PR.label(ctx, '1.000 in', W / 2, H * 0.955, C.red, Math.max(10, W * 0.017), 'center', ease.out(win(p, 0.1, 0.4)));
  PR.vignette(ctx, W, H, 0.5); PR.grain(ctx, W, H, 0.03, 2);
}
function fBreath(ctx, p, W, H) {
  const close = p < 0.75 ? lerp(0, 0.35, ease.in(p / 0.75)) : lerp(0.35, 0.5, (p - 0.75) / 0.25);
  const gx0 = W * close, gx1 = W * (1 - close);
  ctx.fillStyle = C.steelDark; ctx.fillRect(0, 0, gx0, H); ctx.fillRect(gx1, 0, W - gx1, H);
  ctx.save(); ctx.fillStyle = C.bone; ctx.globalAlpha = 0.5; ctx.fillRect(gx0 - 2, 0, 2, H); ctx.fillRect(gx1, 0, 2, H); ctx.restore();
  const rr = PR.rng(33); ctx.save(); ctx.fillStyle = C.bone;
  for (let i = 0; i < 120; i++) { const x = rr() * W, y = rr() * H, s = rr(); if (x < gx0 || x > gx1) continue; ctx.globalAlpha = 0.2 + 0.6 * s; ctx.fillRect(x, y, 1 + s * 2, 1 + s * 2); }
  ctx.restore();
  const beat = (p * 2) % 1;
  PR.glow(ctx, W / 2, H / 2, H * 0.3, 'rgba(231,39,34,0.35)', 0.5 * (1 - beat));
  PR.shockwave(ctx, W / 2, H / 2, beat, H * 0.25, C.red, 2, 1);
  PR.label(ctx, Math.max(0, 1 - close * 2).toFixed(3) + ' in', W / 2, H * 0.9, C.red, Math.max(11, W * 0.02), 'center');
  PR.vignette(ctx, W, H, 0.7); PR.grain(ctx, W, H, 0.03, 3);
}
function fHit(ctx, p, W, H) {
  if (p < 0.07) { ctx.fillStyle = C.bone; ctx.fillRect(0, 0, W, H); return; }
  const q = win(p, 0.07, 1); const shake = (1 - q) * 8;
  ctx.save(); ctx.translate(Math.sin(q * 90) * shake, Math.cos(q * 70) * shake);
  ctx.fillStyle = '#1B1D20'; ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.save(); ctx.fillStyle = C.bone; ctx.globalAlpha = 0.9 * (1 - q * 0.5); ctx.fillRect(W / 2 - 1, 0, 2, H); ctx.restore();
  PR.glow(ctx, W / 2, H / 2, H * 0.5, 'rgba(231,39,34,0.6)', 0.8 * (1 - q));
  PR.speedlines(ctx, W / 2, H / 2, q, 60, C.bone, 5, W, H);
  PR.shockwave(ctx, W / 2, H / 2, q, W * 0.6, C.red, 10, 3);
  PR.burst(ctx, W / 2, H / 2, q, 140, W * 0.5, C.bone, 8, 2.5);
  ctx.restore();
  PR.vignette(ctx, W, H, 0.5);
}
function room(ctx, W, H, hy) {
  const wall = ctx.createLinearGradient(0, 0, 0, hy); wall.addColorStop(0, '#121314'); wall.addColorStop(1, '#232527'); ctx.fillStyle = wall; ctx.fillRect(0, 0, W, hy);
  const floor = ctx.createLinearGradient(0, hy, 0, H); floor.addColorStop(0, '#2E3134'); floor.addColorStop(1, '#141619'); ctx.fillStyle = floor; ctx.fillRect(0, hy, W, H - hy);
  ctx.save(); ctx.fillStyle = C.bone; ctx.globalAlpha = 0.15; ctx.fillRect(0, hy, W, 1); ctx.restore();
}
function drawChair(ctx, x, baseY, s, rot, alpha, lw) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, baseY); ctx.rotate(rot); ctx.strokeStyle = C.wood; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = () => { ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0); ctx.moveTo(-s * 0.45, 0); ctx.lineTo(-s * 0.5, s * 0.55); ctx.moveTo(s * 0.45, 0); ctx.lineTo(s * 0.5, s * 0.55); ctx.moveTo(-s * 0.45, 0); ctx.lineTo(-s * 0.5, -s * 0.75); ctx.moveTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.28, -s * 0.68); ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(-s * 0.28, -s * 0.38); ctx.stroke(); };
  path();
  ctx.globalAlpha = alpha * 0.16; ctx.translate(0, s * 0.55); ctx.scale(1, -0.55); ctx.translate(0, -s * 0.55); path();
  ctx.restore();
}
function fChair(ctx, p, W, H, noDim) {
  const hy = H * 0.62; room(ctx, W, H, hy);
  const x0 = W * 0.3, x1 = W * 0.78, m = ease.outExpo(win(p, 0.05, 0.75)); const cx = lerp(x0, x1, m); const rot = -4 * Math.PI / 180 * Math.sin(m * Math.PI);
  const s = H * 0.22, lw = Math.max(2, W * 0.004), base = hy + H * 0.06;
  if (p > 0.05 && p < 0.6) for (let i = 3; i > 0; i--) { const gm = ease.outExpo(win(p - 0.04 * i, 0.05, 0.75)); drawChair(ctx, lerp(x0, x1, gm), base, s, rot, 0.1 * i, lw); }
  drawChair(ctx, cx, base, s, rot, 1, lw);
  PR.burst(ctx, cx - s * 0.5, base + s * 0.5, win(p, 0.1, 0.9), 40, H * 0.2, '#6B6E72', 4, 2);
  if (noDim) { PR.vignette(ctx, W, H, 0.55); PR.grain(ctx, W, H, 0.03, 5); return; }
  const dA = ease.out(win(p, 0.2, 0.5)); const dy = base + s * 0.85;
  ctx.save(); ctx.globalAlpha = dA; ctx.strokeStyle = C.red; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, dy); ctx.lineTo(cx, dy); ctx.moveTo(x0, dy - 6); ctx.lineTo(x0, dy + 6); ctx.moveTo(cx, dy - 6); ctx.lineTo(cx, dy + 6); ctx.stroke(); ctx.restore();
  const ft = m * 8.17, f = Math.floor(ft), inch = Math.round((ft - f) * 12);
  PR.label(ctx, f + ' ft ' + inch + ' in', (x0 + cx) / 2, dy + 14, C.red, Math.max(10, W * 0.017), 'center', dA);
  PR.vignette(ctx, W, H, 0.55); PR.grain(ctx, W, H, 0.03, 5);
}
function fMedia(ctx, p, W, H) {
  const hy = H * 0.64; room(ctx, W, H, hy);
  const dolly = -p * W * 0.45, waveX = lerp(-W * 0.15, W * 1.15, p), pw = W * 0.2, ph = H * 0.42, top = hy - ph;
  const crossX = waveX + H * 0.078; // where the tilted slash crosses the panels' mid-height
  for (let i = 0; i < 4; i++) {
    const px = W * 0.15 + i * W * 0.32 + dolly; if (px + pw < -20 || px > W + 20) continue;
    const tf = clamp((crossX - px - pw * 0.5) / (pw * 0.6), 0, 1);
    ctx.save(); ctx.translate(px, top);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-4, ph, pw + 8, 6);
    if (i === 0) {
      ctx.fillStyle = '#D9D2C4'; ctx.fillRect(0, 0, pw, ph);
      ctx.save(); ctx.beginPath(); ctx.rect(pw * 0.06, ph * 0.06, pw * 0.88, ph * 0.74); ctx.clip();
      const sky = ctx.createLinearGradient(0, 0, 0, ph); sky.addColorStop(0, tf ? '#2C3E55' : '#5A6670'); sky.addColorStop(1, tf ? '#C96A3A' : '#9A9A95'); ctx.fillStyle = sky; ctx.fillRect(0, 0, pw, ph);
      const sunY = lerp(ph * 0.45, ph * 0.62, tf * (0.5 + 0.5 * Math.sin(p * 9))); ctx.fillStyle = C.bone; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(pw * 0.62, sunY, pw * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#1E2126'; ctx.beginPath(); ctx.moveTo(0, ph * 0.8); ctx.lineTo(pw * 0.3, ph * 0.45); ctx.lineTo(pw * 0.5, ph * 0.62); ctx.lineTo(pw * 0.72, ph * 0.38); ctx.lineTo(pw, ph * 0.8); ctx.closePath(); ctx.fill();
      if (tf > 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; const cxl = (pw * 0.2 + p * pw * 1.5 * tf) % (pw * 1.2) - pw * 0.1; ctx.beginPath(); ctx.ellipse(cxl, ph * 0.22, pw * 0.14, ph * 0.05, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (tf > 0.2) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(pw * 0.12, ph * 0.9, 3, 0, Math.PI * 2); ctx.fill(); PR.label(ctx, 'REC', pw * 0.17, ph * 0.9, '#2A2824', Math.max(8, W * 0.009)); }
    } else if (i === 1) {
      ctx.fillStyle = '#1A1C1F'; ctx.fillRect(0, 0, pw, ph);
      const sz = pw * 0.13, lift = tf * ph * 0.08, depth = Math.round(tf * 7);
      for (let d = depth; d >= 1; d--) { PR.title(ctx, 'ONE INCH', pw / 2 + d, ph * 0.42 - lift + d * 0.6, sz, d % 2 ? '#6E6A62' : '#3F3C36', { weight: 600 }); PR.title(ctx, 'MEDIA', pw / 2 + d, ph * 0.62 - lift + d * 0.6, sz * 0.7, '#5A1F1C', { weight: 500 }); }
      PR.title(ctx, 'ONE INCH', pw / 2, ph * 0.42 - lift, sz, tf ? C.bone : '#8F8A7C', { weight: 600 });
      PR.title(ctx, 'MEDIA', pw / 2, ph * 0.62 - lift, sz * 0.7, tf ? C.red : '#8F8A7C', { weight: 500 });
    } else if (i === 2) {
      ctx.fillStyle = '#EFE9DE'; ctx.fillRect(0, 0, pw, ph);
      for (let l = 0; l < 9; l++) { const y = ph * 0.12 + l * ph * 0.085; const float = tf * (l % 3 + 1) * ph * 0.07 * (0.5 + 0.5 * Math.sin(p * 7 + l)); ctx.fillStyle = '#2A2824'; ctx.globalAlpha = 1 - tf * 0.5; ctx.fillRect(pw * 0.12, y - float, pw * (0.5 + (l * 7 % 4) * 0.08), ph * 0.03); }
      ctx.globalAlpha = 1;
      if (tf > 0) { ctx.fillStyle = C.red; for (let b = 0; b < 16; b++) { const h = ph * 0.03 + Math.abs(Math.sin(p * 40 + b * 1.7)) * ph * 0.14 * tf; ctx.fillRect(pw * 0.1 + b * pw * 0.05, ph * 0.9 - h / 2, pw * 0.03, h); } }
    } else {
      ctx.fillStyle = '#0F1012'; ctx.fillRect(0, 0, pw, ph);
      const cx = pw / 2, cy = ph * 0.5, s = pw * 0.3, o = s * 0.45;
      const front = [[cx - s / 2, cy - s / 2], [cx + s / 2, cy - s / 2], [cx + s / 2, cy + s / 2], [cx - s / 2, cy + s / 2]];
      const back = front.map(([x, y]) => [x + o, y - o]);
      if (tf > 0) {
        ctx.globalAlpha = tf;
        ctx.fillStyle = '#9CA3AB'; ctx.beginPath(); ctx.moveTo(...front[0]); ctx.lineTo(...front[1]); ctx.lineTo(...front[2]); ctx.lineTo(...front[3]); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#C9CED3'; ctx.beginPath(); ctx.moveTo(...front[0]); ctx.lineTo(...back[0]); ctx.lineTo(...back[1]); ctx.lineTo(...front[1]); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6E757C'; ctx.beginPath(); ctx.moveTo(...front[1]); ctx.lineTo(...back[1]); ctx.lineTo(...back[2]); ctx.lineTo(...front[2]); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = tf ? 'rgba(239,233,222,0.25)' : C.red; ctx.lineWidth = 1;
      ctx.beginPath(); for (const q of [front, back]) { ctx.moveTo(...q[0]); for (let k = 1; k < 4; k++) ctx.lineTo(...q[k]); ctx.closePath(); } for (let k = 0; k < 4; k++) { ctx.moveTo(...front[k]); ctx.lineTo(...back[k]); } ctx.stroke();
    }
    ctx.restore();
  }
  PR.slash(ctx, waveX, H / 2, GEO.ang, W * 0.07, H * 1.5, C.red, 0.35, 0.9, 2);
  PR.vignette(ctx, W, H, 0.5); PR.grain(ctx, W, H, 0.03, 6);
}
const GRID = { cols: 40, rows: 22 };
function tileFace(ctx, x, y, w, h, v, k) {
  const hue = v < 0.33 ? '#2B3340' : v < 0.66 ? '#3A322A' : '#2E2E2E';
  ctx.fillStyle = hue; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#4A4F55'; ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  ctx.fillStyle = C.wood; ctx.fillRect(x + w * (0.25 + (k % 5) * 0.1), y + h * 0.4, Math.max(1, w * 0.08), h * 0.3);
}
function fTen(ctx, p, W, H) {
  const z = lerp(1, 1.08, p); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const { cols, rows } = GRID, tw = W / cols, th = H / rows, r = PR.rng(13); const fill = ease.out(win(p, 0, 0.85));
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = r(), a = r(); const d = Math.hypot(i / cols, (j - rows / 2) / rows * 0.6); if (d > fill * 1.25) continue;
    const k = j * cols + i; const inset = a < 0.3 ? [tw * 0.3, 0, tw * 0.4, th] : a < 0.5 ? [tw * 0.15, th * 0.15, tw * 0.7, th * 0.7] : [0, th * 0.2, tw, th * 0.6];
    ctx.globalAlpha = 0.55 + v * 0.45; tileFace(ctx, i * tw + inset[0] + 0.5, j * th + inset[1] + 0.5, inset[2] - 1, inset[3] - 1, v, k);
  }
  ctx.globalAlpha = 1; ctx.restore();
  const n = Math.round(ease.out(win(p, 0.02, 0.9)) * 10000);
  ctx.save(); ctx.fillStyle = 'rgba(11,11,11,0.75)'; ctx.fillRect(W * 0.58, H * 0.76, W * 0.42, H * 0.2); ctx.restore();
  PR.bigNumber(ctx, n.toLocaleString('en-US'), W * 0.96, H * 0.86, Math.max(24, W * 0.085), C.red, { align: 'right' });
  PR.title(ctx, 'TAKES', W * 0.6, H * 0.86, Math.max(9, W * 0.014), C.bone, { align: 'left', weight: 600 });
  PR.vignette(ctx, W, H, 0.45); PR.grain(ctx, W, H, 0.03, 7);
}
function fOne(ctx, p, W, H) {
  const { cols, rows } = GRID, tw = W / cols, th = H / rows, r = PR.rng(13); const conv = ease.inOut(win(p, 0, 0.5));
  const sk = Math.floor(cols * rows * 0.47) + 13;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = r(); r(); const k = j * cols + i; if (k === sk) continue;
    const x = lerp(i * tw, W / 2, conv), y = lerp(j * th, H / 2, conv);
    ctx.globalAlpha = (1 - conv * 0.85) * 0.8; tileFace(ctx, x, y, tw - 1, th - 1, v, k);
  }
  ctx.globalAlpha = 1;
  const g = ease.inOut(win(p, 0.3, 0.7)); const si = sk % cols, sj = Math.floor(sk / cols);
  const x = lerp(si * tw, 0, g), y = lerp(sj * th, 0, g), w = lerp(tw, W, g), h = lerp(th, H, g);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); ctx.scale(w / W, h / H); fChair(ctx, 0.95, W, H, true); ctx.restore();
  if (g < 1) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.globalAlpha = 1 - g; ctx.strokeRect(x, y, w, h); ctx.restore(); }
  const n = Math.max(1, Math.round(10000 - ease.out(win(p, 0, 0.5)) * 9999));
  if (p < 0.62) PR.bigNumber(ctx, n.toLocaleString('en-US'), W * 0.96, H * 0.86, Math.max(24, W * 0.085), C.red, { align: 'right', alpha: 1 - win(p, 0.5, 0.62) });
  const band = win(p, 0.6, 0.75); if (band > 0) { const bg = ctx.createLinearGradient(0, H * 0.68, 0, H); bg.addColorStop(0, 'rgba(11,11,11,0)'); bg.addColorStop(1, 'rgba(11,11,11,0.92)'); ctx.save(); ctx.globalAlpha = band; ctx.fillStyle = bg; ctx.fillRect(0, H * 0.68, W, H * 0.32); ctx.restore(); }
  PR.title(ctx, 'TEN THOUSAND TAKES. ONE HIT.', W / 2, H * 0.85, Math.max(11, W * 0.026), C.bone, { reveal: ease.out(win(p, 0.65, 0.92)), weight: 600 });
  PR.grain(ctx, W, H, 0.03, 8);
}
function lockupGeom(W, H) {
  const inch = W * 0.4, x0 = W / 2 - inch / 2; const imgW = inch, imgH = imgW * GEO.hw, imgX = x0, imgY = H * 0.07;
  return { inch, x0, x1: x0 + inch, imgW, imgH, imgX, imgY, ry: imgY + imgH + H * 0.07, markCy: imgY + GEO.markCy * imgW, cx: W / 2, cy: imgY + imgH / 2 };
}
function drawLockup(ctx, g, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (ready(LOGO)) ctx.drawImage(LOGO, g.imgX, g.imgY, g.imgW, g.imgH);
  else { PR.title(ctx, 'ONE INCH', g.cx, g.imgY + g.imgW * 0.6, g.imgW * 0.11, C.bone, { weight: 600, tracking: g.imgW * 0.045 }); PR.title(ctx, 'MEDIA', g.cx, g.imgY + g.imgW * 0.75, g.imgW * 0.07, C.red, { weight: 500, tracking: g.imgW * 0.045 }); }
  ctx.restore();
}
function drawTagline(ctx, g, reveal, alpha) {
  const x = g.imgX + GEO.tagLeft * g.imgW, y = g.imgY + GEO.tagTop * g.imgW, w = GEO.tagW * g.imgW, h = GEO.tagH * g.imgW;
  ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.beginPath(); ctx.rect(x - 2, y - 2, (w + 4) * reveal, h + 4); ctx.clip();
  if (ready(TAG)) ctx.drawImage(TAG, x, y, w, h);
  else PR.title(ctx, 'SMALL DETAILS. BIG IMPACT.', g.cx, y + h / 2, h * 0.85, C.bone, { weight: 600 });
  ctx.restore();
}
function fLockup(ctx, p, W, H) {
  const g = lockupGeom(W, H);
  PR.ruler(ctx, g.x0 - g.inch, g.x1 + g.inch, g.ry, g.inch, C.bone, 0.8, -1, true);
  const s = win(p, 0, 0.18), scale = lerp(1.6, 1, ease.outBack(s)), alpha = ease.out(win(p, 0, 0.1));
  const shake = p > 0.18 && p < 0.26 ? (0.26 - p) / 0.08 * 6 : 0;
  if (p > 0.18) PR.shockwave(ctx, g.cx, g.markCy, win(p, 0.18, 0.8), W * 0.45, C.red, 6, 2);
  ctx.save(); ctx.translate(g.cx + Math.sin(p * 200) * shake, g.cy); ctx.scale(scale, scale); ctx.translate(-g.cx, -g.cy); drawLockup(ctx, g, alpha); ctx.restore();
  const sl = win(p, 0.18, 0.42); if (sl > 0 && sl < 1) PR.slash(ctx, g.cx, g.markCy, GEO.ang, H * 0.05, ease.out(sl) * g.imgW * 0.7, C.red, 0.25 * (1 - sl), 0.9 * (1 - sl), 2);
  PR.label(ctx, '1.000 in', W / 2, g.ry + H * 0.15, C.red, Math.max(10, W * 0.017), 'center', ease.out(win(p, 0.3, 0.5)));
  PR.vignette(ctx, W, H, 0.5); PR.grain(ctx, W, H, 0.03, 9);
}
function fLine(ctx, p, W, H) {
  const g = lockupGeom(W, H); const out = 1 - ease.out(win(p, 0, 0.25));
  if (out > 0) { PR.ruler(ctx, g.x0 - g.inch, g.x1 + g.inch, g.ry, g.inch, C.bone, 0.8 * out, -1, true); PR.label(ctx, '1.000 in', W / 2, g.ry + H * 0.15, C.red, Math.max(10, W * 0.017), 'center', out); }
  PR.shockwave(ctx, g.cx, g.markCy, p, W * 0.9, C.red, 1.5, 1);
  drawLockup(ctx, g, 1);
  drawTagline(ctx, g, ease.out(win(p, 0.2, 0.6)), 1);
  const fade = win(p, 0.86, 1); if (fade > 0) { ctx.save(); ctx.fillStyle = C.screen; ctx.globalAlpha = fade; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  PR.vignette(ctx, W, H, 0.5); PR.grain(ctx, W, H, 0.03, 10);
}

const DRAW = { 1: fCut, 2: (c, p, W, H) => fInch(c, p, W, H), 3: fBreath, 4: fHit, 5: fChair, 6: fMedia, 7: fTen, 8: fOne, 9: fLockup, 10: fLine };
const TITLES = { 1: 'The cut', 2: 'One inch of air', 3: 'The breath', 4: 'The hit', 5: 'The chair', 6: 'Through every medium', 7: 'Ten thousand takes', 8: 'One', 9: 'The lockup', 10: 'The line' };
const THUMB_AT = { 1: 0.9, 2: 0.5, 3: 0.6, 4: 0.3, 5: 0.6, 6: 0.62, 7: 0.85, 8: 0.85, 9: 0.5, 10: 0.7 };
function build(list) { let t = 0; return list.map(([n, d, draw]) => { const f = { n, t0: t, t1: t + d, title: TITLES[n], draw: draw || DRAW[n] }; t += d; return f; }); }
const CUTS = {
  full: build([[1, 3], [2, 4], [3, 2], [4, 1], [5, 3], [6, 5], [7, 4], [8, 3], [9, 3], [10, 2]]),
  short: build([[2, 2, (c, p, W, H) => fInch(c, p, W, H, 1.05, 1.3)], [3, 1], [4, 0.5], [9, 2.5], [10, 1]]),
};


