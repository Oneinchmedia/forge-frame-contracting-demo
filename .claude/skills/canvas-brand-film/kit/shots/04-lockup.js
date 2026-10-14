// lockup (sweep → end): the brand band crosses the black, accelerating into the mark's centre. On the land cue the lockup slams in:
// it settles on a spring, a white-hot slash flashes through the mark, a ring expands behind it, the frame kicks. The tagline wipes in
// with a glowing leading edge; the film fades to true black on the last frame.
shot('lockup', function (ctx, s) {
  const { W, H, B, F } = s, { ease, win, clamp, lerp } = K;
  const logo = K.img('logo'), tag = K.img('tagline'), LM = F.logoMark;
  const tLand = s.cue('land'), tSweep = s.cue('sweep'), tTag = s.cue('tagline'), tFade = s.cue('fade');

  // layout: the lockup centred, the mark's centre is where everything aims
  const lh = H * 0.58, lw = lh * logo.naturalWidth / logo.naturalHeight, lx = (W - lw) / 2, ly = H * 0.11;
  const mx = lx + LM.cx * lw, my = ly + LM.cy * lh, mr = LM.r * lw;

  if (s.t < tLand) {
    // the band: travels in from the left on the brand angle, accelerating, its core brightening as it nears the mark
    const u = win(s.t, tSweep, tLand), x = lerp(-W * 0.35, mx, ease.in(u));
    K.slash(ctx, x, my, H * 0.9, { band: H * 0.07, bandAlpha: 0.22 * (0.4 + 0.6 * u), core: 1.5 + 2 * u, bloom: 30 + 40 * u, alpha: 0.4 + 0.6 * u, coreColor: K.mix(B.red, B.bone, u * u * 0.8) });
    K.glow(ctx, mx, my, mr * 1.6, B.red, 0.18 * u * u);          // the mark's place warms before it arrives
    return;
  }

  const u = s.t - tLand;
  const sh = K.shake(s.t, tLand, 9, 0.06, 11);
  ctx.save(); K.applyShake(ctx, sh, W, H);

  // behind the lockup: a glow and one ring expanding from the mark's centre
  const q = clamp(u / 1.1, 0, 1);
  K.glow(ctx, mx, my, mr * (1.3 + 0.8 * q), B.red, 0.35 * Math.exp(-u / 0.4));
  K.ring(ctx, mx, my, mr * (1 + 2.6 * ease.outExpo(q)), 10 * Math.pow(1 - q, 1.5) + 0.5, B.red, 0.7 * (1 - q));

  // the lockup: lands slightly large and settles on a spring
  const sc = 1 + 0.06 * (1 - ease.spring(clamp(u / 0.55, 0, 1), 1.6, 4.5));
  ctx.save(); ctx.translate(mx, my); ctx.scale(sc, sc); ctx.translate(-mx, -my);
  ctx.drawImage(logo, lx, ly, lw, lh);
  ctx.restore();

  // the flash: a white-hot slash along the mark's own slash, cooling to nothing
  const heat = Math.exp(-u / 0.18);
  if (heat > 0.01) {   // along the artwork's own slash, scaled with the lockup
    const sx = mx + (lx + LM.slashX * lw - mx) * sc, sy = my + (ly + LM.slashY * lh - my) * sc;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; K.slash(ctx, sx, sy, LM.slashHalf * lw * sc, { core: 2 + 3 * heat, bloom: 40 + 80 * heat, alpha: heat, coreColor: B.bone }); ctx.restore();
  }

  // the tagline: a left-to-right wipe with a soft glowing leading edge
  if (s.t >= tTag) {
    const r = ease.inOut(win(s.t, tTag, tTag + 0.5)), tw = lw * 0.9, th = tw * tag.naturalHeight / tag.naturalWidth, tx = (W - tw) / 2, ty = ly + lh + H * 0.045;
    ctx.save(); ctx.beginPath(); ctx.rect(tx - 2, ty - 10, (tw + 4) * r, th + 20); ctx.clip(); ctx.drawImage(tag, tx, ty, tw, th); ctx.restore();
    if (r > 0 && r < 1) K.glow(ctx, tx + tw * r, ty + th / 2, th * 2.2, B.bone, 0.5 * Math.sin(Math.PI * r));
  }
  ctx.restore();

  // fade to true black (the finish's overlay grain leaves black untouched, so the last frame is black)
  const fade = ease.inOut(win(s.t, tFade, tFade + 0.5));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
});
