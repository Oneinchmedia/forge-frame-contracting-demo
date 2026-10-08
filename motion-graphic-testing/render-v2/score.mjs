// ONE INCH · score.mjs — the soundtrack of the 30-second film, synthesized from nothing. No samples, no external files.
// usage: node score.mjs out/score.wav  → a 16-bit stereo 44.1 kHz WAV of exactly 30 s, then a measurement report against the targets.
//
// THE CUT (seconds)
//   0–3     the cut        black, a red hairline draws. Room tone only; a 40 Hz bed starts at 2.0 and rises to the hit.
//   3–7     one inch       macro steel, dust in a red beam. A soft steel tick at 3.0 as the ruler resolves.
//   7–9     the breath     time stretches. A heartbeat at 7.0, 8.0, 8.9; everything else drops out.
//   9.0     THE HIT        a shutter and one dry hit on the same frame; a struck-steel ring decays under everything for twenty seconds.
//   10–13   the chair      an empty wooden chair is shoved and skids eight feet across polished concrete (launch 10.15, stop 12.25); dust settles.
//   13–18   every medium   a red band sweeps left → right (13.2 → 17.8); four panels transform at 13.75 / 14.7 / 15.7 / 16.6.
//   18–22   ten thousand   a wall of screens fills; a counter climbs 0 → 10,000; one dry click per hundred takes; a low pulse bed rises.
//   22.0    cut            everything to silence except the ring, which is swelled back into hearing (not struck).
//   22–25   one            the tiles converge on the take; a soft tick at 24.75 as a line reveals.
//   25.54   THE LOCKUP     the shutter and the hit, identical to 9.0, then the ring.
//   28.5    the line       a quiet dyad under the tagline. Fade over the last second.
//
// DESIGN
//   Every sound is rendered offline into one of three stereo buses — main, ring (kept apart so the 22.0 cut can spare it), and a reverb
//   send — with a small DSP kit: a seeded noise source per sound (so one sound can change without changing another), a TPT state-variable
//   filter with per-sample cutoff and Q, modal resonator banks for struck steel and knocked wood, a stick-slip oscillator for the chair's
//   friction squeal, a Schroeder reverb for the studio, equal-power panning. The chair is scored from the same kinematics the picture uses
//   (modules/C-chair.js): the launch, the three-frame ramp, the linear friction deceleration, the front legs touching down, the rock at the
//   stop. Levels are declared in dBFS of the finished file: the master is normalised so the hits, the loudest transients, peak at −1 dBFS.

import fs from 'node:fs';
import path from 'node:path';

export const SR = 44100, DUR = 30, FPS = 30;
const N = SR * DUR, TAU = 2 * Math.PI, FRAME = 1 / FPS, MASTER_PEAK_DB = -1;

// ─────────────────────────────────────────── kit ───────────────────────────────────────────
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const win = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const ease = { out: x => 1 - Math.pow(1 - x, 3), in: x => x * x * x };
const rc = u => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));                 // raised cosine 0 → 1
const dB = x => Math.pow(10, x / 20), toDb = x => x > 0 ? 20 * Math.log10(x) : -Infinity;
const lvl = db => dB(db - MASTER_PEAK_DB);  // a level in dBFS of the finished file, expressed in pre-normalisation units (the hits peak at 1.0 before normalisation)
const S = t => Math.round(t * SR);
const fn = v => typeof v === 'function' ? v : () => v;

// mulberry32, returning −1..1. Each sound owns a stream.
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1; }; };
const white = (n, seed) => { const r = rng(seed), y = new Float64Array(n); for (let i = 0; i < n; i++) y[i] = r(); return y; };
// a slowly wandering random signal: breakpoints at `rate` Hz, smoothstep interpolation
function slowNoise(n, rate, seed) { const r = rng(seed), step = SR / rate, y = new Float64Array(n); let a = r(), b = r(), k = 0; for (let i = 0; i < n; i++) { let u = i / step - k; if (u >= 1) { k++; u -= 1; a = b; b = r(); } const s = u * u * (3 - 2 * u); y[i] = a + (b - a) * s; } return y; }
// a sine with per-sample frequency and an amplitude envelope
function osc(n, freq, env = () => 1, phase = 0) { const f = fn(freq), y = new Float64Array(n); let ph = phase; for (let i = 0; i < n; i++) { const t = i / SR; y[i] = Math.sin(ph) * env(t); ph += TAU * f(t) / SR; } return y; }
const shape = (x, env) => { for (let i = 0; i < x.length; i++) x[i] *= env(i / SR); return x; };
const sum = (...xs) => { const n = Math.max(...xs.map(x => x.length)), y = new Float64Array(n); for (const x of xs) for (let i = 0; i < x.length; i++) y[i] += x[i]; return y; };
const gain = (x, g) => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; };
const peakOf = x => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
const rmsOf = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length); };
// TPT state-variable filter (Zavalishin / Simper): stable under per-sample cutoff and Q modulation. bp has unity gain at centre.
function svf(x, fc, q = 0.707, mode = 'lp') {
  const n = x.length, y = new Float64Array(n), fF = fn(fc), qF = fn(q); let ic1 = 0, ic2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, g = Math.tan(Math.PI * clamp(fF(t), 10, 20000) / SR), k = 1 / Math.max(0.1, qF(t));
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    y[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2;
  }
  return y;
}
// a bank of decaying sines: modes = [[hz, amp, tau], ...]. Optional beating partner per mode (a second sine `beat` Hz away on the other side
// of the image), stereo spread, tune, a shared envelope, an attack. Returns [L, R].
function modal(dur, modes, o = {}) {
  const n = Math.ceil(dur * SR), L = new Float64Array(n), R = new Float64Array(n), r = rng(o.seed || 1), env = o.env || (() => 1), atk = o.attack || 0;
  modes.forEach(([f, a, tau], k) => {
    const pan = (o.spread || 0) * (k % 2 ? 1 : -1) * (0.55 + 0.45 * Math.abs(r()));
    for (let j = 0; j < (o.beat ? 2 : 1); j++) {
      const fj = f * (o.tune || 1) + (j ? o.beat * (0.5 + 0.5 * Math.abs(r())) : 0), aj = a * (j ? 0.7 : 1), ph = r() * Math.PI, w = TAU * fj / SR;
      const p = clamp(j ? -pan : pan, -1, 1), th = (p + 1) * Math.PI / 4, gl = Math.cos(th), gr = Math.sin(th), len = Math.min(n, Math.ceil(tau * 9 * SR));
      for (let i = 0; i < len; i++) { const t = i / SR, e = aj * Math.exp(-t / tau) * env(t) * (atk ? 1 - Math.exp(-t / atk) : 1), s = Math.sin(w * i + ph) * e; L[i] += s * gl; R[i] += s * gr; }
    }
  });
  return [L, R];
}
// freeverb-style studio: four combs + two allpasses per channel, pre-delay, damping; returns [L, R] from a mono send
function reverb(send, { pre = 0.012, fb = 0.78, damp = 0.35 } = {}) {
  const out = [new Float64Array(N), new Float64Array(N)];
  for (let ch = 0; ch < 2; ch++) {
    const cb = [1116, 1188, 1277, 1356].map(d => ({ b: new Float64Array(d + ch * 23), i: 0, f: 0 })), ap = [556, 441].map(d => ({ b: new Float64Array(d + ch * 23), i: 0 }));
    const pd = new Float64Array(S(pre) + 1); let pi = 0;
    for (let i = 0; i < N; i++) {
      pd[pi] = send[i]; pi = (pi + 1) % pd.length; const x = pd[pi]; let y = 0;
      for (const c of cb) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.b.length; y += o; }
      y *= 0.25;
      for (const a of ap) { const o = a.b[a.i], v = y + o * 0.5; a.b[a.i] = v; a.i = (a.i + 1) % a.b.length; y = o - 0.5 * v; }
      out[ch][i] = y;
    }
  }
  return out;
}

// ─────────────────────────────────────────── buses ───────────────────────────────────────────
const bus = { main: [new Float64Array(N), new Float64Array(N)], ring: [new Float64Array(N), new Float64Array(N)], send: new Float64Array(N) };
// pan law: constant power, scaled so a centred source is at unity in both channels and a hard-panned one is at unity in its channel —
// a declared dBFS level is then the peak of the louder channel whatever the pan
const panLR = p => { const th = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.min(1, Math.SQRT2 * Math.cos(th)), Math.min(1, Math.SQRT2 * Math.sin(th))]; };
// place a mono signal at t0 with a gain and a pan (number or function of local time); `send` is the reverb send amount
function place(src, t0, g = 1, pan = 0, send = 0, dst = bus.main) {
  const i0 = S(t0), pF = fn(pan);
  for (let i = 0; i < src.length; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; const v = src[i] * g, [gl, gr] = panLR(pF(i / SR)); dst[0][k] += v * gl; dst[1][k] += v * gr; if (send) bus.send[k] += v * send; }
}
function placeStereo([l, r], t0, g = 1, send = 0, dst = bus.main) {
  const i0 = S(t0);
  for (let i = 0; i < l.length; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; dst[0][k] += l[i] * g; dst[1][k] += r[i] * g; if (send) bus.send[k] += (l[i] + r[i]) * 0.5 * g * send; }
}

// ─────────────────────────────────────────── vocabulary ───────────────────────────────────────────
// THE HIT: a click transient, a noise burst whose lowpass sweeps 12 kHz → 150 Hz in 50 ms, a sub thump that drops 130 → 40 Hz, a short body.
function hitSig() {
  const click = shape(svf(white(S(0.004), 101), 1800, 0.7, 'hp'), t => Math.exp(-t / 0.0012) * 0.9);
  const spike = osc(S(0.02), 3200, t => Math.exp(-t / 0.0025) * 0.5);
  const burst = shape(svf(white(S(0.14), 102), t => 12000 * Math.pow(150 / 12000, clamp(t / 0.05, 0, 1)), 1.4, 'lp'), t => Math.exp(-t / 0.028) * 1.1);
  const sub = osc(S(0.9), t => 40 + 90 * Math.exp(-t / 0.045), t => (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / 0.13) * 1.0);
  const body = osc(S(0.3), t => 70 + 120 * Math.exp(-t / 0.03), t => Math.exp(-t / 0.05) * 0.55);
  return sum(click, spike, burst, sub, body);
}
// a camera shutter: the mirror slap (bandpassed noise with a low thunk), the first curtain 48 ms later, the second curtain 4 ms after that
function shutterSig(seed = 200) {
  const slap = sum(shape(svf(white(S(0.02), seed), 2800, 1.2, 'bp'), t => Math.exp(-t / 0.0035)), osc(S(0.03), t => 180 + 140 * Math.exp(-t / 0.008), t => Math.exp(-t / 0.012) * 0.8));
  const curtain = shape(svf(white(S(0.012), seed + 1), 5500, 1.5, 'bp'), t => Math.exp(-t / 0.0018) * 1.0);
  const curtain2 = shape(svf(white(S(0.008), seed + 2), 7000, 1.5, 'bp'), t => Math.exp(-t / 0.0012) * 0.6);
  const x = new Float64Array(S(0.07)); for (let i = 0; i < slap.length; i++) x[i] += slap[i]; for (let i = 0; i < curtain.length; i++) x[S(0.048) + i] += curtain[i]; for (let i = 0; i < curtain2.length; i++) x[S(0.052) + i] += curtain2[i];
  return gain(x, 1 / peakOf(x));
}
const shutter = (t0, db = -9, pan = 0, seed = 200) => place(shutterSig(seed), t0, lvl(db), pan, 0.12);
// THE STRIKE: the shutter and the hit on the same frame. Built once, scaled so its click peaks at exactly 1.0 before normalisation, and placed
// twice so 9.0 and 25.54 are sample-identical. The frame of silence before each is cut on the master.
const STRIKE = (() => { const x = sum(hitSig(), gain(shutterSig(200), 0.4)); return gain(x, 1 / peakOf(x)); })();
// everything already on the main bus stops inside that frame and stays out from under the strike's first quarter second, so the click's peak
// is the strike's alone and the two strikes measure the same
const hush = (t0, t1) => { bus.main[0].fill(0, S(t0), S(t1)); bus.main[1].fill(0, S(t0), S(t1)); bus.send.fill(0, S(t0), S(t1)); };
const strike = t0 => { hush(t0 - FRAME, t0 + 0.25); place(STRIKE, t0, lvl(MASTER_PEAK_DB), 0, 0.18); };
// struck steel: ten inharmonic partials, each with a beating partner a fraction of a hertz away on the other side of the image; the fundamental
// decays slowest. `env` is a shared multiplier used for the swell at 22.0: the same partials, phase-continuous, brought back without a strike.
const STEEL = [[1, 1, 4.2], [1.59, 0.55, 2.6], [2.14, 0.5, 1.7], [2.76, 0.3, 1.25], [3.52, 0.32, 0.95], [4.07, 0.18, 0.7], [5.09, 0.2, 0.52], [6.25, 0.12, 0.37], [7.46, 0.09, 0.26], [9.12, 0.05, 0.19]];
const RING_F = 523.25, RING_A0 = lvl(-21), RING_TAU = STEEL[0][2];   // fundamental: C5, its initial peak in dBFS, its decay
function ring(t0, dur) { placeStereo(modal(dur, STEEL.map(([r, a, tau]) => [RING_F * r, RING_A0 * a, tau]), { seed: 300, beat: 0.9, spread: 0.5 }), t0, 1, 0.06, bus.ring); }
// a soft tick: a short damped sine with a grain of noise
function tick(t0, g = 1, f = 2400, pan = 0, seed = 400) { place(sum(osc(S(0.05), f, t => Math.exp(-t / 0.012)), shape(svf(white(S(0.004), seed), 4000, 0.7, 'hp'), () => 0.8)), t0, lvl(-22) * g, pan, 0.08); }
// knocked wood (a chair leg meeting concrete): seven modes, a click, pitch and hardness controls; a second leg lands `gap` later
const WOOD = [[196, 1, 0.05], [287, 0.6, 0.04], [433, 0.55, 0.03], [612, 0.35, 0.022], [948, 0.3, 0.014], [1380, 0.2, 0.009], [2100, 0.1, 0.006]];
function knock(t0, { db = -16, pitch = 1, hard = 0.5, pan = 0, legs = 1, gap = 0.013, seed = 500 } = {}) {
  for (let l = 0; l < legs; l++) {
    const modes = WOOD.map(([f, a, tau]) => [f * pitch * (l ? 1.06 : 1), a * (f >= 600 ? 0.4 + 0.6 * hard : 1), tau]);
    const [L, R] = modal(0.6, modes, { seed: seed + l, spread: 0.1 });
    const click = shape(svf(white(S(0.003), seed + 10 + l), 4000, 0.7, 'lp'), t => Math.exp(-t / 0.0008) * 0.9 * hard);
    const x = sum(L, R, click); gain(x, 1 / peakOf(x));
    place(x, t0 + l * gap, lvl(db) * (l ? 0.75 : 1), pan, 0.3);
  }
}

// ─────────────────────────────────────────── act I · the cut, the inch, the breath ───────────────────────────────────────────
{ // room tone: decorrelated left/right noise, lowpassed, breathing slowly; RMS pinned to −40 dBFS; drops out by the first heartbeat
  const n = S(7.2), env = t => rc(t / 0.03) * (1 - rc((t - 6.45) / 0.55)) * (1 + 0.12 * Math.sin(TAU * 0.09 * t + 1));
  const ch = [11, 12].map(seed => shape(svf(svf(white(n, seed), 900, 0.6, 'lp'), 60, 0.7, 'hp'), env)), g = lvl(-40) / rmsOf(ch[0].subarray(0, S(2)));
  placeStereo(ch, 0, g);
}
{ // dust in the red beam (3–7): a whisper of high air that drifts; near-subliminal
  const n = S(4.0), drift = slowNoise(n, 0.7, 13), x = svf(white(n, 14), 5000, 0.6, 'hp');
  place(shape(x, t => rc(t / 1.2) * (1 - rc((t - 3.3) / 0.7)) * (0.7 + 0.3 * drift[Math.min(n - 1, S(t))])), 3.0, lvl(-56) / rmsOf(x), 0.2);
}
tick(3.0, 1, 3100, -0.1);                                                                   // the ruler resolves: a steel tick
{ // the bed: 40 Hz from 2.0, rising to the hit; a touch of 80 Hz so it reads on small speakers
  const n = S(7.0), env = t => Math.pow(t / 7, 1.8) * (0.4 + 0.6 * rc(t / 1.5));
  place(osc(n, 40, env), 2.0, lvl(-13)); place(osc(n, 80, env), 2.0, lvl(-24));
}
{ // the breath: a held inhale rising under the heartbeat, cut by the frame of silence before the hit
  const n = S(2.0), x = svf(white(n, 15), t => 700 + 500 * t / 2, 2.5, 'bp');
  place(shape(x, t => Math.pow(rc(t / 1.8), 2)), 7.0, lvl(-40) / rmsOf(x), 0);
}
// heartbeat at 48 bpm stretched by the cut: 7.0, 8.0, 8.9. Lub (62 → 38 Hz) and dub 175 ms later (72 → 46 Hz); soft 8 ms attacks
function heart(t0, db) {
  const beat = (t, f0, f1, tau, g) => place(sum(osc(S(0.7), t => f1 + (f0 - f1) * Math.exp(-t / 0.05), t => (1 - Math.exp(-t / 0.008)) * Math.exp(-t / tau)), osc(S(0.25), t => 2 * (f1 + (f0 - f1) * Math.exp(-t / 0.05)), t => (1 - Math.exp(-t / 0.006)) * Math.exp(-t / 0.06) * 0.22)), t, g);
  beat(t0, 62, 38, 0.16, lvl(db)); beat(t0 + 0.175, 72, 46, 0.11, lvl(db) * 0.7);
}
heart(7.0, -7.0); heart(8.0, -6.0); heart(8.9, -5.0);

// ─────────────────────────────────────────── act II · the hit, the chair ───────────────────────────────────────────
strike(9.0); ring(9.012, 30 - 9.012);                                                        // the ring's swell is applied on its bus at 22.0 (see master)

// the chair: kinematics copied from modules/C-chair.js so the sound is bound to the picture (p = (t − 10) / 3)
const CH = { t0: 10, len: 3, tL: 0.05, ramp: 0.034, tS: 0.75, travel: 2.489, X0: -0.95, Z: 5.0 };
function chairMotion(p) {
  const { tL, ramp, tS } = CH, T = tS - tL - ramp, dR = ramp * 0.75, V = 1 / (dR + T / 2);
  if (p <= tL) return { s: 0, v: 0 };
  if (p <= tL + ramp) { const r = (p - tL) / ramp; return { s: V * ramp * (r - (1 - Math.pow(1 - r, 4)) / 4), v: V * (1 - Math.pow(1 - r, 3)) }; }
  if (p <= tS) { const u = (p - tL - ramp) / T; return { s: V * dR + V * T * (u - u * u / 2), v: V * (1 - u) }; }
  return { s: 1, v: 0 };
}
const chairAt = t => { const m = chairMotion((t - CH.t0) / CH.len); return { s: m.s, v: m.v * CH.travel / CH.len, x: CH.X0 + CH.travel * m.s }; };
const chairPan = t => clamp(chairAt(t).x / CH.Z * 1.8, -1, 1);                                // the image: x over depth, widened
const T_LAUNCH = CH.t0 + CH.len * CH.tL, T_PEAK = CH.t0 + CH.len * (CH.tL + CH.ramp), T_STOP = CH.t0 + CH.len * CH.tS, V_MAX = chairAt(T_PEAK).v;
const T_FRONT = 10.50;                                                                        // the pitch crosses zero: the front legs touch down, the rear legs lift and hover
{ // the shove at launch: a dull, deep knock, a whump, and the dust kicked from under the rear legs
  knock(T_LAUNCH, { db: -13, pitch: 0.55, hard: 0.35, pan: chairPan(T_LAUNCH), seed: 510 });
  place(osc(S(0.5), t => 42 + 40 * Math.exp(-t / 0.06), t => (1 - Math.exp(-t / 0.003)) * Math.exp(-t / 0.1)), T_LAUNCH, lvl(-18), chairPan(T_LAUNCH));
  const puff = svf(white(S(0.5), 520), 3200, 0.8, 'bp'); place(shape(puff, t => rc(t / 0.03) * Math.exp(-t / 0.12)), T_LAUNCH + 0.01, lvl(-38) / peakOf(puff) * 2, chairPan(T_LAUNCH) - 0.1);
}
{ // the skid: rumble, grit, friction squeal, scrape; all driven by v(t) and panned along the chair's path
  const n = S(T_STOP - T_LAUNCH + 0.35), vn = t => clamp(chairAt(T_LAUNCH + t).v / V_MAX, 0, 1), pan = t => chairPan(T_LAUNCH + t);
  // rumble: the mass of the chair dragged over the slab; lowpassed noise whose cutoff falls with speed, a little slow flutter of contact
  const flutter = slowNoise(n, 7, 530);
  const rumble = svf(white(n, 531), t => 80 + 260 * vn(t), 0.8, 'lp');
  place(shape(rumble, t => Math.pow(vn(t), 0.7) * (0.8 + 0.2 * flutter[Math.min(n - 1, S(t))])), T_LAUNCH, lvl(-30) / rmsOf(rumble), pan, 0.12);
  // grit: the legs chatter over the concrete as a Poisson train of micro-impacts, dense at speed, through two resonances; a step up when the front legs land
  const r = rng(532), imp = new Float64Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR, v = vn(t), rate = v > 0 ? 60 + 900 * Math.pow(v, 1.6) : 0; if (Math.abs(r()) < rate / SR) imp[i] = Math.pow(0.3 + 0.7 * Math.abs(r()), 2) * (r() < 0 ? -1 : 1); }
  const grit = sum(svf(imp, 1500, 0.8, 'bp'), gain(svf(imp, 420, 1.0, 'bp'), 0.8));
  place(shape(grit, t => (0.3 + 0.7 * vn(t)) * (T_LAUNCH + t > T_FRONT ? 1 : 0.65)), T_LAUNCH, lvl(-27) / peakOf(grit), pan, 0.12);
  // the friction squeal: stick-slip. Pitch falls with speed (1450 → 300 Hz). It bites in windows where a wandering "grip" crosses a threshold,
  // and locks on for the final descent into the stop; the rear legs squeal first, the front legs take over when they touch down.
  const grip = slowNoise(n, 5.5, 533), jitter = slowNoise(n, 14, 534);
  const bite = t => { const T = T_LAUNCH + t; return rc((T - 10.19) / 0.04) * (1 - rc((T - 10.3) / 0.12)); };   // the launch: a short high skree as the legs first drag
  const profile = t => { const T = T_LAUNCH + t; return Math.max(bite(t), rc((T - 10.28) / 0.45)) * (T < T_STOP ? 1 : 0); };
  const lock = t => Math.max(bite(t), rc((T_LAUNCH + t - (T_STOP - 0.6)) / 0.25));            // the last 0.6 s: continuous, descending into the stop
  const gate = t => { const i = Math.min(n - 1, S(t)); const thr = 0.25 - 0.5 * profile(t); return Math.max(lock(t), rc(clamp((grip[i] - thr) / 0.3, 0, 1))) * profile(t); };
  const f = t => { const i = Math.min(n - 1, S(t)); return (320 + 1380 * Math.pow(vn(t), 0.9)) * (1 + 0.012 * jitter[i]) * (T_LAUNCH + t > T_FRONT ? 1 : 0.93); };
  const sq = osc(n, f, () => 1); const sq2 = osc(n, t => 2 * f(t), () => 0.45), sq3 = osc(n, t => 3 * f(t), () => 0.18);
  const squeal = svf(sum(sq, sq2, sq3), t => f(t) * 1.02, 1.8, 'bp');
  place(shape(squeal, t => gate(t) * (0.5 + 0.5 * vn(t)) * (1 - 0.3 * bite(t)) * (1 - rc((T_LAUNCH + t - (T_STOP - 0.05)) / 0.05))), T_LAUNCH, lvl(-18) / peakOf(squeal), pan, 0.2);
  // scrape: a little high air on the skid, kept well under the squeal
  const scrape = svf(svf(white(n, 535), 3500, 0.7, 'hp'), 9000, 0.7, 'lp'); place(shape(scrape, t => Math.pow(vn(t), 1.5)), T_LAUNCH, lvl(-49) / rmsOf(scrape), pan, 0.1);
}
knock(T_FRONT, { db: -18, pitch: 1.05, hard: 0.6, pan: chairPan(T_FRONT), legs: 2, gap: 0.016, seed: 540 });      // the front legs touch down at speed
knock(T_STOP, { db: -13, pitch: 0.85, hard: 0.7, pan: chairPan(T_STOP), legs: 2, gap: 0.011, seed: 550 });         // the catch: the rear legs land as it stops
place(osc(S(0.5), t => 96 - 8 * (1 - Math.exp(-t / 0.1)), t => (1 - Math.exp(-t / 0.004)) * Math.exp(-t / 0.16)), T_STOP, lvl(-22), chairPan(T_STOP), 0.1); // the back posts flex: a low wooden thrum
knock(T_STOP + 0.21, { db: -16, pitch: 0.9, hard: 0.45, pan: chairPan(T_STOP), legs: 2, gap: 0.019, seed: 560 });  // the rock back: the rear legs land again
knock(T_STOP + 0.36, { db: -27, pitch: 1.1, hard: 0.3, pan: chairPan(T_STOP), legs: 1, seed: 570 });               // the front legs settle
{ // dust settles: a soft noise tail around the chair, decorrelated left/right, with a few grains
  const n = S(1.3), ch = [581, 582].map(seed => svf(white(n, seed), 4200, 0.6, 'bp')), env = t => rc(t / 0.06) * Math.exp(-t / 0.35), [gl, gr] = panLR(chairPan(T_STOP));
  placeStereo([shape(ch[0], env), shape(ch[1], env)], T_STOP - 0.04, lvl(-47) / rmsOf(ch[0]) * (gl + gr) / 2);
}
// a slow drone under acts II and III: two notes a fifth apart, each a detuned pair with an octave whisper, breathing; moving on the cuts
function drone(t0, t1, [fa, fb], db, fadeIn = 0.9, fadeOut = 0.9) {
  const n = S(t1 - t0), env = t => rc(t / fadeIn) * (1 - rc((t - (t1 - t0 - fadeOut)) / fadeOut)) * (0.85 + 0.15 * Math.sin(TAU * 0.07 * t));
  const voice = (f, g, pan) => place(sum(osc(n, f - 0.12, env), osc(n, f + 0.12, env, 1.1), osc(n, 2 * f + 0.2, t => env(t) * 0.2)), t0, lvl(db) * g, pan);
  voice(fa, 0.5, -0.2); voice(fb, 0.38, 0.2);
}
drone(9.4, 13.5, [65.41, 98.0], -30, 1.6, 0.8);         // C2 + G2 under the chair
drone(12.9, 18.5, [58.27, 87.31], -37, 0.9, 0.8);       // Bb1 + F2: a step down for the passage, quieter so the band's pan reads
drone(17.8, 22.0, [73.42, 110.0], -30, 0.9, 0.01);      // D2 + A2 rising under the wall; cut at 22.0 with everything else

// ─────────────────────────────────────────── act III · through every medium, ten thousand, one ───────────────────────────────────────────
const BAND0 = 13.2, BAND1 = 17.8, bandPan = t => -1 + 2 * win(t, BAND0, BAND1);
{ // the band's passage: a resonant whoosh that rises 400 → 3200 Hz and pans with the band; a sub bloom at the centre; a wide bright air
  const n = S(BAND1 - BAND0), u = t => t / (BAND1 - BAND0);
  const core = svf(white(n, 600), t => 400 * Math.pow(8, u(t)), 2.4, 'bp'); place(shape(core, t => 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * u(t)), 0.5)), BAND0, lvl(-12) / peakOf(core), t => bandPan(BAND0 + t), 0.08);
  const bloom = svf(white(n, 601), 160, 0.7, 'lp'); place(shape(bloom, t => Math.pow(Math.sin(Math.PI * u(t)), 3)), BAND0, lvl(-27) / rmsOf(bloom), t => bandPan(BAND0 + t));
  const air = [602, 603].map(seed => svf(white(n, seed), 5500, 0.6, 'hp')), aenv = t => Math.pow(Math.sin(Math.PI * u(t)), 2), ga = lvl(-38) / rmsOf(air[0]);
  const wide = [new Float64Array(n), new Float64Array(n)];
  for (let i = 0; i < n; i++) { const t = i / SR, [gl, gr] = panLR(bandPan(BAND0 + t)); wide[0][i] = air[0][i] * aenv(t) * gl * ga; wide[1][i] = air[1][i] * aenv(t) * gr * ga; }
  placeStereo(wide, BAND0, 1);
}
shutter(13.75, -14, bandPan(13.75), 610);                                                  // a photograph starts moving
{ // a flat logo becomes metal: a short metallic ping with beating partials and a sheen
  const [L, R] = modal(0.7, [[2093, 1, 0.22], [3310, 0.6, 0.16], [4850, 0.4, 0.11], [6530, 0.25, 0.08], [8870, 0.12, 0.05]], { seed: 620, beat: 2.2, spread: 0.3 });
  const sheen = shape(svf(white(S(0.03), 621), 6000, 0.8, 'hp'), t => Math.exp(-t / 0.006));
  const [gl, gr] = panLR(bandPan(14.7)); placeStereo([sum(gain(L, gl * 1.3), gain(sheen, gl * 0.6)), sum(gain(R, gr * 1.3), gain(sheen, gr * 0.6))], 14.7, lvl(-18), 0.15);
}
{ // text lifts off the page and is spoken: a breath — two gliding formants on noise, exhaled
  const n = S(0.6), x = sum(svf(white(n, 630), t => 1300 - 600 * t / 0.6, 2.0, 'bp'), gain(svf(white(n, 631), t => 2600 - 800 * t / 0.6, 3.0, 'bp'), 0.4));
  place(shape(x, t => Math.pow(Math.sin(Math.PI * t / 0.6), 1.4)), 15.7, lvl(-23) / peakOf(x), bandPan(15.7), 0.1);
}
{ // a wireframe renders: a soft glass chime, a fifth, with a gentle attack
  const [L, R] = modal(1.6, [[1046.5, 1, 0.6], [1568, 0.7, 0.5], [2093, 0.3, 0.4], [2890, 0.1, 0.25], [3136, 0.18, 0.3]], { seed: 640, beat: 0.8, spread: 0.35, attack: 0.008 });
  const [gl, gr] = panLR(bandPan(16.6)); placeStereo([gain(L, gl * 1.2), gain(R, gr * 1.2)], 16.6, lvl(-21), 0.2);
}
{ // ten thousand takes: one dry click per hundred, exactly where the counter n(t) = ease.out(win(p, 0.02, 0.9)) · 10000 crosses each hundred.
  // The counter eases out, so the clicks start 12 ms apart and spread to the 10,000th at 21.6. They pan with the wall filling left to right.
  const tOf = k => 18 + 4 * (0.02 + 0.88 * (1 - Math.cbrt(1 - k / 100))), fill = t => ease.out(win((t - 18) / 4, 0, 0.85)), r = rng(700);
  for (let k = 1; k <= 100; k++) {
    const t = tOf(k), u = k / 100, front = clamp(-1 + 2 * 1.25 * fill(t), -1, 1), pan = front >= 1 ? r() * 0.8 : clamp(front + r() * 0.25, -1, 1);
    const x = sum(svf(shape(white(S(0.006), 701 + k), t => t < 0.0004 ? 1 : 0), 2300 + 600 * r(), 1.6, 'bp'), gain(shape(white(S(0.001), 801 + k), () => 1), 0.4));
    place(x, t, lvl(-30 + 12 * u) / peakOf(x), pan);
  }
  knock(tOf(100), { db: -20, pitch: 1.4, hard: 0.9, pan: 0, seed: 710 });                 // 10,000: the counter lands
  // a low pulse bed rising under the wall: D1 with its octave, throbbing at 1.6 Hz
  const n = S(4.0), env = t => Math.pow(t / 4, 1.5) * (0.72 + 0.28 * Math.sin(TAU * 1.6 * t));
  place(osc(n, 36.71, env), 18.0, lvl(-22)); place(osc(n, 73.42, env), 18.0, lvl(-30));
}
tick(24.75, 0.8, 2000, 0.1, 410);                                                          // the line reveals

// ─────────────────────────────────────────── act IV · the lockup, the line ───────────────────────────────────────────
// the second strike re-excites the plate: the first ring ends inside the frame of silence before it, and a fresh ring begins
const RING_END = S(25.54 - FRAME); bus.ring[0].fill(0, RING_END); bus.ring[1].fill(0, RING_END);
strike(25.54); ring(25.552, 30 - 25.552);
{ // a quiet dyad under the tagline: C4 + G4, slow attack, held into the fade
  const n = S(1.6), env = t => rc(t / 0.35);
  for (const [f, g, pan] of [[261.63, 1, -0.25], [392.0, 0.7, 0.25]]) place(sum(osc(n, f - 0.4, env), osc(n, f + 0.4, env, 0.7), osc(n, 2 * f, t => env(t) * 0.12)), 28.5, lvl(-30) * g, pan, 0.25);
}

// ─────────────────────────────────────────── master ───────────────────────────────────────────
const L = new Float64Array(N), R = new Float64Array(N);
{ // the studio: the reverb return, highpassed and darkened, added to the main bus
  const [vl, vr] = reverb(bus.send); const hp = x => svf(svf(x, 180, 0.7, 'hp'), 5500, 0.6, 'lp'); const wl = hp(vl), wr = hp(vr);
  for (let i = 0; i < N; i++) { bus.main[0][i] += wl[i] * 0.55; bus.main[1][i] += wr[i] * 0.55; }
}
{ // 22.0: everything cuts except the ring (3 ms ramp); nothing but the ring and the 24.75 tick until the lockup
  const a = S(22.0), b = S(24.7), ramp = S(0.003);
  for (let i = a - ramp; i < b; i++) { const m = i < a ? rc((a - i) / ramp) : 0; bus.main[0][i] *= m; bus.main[1][i] *= m; }
}
{ // the swell: the ring brought back without a strike. The bus is multiplied by a raised cosine over 0.7 s to a gain that lands the
  // fundamental (decayed since 9.012) at −15 dBFS, then held so it decays naturally again into the lockup.
  const target = lvl(-14), at = 22.7, natural = RING_A0 * 1.7 * Math.exp(-(at - 9.012) / RING_TAU), K = Math.max(0, target / natural - 1);
  for (let i = S(21.9); i < RING_END; i++) { const t = i / SR, g = 1 + K * rc((t - 22.0) / 0.7); bus.ring[0][i] *= g; bus.ring[1][i] *= g; }
}
for (let i = 0; i < N; i++) { L[i] = bus.main[0][i] + bus.ring[0][i]; R[i] = bus.main[1][i] + bus.ring[1][i]; }
for (const T of [9.0, 25.54]) { // the pre-echo: one frame of silence before each hit, so it lands harder
  const a = S(T - FRAME), b = S(T), ramp = S(0.002);
  for (let i = a - ramp; i < b; i++) { const m = i < a ? rc((a - i) / ramp) : 0; L[i] *= m; R[i] *= m; }
}
for (let i = 0; i < S(0.005); i++) { const m = rc(i / S(0.005)); L[i] *= m; R[i] *= m; }                       // no click at the head
for (let i = N - SR; i < N; i++) { const m = 1 - rc((i - (N - SR)) / SR); L[i] *= m; R[i] *= m; }               // a clean fade over the last second
let peak = 0, peakAt = 0; for (let i = 0; i < N; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > peak) { peak = a; peakAt = i; } }
const norm = peak > 0 ? dB(MASTER_PEAK_DB) / peak : 1;

// ─────────────────────────────────────────── write ───────────────────────────────────────────
const out = process.argv[2] || 'out/score.wav'; fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
const buf = Buffer.alloc(44 + N * 4), w32 = (o, v) => buf.writeUInt32LE(v, o), w16 = (o, v) => buf.writeUInt16LE(v, o);
buf.write('RIFF', 0); w32(4, 36 + N * 4); buf.write('WAVE', 8); buf.write('fmt ', 12); w32(16, 16); w16(20, 1); w16(22, 2); w32(24, SR); w32(28, SR * 4); w16(32, 4); w16(34, 16); buf.write('data', 36); w32(40, N * 4);
const dither = rng(9); const q = v => clamp(Math.round(v * 32767 + (dither() + dither()) * 0.5), -32768, 32767);   // TPDF dither, ±1 LSB
for (let i = 0; i < N; i++) { buf.writeInt16LE(q(L[i] * norm), 44 + i * 4); buf.writeInt16LE(q(R[i] * norm), 46 + i * 4); }
fs.writeFileSync(out, buf);

// ─────────────────────────────────────────── report ───────────────────────────────────────────
const stat = (t0, t1) => { let p = 0, pi = 0, s = 0, sl = 0, sr = 0, n = 0; for (let i = S(t0); i < Math.min(N, S(t1)); i++) { const l = L[i] * norm, r = R[i] * norm, a = Math.max(Math.abs(l), Math.abs(r)); if (a > p) { p = a; pi = i; } s += (l * l + r * r) / 2; sl += l * l; sr += r * r; n++; } return { peak: toDb(p), at: pi / SR, mean: toDb(Math.sqrt(s / n)), bal: toDb(Math.sqrt(sr / n)) - toDb(Math.sqrt(sl / n)) }; };
const f1 = v => (v === -Infinity ? '  -inf' : v.toFixed(1).padStart(6));
const rows = [
  ['room tone 0–2', 0, 2, s => Math.abs(s.mean + 40) < 2.5, 'mean ≈ −40'],
  ['heartbeat 7–9', 7, 9, s => Math.abs(s.peak + 5) < 1.5, 'peak ≈ −5'],
  ['hit 9.0', 8.95, 9.2, s => s.peak > -1.05, 'peak ≈ −1'],
  ['chair 10.1–12.7', 10.1, 12.7, s => s.peak < -8, 'under the hits'],
  ['band left 13.2–14.4', 13.2, 14.4, s => s.bal < -4, 'left-heavy'],
  ['band right 16.6–17.8', 16.6, 17.8, s => s.bal > 4, 'right-heavy'],
  ['takes 18–22', 18, 22, s => s.peak < -5, 'under the hits'],
  ['ring 22–25', 22, 25, s => s.peak > -22, 'peak > −22'],
  ['lockup 25.54', 25.5, 25.7, s => s.peak > -1.05, 'peak ≈ −1'],
  ['line 28.5–30', 28.5, 30, s => s.peak < -10, 'ring + dyad, quiet'],
];
console.log(`score: ${out} · ${DUR}s · peak before norm ${peak.toFixed(3)} at ${(peakAt / SR).toFixed(3)}s · chair v_max ${V_MAX.toFixed(2)} m/s, stop ${T_STOP.toFixed(2)}s`);
console.log('window                   peak  (at s)    mean    R−L   target');
for (const [name, a, b, ok, target] of rows) { const s = stat(a, b); console.log(`${name.padEnd(22)} ${f1(s.peak)} ${s.at.toFixed(3).padStart(7)}  ${f1(s.mean)} ${f1(s.bal)}   ${target.padEnd(20)} ${ok(s) ? 'ok' : 'MISS'}`); }
