// open (0 → hit): black that is not quite flat; a red hairline draws itself from the centre outward at the brand angle,
// photographed: a bloom around it, an anamorphic streak at each growing tip, a slow push-in. It brightens into the hit.
shot('open', function (ctx, s) {
  const { W, H, B } = s, { ease, win, lerp, clamp } = K;
  const t0 = s.cue('line'), t1 = s.cue('hit');
  const draw = ease.out(win(s.t, t0, t1 - 0.35));          // the line's growth, 0 → 1
  const charge = Math.pow(win(s.t, t1 - 0.6, t1), 2);      // tension into the hit

  // the room: a barely-there radial lift so the black reads as a space
  const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, H * 0.9);
  g.addColorStop(0, '#16171A'); g.addColorStop(1, B.screen);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const z = lerp(1, 1.05, ease.inOut(s.p));                 // slow push-in
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z);
  if (s.t >= t0) {
    const len = H * 0.42 * draw, dx = Math.cos(K.ANG) * len, dy = Math.sin(K.ANG) * len;
    K.glow(ctx, 0, 0, H * (0.25 + 0.2 * charge), B.red, 0.10 + 0.25 * charge);
    K.bloomLine(ctx, -dx, -dy, dx, dy, B.red, { core: 2 + 1.5 * charge, bloom: 28 + 40 * charge, alpha: clamp(win(s.t, t0, t0 + 0.12), 0, 1), coreColor: charge > 0.5 ? K.mix(B.red, B.bone, (charge - 0.5) * 0.9) : B.red });
    // anamorphic streaks: thin horizontal flares at the two growing tips, strongest while the line is still moving fast
    const speed = 1 - draw, streak = W * (0.05 + 0.12 * speed);
    for (const sgn of [-1, 1]) {
      const x = sgn * dx, y = sgn * dy, sg = ctx.createLinearGradient(x - streak, y, x + streak, y);
      sg.addColorStop(0, K.rgba(B.red, 0)); sg.addColorStop(0.5, K.rgba(B.red, 0.35 * (0.3 + 0.7 * speed))); sg.addColorStop(1, K.rgba(B.red, 0));
      ctx.fillStyle = sg; ctx.fillRect(x - streak, y - 1.5, streak * 2, 3);
      K.glow(ctx, x, y, 22 + 30 * speed, B.bone, 0.25 * speed);
    }
  }
  ctx.restore();
});
