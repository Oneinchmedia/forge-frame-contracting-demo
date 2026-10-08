// Module: C-chair.js — frame 5, THE CHAIR (10–13 s). Overrides room, drawChair, fChair.
// The chair is built in metres as boxes (seat slab, four legs, two raked back posts, two cross rails, stretchers),
// posed (yaw, pitch about a leg contact line) and projected through a 35 mm pinhole camera at chest height.
// Everything else here is prefixed C_ because all modules share one global scope.

const C_DEG = Math.PI / 180;
const C_CH = {
  Z: 5.0, X0: -0.95, travel: 2.489, wallZ: 9.5,                  // metres: chair depth, rest x of the rear legs, 8 ft 2 in, back wall
  rearX: 0.04, frontX: 0.39, midX: 0.215, midZ: 0.21, nearZ: 0.035, farZ: 0.385,
  tL: 0.05, ramp: 0.034, tS: 0.75,                                // launch, time to peak velocity (3 frames), full stop
};
const C_L = (function () { const v = [-0.62, 0.68, 0.40], n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; })(); // toward the key
const C_WOOD_RGB = [201, 162, 107], C_WOOD_DARK = [58, 40, 22], C_FLOOR_RGB = [52, 56, 61], C_GHOST_RGB = [60, 63, 67];
const C_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
const C_GEOM = (function () {
  const B = [], rake = y => y > 0.45 ? -0.045 * (y - 0.45) / 0.43 : 0;
  const box = (x0, x1, y0, y1, z0, z1, kind) => B.push({ kind, v: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(([x, y, z]) => [x + rake(y), y, z]) });
  box(0, 0.43, 0.415, 0.45, 0, 0.42, 'seat');
  for (const [z0, z1] of [[0.015, 0.055], [0.365, 0.405]]) {
    box(0.02, 0.06, 0, 0.415, z0, z1, 'leg'); box(0.37, 0.41, 0, 0.415, z0, z1, 'leg');
    box(0.02, 0.055, 0.45, 0.88, z0, z1, 'post');
    box(0.065, 0.365, 0.15, 0.175, z0 + 0.006, z1 - 0.006, 'stretch');
  }
  box(0.022, 0.05, 0.60, 0.645, 0.055, 0.365, 'rail'); box(0.016, 0.055, 0.80, 0.86, 0.055, 0.365, 'rail');
  box(0.026, 0.05, 0.15, 0.175, 0.06, 0.36, 'stretch');
  return B;
})();
let C_OFF = document.createElement('canvas'); C_OFF.width = 1920; C_OFF.height = 1080;
let C_SPR = null;

// ---------- camera ----------
function C_cam(W, H) { return { f: W * 0.5 / Math.tan(27.2 * C_DEG), cx: W * 0.5, cy: H * 0.40, h: 1.1 }; }
function C_proj(cam, x, y, z) { return [cam.cx + cam.f * x / z, cam.cy - cam.f * (y - cam.h) / z]; }
function C_floorY(cam, z) { return cam.cy + cam.f * cam.h / z; }

// ---------- motion ----------
function C_motion(p) {
  const { tL, ramp, tS } = C_CH, T = tS - tL - ramp, dR = ramp * 0.75, V = 1 / (dR + T / 2);
  if (p <= tL) return { s: 0, v: 0 };
  if (p <= tL + ramp) { const r = (p - tL) / ramp; return { s: V * ramp * (r - (1 - Math.pow(1 - r, 4)) / 4), v: V * (1 - Math.pow(1 - r, 3)) }; }
  if (p <= tS) { const u = (p - tL - ramp) / T; return { s: V * dR + V * T * (u - u * u / 2), v: V * (1 - u) }; }
  return { s: 1, v: 0 };
}
function C_pose(p) {
  const G = C_CH, mo = C_motion(p);
  const yaw = 4 * Math.sin(Math.PI * mo.s);
  const up = ease.out(win(p, G.tL, G.tL + 0.034)), down = 1 - ease.in(win(p, G.tL + 0.04, G.tL + 0.14));
  let pitch = 6 * up * down + 0.7 * Math.sin(Math.PI * win(p, G.tL + 0.14, G.tL + 0.2));
  pitch -= 1.2 * win(p, G.tL + 0.03, G.tL + 0.1) * (1 - ease.in(win(p, G.tS - 0.03, G.tS)));
  pitch -= 2.5 * Math.sin(Math.PI * win(p, G.tS - 0.02, G.tS + 0.06));                               // the stop: rocks forward onto the front legs
  pitch += 0.6 * Math.sin(Math.PI * win(p, G.tS + 0.06, G.tS + 0.14));                               // ... overshoots back and settles
  return { x: G.X0 + G.travel * mo.s, z: G.Z, yaw: yaw * C_DEG, pitch: pitch * C_DEG, pivotX: pitch >= 0 ? G.rearX : G.frontX, mirror: false, mo };
}
function C_xf(pose, x, y, z) {
  const cp = Math.cos(pose.pitch), sp = Math.sin(pose.pitch), cy = Math.cos(pose.yaw), sy = Math.sin(pose.yaw);
  const dx = x - pose.pivotX, x1 = pose.pivotX + dx * cp - y * sp, y1 = dx * sp + y * cp;
  const ex = x1 - C_CH.midX, ez = z - C_CH.midZ;
  return [C_CH.midX + ex * cy - ez * sy + pose.x, pose.mirror ? -y1 : y1, C_CH.midZ + ex * sy + ez * cy + pose.z];
}
function C_world(pose) {
  return C_GEOM.map(b => {
    const v = b.v.map(q => C_xf(pose, q[0], q[1], q[2])); let cx = 0, cy = 0, cz = 0;
    for (const q of v) { cx += q[0]; cy += q[1]; cz += q[2]; }
    return { v, c: [cx / 8, cy / 8, cz / 8], kind: b.kind };
  });
}
function C_hull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}

// ---------- the chair ----------
function C_drawChair3D(ctx, cam, pose, opts) {
  const o = opts || {}, boxes = C_world(pose); boxes.sort((a, b) => b.c[2] - a.c[2]);
  ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.lineJoin = 'round';
  for (const b of boxes) for (const f of C_FACES) {
    const a = b.v[f[0]], b1 = b.v[f[1]], c = b.v[f[2]], d = b.v[f[3]];
    const ux = b1[0] - a[0], uy = b1[1] - a[1], uz = b1[2] - a[2], wx = d[0] - a[0], wy = d[1] - a[1], wz = d[2] - a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const fx = (a[0] + b1[0] + c[0] + d[0]) / 4, fy = (a[1] + b1[1] + c[1] + d[1]) / 4, fz = (a[2] + b1[2] + c[2] + d[2]) / 4;
    if (nx * (fx - b.c[0]) + ny * (fy - b.c[1]) + nz * (fz - b.c[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * (0 - fx) + ny * (cam.h - fy) + nz * (0 - fz) <= 0) continue;            // back-face cull
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const lam = nx * C_L[0] + (pose.mirror ? -ny : ny) * C_L[1] + nz * C_L[2];
    let t = clamp(0.24 + 0.92 * Math.max(0, lam) + 0.2 * Math.max(0, -nz), 0, 1); t *= 0.7 + 0.3 * clamp(Math.abs(fy) / 0.5, 0, 1);  // lambert + a touch of floor AO
    let r = lerp(C_WOOD_DARK[0], C_WOOD_RGB[0], t), g = lerp(C_WOOD_DARK[1], C_WOOD_RGB[1], t), bl = lerp(C_WOOD_DARK[2], C_WOOD_RGB[2], t);
    if (o.tint) { r = lerp(o.tint[0], r, o.blend); g = lerp(o.tint[1], g, o.blend); bl = lerp(o.tint[2], bl, o.blend); }
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${bl | 0})`;
    const P0 = C_proj(cam, a[0], a[1], a[2]), P1 = C_proj(cam, b1[0], b1[1], b1[2]), P2 = C_proj(cam, c[0], c[1], c[2]), P3 = C_proj(cam, d[0], d[1], d[2]);
    ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]); ctx.lineTo(P3[0], P3[1]); ctx.closePath(); ctx.fill();
    if (o.edge) { ctx.strokeStyle = o.edge; ctx.lineWidth = 0.75; ctx.stroke(); }
  }
  ctx.restore();
}
function C_castShadow(ctx, cam, pose, alpha, blur) {
  const boxes = C_world(pose), kx = C_L[0] / C_L[1], kz = C_L[2] / C_L[1];
  ctx.save(); ctx.beginPath();
  for (const b of boxes) {
    const hull = C_hull(b.v.map(([x, y, z]) => [x - kx * y, z - kz * y]));
    hull.forEach((q, i) => { const P = C_proj(cam, q[0], 0, q[1]); if (i) ctx.lineTo(P[0], P[1]); else ctx.moveTo(P[0], P[1]); }); ctx.closePath();
  }
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fill('nonzero'); ctx.restore();
}
function C_contactShadows(ctx, cam, pose) {
  const G = C_CH; ctx.save();
  const blob = (wx, wz, radM, sy, a) => { const P = C_proj(cam, wx, 0, wz), r = cam.f * radM / wz; ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(1, sy); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.45, `rgba(0,0,0,${a * 0.45})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); };
  const m = C_xf(pose, G.midX, 0, G.midZ); blob(m[0], m[2], 0.5, 0.32, 0.34);
  for (const lx of [G.rearX, G.frontX]) for (const lz of [G.nearZ, G.farZ]) { const q = C_xf(pose, lx, 0, lz); const lift = Math.max(0, q[1]); blob(q[0], q[2], 0.085 + lift * 0.6, 0.38, 0.6 / (1 + lift * 45)); }
  ctx.restore();
}
function C_reflection(ctx, cam, pose, W, H, alpha, ghosts) {
  if (C_OFF.width !== W || C_OFF.height !== H) { C_OFF = document.createElement('canvas'); C_OFF.width = W; C_OFF.height = H; }
  const o = C_OFF.getContext('2d');
  const top = C_floorY(cam, pose.z + C_CH.farZ) - 8, len = cam.f * 0.95 / pose.z;
  const x0 = C_proj(cam, pose.x - 0.35, 0, pose.z)[0], x1 = C_proj(cam, pose.x + 0.85, 0, pose.z)[0];
  const bx = Math.max(0, Math.floor(x0)), by = Math.max(0, Math.floor(top)), bw = Math.min(W, Math.ceil(x1)) - bx, bh = Math.min(H, Math.ceil(top + len + 12)) - by;
  if (bw <= 0 || bh <= 0) return;
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.clearRect(bx, by, bw, bh);
  o.save(); o.beginPath(); o.rect(bx, by, bw, bh); o.clip();
  const mp = Object.assign({}, pose, { mirror: true });
  if (ghosts) for (const gh of ghosts) C_drawChair3D(o, cam, Object.assign({}, mp, { x: mp.x + gh.dx }), { tint: C_FLOOR_RGB, blend: 0.5, alpha: gh.alpha });
  C_drawChair3D(o, cam, mp, { tint: C_FLOOR_RGB, blend: 0.62 });
  o.translate(0, 3); C_drawChair3D(o, cam, mp, { tint: C_FLOOR_RGB, blend: 0.62, alpha: 0.4 });
  o.restore();
  o.globalCompositeOperation = 'destination-in';
  const g = o.createLinearGradient(0, top + 8, 0, top + len * 0.85); g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(0.45, `rgba(0,0,0,${alpha * 0.4})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = g; o.fillRect(bx, by, bw, bh); o.globalCompositeOperation = 'source-over';
  ctx.drawImage(C_OFF, bx, by, bw, bh, bx, by, bw, bh);
}
function C_skids(ctx, cam, pose) {
  const G = C_CH, travel = pose.x - G.X0; if (travel < 0.005) return;
  const xa = G.X0 + G.rearX, xb = pose.x + G.frontX + 0.012, len = xb - xa, rearEnd = xa + travel, frontStart = G.X0 + G.frontX;
  ctx.save();
  for (const [lz, a] of [[G.nearZ, 0.14], [G.farZ, 0.09]]) for (const [hw, k] of [[0.036, 0.35], [0.02, 0.6]]) {
    const z0 = G.Z + lz - hw, z1 = G.Z + lz + hw;
    const P = [C_proj(cam, xa, 0, z0), C_proj(cam, xb, 0, z0), C_proj(cam, xb, 0, z1), C_proj(cam, xa, 0, z1)];
    const g = ctx.createLinearGradient(P[0][0], 0, P[1][0], 0);
    for (let xw = xa; ; xw += 0.08) {                                                        // stops fixed on the floor every 8 cm
      const last = xw >= xb; if (last) xw = xb;
      const cov = Math.max(clamp((rearEnd + 0.02 - xw) / 0.05, 0, 1), clamp((xw - frontStart + 0.02) / 0.05, 0, 1));   // only where a leg has been
      const wob = (0.55 + 0.45 * Math.sin(xw * 9.5 + lz * 9)) * (0.72 + 0.28 * Math.sin(xw * 3.1 + 0.7 + lz * 4));
      const al = a * k * wob * cov * Math.min(1, (xw - xa) / 0.3) * (1 - 0.4 * (xw - xa) / 2.85);
      g.addColorStop(clamp((xw - xa) / len, 0, 1), `rgba(4,4,5,${al.toFixed(3)})`);
      if (last) break;
    }
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.lineTo(P[3][0], P[3][1]); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function C_sprite() {
  if (C_SPR) return C_SPR; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(196,190,178,0.5)'); rg.addColorStop(0.3, 'rgba(196,190,178,0.24)'); rg.addColorStop(0.7, 'rgba(196,190,178,0.06)'); rg.addColorStop(1, 'rgba(196,190,178,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64); C_SPR = c; return c;
}
function C_puff(ctx, p, cfg) {
  if (p < cfg.t0) return;
  const r = PR.rng(cfg.seed), spr = C_sprite(); ctx.save();
  for (let i = 0; i < cfg.n; i++) {
    const tb = cfg.t0 + r() * cfg.spawn, pick = r(), vx = lerp(cfg.vx[0], cfg.vx[1], r()), vy = lerp(cfg.vy[0], cfg.vy[1], r()), life = lerp(cfg.life[0], cfg.life[1], r()), sz = lerp(cfg.size[0], cfg.size[1], r()), ph = r() * 6.28, jit = r();
    const age = p - tb; if (age < 0 || age > life) continue;
    const o = cfg.at(tb)[pick < 0.62 ? 0 : 1];
    const df = age * 90, m = (1 - Math.exp(-0.11 * df)) / 0.11, grow = 1 + 1.6 * Math.min(1, df / 30);
    const x = o[0] + (vx * m + (jit - 0.5) * 10 + Math.sin(df * 0.21 + ph) * 3 * Math.min(1, df / 10)) * o[2];
    const y = Math.min(o[1] + 2, o[1] + (vy * m + Math.cos(df * 0.17 + ph) * 2 * Math.min(1, df / 10)) * o[2] + cfg.g * df * df);
    const a = cfg.alpha * Math.min(1, df / 2.5) * Math.pow(1 - age / life, 1.5), s = sz * o[2] * grow;
    ctx.globalAlpha = a; ctx.drawImage(spr, x - s, y - s, s * 2, s * 2);
  }
  ctx.restore();
}

// ---------- the studio ----------
function room(ctx, W, H, hy) {
  const vpx = W * 0.5, vpy = H * 0.40, f = W * 0.5 / Math.tan(27.2 * C_DEG);
  ctx.save();
  ctx.fillStyle = '#1E2024'; ctx.fillRect(-6, -6, W + 12, hy + 6);
  let g = ctx.createRadialGradient(W * 0.24, -H * 0.25, 0, W * 0.24, -H * 0.25, H * 1.35);
  g.addColorStop(0, 'rgba(128,132,136,0.7)'); g.addColorStop(0.45, 'rgba(96,100,104,0.3)'); g.addColorStop(1, 'rgba(60,63,66,0)');
  ctx.fillStyle = g; ctx.fillRect(-6, -6, W + 12, hy + 6);
  g = ctx.createLinearGradient(W * 0.55, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)'); ctx.fillStyle = g; ctx.fillRect(W * 0.55, -6, W * 0.45 + 6, hy + 6);
  g = ctx.createLinearGradient(0, hy - H * 0.2, 0, hy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = g; ctx.fillRect(-6, hy - H * 0.2, W + 12, H * 0.2);
  g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, '#3C4045'); g.addColorStop(0.4, '#30343A'); g.addColorStop(1, '#15171A'); ctx.fillStyle = g; ctx.fillRect(-6, hy, W + 12, H - hy + 6);
  ctx.save(); ctx.beginPath(); ctx.rect(-6, hy, W + 12, H - hy + 6); ctx.clip();                      // the key pool lives on the floor only
  ctx.translate(W * 0.36, hy + H * 0.05); ctx.scale(1, 0.46);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.78); g.addColorStop(0, 'rgba(168,172,176,0.5)'); g.addColorStop(0.45, 'rgba(130,134,138,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(-W * 0.7, -W * 0.7, W * 1.4, W * 1.4); ctx.restore();
  g = ctx.createLinearGradient(0, hy - H * 0.1, 0, hy); g.addColorStop(0, 'rgba(168,172,176,0)'); g.addColorStop(1, 'rgba(168,172,176,0.05)'); ctx.fillStyle = g; ctx.fillRect(-6, hy - H * 0.1, W + 12, H * 0.1);   // bounce off the pool onto the wall base
  g = ctx.createLinearGradient(0, hy, 0, hy + H * 0.14); g.addColorStop(0, 'rgba(200,204,208,0.12)'); g.addColorStop(1, 'rgba(200,204,208,0)'); ctx.fillStyle = g; ctx.fillRect(-6, hy, W + 12, H * 0.14);
  ctx.strokeStyle = 'rgba(239,233,222,0.06)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const xb of [-0.35, 0.2, 0.75, 1.3]) { const bx = W * xb, t = (hy - vpy) / (H + 6 - vpy); ctx.moveTo(vpx + (bx - vpx) * t, hy); ctx.lineTo(bx, H + 6); }
  const jy = vpy + f * 1.1 / 6.6; ctx.moveTo(-6, jy); ctx.lineTo(W + 6, jy); ctx.stroke();
  ctx.fillStyle = 'rgba(239,233,222,0.14)'; ctx.fillRect(-6, hy, W + 12, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-6, hy + 1, W + 12, 2);
  ctx.restore();
}

// thin wrapper: the projected chair centred on screen x with its feet on baseY, about 1.3*s tall. rot maps to pitch, lw is ignored.
function drawChair(ctx, x, baseY, s, rot, alpha, lw) {
  const W = ctx.canvas.width, H = ctx.canvas.height, cam = C_cam(W, H);
  const Z = cam.f * 0.88 / (1.3 * s), X = (x - cam.cx) * Z / cam.f - C_CH.midX, pitch = -(rot || 0);
  ctx.save(); ctx.translate(0, baseY - C_floorY(cam, Z + C_CH.nearZ));
  C_drawChair3D(ctx, cam, { x: X, z: Z, yaw: 0, pitch, pivotX: pitch >= 0 ? C_CH.rearX : C_CH.frontX, mirror: false }, { alpha: alpha == null ? 1 : alpha });
  ctx.restore();
}

function fChair(ctx, p, W, H, noDim) {
  const G = C_CH, cam = C_cam(W, H), hy = C_floorY(cam, G.wallZ), pose = C_pose(p), mo = pose.mo;
  const travelPx = G.travel * cam.f / G.Z, vPx = mo.v * travelPx / 90;                // px per frame at the chair's depth
  const sh = p < G.tL ? 0 : 2 * (1 - win(p, G.tL, G.tL + 6 / 90)), ph = (p - G.tL) * 90;
  ctx.save(); ctx.translate(sh * Math.sin(ph * 2.7 + 0.4), sh * Math.cos(ph * 3.9));
  room(ctx, W, H, hy);
  C_skids(ctx, cam, pose);
  C_castShadow(ctx, cam, pose, 0.3, 3); C_castShadow(ctx, cam, pose, 0.24, 11);
  C_contactShadows(ctx, cam, pose);
  const gA = win(vPx, 2.5, 9), nG = 4, ghosts = [];
  if (gA > 0) for (let k = nG; k >= 1; k--) ghosts.push({ dx: -(k / nG) * vPx * G.Z / cam.f, alpha: gA * 0.11 * (1 - (k - 1) / nG) });
  C_reflection(ctx, cam, pose, W, H, 0.66, ghosts);
  for (const gh of ghosts) C_drawChair3D(ctx, cam, Object.assign({}, pose, { x: pose.x + gh.dx }), { alpha: gh.alpha, tint: C_GHOST_RGB, blend: 0.5 });
  C_drawChair3D(ctx, cam, pose, { edge: 'rgba(20,12,4,0.24)' });
  const legsAt = tb => { const q = C_pose(tb); const a = C_xf(q, G.rearX + 0.02, 0, G.nearZ + 0.02), b = C_xf(q, G.rearX + 0.02, 0, G.farZ + 0.02); const Pa = C_proj(cam, a[0], 0, a[2]), Pb = C_proj(cam, b[0], 0, b[2]); return [[Pa[0], Pa[1], 1], [Pb[0], Pb[1], 0.88]]; };
  C_puff(ctx, p, { seed: 77, t0: G.tL, spawn: 0.07, n: 50, at: legsAt, vx: [-4.5, 1.2], vy: [-9, -2], g: 0.002, life: [0.22, 0.5], size: [10, 26], alpha: 0.085 });
  C_puff(ctx, p, { seed: 78, t0: G.tL + 0.05, spawn: 0.25, n: 22, at: legsAt, vx: [-2, 0.6], vy: [-2.2, -0.3], g: 0.0015, life: [0.15, 0.3], size: [6, 12], alpha: 0.04 });
  const frontAt = tb => { const q = C_pose(tb); const a = C_xf(q, G.frontX + 0.02, 0, G.nearZ + 0.02), b = C_xf(q, G.frontX + 0.02, 0, G.farZ + 0.02); const Pa = C_proj(cam, a[0], 0, a[2]), Pb = C_proj(cam, b[0], 0, b[2]); return [[Pa[0], Pa[1], 1], [Pb[0], Pb[1], 0.88]]; };
  C_puff(ctx, p, { seed: 91, t0: G.tS - 0.03, spawn: 0.05, n: 40, at: frontAt, vx: [-1.2, 3.2], vy: [-3, -0.6], g: 0.003, life: [0.2, 0.36], size: [9, 18], alpha: 0.14 });
  if (!noDim) {
    const dA = ease.out(win(p, 0.07, 0.2));
    if (dA > 0) {
      const zL = G.Z - 0.3, y = C_floorY(cam, zL), xa = C_proj(cam, G.X0 + G.rearX, 0, zL)[0], xb = C_proj(cam, pose.x + G.rearX, 0, zL)[0];
      ctx.save(); ctx.globalAlpha = dA; ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.moveTo(xa, y - 9); ctx.lineTo(xa, y + 9); ctx.moveTo(xb, y - 9); ctx.lineTo(xb, y + 9); ctx.stroke(); ctx.restore();
      const ti = Math.round(mo.s * 98);
      const lx = Math.max((xa + xb) / 2, xa + 210);                                                     // stays clear of the reflection while the line is short
      PR.label(ctx, Math.floor(ti / 12) + ' ft ' + (ti % 12) + ' in', lx, y + 38, C.red, Math.max(14, Math.round(H * 0.03)), 'center', dA);
    }
  }
  ctx.restore();
  const fl = Math.pow(1 - win(p, 0, 0.067), 1.5); if (fl > 0) { ctx.save(); ctx.globalAlpha = 0.2 * fl; ctx.fillStyle = C.bone; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  PR.vignette(ctx, W, H, 0.5); PR.grain(ctx, W, H, 0.03, 500 + Math.floor(p * 300));
}

// base.js captured fChair by reference when it built DRAW and CUTS, so the override must be rebound for the harness and drawAt().
DRAW[5] = fChair; for (const C_f of CUTS.full) { if (C_f.n === 5) C_f.draw = fChair; }
(function () { C_sprite(); const o = C_OFF.getContext('2d'); o.save(); o.filter = 'blur(3px)'; o.fillRect(0, 0, 4, 4); o.filter = 'blur(11px)'; o.fillRect(0, 0, 4, 4); o.restore(); o.clearRect(0, 0, 64, 64); })();   // one-off warm-up
