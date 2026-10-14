// strike (hit → 3.3 s): two bone-white frames on the cue (the shutter), then black: shock rings with thickness falloff, sparks thrown
// under gravity (motion blur streaks them), a white-hot core with a chromatic split, a decaying camera shake, and the seam of light that stays.
shot('strike', function (ctx, s) {
  const { W, H, B } = s, { ease, win, clamp, lerp } = K;
  const u = s.since('hit');                                  // seconds since the hit
  if (u < 1.999 / s.fps) { ctx.fillStyle = B.bone; ctx.fillRect(0, 0, W, H); return; }   // the shutter: exactly frames 0 and 1 (1.999, not 2: float time)

  const sh = K.shake(s.t, s.cue('hit'), 14, 0.16, 7);
  ctx.save(); K.applyShake(ctx, sh, W, H);
  const cx = W / 2, cy = H / 2;

  // the seam: the hairline, now a wound of light that cools but never goes out
  const heat = Math.exp(-u / 0.35);
  K.slash(ctx, cx, cy, H * 0.75, { band: H * 0.05 * (0.4 + heat), bandAlpha: 0.10 + 0.25 * heat, core: 1.5 + 2.5 * heat, bloom: 30 + 60 * heat, alpha: 0.55 + 0.45 * heat, coreColor: K.mix(B.red, B.bone, heat * 0.85) });

  // the core: hot white with a red-shifted and a cool-shifted copy offset along the slash (chromatic aberration)
  const core = H * (0.08 + 0.35 * ease.outExpo(clamp(u / 0.5, 0, 1)));
  const ca = 10 * heat, ox = Math.cos(K.ANG) * ca, oy = Math.sin(K.ANG) * ca;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  K.glow(ctx, cx + ox, cy + oy, core, '#FF3020', 0.35 * heat);
  K.glow(ctx, cx - ox, cy - oy, core, '#4AA8FF', 0.16 * heat);
  K.glow(ctx, cx, cy, core * 0.55, B.bone, 0.55 * heat);
  ctx.restore();

  // shock rings: three, staggered; each thins as it grows
  for (let i = 0; i < 3; i++) {
    const q = clamp((u - i * 0.07) / 0.9, 0, 1); if (q <= 0) continue;
    const r = H * 0.95 * ease.outExpo(q);
    K.ring(ctx, cx, cy, r, (16 - i * 4) * Math.pow(1 - q, 1.5) + 0.6, i === 0 ? B.bone : B.red, (1 - q) * (i === 0 ? 0.55 : 0.7));
    K.ring(ctx, cx, cy, r * 0.985, 40 * (1 - q), B.red, 0.06 * (1 - q));
  }

  // sparks: ballistic, with drag and gravity; each is drawn as a short segment along its velocity
  const r = K.rng(42), G = 1900, DRAG = 2.2;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2, v0 = 600 + r() * 1700, life = 0.35 + r() * 0.8, born = r() * 0.05, tt = u - born;
    if (tt <= 0 || tt > life) { r(); continue; }
    const k = (1 - Math.exp(-DRAG * tt)) / DRAG, vx = Math.cos(a) * v0, vy = Math.sin(a) * v0;
    const x = cx + vx * k, y = cy + vy * k + 0.5 * G * tt * tt * 0.35;
    const svx = vx * Math.exp(-DRAG * tt), svy = vy * Math.exp(-DRAG * tt) + G * tt * 0.35, sp = Math.hypot(svx, svy) || 1, tail = clamp(sp * 0.012, 2, 40);
    const fade = 1 - tt / life, hot = r() < 0.35;
    ctx.strokeStyle = K.rgba(hot ? B.bone : B.red, 0.9 * fade); ctx.lineWidth = hot ? 2.2 : 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - svx / sp * tail, y - svy / sp * tail); ctx.stroke();
  }
  ctx.restore();

  // haze: what is left in the air
  K.glow(ctx, cx, cy, H * 0.7, B.red, 0.07 * win(u, 0.1, 0.6));
  ctx.restore();
});
