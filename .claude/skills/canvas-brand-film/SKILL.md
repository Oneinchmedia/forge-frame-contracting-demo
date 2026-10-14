---
name: canvas-brand-film
description: Make motion-graphics brand films (logo intros, idents, stings, animated title cards, product teasers) entirely in code. Every frame is drawn on a JavaScript Canvas 2D, captured with Playwright in headless Chromium, scored by a soundtrack synthesised in JavaScript, then encoded, loudness-mastered and quality-checked with FFmpeg into finished MP4s. Use this skill whenever someone wants a rendered video of a brand, logo or title animation made with code, JavaScript, canvas, Playwright or FFmpeg; asks to turn a storyboard or animation idea into an MP4; or says things like "make me an intro video for my brand", "animate my logo", "motion graphics with code" or "render this to video", even if they never name the tools. It ships a working starter kit (shared cue sheet, sub-frame motion blur, film grain, a 3D camera, a sound-design kit, -14 LUFS / -1 dBTP mastering, BT.709 encodes and an automatic check that sound and picture are in sync).
---

# Canvas brand film

A film made of code: you write each shot as a JavaScript function of time and the kit turns it into finished, checked video files. The approach comes from two real renders for One Inch Media and an independent audit of the second one. That film looked good but shipped with its final hit 8 frames out of sync, untagged colour that shifted the brand red, audio 7 dB too quiet, and invisible motion blur. The kit makes those mistakes hard to make again, and its QC catches them when they happen. `references/lessons.md` maps each audit finding to the rule that prevents it.

**Use it for** rendered video: logo reveals, brand idents and stings, title sequences, animated storyboards, short product teasers. **Don't use it for** live web animation (write CSS or JS for the page instead), for editing camera footage, or when the user wants a Lottie or After Effects file.

## Quick start

```bash
cp -r <this skill>/kit <project>/film && cd <project>/film
rm -rf out node_modules     # in case the skill folder carries renders from an earlier run; they are not part of the kit
npm install                 # pins Playwright 1.56.1 exactly (the lockfile is part of reproducing a render)
npx playwright install chromium   # only if no Chromium is available; see Troubleshooting for sandboxes
node render.mjs             # renders the 8-second example sting; must end with "ALL QC PASSED"
```

Needs Node 18.19+, FFmpeg with libx264 (`ffmpeg -encoders | grep libx264`), and Chromium. If Playwright and a browser are already installed globally (common in sandboxes), skip `npm install` and set `PLAYWRIGHT=/path/to/playwright/index.mjs` and, if needed, `CHROMIUM_PATH=/path/to/chrome`. Render the example once before changing anything, so you know the toolchain works.

## The workflow

The order matters. Every serious defect in the audited film came from skipping a step or doing them out of order.

### 1. Brief and storyboard

Pin down the concept, the brand (colours as hex, font files, logo PNGs with transparent backgrounds), the length, the deliverables (aspect ratio, platform) and anything the user wants to see or hear. If the user wants to see the idea before you render, storyboard it first: frames, timing, camera and sound notes. Rendering is minutes per iteration, a storyboard is seconds, so settle the idea before the pixels.

### 2. Write the cue sheet before any shot (`film.config.cjs`)

This file is the film's contract. It holds the format, the brand, the **shots** (contiguous, in order), the **cues** (every moment picture and sound share) and any **shared motion** (functions of time that both the picture and the sound evaluate, like `slideAt(t)`). The page, the score, the render and the QC all read it.

- Write times only here. A shot asks `s.cue('land')`; the score asks `T('land')`. In the audit, a picture builder moved the lockup's landing while the score kept the old time, and the hit played 8 frames early. With one clock that cannot happen.
- Wrap every sync cue in `F()`, which snaps it to the frame grid. A picture can only change on a frame; a cue between frames can never be in sync. The build refuses an unsnapped sync cue.
- Mark `sync: 'both'` where a sound must land with a visible change (hits, slams, cuts to white), and `'audio'` where only the sound has a sharp onset (a stop, a tick). The QC measures exactly these.
- When sound follows motion (a skid, a whoosh that pans with an object), put the motion function in `motion` and call it from both the shot and the score.

### 3. Build the shots, looking at every iteration

One file per shot in `shots/` (loaded in filename order), each registering `shot('name', (ctx, s) => { ... })`. Helpers that several shots share (a layout, a particle system, cached type) go in a file that registers no shot, such as `shots/00-common.js`. All shot files share one global scope, so prefix that file's globals (`COMMON_...`, or one object) to avoid collisions. The kit's API is in **Kit reference** below; motion craft is in `references/craft.md`.

Preview constantly. It renders through the same page as the final render, with every shot loaded:

```bash
node preview.mjs --shot slide --p 0,0.25,0.5,0.75,1   # points inside one shot
node preview.mjs --cue land --around 3                 # a cue's frame and 3 either side
node preview.mjs --frames 110-118                      # consecutive frames: look for jitter and pops
node preview.mjs --sheet                               # every shot at start, middle, end
node preview.mjs --t 4.9,5.0 --determinism             # render twice, reversed, compare hashes
```

Each run empties `out/preview/` and writes numbered PNGs plus `strip.png`. The first frame's time includes one-time setup (caches, grain tiles), so judge cost from the frames after it. **Open the PNGs with the Read tool and look at them**, at full size for anything detailed. Work as a motion director would: change, render, look, criticise, change again, at least three times on any hero shot. Check neighbouring frames (`--frames`) for jitter and pops, and cue frames (`--cue`) for exact timing. Add `--no-blur` for fast drafts and remove it before judging motion. The reported milliseconds include rasterisation, so they are the real cost per frame.

### 4. Score it

`score.mjs` builds the soundtrack with `lib/synth.mjs` (see **Sound** below) from the same cues and motion functions. Mix by feel, using relative levels with the strike as the loudest element. The render step sets the final loudness.

### 5. Render

```bash
node render.mjs                 # add --keep-frames to keep the PNGs, then --reuse-frames to re-encode or remaster without recapturing
node render.mjs --prores        # also writes a ProRes 422 HQ .mov for editing
```

It builds the page and captures every frame, stopping before anything is encoded if the page throws. It then synthesises the score and masters it to `film.audio` (default -14 LUFS integrated, true peak at most -1 dBTP), measuring the AAC encode itself because encoding adds overshoot. Every deliverable is encoded straight from the PNG frames, one generation each, BT.709-tagged with faststart. Poster and contact sheet come from the PNGs too, so their colour is exact. Last, it runs the QC and writes `out/render.log` with tool versions and checksums.

Outputs in `out/`: `<name>.mp4` (1080p delivery), `<name>-web.mp4` (720p, grain-preserving), `<name>-master.mp4` (high bitrate), `<name>-poster.jpg/.png`, `<name>-contact.png`, `qc.json`, `render.log`.

### 6. QC must pass

`qc.mjs` runs automatically after a render, and can be run alone: `node qc.mjs [file.mp4]`. It measures the finished file:

| Check | Typical fix when it fails |
|---|---|
| H.264 yuv420p, BT.709 tags, frame count, 48 kHz AAC, equal audio and video length, faststart | Usually a hand-edited ffmpeg command; use `render.mjs` |
| Loudness within ±1 LU of target, true peak at or under target | Check `render.log`. If the limiter took more than about 6 dB, the mix is too spiky: lower the strike or raise the beds |
| Sync: audio onset (and picture change, for `'both'`) within one frame of each cue, searched ±250 ms | Something reads a time that isn't from the cue sheet, or the picture change is soft or late. Preview `--cue <name> --around 3` |
| Last frame is black (if `deliver.endOnBlack`) | Finish the fade by the last frame |

The sync check was tested against broken files: audio moved 260 ms early fails every cue, and picture moved 3 frames late fails exactly the `'both'` cues. A pass therefore means something. Never deliver a failing QC, and never describe a failing file as finished.

### 7. Critique the whole film, then loop

Per-shot work can't see what goes wrong between shots, and every serious defect in the audited film crossed sections. After a passing render, review the film as a whole with `references/critique.md`: the contact sheet, every cue frame with 2 frames either side, the cuts, the last second. Write the findings down with timestamps, fix them, re-render, and repeat until a pass finds nothing major. When several agents are available, give each critique lens to a separate agent. Ask each to disprove what it is checking, not just to comment.

### 8. Deliver, and report only what was measured

Send the delivery MP4 (and the web or ProRes files if useful), with a short note. Every number in your message (loudness, sync, frame count, file size, counts of anything) must come from `qc.json` or `render.log` or a command you ran. Don't describe features you haven't seen in a frame. In the audit, the delivery message claimed sync that didn't exist and miscounted its own review notes. List open creative decisions for the user by name.

## Rules and why they exist

- **One clock.** All times live in the cue sheet. A time typed into a shot or the score will drift the next time someone edits the other side.
- **Deterministic frames.** A frame is a pure function of time. Seed every random with `K.rng(seed)` and never use `Math.random`, `Date` or `performance.now` in a shot. Inside loops, draw every random number before any `continue`, so each particle keeps its identity from frame to frame. Check with `preview.mjs --determinism`.
- **Shots paint complete opaque frames; the kit adds the finish.** Grain and vignette are applied once per frame after motion blur, so grain is never smeared and matches across shots. Grain blends with overlay, so true black stays black and fades end clean. The vignette leaves a clear centre but still darkens anything near the edges. For a shot whose logo or type must keep its exact brand colours, set a lighter vignette on that shot in the config (`finish: { vignette: 0.3 }`, as the example lockup does), or `finish: false`. Then check the colour in a PNG frame.
- **Real motion blur.** `blur: { samples, shutter }` on a shot averages several renders across the open shutter. Fast moments need more samples: a samples function such as `burst(cue, 0.35, 24, 6)` raises them right after an impact. Anything that must stay sharp (readouts, counters, type) should use `s.frameT`, the frame's own time, not `s.t`. Rule of thumb: samples ≥ pixels moved per frame ÷ 3 for the fastest element.
- **Shots are looked up by name at draw time.** Register with `shot()`; never store a reference to another shot's function. The audited film's first scaffold bound functions at load time, and all five agents' overrides silently did nothing until each found and patched it.
- **Everything is inlined.** `build.mjs` embeds fonts and images as data URIs, so the canvas stays untainted and `toDataURL` works from `file://`. The page refuses to start if a font or an image fails to load, so a fallback typeface never ships unnoticed.
- **Colour is tagged.** Untagged HD video is assumed to be BT.709 by most players. Encoding with FFmpeg's default BT.601 matrix and no tags shifted the audited film's #E72722 visibly toward orange. The kit converts with the BT.709 matrix and writes the tags; the QC checks them.
- **Loudness is mastered, then measured after encoding.** -14 LUFS is the web and social norm; use -23 for broadcast (EBU R128). Keep the strike a few dB under the top of the mix (the example uses -4) so the limiter isn't crushing it.
- **Measure real cost.** Timings include a forced rasterise. Cost per frame is roughly samples × draw time. Cache static layers in an offscreen canvas (see `paintRoom` in the example slide shot), and crop each cache to its content: a full-frame `drawImage` is expensive in headless Chromium, and motion blur multiplies it. Prefer gradients over `ctx.filter` blurs inside blurred shots. Give the fastest moments many samples (`bursts(lo, [t0, dur, hi], ...)` in the config) and the rest few.

## Kit reference

| File | What it does |
|---|---|
| `film.config.cjs` | The contract: format, brand, fonts, images, logo geometry, shots, cues, shared motion, finish, audio and delivery targets |
| `shots/*.js` | One shot per file; the example has `open`, `strike`, `slide` and `lockup` |
| `lib/core.js` | `K` (the drawing kit), the shot registry, and `FRAMES` (dispatch, motion blur, finish) |
| `lib/page.js` | `FILMPAGE`: `ready`, `drawFrame(n)`, `drawTime(t)`, `png()`, `info()` |
| `lib/synth.mjs` | `createSynth()`: the DSP kit and sound vocabulary |
| `lib/node.mjs` | Node helpers: config loading and validation, FFmpeg and ffprobe, loudness, Playwright and browser discovery |
| `build.mjs` | Assembles `out/work/film.html` with everything inlined |
| `preview.mjs`, `render.mjs`, `score.mjs`, `qc.mjs` | As above |

**Shot context `s`:** `t` (film time; varies across motion-blur samples), `frameT` (the frame's own time), `local` and `dur` and `p` (position in the shot), `W`, `H`, `frame`, `fps`, `cue(name)`, `since(name)`, `B` (brand), `F` (the whole config).

**`K`, the drawing kit:**
- Maths: `clamp`, `lerp`, `win(x,a,b)` (0..1 window), `smooth`, `ease.{out,in,inOut,outExpo,outBack,spring}`, `rng(seed)`.
- Colour: `rgba(hex,a)`, `mix(h1,h2,u)`.
- Type: `font(ctx,role,size,weight)` with roles from `FILM.fonts`; `text(ctx,str,x,y,{size,role,weight,tracking,align,color,colorOf,alpha,reveal})`. `textLayout(...)` takes the same arguments and returns each letter's position and visible ink box, for effects placed on a letter.
- Light: `glow`, `bloomLine`, `ring`, `slash(ctx,cx,cy,halfLen,{band,bandAlpha,core,bloom,alpha,coreColor})` at the brand angle `K.ANG`.
- Camera: `shake(t,t0,amp,decay,seed)` with `applyShake`.
- 3D: `camera({x,y,z,yaw,pitch,focal,W,H}).project([x,y,z])`, `drawBox(ctx,cam,{pos,size,yaw,tilt,pivot},{color,dark,light,ambient,gradient,edge,mirror,alpha,decal})`.
- Images: `img(name)`.
- Finish: `grain`, `vignette`.

**Sound (`createSynth`):**
- Building blocks: `osc`, `svf` (lp/bp/hp, modulatable), `white`, `slowNoise`, `modal`, `reverb`, `shape`, `sum`, `gain`, `normalize`.
- Mixing: `place` and `placeStereo` (with pan functions and reverb send), `hush`, `mixdown({silence:[cue times]})`.
- Vocabulary: `strike` (sample-identical every time, with one frame of silence before), `ring`/`cutRing` (struck steel on its own bus), `tick`, `knock`, `whoosh`, `bed`, `dyad`, `roomTone`, `heart`.
- Layering: `hitSig`, `knockSig`, `whooshSig` and `shutterSig` return normalised mono signals; combine them with `sum`, then `normalize` and `place`. `buildStrike({ shutter, extra })` makes a strike for a new brand. The default strike layers in a camera shutter, which is One Inch Media's photographic motif: use `buildStrike({ shutter: 0, extra: A.knockSig({ pitch: 0.6 }) })` or similar and pass the result to `strike(t, level, send, sig)`.

## Making it the user's film

1. **Brand:** set `brand` colours, the slash or accent angle if the brand has one, and `fonts` roles.
2. **Fonts:** put the files in `assets/fonts/` named `<Family_Name>-<weight>.woff2`, or `<Family_Name>-100_900.woff2` for a variable font, with `-italic` where needed. Use the brand's real fonts. A licensed font the user supplies stays in their project and is never published.
3. **Images:** for a type-only brand (no logo file), delete `images` and `logoMark` from the config and set the name with `K.text`. Otherwise, list logos in `images`. To find a logo's geometry, view the PNG, read off the pixel coordinates of the mark's centre (and of its slash or other features you will animate against), divide by the image size, and record them in `logoMark`. Check a preview frame where the animation touches the logo at full size.
4. **Shots:** replace the example shots with the storyboard's, keeping the patterns: cues from `s.cue`, `frameT` for type, seeded randomness, cached static layers.
5. **Score:** rewrite `score.mjs` for the new cues. Use `strike()` for any hit that must be identical every time, with a strike built for this brand (`buildStrike`; the default's camera shutter belongs to One Inch).
6. **Format:** change `width`, `height` and `fps`. For vertical social video use 1080×1920; `render.mjs` sizes the web version from the height.

## Scaling up

For films longer than about 30 seconds, or when multiple agents will build shots in parallel, read `references/multi-agent.md`. It describes how to split the work so the cue sheet stays the single contract and a whole-film critique loop closes it. Briefly: freeze the cue sheet first; run each shot through build, review and fix without waiting for the others; give the hero shot several competing builds; end with an integration loop. Every preview already loads every shot, so no agent ever judges a shot in isolation.

## Troubleshooting

- **"Playwright not found":** run `npm install`, or set `PLAYWRIGHT` to a global install's `index.mjs`.
- **"Executable doesn't exist":** run `npx playwright install chromium`, or set `CHROMIUM_PATH`. Where downloads are blocked but browsers are preinstalled (`PLAYWRIGHT_BROWSERS_PATH`), the kit falls back to the newest `chromium-*` it finds there. Record which browser rendered the film: text rasterisation can differ between Chromium builds.
- **"fonts not loaded":** a file name doesn't match the family that `FILM.fonts` asks for, or the file is not a font.
- **Frames are slow:** look at the per-frame milliseconds in `preview.mjs`. Lower samples outside fast moments, cache static layers, and avoid `ctx.filter` and per-pixel loops inside blurred shots.
- **A sync check fails by a consistent amount:** a time is coming from somewhere other than the cue sheet. A sync check that fails with "no visible change" means the picture change at a `'both'` cue is too gradual: make it a cut, a flash or a slam on the cue frame, or mark the cue `'audio'`.
- **Colours look different in another player:** check the tags with `ffprobe -show_streams`. Only files made by `render.mjs` are tagged; re-encode through it rather than by hand.
