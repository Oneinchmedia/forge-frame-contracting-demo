# ONE INCH · render

A 30-second One Inch Media ident, 1920×1080 at 30 fps, built the way the recipe says: the picture is JavaScript on a canvas, the soundtrack is synthesized in code, Playwright draws every frame, FFmpeg encodes, muxes and pulls a contact sheet to check the result.

## Files

- `render.html` — the animation. Self-contained: the ten frames of the ONE INCH storyboard, the real lockup, and the three typefaces embedded as base64. Exposes `renderFrame(t)` which draws time `t` to the canvas and returns a PNG.
- `score.mjs` — the soundtrack. Room tone, a sub bed, a heartbeat, the shutter and the hit, a struck-steel ring that decays under everything, the chair skid, the band's whoosh, four transformation sounds, the accelerating pulse, the hit again under the lockup, a quiet dyad under the line. Writes a 16-bit stereo WAV.
- `render.mjs` — the pipeline. Captures 900 frames through Playwright, encodes with libx264, runs the score, muxes with AAC, deletes the frames, and writes `out/contact-sheet.png` (one frame every 1.5 seconds, 5×4).
- `assets/` — the reverse lockup and the tagline crop. They are embedded in `render.html` as data URIs, because an image loaded from a file path taints the canvas and blocks PNG export.

## Run

Install once: Node 18+, FFmpeg on the PATH, then in this folder:

```
npm install
npx playwright install chromium
npm run render
```

Outputs land in `out/`: `one-inch.mp4` (final, with sound), `video.mp4` (picture only), `score.wav`, `contact-sheet.png`.

`npm run sheet` regenerates the contact sheet from the final file without re-rendering. Set `CHROMIUM_PATH` to use a specific browser binary, `FFMPEG` to use a specific FFmpeg, and `PLAYWRIGHT` to the path of a Playwright `index.mjs` if it is not installed locally.

## The loop

Render, open the contact sheet, fix what is wrong in `render.html` or `score.mjs`, render again. The timings in the score match the cut in the page; if a frame moves, move its sounds.

No voice-over is used. If one is recorded, the recipe's optional step applies: get word timestamps with Whisper and land the text reveals on the words.
