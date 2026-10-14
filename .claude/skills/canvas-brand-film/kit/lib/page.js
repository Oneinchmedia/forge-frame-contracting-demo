// lib/page.js: the API Playwright drives. Loaded after the config, the kit and every shot.
// FILMPAGE.ready resolves once fonts and images are decoded; it rejects if any is missing, so a render can never silently use a fallback.
const FILMPAGE = (function () {
  const loadImage = (name, src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { K.IMG[name] = im; res(name); };
    im.onerror = () => rej(new Error(`image "${name}" failed to decode`));
    im.src = src;
  });
  const fontLoads = FONT_FACES.map(f => document.fonts.load(`${f.style === 'italic' ? 'italic ' : ''}${f.probe} 64px "${f.family}"`, 'AaQq01'));
  const ready = Promise.all([...fontLoads, ...Object.entries(IMAGE_DATA).map(([k, v]) => loadImage(k, v))])
    .then(() => document.fonts.ready)
    .then(() => {
      const missing = FONT_FACES.filter(f => !document.fonts.check(`${f.probe} 64px "${f.family}"`)).map(f => f.family);
      if (missing.length) throw new Error('fonts not loaded: ' + missing.join(', '));
      for (const s of FILM.shots) if (!SHOTS[s.name]) throw new Error(`no shot registered as "${s.name}"`);
      return { fonts: FONT_FACES.length, images: Object.keys(K.IMG), frames: FRAMES.total, duration: FILM.duration };
    });

  // Draw a frame and force the canvas to rasterise (a 1-pixel readback), so the time reported is the real cost, not just recording.
  function timed(fn) { const t0 = performance.now(); const shotName = fn(); FRAMES.ctx.getImageData(0, 0, 1, 1); return { ms: performance.now() - t0, shot: shotName }; }
  return {
    ready,
    info: () => ({ name: FILM.name, width: FILM.width, height: FILM.height, fps: FILM.fps, duration: FILM.duration, total: FRAMES.total, shots: FILM.shots, cues: FILM.cues }),
    drawFrame: (n, opts) => timed(() => FRAMES.draw(n, opts)),
    drawTime: (t, opts) => timed(() => FRAMES.drawTime(t, Math.floor(t * FILM.fps + 1e-6), opts)),
    png: () => FRAMES.canvas.toDataURL('image/png'),
  };
})();
window.FILMPAGE = FILMPAGE;
