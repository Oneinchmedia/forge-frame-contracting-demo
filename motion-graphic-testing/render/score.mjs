// ONE INCH · soundtrack generated in code. Writes a 16-bit stereo WAV timed to the cut.
// Timeline (s): 0-3 the cut · 3-7 one inch of air · 7-9 the breath · 9 the hit · 10-13 the chair
// 13-18 through every medium · 18-22 ten thousand · 22-25 one · 25-28 the lockup · 28-30 the line
import fs from 'node:fs';
export const SR = 44100, DUR = 30;
const N = SR * DUR; const L = new Float32Array(N), R = new Float32Array(N);
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function mix(i, v, pan = 0) { if (i < 0 || i >= N) return; L[i] += v * (1 - Math.max(0, pan)); R[i] += v * (1 + Math.min(0, pan)); }
// coloured noise: white noise through a one-pole lowpass and a one-pole highpass
function noise(t0, t1, gain, lp, hp, env, pan = 0) {
  let y = 0, yh = 0, xp = 0; const a = Math.exp(-2 * Math.PI * lp / SR), b = Math.exp(-2 * Math.PI * hp / SR);
  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor(t1 * SR)); i++) { const t = i / SR - t0; const x = rnd(); y = (1 - a) * x + a * y; yh = b * (yh + y - xp); xp = y; mix(i, yh * gain * env(t, t1 - t0), pan); }
}
// a sine partial with exponential decay, optional pitch drop
function tone(t0, dur, f, gain, decay, drop = 0, pan = 0) {
  let ph = 0; for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor((t0 + dur) * SR)); i++) { const t = i / SR - t0; const fr = f * (1 - drop * (1 - Math.exp(-t * 12))); ph += 2 * Math.PI * fr / SR; mix(i, Math.sin(ph) * gain * Math.exp(-t * decay), pan); }
}
const hit = (t0, g = 1) => { tone(t0, 0.5, 150, 0.9 * g, 14, 0.7); noise(t0, t0 + 0.06, 0.8 * g, 6000, 200, t => Math.exp(-t * 90)); noise(t0, t0 + 0.012, 0.9 * g, 12000, 1000, () => 1); };
const shutter = (t0, g = 1) => { noise(t0, t0 + 0.02, 0.7 * g, 9000, 1500, t => Math.exp(-t * 300)); noise(t0 + 0.045, t0 + 0.07, 0.5 * g, 7000, 1200, t => Math.exp(-t * 300)); };
// a struck steel plate: inharmonic partials, long decay
const ring = (t0, g = 1, len = 14) => { [[523, 1, 0.22], [1104, 0.6, 0.3], [1860, 0.35, 0.42], [2650, 0.22, 0.6], [3900, 0.12, 0.9]].forEach(([f, a, d], k) => tone(t0, len, f * (1 + 0.0007 * k), 0.16 * a * g, d, 0, k % 2 ? 0.25 : -0.25)); };
// the ring brought back without a strike: partials fade in over 0.4 s, then decay
const swell = (t0, dur, g = 1) => { [[523, 1, 0.5], [1104, 0.6, 0.7], [1860, 0.3, 0.9]].forEach(([f, a, d], k) => { let ph = 0; for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor((t0 + dur) * SR)); i++) { const t = i / SR - t0; ph += 2 * Math.PI * f / SR; mix(i, Math.sin(ph) * 0.14 * a * g * Math.min(1, t / 0.4) * Math.exp(-Math.max(0, t - 0.4) * d), k % 2 ? 0.25 : -0.25); } }); };
const tick = (t0, g = 1) => { tone(t0, 0.03, 2400, 0.25 * g, 120); noise(t0, t0 + 0.004, 0.3 * g, 10000, 2000, () => 1); };
const thump = (t0, g = 1) => tone(t0, 0.35, 70, 0.8 * g, 9, 0.45);
const chime = (t0, g = 1) => [660, 880, 1320].forEach((f, k) => tone(t0 + k * 0.07, 1.2, f, 0.12 * g, 3.5, 0, (k - 1) * 0.3));
// bed: a 40 Hz sine that swells
function bed(t0, t1, f, gIn, gOut) { let ph = 0; for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor(t1 * SR)); i++) { const u = (i / SR - t0) / (t1 - t0); ph += 2 * Math.PI * f / SR; mix(i, Math.sin(ph) * (gIn + (gOut - gIn) * u * u)); } }
// sweep: band-ish noise whose colour slides, for the whoosh and the chair skid
function sweep(t0, t1, gain, lpFrom, lpTo, hp, env, pan = 0) { let y = 0, yh = 0, xp = 0; for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor(t1 * SR)); i++) { const u = (i / SR - t0) / (t1 - t0); const lp = lpFrom + (lpTo - lpFrom) * u; const a = Math.exp(-2 * Math.PI * lp / SR), b = Math.exp(-2 * Math.PI * hp / SR); const x = rnd(); y = (1 - a) * x + a * y; yh = b * (yh + y - xp); xp = y; mix(i, yh * gain * env(u), pan * (u * 2 - 1)); } }

// ---- act I · the cut, the inch, the breath ----
noise(0, 7.4, 0.05, 900, 60, (t, d) => clamp(Math.min(t * 2, (d - t) * 3), 0, 1));   // room tone, fades out into the breath
bed(2.0, 9.0, 40, 0.0, 0.22);                                                             // sub bed rising to the hit
tick(3.0, 0.8);                                                                            // the ruler resolves
[7.0, 8.0, 8.9].forEach((t, k) => { thump(t, 0.55 + k * 0.08); thump(t + 0.16, 0.35 + k * 0.08); }); // heartbeat, accelerating, under the hit
// ---- act II · the hit, the chair ----
shutter(9.0, 1); hit(9.0, 1); ring(9.03, 1, 16);
sweep(10.15, 11.35, 0.35, 2600, 500, 150, u => Math.sin(Math.PI * Math.min(1, u * 1.2)) * (1 - u * 0.4), 0.6); // chair skid across the floor
noise(11.3, 12.6, 0.06, 1500, 80, (t, d) => Math.exp(-t * 2));                           // dust settling
// ---- act III · the force travels, ten thousand, one ----
sweep(13.2, 17.8, 0.2, 400, 3200, 80, u => Math.sin(Math.PI * u) * 0.9, 0.9);             // the band's passage, left to right
shutter(13.75, 0.8); ring(14.7, 0.35, 3); noise(15.7, 16.3, 0.18, 1800, 300, t => Math.sin(Math.PI * t / 0.6)); chime(16.6, 1);
{ let t = 18.1; const end = 21.9; let k = 0; while (t < end) { tick(t, 0.5 + 0.5 * (t - 18.1) / 3.8); const u = (t - 18.1) / 3.8; t += 0.16 - 0.135 * u * u; k++; } }
bed(18.0, 22.0, 55, 0.04, 0.16);                                                           // a rising pulse bed under the wall
// 22.0: everything cuts; the ring from 9.0 is still decaying underneath, so swell it back into hearing
swell(22.0, 3.5, 0.5);
tick(24.75, 0.6);                                                                           // the line reveals
// ---- act IV · the lockup, the line ----
shutter(25.54, 1); hit(25.54, 1); ring(25.57, 0.9, 6);
tone(28.5, 1.5, 330, 0.08, 2.2); tone(28.5, 1.5, 495, 0.05, 2.4);                           // a quiet dyad under the line

// master: soft clip, normalise to -1 dBFS, fade the last second
let peak = 0; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const norm = peak > 0 ? 0.89 / peak : 1;
for (let i = N - SR; i < N; i++) { const f = (N - i) / SR; L[i] *= f; R[i] *= f; }
const buf = Buffer.alloc(44 + N * 4); const w32 = (o, v) => buf.writeUInt32LE(v, o), w16 = (o, v) => buf.writeUInt16LE(v, o);
buf.write('RIFF', 0); w32(4, 36 + N * 4); buf.write('WAVE', 8); buf.write('fmt ', 12); w32(16, 16); w16(20, 1); w16(22, 2); w32(24, SR); w32(28, SR * 4); w16(32, 4); w16(34, 16); buf.write('data', 36); w32(40, N * 4);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * norm, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * norm, -1, 1) * 32767), 46 + i * 4); }
const out = process.argv[2] || 'out/score.wav'; fs.mkdirSync('out', { recursive: true }); fs.writeFileSync(out, buf);
console.log(`score: ${out} · ${DUR}s · peak before norm ${peak.toFixed(2)}`);
