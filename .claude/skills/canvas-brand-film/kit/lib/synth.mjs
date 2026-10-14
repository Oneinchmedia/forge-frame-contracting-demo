// lib/synth.mjs: a small offline DSP kit for scoring a film in code. No samples, no external files, deterministic (every noise source is seeded).
// createSynth({ sampleRate, duration }) returns the kit bound to one mix. Levels are in dB relative to the strike, which peaks at 0 dB;
// render.mjs sets the final loudness, so write the mix by feel (relative levels), not by absolute dBFS.
import fs from 'node:fs';
import path from 'node:path';

export function createSynth({ sampleRate: SR = 48000, duration: DUR, fps = 30 }) {
  const N = Math.round(SR * DUR), TAU = 2 * Math.PI, FRAME = 1 / fps;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u, win = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
  const rc = u => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));          // raised cosine 0 → 1
  const db = x => Math.pow(10, x / 20), toDb = x => x > 0 ? 20 * Math.log10(x) : -Infinity;
  const S = t => Math.round(t * SR), fn = v => typeof v === 'function' ? v : () => v;
  // mulberry32 returning -1..1; each sound owns its own stream, so changing one sound never changes another
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1; }; };
  const white = (n, seed) => { const r = rng(seed), y = new Float64Array(n); for (let i = 0; i < n; i++) y[i] = r(); return y; };
  // a slowly wandering random signal: breakpoints at `rate` Hz, smoothstep between them
  function slowNoise(n, rate, seed) { const r = rng(seed), step = SR / rate, y = new Float64Array(n); let a = r(), b = r(), k = 0; for (let i = 0; i < n; i++) { let u = i / step - k; if (u >= 1) { k++; u -= 1; a = b; b = r(); } y[i] = a + (b - a) * u * u * (3 - 2 * u); } return y; }
  // a sine with per-sample frequency and amplitude envelope (both may be functions of local time)
  function osc(n, freq, env = () => 1, phase = 0) { const f = fn(freq), e = fn(env), y = new Float64Array(n); let ph = phase; for (let i = 0; i < n; i++) { const t = i / SR; y[i] = Math.sin(ph) * e(t); ph += TAU * f(t) / SR; } return y; }
  const shape = (x, env) => { for (let i = 0; i < x.length; i++) x[i] *= env(i / SR); return x; };
  const sum = (...xs) => { const n = Math.max(...xs.map(x => x.length)), y = new Float64Array(n); for (const x of xs) for (let i = 0; i < x.length; i++) y[i] += x[i]; return y; };
  const gain = (x, g) => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; };
  const peakOf = x => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
  const rmsOf = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length); };
  const normalize = x => gain(x, 1 / (peakOf(x) || 1));
  // TPT state-variable filter (Zavalishin/Simper): stable under per-sample cutoff and Q modulation. mode: lp | bp | hp
  function svf(x, fc, q = 0.707, mode = 'lp') {
    const n = x.length, y = new Float64Array(n), fF = fn(fc), qF = fn(q); let ic1 = 0, ic2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, g = Math.tan(Math.PI * clamp(fF(t), 10, SR * 0.45) / SR), k = 1 / Math.max(0.1, qF(t));
      const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      y[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2;
    }
    return y;
  }
  // a bank of decaying sines, modes = [[hz, amp, tau], ...]; optional beating partner per mode, stereo spread, shared envelope, attack. → [L, R]
  function modal(dur, modes, o = {}) {
    const n = Math.ceil(dur * SR), L = new Float64Array(n), R = new Float64Array(n), r = rng(o.seed || 1), env = o.env || (() => 1), atk = o.attack || 0;
    modes.forEach(([f, a, tau], k) => {
      const pan = (o.spread || 0) * (k % 2 ? 1 : -1) * (0.55 + 0.45 * Math.abs(r()));
      for (let j = 0; j < (o.beat ? 2 : 1); j++) {
        const fj = f + (j ? o.beat * (0.5 + 0.5 * Math.abs(r())) : 0), aj = a * (j ? 0.7 : 1), ph = r() * Math.PI, w = TAU * fj / SR;
        const p = clamp(j ? -pan : pan, -1, 1), th = (p + 1) * Math.PI / 4, gl = Math.cos(th), gr = Math.sin(th), len = Math.min(n, Math.ceil(tau * 9 * SR));
        for (let i = 0; i < len; i++) { const t = i / SR, e = aj * Math.exp(-t / tau) * env(t) * (atk ? 1 - Math.exp(-t / atk) : 1), s = Math.sin(w * i + ph) * e; L[i] += s * gl; R[i] += s * gr; }
      }
    });
    return [L, R];
  }
  // a freeverb-style room from a mono send → [L, R]
  function reverb(send, { pre = 0.012, fb = 0.78, damp = 0.35 } = {}) {
    const out = [new Float64Array(N), new Float64Array(N)], k = SR / 44100;
    for (let ch = 0; ch < 2; ch++) {
      const cb = [1116, 1188, 1277, 1356].map(d => ({ b: new Float64Array(Math.round((d + ch * 23) * k)), i: 0, f: 0 })), ap = [556, 441].map(d => ({ b: new Float64Array(Math.round((d + ch * 23) * k)), i: 0 }));
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

  // ── buses: main, ring (kept apart so a cut to silence can spare it), and a reverb send ──
  const bus = { main: [new Float64Array(N), new Float64Array(N)], ring: [new Float64Array(N), new Float64Array(N)], send: new Float64Array(N) };
  // constant-power pan, scaled so a centred source is unity in both channels
  const panLR = p => { const th = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.min(1, Math.SQRT2 * Math.cos(th)), Math.min(1, Math.SQRT2 * Math.sin(th))]; };
  // place a mono signal at t0 with a gain, a pan (number or function of local time) and a reverb send
  function place(src, t0, g = 1, pan = 0, send = 0, dst = bus.main) {
    const i0 = S(t0), pF = fn(pan);
    for (let i = 0; i < src.length; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; const v = src[i] * g, [gl, gr] = panLR(pF(i / SR)); dst[0][k] += v * gl; dst[1][k] += v * gr; if (send) bus.send[k] += v * send; }
  }
  function placeStereo([l, r], t0, g = 1, send = 0, dst = bus.main) {
    const i0 = S(t0);
    for (let i = 0; i < l.length; i++) { const k = i0 + i; if (k < 0 || k >= N) continue; dst[0][k] += l[i] * g; dst[1][k] += r[i] * g; if (send) bus.send[k] += (l[i] + r[i]) * 0.5 * g * send; }
  }
  // clear everything already on the main bus in a window (used for the frame of silence before a hit)
  const hush = (t0, t1) => { for (const b of [bus.main[0], bus.main[1], bus.send]) b.fill(0, Math.max(0, S(t0)), Math.min(N, S(t1))); };

  // ── vocabulary ──
  // THE HIT: a click, a noise burst whose lowpass sweeps 12 kHz → 150 Hz in 50 ms, a sub thump dropping 130 → 40 Hz, a short body
  function hitSig() {
    const click = shape(svf(white(S(0.004), 101), 1800, 0.7, 'hp'), t => Math.exp(-t / 0.0012) * 0.9);
    const spike = osc(S(0.02), 3200, t => Math.exp(-t / 0.0025) * 0.5);
    const burst = shape(svf(white(S(0.14), 102), t => 12000 * Math.pow(150 / 12000, clamp(t / 0.05, 0, 1)), 1.4, 'lp'), t => Math.exp(-t / 0.028) * 1.1);
    const sub = osc(S(0.9), t => 40 + 90 * Math.exp(-t / 0.045), t => (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / 0.13));
    const body = osc(S(0.3), t => 70 + 120 * Math.exp(-t / 0.03), t => Math.exp(-t / 0.05) * 0.55);
    return sum(click, spike, burst, sub, body);
  }
  // a camera shutter: mirror slap, first curtain 48 ms later, second curtain 4 ms after that
  function shutterSig(seed = 200) {
    const slap = sum(shape(svf(white(S(0.02), seed), 2800, 1.2, 'bp'), t => Math.exp(-t / 0.0035)), osc(S(0.03), t => 180 + 140 * Math.exp(-t / 0.008), t => Math.exp(-t / 0.012) * 0.8));
    const c1 = shape(svf(white(S(0.012), seed + 1), 5500, 1.5, 'bp'), t => Math.exp(-t / 0.0018)), c2 = shape(svf(white(S(0.008), seed + 2), 7000, 1.5, 'bp'), t => Math.exp(-t / 0.0012) * 0.6);
    const x = new Float64Array(S(0.07)); slap.forEach((v, i) => x[i] += v); c1.forEach((v, i) => x[S(0.048) + i] += v); c2.forEach((v, i) => x[S(0.052) + i] += v);
    return normalize(x);
  }
  // the strike = hit + shutter, built once and normalised to peak 1.0, so every strike in the film is sample-identical
  const STRIKE = normalize(sum(hitSig(), gain(shutterSig(200), 0.4)));
  // a strike at t0: one frame of silence before it (it lands harder), and nothing else on the main bus under its first quarter second
  const strike = (t0, level = 0, send = 0.18) => { hush(t0 - FRAME, t0 + 0.25); place(STRIKE, t0, db(level), 0, send); };
  // struck steel: ten inharmonic partials with beating partners; the fundamental decays slowest. Goes on the ring bus.
  const STEEL = [[1, 1, 4.2], [1.59, 0.55, 2.6], [2.14, 0.5, 1.7], [2.76, 0.3, 1.25], [3.52, 0.32, 0.95], [4.07, 0.18, 0.7], [5.09, 0.2, 0.52], [6.25, 0.12, 0.37], [7.46, 0.09, 0.26], [9.12, 0.05, 0.19]];
  function ring(t0, dur, { f = 523.25, level = -20, seed = 300 } = {}) { placeStereo(modal(dur, STEEL.map(([r, a, tau]) => [f * r, db(level) * a, tau]), { seed, beat: 0.9, spread: 0.5 }), t0, 1, 0.06, bus.ring); }
  const cutRing = t => { bus.ring[0].fill(0, S(t)); bus.ring[1].fill(0, S(t)); };
  // a soft tick: a short damped sine with a grain of noise
  function tick(t0, { level = -22, f = 2400, pan = 0, seed = 400 } = {}) { place(sum(osc(S(0.05), f, t => Math.exp(-t / 0.012)), shape(svf(white(S(0.004), seed), 4000, 0.7, 'hp'), () => 0.8)), t0, db(level), pan, 0.08); }
  // knocked wood or a block meeting concrete: modal body plus a click; pitch and hardness controls; a second contact `gap` later
  const WOOD = [[196, 1, 0.05], [287, 0.6, 0.04], [433, 0.55, 0.03], [612, 0.35, 0.022], [948, 0.3, 0.014], [1380, 0.2, 0.009], [2100, 0.1, 0.006]];
  function knock(t0, { level = -16, pitch = 1, hard = 0.5, pan = 0, contacts = 1, gap = 0.013, seed = 500, modes = WOOD } = {}) {
    for (let l = 0; l < contacts; l++) {
      const m = modes.map(([f, a, tau]) => [f * pitch * (l ? 1.06 : 1), a * (f >= 600 ? 0.4 + 0.6 * hard : 1), tau]);
      const [L, R] = modal(0.6, m, { seed: seed + l, spread: 0.1 });
      const click = shape(svf(white(S(0.003), seed + 10 + l), 4000, 0.7, 'lp'), t => Math.exp(-t / 0.0008) * 0.9 * hard);
      place(normalize(sum(L, R, click)), t0 + l * gap, db(level) * (l ? 0.75 : 1), pan, 0.3);
    }
  }
  // a whoosh: resonant noise whose band rises lo → hi Hz over the duration, shaped by a swell, panned by a function of local time
  function whoosh(t0, dur, { lo = 400, hi = 3200, level = -14, pan = 0, seed = 600, q = 2.4 } = {}) {
    const n = S(dur), u = t => t / dur, x = svf(white(n, seed), t => lo * Math.pow(hi / lo, u(t)), q, 'bp');
    place(shape(x, t => Math.pow(Math.sin(Math.PI * clamp(u(t) * 0.92 + 0.04, 0, 1)), 0.7) * rc(u(t) / 0.15)), t0, db(level) / (peakOf(x) || 1), pan, 0.1);
  }
  // a sub bed: one low note and its octave, swelling with `env(u)` (u = 0..1 across the duration)
  function bed(t0, dur, { f = 40, level = -16, env = u => Math.pow(u, 1.8) } = {}) {
    const n = S(dur), e = t => env(t / dur) * rc(t / 0.3);
    place(osc(n, f, e), t0, db(level)); place(osc(n, 2 * f, e), t0, db(level - 11));
  }
  // a quiet tonal pad: two notes (a dyad), each a slightly detuned pair with an octave whisper
  function dyad(t0, dur, [fa, fb], { level = -30, attack = 0.35, release = 0.6 } = {}) {
    const n = S(dur), env = t => rc(t / attack) * (1 - rc((t - (dur - release)) / release));
    for (const [f, g, pan] of [[fa, 1, -0.25], [fb, 0.7, 0.25]]) place(sum(osc(n, f - 0.4, env), osc(n, f + 0.4, env, 0.7), osc(n, 2 * f, t => env(t) * 0.12)), t0, db(level) * g, pan, 0.25);
  }
  // room tone: decorrelated noise, lowpassed, breathing slowly, at an RMS level
  function roomTone(t0, dur, { level = -42, fadeIn = 0.03, fadeOut = 0.5, seed = 11 } = {}) {
    const n = S(dur), env = t => rc(t / fadeIn) * (1 - rc((t - (dur - fadeOut)) / fadeOut)) * (1 + 0.12 * Math.sin(TAU * 0.09 * t + 1));
    const ch = [seed, seed + 1].map(sd => shape(svf(svf(white(n, sd), 900, 0.6, 'lp'), 60, 0.7, 'hp'), env));
    placeStereo(ch, t0, db(level) / (rmsOf(ch[0].subarray(0, Math.min(n, S(1)))) || 1));
  }
  // a heartbeat: lub, then dub 175 ms later
  function heart(t0, { level = -6 } = {}) {
    const beat = (t, f0, f1, tau, g) => place(sum(osc(S(0.7), t => f1 + (f0 - f1) * Math.exp(-t / 0.05), t => (1 - Math.exp(-t / 0.008)) * Math.exp(-t / tau)), osc(S(0.25), t => 2 * (f1 + (f0 - f1) * Math.exp(-t / 0.05)), t => (1 - Math.exp(-t / 0.006)) * Math.exp(-t / 0.06) * 0.22)), t, g);
    beat(t0, 62, 38, 0.16, db(level)); beat(t0 + 0.175, 72, 46, 0.11, db(level) * 0.7);
  }

  // ── mixdown and output ──
  // Sum the buses (reverb return included), shape the head and the tail, and write a 32-bit float WAV. Float keeps every sample
  // un-clipped; render.mjs measures it and sets the final loudness and true peak.
  function mixdown({ reverbReturn = 0.55, fadeIn = 0.005, fadeOut = 0.6, silence = [] } = {}) {
    const [vl, vr] = reverb(bus.send), hp = x => svf(svf(x, 180, 0.7, 'hp'), 5500, 0.6, 'lp'), wl = hp(vl), wr = hp(vr);
    const L = new Float64Array(N), R = new Float64Array(N);
    for (let i = 0; i < N; i++) { L[i] = bus.main[0][i] + bus.ring[0][i] + wl[i] * reverbReturn; R[i] = bus.main[1][i] + bus.ring[1][i] + wr[i] * reverbReturn; }
    for (const T of silence) { const a = S(T - FRAME), b = S(T), ramp = S(0.002); for (let i = Math.max(0, a - ramp); i < b; i++) { const m = i < a ? rc((a - i) / ramp) : 0; L[i] *= m; R[i] *= m; } }
    for (let i = 0; i < S(fadeIn); i++) { const m = rc(i / S(fadeIn)); L[i] *= m; R[i] *= m; }
    if (fadeOut > 0) for (let i = N - S(fadeOut); i < N; i++) { const m = 1 - rc((i - (N - S(fadeOut))) / S(fadeOut)); L[i] *= m; R[i] *= m; }
    return [L, R];
  }
  function writeWav(file, [L, R]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const n = L.length, buf = Buffer.alloc(44 + n * 8), w32 = (o, v) => buf.writeUInt32LE(v, o), w16 = (o, v) => buf.writeUInt16LE(v, o);
    buf.write('RIFF', 0); w32(4, 36 + n * 8); buf.write('WAVE', 8); buf.write('fmt ', 12); w32(16, 16); w16(20, 3); w16(22, 2); w32(24, SR); w32(28, SR * 8); w16(32, 8); w16(34, 32); buf.write('data', 36); w32(40, n * 8);
    for (let i = 0; i < n; i++) { buf.writeFloatLE(L[i], 44 + i * 8); buf.writeFloatLE(R[i], 48 + i * 8); }
    fs.writeFileSync(file, buf);
  }

  return { SR, N, DUR, FRAME, TAU, clamp, lerp, win, rc, db, toDb, S, rng, white, slowNoise, osc, shape, sum, gain, peakOf, rmsOf, normalize, svf, modal, reverb,
    bus, panLR, place, placeStereo, hush, hitSig, shutterSig, STRIKE, strike, STEEL, ring, cutRing, tick, knock, WOOD, whoosh, bed, dyad, roomTone, heart, mixdown, writeWav };
}
