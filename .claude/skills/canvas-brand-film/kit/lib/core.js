// lib/core.js: the drawing kit (K) and the frame dispatcher (FRAMES). Browser only, no libraries.
//
// Shots register with shot(name, fn). The dispatcher looks a shot up by name each time it draws, so a file loaded later can replace a shot
// and the replacement is what renders. Nothing captures a function reference at load time.
//
// A shot is fn(ctx, s), where s = { t, frameT, local, dur, p, W, H, frame, fps, cue(name), since(name), B (brand), F (FILM) }.
// It paints a complete opaque frame (the background is already filled with brand.screen). It must not call grain or vignette:
// the dispatcher applies the finish once per frame, after motion blur.

const SHOTS = Object.create(null);
function shot(name, draw) { SHOTS[name] = draw; }

const K = (function () {
  const B = FILM.brand;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const win = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const ease = {
    out: u => 1 - Math.pow(1 - u, 3),
    in: u => u * u * u,
    inOut: u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    outExpo: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u),
    outBack: (u, s = 1.70158) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
    // a damped spring from 0 to 1: overshoot, then ring down. k = oscillations over u 0..1, d = damping
    spring: (u, k = 2.2, d = 5) => u <= 0 ? 0 : 1 - Math.exp(-d * u) * Math.cos(2 * Math.PI * k * u),
  };
  // mulberry32: a deterministic 0..1 stream per seed. Never use Math.random in a frame.
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgba = (h, a = 1) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  const mix = (h1, h2, u) => { const a = hex(h1), b = hex(h2); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], clamp(u, 0, 1)))).join(',')})`; };
  const ANG = (B.angle || 0) * Math.PI / 180;

  // ── type ──
  const FALLBACK = { display: '"Helvetica Neue", Arial, sans-serif', numeral: 'Didot, "Bodoni 72", Georgia, serif', mono: 'ui-monospace, Menlo, Consolas, monospace' };
  const family = role => `"${FILM.fonts[role] || FILM.fonts.display}", ${FALLBACK[role] || FALLBACK.display}`;
  function font(ctx, role, size, weight) { ctx.font = `${weight || 700} ${size}px ${family(role)}`; }
  // Tracked caps, drawn letter by letter. o: { size, role, weight, tracking (px), align, color, alpha, reveal 0..1 (wipes in left to right) }.
  // Returns the drawn width.
  function text(ctx, str, x, y, o = {}) {
    const size = o.size || 40; ctx.save(); font(ctx, o.role || 'display', size, o.weight || 600);
    const chars = Array.from(str), tr = o.tracking == null ? size * 0.25 : o.tracking;
    const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width + tr, -tr);
    const left = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    if (o.reveal != null && o.reveal < 1) { ctx.beginPath(); ctx.rect(left - 4, y - size, (w + 8) * clamp(o.reveal, 0, 1), size * 2); ctx.clip(); }
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha; ctx.fillStyle = o.color || B.bone; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let cx = left; for (const ch of chars) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + tr; }
    ctx.restore(); return w;
  }

  // ── light ──
  function glow(ctx, x, y, r, color, alpha = 1) {
    if (r <= 0 || alpha <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(0.35, rgba(color, alpha * 0.35)); g.addColorStop(1, rgba(color, 0));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // A line with bloom: wide, faint strokes under a crisp core. o: { core (px), bloom (px), alpha, coreColor }
  function bloomLine(ctx, x0, y0, x1, y1, color, o = {}) {
    const core = o.core || 2, bloom = o.bloom || 24, a = o.alpha == null ? 1 : o.alpha; if (a <= 0) return;
    ctx.save(); ctx.lineCap = 'round';
    for (const [w, al] of [[bloom, 0.05], [bloom * 0.5, 0.09], [bloom * 0.22, 0.18], [core * 2.2, 0.45]]) { ctx.strokeStyle = rgba(color, al * a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    ctx.strokeStyle = rgba(o.coreColor || color, a); ctx.lineWidth = core; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }
  function ring(ctx, x, y, r, width, color, alpha = 1) {
    if (r <= 0 || alpha <= 0 || width <= 0) return;
    ctx.save(); ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  // The brand slash through (cx, cy): a soft band plus a crisp line, at the brand angle. len is the half-length.
  function slash(ctx, cx, cy, len, o = {}) {
    const dx = Math.cos(ANG) * len, dy = Math.sin(ANG) * len;
    if (o.band) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ANG);
      const bw = o.band, g = ctx.createLinearGradient(0, -bw, 0, bw);
      g.addColorStop(0, rgba(B.red, 0)); g.addColorStop(0.5, rgba(B.red, o.bandAlpha == null ? 0.25 : o.bandAlpha)); g.addColorStop(1, rgba(B.red, 0));
      ctx.fillStyle = g; ctx.fillRect(-len, -bw, len * 2, bw * 2); ctx.restore();
    }
    bloomLine(ctx, cx - dx, cy - dy, cx + dx, cy + dy, o.color || B.red, { core: o.core || 2, bloom: o.bloom || 26, alpha: o.alpha == null ? 1 : o.alpha, coreColor: o.coreColor });
  }
  // Camera shake as smooth noise (sums of sines with seeded phases), so motion blur smears it instead of strobing it.
  // amp in px, decay in seconds. Returns { x, y, r (radians) }.
  function shake(t, t0, amp, decay = 0.2, seed = 1) {
    if (t < t0) return { x: 0, y: 0, r: 0 };
    const e = amp * Math.exp(-(t - t0) / decay), r = rng(seed), u = t - t0;
    const n = (f1, f2) => Math.sin(2 * Math.PI * f1 * u + r() * 6.28) * 0.6 + Math.sin(2 * Math.PI * f2 * u + r() * 6.28) * 0.4;
    return { x: e * n(13, 23), y: e * n(17, 29), r: e * 0.0012 * n(7, 11) };
  }
  function applyShake(ctx, sh, W, H) { ctx.translate(W / 2 + sh.x, H / 2 + sh.y); ctx.rotate(sh.r); ctx.translate(-W / 2, -H / 2); }

  // ── 3D: a pinhole camera and lit boxes ──
  // World: metres, y up, the camera looks along +z. focal in mm on a 36 mm-wide sensor. pitch > 0 looks up, yaw > 0 turns right.
  function camera({ x = 0, y = 1.2, z = -3, yaw = 0, pitch = 0, focal = 35, W, H }) {
    const f = W * focal / 36, cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
    return {
      f, W, H, pos: [x, y, z],
      // world point → [screen x, screen y, depth]. depth <= 0 is behind the camera.
      project([px, py, pz]) {
        const X = px - x, Y = py - y, Z = pz - z;
        const X1 = cY * X - sY * Z, Z1 = sY * X + cY * Z;
        const Y2 = cP * Y - sP * Z1, Z2 = sP * Y + cP * Z1;
        return [W / 2 + f * X1 / Z2, H / 2 - f * Y2 / Z2, Z2];
      },
    };
  }
  // A box resting on its base: pos = [x, y, z] of the base centre, size = [w, h, d], yaw about its vertical axis,
  // tilt = rotation about its depth axis around the bottom edge at x = ±w/2 (pivot -1 = left edge, +1 = right edge).
  const BOX_FACES = [
    { i: [4, 5, 6, 7], n: [0, 0, -1], name: 'front' }, { i: [1, 0, 3, 2], n: [0, 0, 1], name: 'back' },
    { i: [0, 4, 7, 3], n: [-1, 0, 0], name: 'left' }, { i: [5, 1, 2, 6], n: [1, 0, 0], name: 'right' },
    { i: [7, 6, 2, 3], n: [0, 1, 0], name: 'top' }, { i: [0, 1, 5, 4], n: [0, -1, 0], name: 'bottom' },
  ];
  function boxWorld({ pos, size, yaw = 0, tilt = 0, pivot = -1 }) {
    const [w, h, d] = size, px = pivot * w / 2, cT = Math.cos(tilt), sT = Math.sin(tilt), cY = Math.cos(yaw), sY = Math.sin(yaw);
    const xf = ([x, y, z]) => {
      const x1 = px + (x - px) * cT - y * sT, y1 = (x - px) * sT + y * cT;   // tilt about the pivot edge
      return [pos[0] + x1 * cY + z * sY, pos[1] + y1, pos[2] - x1 * sY + z * cY];
    };
    const rot = ([x, y, z]) => { const x1 = x * cT - y * sT, y1 = x * sT + y * cT; return [x1 * cY + z * sY, y1, -x1 * sY + z * cY]; };
    const L = [[-w / 2, 0, d / 2], [w / 2, 0, d / 2], [w / 2, h, d / 2], [-w / 2, h, d / 2], [-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, h, -d / 2], [-w / 2, h, -d / 2]];
    return { corners: L.map(xf), faces: BOX_FACES.map(f => ({ ...f, n: rot(f.n) })), xf };
  }
  // Draw a lit box. o: { color, dark, light ([x,y,z] direction toward the light), ambient, edge (bevel highlight colour), edgeAlpha,
  // alpha, mirror (draw its floor reflection instead), decal(ctx, face, toScreen) to paint on a face }
  function drawBox(ctx, cam, box, o = {}) {
    const B3 = boxWorld(box), Lt = norm(o.light || [-0.55, 0.75, -0.35]), amb = o.ambient == null ? 0.32 : o.ambient;
    const mir = !!o.mirror, P = p => cam.project(mir ? [p[0], -p[1], p[2]] : p);
    const faces = B3.faces.map(f => {
      const pts = f.i.map(k => B3.corners[k]), c = pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      const n = mir ? [f.n[0], -f.n[1], f.n[2]] : f.n, cc = mir ? [c[0], -c[1], c[2]] : c;
      const toCam = [cam.pos[0] - cc[0], cam.pos[1] - cc[1], cam.pos[2] - cc[2]];
      return { ...f, n, pts, c: cc, vis: dot(n, toCam) > 0, depth: Math.hypot(...toCam) };
    }).filter(f => f.vis).sort((a, b) => b.depth - a.depth);
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha; ctx.lineJoin = 'round';
    for (const f of faces) {
      const s = f.pts.map(P), lam = Math.max(0, dot(f.n, mir ? [Lt[0], -Lt[1], Lt[2]] : Lt)), shade = amb + (1 - amb) * lam;
      ctx.beginPath(); s.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
      // a soft top-to-bottom falloff across each face (studio light reads as a gradient, not a flat tone)
      const gr = o.gradient == null ? 0.14 : o.gradient, ys = s.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
      if (gr && y1 - y0 > 2) { const lg = ctx.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, mix(o.dark || '#101214', o.color || B.steel, shade + gr * (mir ? -1 : 1))); lg.addColorStop(1, mix(o.dark || '#101214', o.color || B.steel, shade - gr * (mir ? -1 : 1))); ctx.fillStyle = lg; }
      else ctx.fillStyle = mix(o.dark || '#101214', o.color || B.steel, shade);
      ctx.fill();
      if (o.decal && !mir) { ctx.save(); ctx.clip(); o.decal(ctx, f, p => cam.project(B3.xf(p))); ctx.restore(); }
      if (o.edge) { ctx.strokeStyle = rgba(o.edge, (o.edgeAlpha == null ? 0.35 : o.edgeAlpha) * (0.4 + 0.6 * shade)); ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    ctx.restore();
    return B3;
  }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };

  // ── images (embedded at build time; listed in FILM.images) ──
  const IMG = Object.create(null);
  const img = name => IMG[name] || null;

  // ── finish: grain and vignette, applied once per frame by the dispatcher ──
  let tiles = null;
  function makeTiles() {
    tiles = [];
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), id = g.createImageData(512, 512), r = rng(9000 + k);
      for (let i = 0; i < id.data.length; i += 4) { const v = clamp(Math.round(128 + ((r() + r() + r()) / 3 - 0.5) * 2 * 120), 0, 255); id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0); tiles.push(c);
    }
  }
  // Overlay-blended noise: textures the midtones and leaves true black black, so fades still end on black.
  function grain(ctx, W, H, amount, frame) {
    if (!amount) return; if (!tiles) makeTiles();
    const r = rng(frame * 7919 + 17), tile = tiles[frame % tiles.length];
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amount;
    ctx.translate(-Math.floor(r() * 512), -Math.floor(r() * 512)); ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W + 512, H + 512);
    ctx.restore();
  }
  function vignette(ctx, W, H, strength) {
    if (!strength) return;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  return { B, ANG, clamp, lerp, win, smooth, ease, rng, hex, rgba, mix, font, text, glow, bloomLine, ring, slash, shake, applyShake, camera, boxWorld, drawBox, dot, norm, IMG, img, grain, vignette };
})();

const FRAMES = (function () {
  const W = FILM.width, H = FILM.height, dt = 1 / FILM.fps, total = Math.round(FILM.duration * FILM.fps);
  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d', { alpha: false });
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d', { alpha: false })]; };
  let tmp = null, acc = null;
  function shotAt(t) { for (const s of FILM.shots) if (t < s.end - 1e-9) return s; return FILM.shots[FILM.shots.length - 1]; }
  function info(sh, t, n) {
    const dur = sh.end - sh.start, local = t - sh.start;
    const cue = name => { const c = FILM.cues[name]; if (!c) throw new Error(`unknown cue "${name}"`); return c.t; };
    // frameT: the frame's own time. Use it for anything that must stay sharp under motion blur (readouts, counters, type).
    return { t, frameT: n / FILM.fps, local, dur, p: K.clamp(local / dur, 0, 1), W, H, frame: n, fps: FILM.fps, cue, since: name => t - cue(name), B: FILM.brand, F: FILM };
  }
  function paint(c2d, sh, t, n) {
    const fn = SHOTS[sh.name]; if (!fn) throw new Error(`no shot registered as "${sh.name}"`);
    c2d.save(); c2d.setTransform(1, 0, 0, 1, 0, 0); c2d.globalAlpha = 1; c2d.globalCompositeOperation = 'source-over'; c2d.filter = 'none';
    c2d.fillStyle = FILM.brand.screen; c2d.fillRect(0, 0, W, H);
    fn(c2d, info(sh, t, n)); c2d.restore();
  }
  // Draw film time t as frame n. Motion blur averages `samples` renders spread over the open shutter [t, t + shutter·dt),
  // clamped inside the shot so a hard cut never blends two shots. Then the finish runs once.
  function drawTime(t, n, opts = {}) {
    const sh = shotAt(t), mb = Object.assign({ samples: 1, shutter: 0.5 }, FILM.motionBlur, sh.blur || {});
    const samples = opts.noBlur ? 1 : Math.max(1, Math.round(typeof mb.samples === 'function' ? mb.samples(t) : mb.samples));
    if (samples === 1) paint(ctx, sh, t, n);
    else {
      if (!tmp) { tmp = mk(); acc = mk(); }
      for (let i = 0; i < samples; i++) {
        const ts = Math.min(t + mb.shutter * dt * i / samples, sh.end - 1e-6);
        paint(tmp[1], sh, ts, n);
        acc[1].globalAlpha = 1 / (i + 1); acc[1].drawImage(tmp[0], 0, 0);   // running average: the first sample overwrites
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(acc[0], 0, 0); ctx.restore();
    }
    if (sh.finish !== false) { const fin = Object.assign({}, FILM.finish, sh.finish || {}); K.vignette(ctx, W, H, fin.vignette); K.grain(ctx, W, H, fin.grain, n); }
    return sh.name;
  }
  return { W, H, dt, total, canvas, ctx, shotAt, drawTime, draw: (n, opts) => drawTime(n * dt, n, opts) };
})();
