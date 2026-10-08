# ONE INCH · render v2

The ONE INCH ident rendered from a JavaScript canvas, built the way the recipe says and pushed as far as the technique goes: every frame is Canvas 2D code, the soundtrack is synthesized in code, Playwright draws the frames, FFmpeg encodes, muxes and pulls a contact sheet to check the result. 1920×1080, 30 fps, 30 seconds.

This version was built by a parallel crew: five section builders (each iterating against rendered frames of their own section), a sound designer working from FFmpeg spectrograms and loudness windows, five adversarial reviewers, and a fix round. The chair shot got the longest brief.

## Files

- `base.js` — shared primitives, palette, lockup geometry and the original frame code, which the modules override.
- `modules/A-inch.js` — frames 1–3: the cut, one inch of air, the breath. Brushed steel with parallax highlight bands and bevelled edges, a volumetric red beam with three depths of dust, a ruler engraved into the steel, motion-blurred faces closing, a breathing ring with chromatic doubles.
- `modules/B-hit-lockup.js` — frames 4, 9, 10: the hit, the lockup, the line. A white-hot core with chromatic aberration, motion-smeared shock rings, streaked sparks under gravity, a decaying hand-held shake; the mark's six real blades (traced from the artwork) flying in with motion blur and a damped settle, cross-fading into the lockup; the tagline wipe with a glowing edge.
- `modules/C-chair.js` — frame 5: the chair. Eleven boxes projected through a 35 mm pinhole camera at chest height, lambert-shaded wood, a blurred cast shadow and per-leg contact shadows, a floor reflection, impulse-and-friction physics with a 6° pitch onto the rear legs, 4° yaw, a settle bounce, velocity-spaced motion blur, dust, skid marks, a 2-pixel camera kick, and the dimension line counting to 8 ft 2 in.
- `modules/D-media.js` — frame 6: through every medium. A one-point-perspective dolly past four stands with thickness on a glossy floor, a far wall at a third of the parallax, the slash as a volumetric blade, and four transformations: photograph to footage, flat wordmark to extruded metal, page to floating text with a waveform, wireframe to shaded solid.
- `modules/E-ten-one.js` — frames 7–8: ten thousand takes, one. A wall of 880 tiles drawn from an atlas of 220 distinct lit chair takes in mixed aspect ratios, switched on in a wave with a screen flicker, a tabular counter; then every tile pulled into the survivor with velocity-aligned smears, the counter running down to one, and the line.
- `score.mjs` — the soundtrack: three buses, a state-variable filter, modal resonators for struck steel and knocked wood, a stick-slip oscillator for the chair's friction, a small Schroeder reverb, constant-power panning, TPDF dither. It prints a loudness table for every cue window when it runs.
- `template.html`, `build.mjs` — assemble `render.html` from base plus modules, with fonts and the lockup embedded as data URIs (an image loaded from a file path would taint the canvas and block PNG export).
- `harness.mjs` — renders chosen frames at chosen progress values to PNGs and a tiled strip, and reports draw time. This is what the builders and reviewers used.
- `render.mjs` — the pipeline: build, capture 900 frames, encode, score, mux, a 720p web encode, contact sheet.

## Run

Node 18+, FFmpeg on the PATH, then in this folder:

```
npm install
npx playwright install chromium
node render.mjs
```

Outputs in `out/`: `one-inch-v2.mp4` (1080p master), `one-inch-v2-web.mp4` (720p), `video.mp4`, `score.wav`, `contact-sheet.png`. `node render.mjs sheet` regenerates the sheet; `node render.mjs build` only assembles `render.html`. To look at one section: `node harness.mjs --module modules/C-chair.js --frame 5 --p 0,0.2,0.4,0.6,0.8,1 --out out/C`.

Environment overrides: `CHROMIUM_PATH`, `FFMPEG`, `PLAYWRIGHT` (path to a Playwright `index.mjs` when it is not installed locally).

## The loop

Render, open the contact sheet, fix what is wrong in the module that owns the frame or in `score.mjs`, render again. Cue timings in the score follow the cut; if a frame's timing moves, move its sounds.

No voice-over is used. With one, word timestamps from Whisper would land the text reveals on the words.
