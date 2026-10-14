// film.config.cjs: the film's single source of truth. Format, brand, shots, cues and any motion that sound must follow.
// The page loads it as a plain script (it sets globalThis.FILM); score.mjs, render.mjs and qc.mjs require() it in Node.
// Picture and sound read the same numbers from here, so they cannot drift apart. Change a time here, never in a shot or in the score.
(function (root, factory) {
  const film = factory();
  if (typeof module === 'object' && module.exports) module.exports = film; else root.FILM = film;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FPS = 30;
  // Snap a time to the frame grid. Sync points must land on a frame, or the picture cannot change exactly on them.
  const F = t => Math.round(t * FPS) / FPS;

  // ── cues: every moment that picture and sound share, in seconds on the film's clock ──
  // sync: 'both'  → qc checks that the audio onset AND a visible picture change land within one frame of the cue
  //       'audio' → qc checks the audio onset only (use for moments with no hard visual change, e.g. a stop)
  //       false   → informational; shots and score may still use it
  const cues = {
    line:    { t: F(0.40), sync: 'audio', note: 'the red hairline starts to draw; a soft tick' },
    hit:     { t: F(2.00), sync: 'both',  note: 'THE HIT: two bone frames, the strike, the shockwave' },
    launch:  { t: F(3.60), sync: 'audio', note: 'the block is shoved; a dull knock' },
    stop:    { t: F(4.90), sync: 'audio', note: 'the block stops; a hard knock' },
    sweep:   { t: F(5.60), sync: false,   note: 'the brand band starts its pass' },
    land:    { t: F(6.20), sync: 'both',  note: 'the lockup lands: the strike again' },
    tagline: { t: F(6.80), sync: false,   note: 'the tagline wipes in; a quiet dyad' },
    fade:    { t: F(7.45), sync: false,   note: 'fade to black' },
  };

  // ── shots: contiguous, in order. blur = sub-frame motion blur: samples per frame (a number, or a function of film time so the
  //    fastest moments get more), shutter as a fraction of the frame (0.5 = a 180° shutter) ──
  // more samples right after an impact, when rings and sparks move hundreds of pixels a frame
  const burst = (t0, dur, hi, lo) => t => (t >= t0 && t < t0 + dur ? hi : lo);
  const shots = [
    { name: 'open',   start: 0,             end: cues.hit.t },
    { name: 'strike', start: cues.hit.t,    end: F(3.30), blur: { samples: burst(cues.hit.t, 0.4, 24, 8) } },
    { name: 'slide',  start: F(3.30),       end: cues.sweep.t, blur: { samples: 12, shutter: 0.5 } },
    { name: 'lockup', start: cues.sweep.t,  end: F(8.00), blur: { samples: burst(cues.land.t, 0.35, 24, 6) } },
  ];

  // ── shared motion: functions of film time that both the picture and the score evaluate ──
  // The block's slide: an impulse to peak speed in `ramp`, then constant friction to rest at the stop cue.
  // rock: after the stop the block tips forward on its leading edge and drops back flat this many seconds later (a second, softer knock).
  const slide = { launch: cues.launch.t, ramp: 3 / FPS, stop: cues.stop.t, distance: 2.4 /* metres */, rock: 0.16 };
  function slideAt(t) {
    const { launch, ramp, stop, distance } = slide, T = stop - launch - ramp;
    const vMax = distance / (ramp * 0.75 + T / 2);
    if (t <= launch) return { s: 0, v: 0, vMax };
    if (t <= launch + ramp) { const r = (t - launch) / ramp; return { s: vMax * ramp * (r - (1 - Math.pow(1 - r, 4)) / 4), v: vMax * (1 - Math.pow(1 - r, 3)), vMax }; }
    if (t <= stop) { const u = (t - launch - ramp) / T; return { s: vMax * ramp * 0.75 + vMax * T * (u - u * u / 2), v: vMax * (1 - u), vMax }; }
    return { s: distance, v: 0, vMax };
  }

  return {
    name: 'one-inch-sting',
    width: 1920, height: 1080, fps: FPS,
    duration: shots[shots.length - 1].end,
    frame: F,
    brand: {
      screen: '#0B0B0B', bone: '#EFE9DE', red: '#E72722', steel: '#8C939B', steelDark: '#2B2E32', steelMid: '#4A4F55',
      angle: -42, // the brand slash, in degrees
    },
    // font roles → families. Files live in assets/fonts as <Family_Name>-<weight or min_max>[-italic].woff2
    fonts: { display: 'Montserrat', numeral: 'Bodoni Moda', mono: 'IBM Plex Mono' },
    // images the shots use, embedded as data URIs at build time (the build fails if one is missing)
    images: { logo: 'assets/images/logo.png', tagline: 'assets/images/tagline.png' },
    // logo geometry, measured on the logo image (x as a fraction of its width, y of its height, lengths of its width):
    // the mark's centre and radius, and the midpoint and half-length of the red slash printed in the artwork
    logoMark: { cx: 0.505, cy: 0.317, r: 0.257, slashX: 0.539, slashY: 0.353, slashHalf: 0.337 },
    cues, shots,
    motion: { slide, slideAt },
    // applied once per frame after motion blur, so grain is never smeared and matches across shots
    finish: { grain: 0.16, vignette: 0.55 },
    motionBlur: { samples: 1, shutter: 0.5 },
    audio: { sampleRate: 48000, lufs: -14, truePeak: -1.0 },
    deliver: { poster: F(7.30), endOnBlack: true },
  };
});
