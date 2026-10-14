// score.mjs: the film's soundtrack, synthesised from nothing. Every time comes from film.config.cjs (cues and shared motion),
// so the sound lands where the picture does. usage: node score.mjs [out/work/score.wav]
import path from 'node:path';
import { ROOT, WORK, loadFilm } from './lib/node.mjs';
import { createSynth } from './lib/synth.mjs';

export function score(outFile = path.join(WORK, 'score.wav')) {
  const film = loadFilm(), C = film.cues, T = k => C[k].t;
  const A = createSynth({ sampleRate: film.audio.sampleRate, duration: film.duration, fps: film.fps });
  const { S, db, rc, clamp, osc, svf, white, shape, sum, gain, peakOf, rmsOf, slowNoise, rng, place } = A;
  const placed = [];
  const mark = (what, t) => placed.push([t, what]);

  // ── open: room tone, the tick as the line starts, a sub bed rising into the hit ──
  A.roomTone(0, T('hit'), { level: -44, fadeOut: 0.05 });
  A.tick(T('line'), { level: -20, f: 3100, pan: -0.1 }); mark('tick (line)', T('line'));
  A.bed(T('line'), T('hit') - T('line'), { f: 40, level: -15 });

  // ── the hit: the strike, then struck steel ringing under the next shots ──
  // the strike sits 4 dB under the other sounds' scale, so normalising the film to the loudness target does not have to crush it
  A.strike(T('hit'), -4); mark('strike (hit)', T('hit'));
  A.ring(T('hit') + 0.012, film.duration - T('hit'), { level: -20 });

  // ── the slide: everything below is driven by FILM.motion.slideAt, the same function that moves the block on screen ──
  const SL = film.motion.slide, at = t => film.motion.slideAt(t), vMax = at(SL.launch + SL.ramp).v;
  const pan = t => clamp((-1.2 + at(t).s) / 1.6, -1, 1);           // the block's x, over the camera's half-width at its depth
  A.knock(SL.launch, { level: -11, pitch: 0.55, hard: 0.35, pan: pan(SL.launch), seed: 510 }); mark('shove knock (launch)', SL.launch);
  {
    const n = S(SL.stop - SL.launch + 0.3), vn = t => clamp(at(SL.launch + t).v / vMax, 0, 1), pn = t => pan(SL.launch + t);
    // rumble: the mass dragged over concrete; the lowpass falls with speed
    const flutter = slowNoise(n, 7, 530), rumble = svf(white(n, 531), t => 80 + 260 * vn(t), 0.8, 'lp');
    place(shape(rumble, t => Math.pow(vn(t), 0.7) * (0.8 + 0.2 * flutter[Math.min(n - 1, S(t))])), SL.launch, db(-26) / rmsOf(rumble), pn, 0.12);
    // grit: a Poisson train of micro-impacts, dense at speed, through two resonances
    const r = rng(532), imp = new Float64Array(n);
    for (let i = 0; i < n; i++) { const v = vn(i / A.SR), rate = v > 0 ? 60 + 900 * Math.pow(v, 1.6) : 0; if (Math.abs(r()) < rate / A.SR) imp[i] = Math.pow(0.3 + 0.7 * Math.abs(r()), 2) * (r() < 0 ? -1 : 1); }
    const grit = sum(svf(imp, 1500, 0.8, 'bp'), gain(svf(imp, 420, 1.0, 'bp'), 0.8));
    place(shape(grit, t => 0.3 + 0.7 * vn(t)), SL.launch, db(-22) / (peakOf(grit) || 1), pn, 0.12);
    // the squeal: friction pitch falls with speed and bites in a wandering gate, locking on for the last half second into the stop
    const grip = slowNoise(n, 5.5, 533), stopIn = SL.stop - SL.launch;
    const gate = t => { const i = Math.min(n - 1, S(t)); return Math.max(rc((t - (stopIn - 0.5)) / 0.2), rc(clamp((grip[i] + 0.1) / 0.3, 0, 1))) * (t < stopIn ? 1 : 0) * rc(t / 0.08); };
    const f = t => 300 + 1300 * Math.pow(vn(t), 0.9);
    const squeal = svf(sum(osc(n, f), osc(n, t => 2 * f(t), () => 0.45), osc(n, t => 3 * f(t), () => 0.18)), t => f(t) * 1.02, 1.8, 'bp');
    place(shape(squeal, t => gate(t) * (0.5 + 0.5 * vn(t)) * (1 - rc((t - (stopIn - 0.04)) / 0.04))), SL.launch, db(-17) / (peakOf(squeal) || 1), pn, 0.2);
  }
  A.knock(SL.stop, { level: -9, pitch: 0.8, hard: 0.75, pan: pan(SL.stop), contacts: 2, gap: 0.011, seed: 550 }); mark('stop knock (stop)', SL.stop);
  A.knock(SL.stop + SL.rock, { level: -15, pitch: 0.9, hard: 0.45, pan: pan(SL.stop), contacts: 1, seed: 560 }); mark('rock knock', SL.stop + SL.rock);

  // ── the lockup: the band's whoosh panned with it, the strike again, a fresh ring, a quiet dyad under the tagline ──
  A.whoosh(T('sweep'), T('land') - T('sweep'), { lo: 300, hi: 2800, level: -13, pan: t => -1 + 1 * Math.pow(t / (T('land') - T('sweep')), 2) });
  A.cutRing(T('land') - A.FRAME);
  A.strike(T('land'), -4); mark('strike (land)', T('land'));
  A.ring(T('land') + 0.012, film.duration - T('land'), { level: -20, seed: 310 });
  A.dyad(T('tagline'), film.duration - T('tagline'), [261.63, 392.0], { level: -27, release: 0.3 }); mark('dyad (tagline)', T('tagline'));

  const mix = A.mixdown({ silence: [T('hit'), T('land')], fadeOut: film.duration - T('fade') });
  A.writeWav(outFile, mix);
  return { file: outFile, sampleRate: A.SR, duration: film.duration, placed: placed.sort((a, b) => a[0] - b[0]) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = score(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log(`score: ${path.relative(ROOT, r.file)} · ${r.duration}s · ${r.sampleRate} Hz float`);
  for (const [t, what] of r.placed) console.log(`  ${t.toFixed(3).padStart(7)}s  ${what}`);
}
