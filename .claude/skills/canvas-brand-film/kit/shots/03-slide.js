// slide (3.3 s → sweep): the hit's echo. A machined steel block sits on a polished concrete floor in a quiet studio, locked-off camera
// at 35 mm. On the launch cue it is shoved: peak speed in three frames, then friction to a dead stop on the stop cue, tipping onto its
// leading edge as it brakes and dropping back. Its position comes from FILM.motion.slideAt, the same function the score uses.
// Sub-frame motion blur (config: 12 samples, 180° shutter) smears it at speed; dust kicks from the trailing edge; skid marks stay;
// a dimension line counts the travel.
let ROOM = null; const ROOM_PAD = 12;
function paintRoom(W, H, cam, seam, WALL_Z) {
  const { lerp } = K, c = document.createElement('canvas'); c.width = W + 2 * ROOM_PAD; c.height = H + 2 * ROOM_PAD;
  const ctx = c.getContext('2d', { alpha: false }); ctx.translate(ROOM_PAD, ROOM_PAD);
  // a wall that falls off from a key light upper left, a floor below the seam
  const wg = ctx.createLinearGradient(0, 0, 0, seam); wg.addColorStop(0, '#0E0F11'); wg.addColorStop(1, '#1C1D21');
  ctx.fillStyle = wg; ctx.fillRect(-ROOM_PAD, -ROOM_PAD, W + 2 * ROOM_PAD, seam + ROOM_PAD + 1);
  K.glow(ctx, W * 0.28, seam * 0.55, H * 0.9, '#2A2C31', 0.9);
  const fl = [[-12, 0, -1.9], [12, 0, -1.9], [12, 0, WALL_Z], [-12, 0, WALL_Z]].map(p => cam.project(p));
  const fg = ctx.createLinearGradient(0, seam, 0, H); fg.addColorStop(0, '#202125'); fg.addColorStop(1, '#2C2E33');
  ctx.beginPath(); fl.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fg; ctx.fill();
  ctx.fillRect(-ROOM_PAD, H - 1, W + 2 * ROOM_PAD, ROOM_PAD + 1);
  // concrete: big, faint, fixed mottling
  const cr = K.rng(77);
  for (let i = 0; i < 26; i++) { const [x, y] = cam.project([lerp(-5, 5, cr()), 0, lerp(-1.2, WALL_Z, cr())]); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.28); K.glow(ctx, 0, 0, 120 + cr() * 260, cr() < 0.5 ? '#3A3C42' : '#15161A', 0.18); ctx.restore(); }
  // the key light's pool on the floor, squashed by perspective
  const [px, py] = cam.project([-0.5, 0, 1.6]);
  ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.3); K.glow(ctx, 0, 0, W * 0.5, '#6A6C73', 0.62); ctx.restore();
  ctx.fillStyle = K.rgba(K.B.bone, 0.06); ctx.fillRect(0, seam - 1, W, 1.5);       // the wall-to-floor seam catches a little light
  return c;
}

shot('slide', function (ctx, s) {
  const { W, H, B, F } = s, { ease, win, clamp, lerp } = K;
  const SL = F.motion.slide, m = F.motion.slideAt(s.t);
  const cam = K.camera({ x: 0, y: 0.72, z: -2.4, pitch: -0.12, focal: 35, W, H });
  const WALL_Z = 4.2, X0 = -1.2, Z0 = 0.6, SIZE = [0.42, 0.26, 0.30];

  const sh = K.shake(s.t, SL.launch, 2.5, 0.08, 3);
  ctx.save(); K.applyShake(ctx, sh, W, H);

  // ── the room: static, so it is painted once into a cache and only moved by the shake (12 motion-blur samples per frame
  //    would otherwise repaint 30 gradients each time) ──
  const seam = cam.project([0, 0, WALL_Z])[1];
  if (!ROOM) ROOM = paintRoom(W, H, cam, seam, WALL_Z);
  ctx.drawImage(ROOM, -ROOM_PAD, -ROOM_PAD);
  const echo = Math.exp(-s.local / 0.18);                    // the room is a touch brighter at the cut: the hit's flash settling
  if (echo > 0.01) { ctx.fillStyle = K.rgba(B.bone, 0.10 * echo); ctx.fillRect(-ROOM_PAD, -ROOM_PAD, W + 2 * ROOM_PAD, H + 2 * ROOM_PAD); }

  // ── the block's pose ──
  const sinceL = s.t - SL.launch, sinceS = s.t - SL.stop;
  let tilt = 0;
  if (sinceL > 0 && sinceS < 0) tilt -= 0.05 * Math.sin(Math.PI / 2 * Math.min(1, sinceL / 0.1)) * Math.exp(-Math.max(0, sinceL - 0.1) / 0.22);
  if (sinceS >= 0) tilt -= 0.06 * Math.sin(Math.PI * Math.min(1, sinceS / SL.rock)) * (sinceS < SL.rock ? 1 : 0)
                         + 0.012 * Math.sin(Math.PI * clamp((sinceS - SL.rock) / 0.09, 0, 1));   // the drop back, and one small bounce
  const x = X0 + m.s, yaw = 0.05 * (m.s / SL.distance);
  const box = { pos: [x, 0, Z0], size: SIZE, yaw, tilt, pivot: 1 };

  // ── skid marks: two faint lines laid down by the base edges, from the start to where it is now ──
  if (m.s > 0.005) {
    ctx.save(); ctx.lineCap = 'round';
    for (const dz of [-0.11, 0.11]) {
      const a = cam.project([X0 + 0.12, 0, Z0 + dz]), b = cam.project([x + 0.12, 0, Z0 + dz]);
      const sg = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); sg.addColorStop(0, 'rgba(8,8,10,0)'); sg.addColorStop(0.25, 'rgba(8,8,10,0.30)'); sg.addColorStop(1, 'rgba(8,8,10,0.45)');
      ctx.strokeStyle = sg; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.restore();
  }

  // ── reflection (the mirrored block, faint), then the soft contact shadow ──
  K.drawBox(ctx, cam, box, { mirror: true, alpha: 0.16, color: B.steel, dark: '#141518' });
  // contact shadow: a soft ellipse under the base (a radial gradient: far cheaper than a blur filter at 12 samples a frame)
  const [sx, sy] = cam.project([x, 0, Z0]), [ex] = cam.project([x + 0.3, 0, Z0]), rx = Math.abs(ex - sx);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.22); const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  sg.addColorStop(0, 'rgba(0,0,0,0.7)'); sg.addColorStop(0.6, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();

  // ── dust: kicked from the trailing edge at launch, rising and settling (3D particles, projected) ──
  if (sinceL > 0) {
    const dr = K.rng(91);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      // draw every random number before any early exit, so each particle keeps its identity from frame to frame
      const born = dr() * 0.35, vx = -0.2 - dr() * 0.6, vy = 0.15 + dr() * 0.55, vz = (dr() - 0.5) * 0.5, life = 0.9 + dr() * 1.4, sz = 1 + dr() * 2.4, jz = (dr() - 0.5) * 0.28;
      const tt = sinceL - born; if (tt <= 0 || tt > life) continue;
      const ex = X0 - 0.21 + F.motion.slideAt(SL.launch + born).s;   // the trailing edge when this particle was kicked up
      const k = (1 - Math.exp(-2.5 * tt)) / 2.5, py2 = Math.max(0, 0.01 + vy * k - 0.25 * tt * tt);
      const p3 = [ex + vx * k, py2, Z0 + jz + vz * k], [qx, qy, qz] = cam.project(p3);
      const a = Math.sin(Math.PI * Math.min(1, tt / life)) * 0.32;
      ctx.fillStyle = K.rgba('#C9C4BA', a); ctx.beginPath(); ctx.arc(qx, qy, sz * 3.2 / qz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ── the block: lit steel, a bevel highlight on every edge, the brand slash engraved across its front face ──
  K.drawBox(ctx, cam, box, {
    color: '#A7AEB6', dark: '#16181B', edge: B.bone, edgeAlpha: 0.45, light: [-0.6, 0.8, -0.45], ambient: 0.28,
    decal(c2, face, P) {
      if (face.name !== 'front') return;
      const [w, h, d] = SIZE, rise = Math.tan(-K.ANG), half = h / rise / 2;
      const a = P([-half, 0.0, -d / 2 - 0.0005]), b = P([half, h, -d / 2 - 0.0005]);
      c2.strokeStyle = K.rgba(B.red, 0.95); c2.lineWidth = 3; c2.beginPath(); c2.moveTo(a[0], a[1]); c2.lineTo(b[0], b[1]); c2.stroke();
      c2.strokeStyle = K.rgba('#000000', 0.35); c2.lineWidth = 1; c2.beginPath(); c2.moveTo(a[0], a[1] - 2); c2.lineTo(b[0], b[1] - 2); c2.stroke();
    },
  });

  // ── the measurement: a red dimension line on the floor in front of the block, counting the travel in inches ──
  if (sinceL > 0) {
    const zf = Z0 - 0.42, a = cam.project([X0, 0, zf]), b = cam.project([x, 0, zf]);
    ctx.save(); ctx.strokeStyle = K.rgba(B.red, 0.95); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    for (const p of [a, b]) { ctx.beginPath(); ctx.moveTo(p[0], p[1] - 14); ctx.lineTo(p[0], p[1] + 14); ctx.stroke(); }
    ctx.restore();
    // the readout uses the frame's own time for its value AND its position, so the digits stay sharp under motion blur
    const sF = F.motion.slideAt(s.frameT).s, bF = cam.project([X0 + sF, 0, zf]);
    K.font(ctx, 'mono', 34, 500); ctx.fillStyle = K.rgba(B.red, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${(sF * 39.3701).toFixed(1)} in`, (a[0] + bF[0]) / 2, a[1] + 26);
  }
  ctx.restore();
});
