# Craft notes: picture and sound

Techniques that make a canvas film read as photographed rather than drawn. Every one is used somewhere in the example shots, so open the shot file to see it working.

## Contents
- Timing and easing
- Light
- Depth and 3D
- Physics
- Impacts
- Type
- Transitions
- Sound

## Timing and easing

- Ease nearly everything. Use `ease.out` for arrivals, `ease.in` for departures and accelerations, and `ease.inOut` for camera moves. Linear motion reads as mechanical; save it for things that really are mechanical.
- Use anticipation, action and settle: a beat of tension before an impact (the `open` shot brightens its line into the hit), then the impact, then a settle. Use `ease.spring` or `outBack` for a settle with overshoot.
- `win(t, a, b)` turns any span of film time into a 0..1 value. Build sequences out of windows keyed to cues (`win(s.t, s.cue('tagline'), s.cue('tagline') + 0.5)`) rather than shot-local fractions, so they survive edits to the shot lengths.
- Hold the payoff. A lockup needs at least 1.5 s fully readable before the fade.

## Light

- Black is a space, not a fill. Lift it slightly with a large, faint radial gradient. Pure flat black reads as "no image".
- Bloom is several wide, faint strokes under a crisp core (`bloomLine`). Add `globalCompositeOperation = 'lighter'` for hot light. Fake chromatic aberration with red-shifted and blue-shifted copies offset along the motion.
- Use one key light per scene and keep it consistent: the same direction for face shading (`drawBox` `light`), floor pools, highlights and shadows.
- The finish (grain and vignette) belongs to the kit, applied once per frame. Don't add grain in shots.

## Depth and 3D

- Use `K.camera` for anything that sits in a room. A 35 mm lens at chest height (about 1.2–1.5 m) reads as natural; lower reads heroic. A slight downward pitch shows the floor.
- Objects need contact to sit in a room: a soft contact shadow (a radial gradient ellipse squashed by perspective), a faint floor reflection (`drawBox(..., { mirror: true, alpha: 0.15 })`), and dust or marks where they touch.
- Paint static scenery once into an offscreen canvas and draw it each frame. This matters when motion blur multiplies every draw by 8–24.
- Parallax: far layers move less than near ones. Even a 2–5% difference between a background and a foreground sells depth.

## Physics

- Define motion as a function of time in the config (`motion`), not as per-frame state. It is deterministic, lets you preview any frame directly, and lets the score follow the same curve.
- An impulse followed by friction: peak speed within 2–4 frames, then constant deceleration (velocity falls linearly, position eases out quadratically) to a dead stop on a cue. See `slideAt`.
- Mass shows in secondary motion: an object braking hard tips forward onto its leading edge and drops back with a knock (`tilt` and `pivot` on `drawBox`). Keep it small: 2–4°.
- Particles: draw all of a particle's random numbers before any early `continue`. Use ballistic motion with drag, `(1 - e^(-k·t)) / k`, plus gravity, and fade over the particle's life.

## Impacts

- Two frames of near-white (the bone colour, not pure white) on the cue frame read as a shutter, so the audience feels the hit.
- Then add the shockwave rings (thinning as they grow), sparks, a hot core cooling over about 0.3 s, a shake decaying over about 0.15 s, and a residue that stays (a seam, haze, a ring).
- Give the first 0.3–0.4 s after an impact many more motion-blur samples (`burst()` in the config). Rings and sparks move hundreds of pixels a frame and step visibly otherwise.

## Type

- Brand type comes from the brand's font files, inlined by the build. Don't substitute a fallback.
- Wide tracking and slow reveals read as premium: `K.text(..., { tracking, reveal })`. A wipe with a soft glowing leading edge reads better than a fade.
- Any text that changes (readouts, counters) or must stay sharp should be drawn from `s.frameT`, so motion blur doesn't smear the digits. Use tabular figures (monospace) for counters so they don't jiggle.
- At 1080p, body type should be at least about 28 px, and labels at least about 15 px with tracking.

## Transitions

- Hard cuts land on sync cues; the QC checks them. A cut to a flash frame is the strongest sync point a picture can make.
- Cross-dissolves between shots belong inside one shot. The kit never blends shots, and motion-blur samples stay inside the shot that owns the frame.
- For a match cut, carry a shape, angle or colour across the cut (the example carries the brand slash from the hairline to the strike's seam to the band to the logo).

## Sound

- Every onset needs a visible cause on the same frame, and every big visible event needs a sound. Silence is a sound: one frame of silence before a hit (`strike()` does this) makes it land harder.
- Layer the hit: click (1–4 ms), noise burst with a falling lowpass, sub thump with a pitch drop, short body. Keep it sample-identical every time it recurs, so the brand has a sonic logo.
- Let tails ring: struck steel on its own bus (`ring`) can carry under several shots, and is cut or re-struck on the next hit (`cutRing`).
- Drive moving sounds from the motion: a skid's rumble cutoff, grit density and squeal pitch all follow `slideAt(t).v`, and its pan follows the position.
- Use a bed (a low note rising into a hit) to build tension without melody. Use a dyad (two soft notes a fifth apart) under the payoff to resolve it.
- Mix by feel relative to the strike, then let `render.mjs` set the loudness. If its log says the limiter took more than about 6 dB, the mix is too spiky: lower the strike a few dB or raise the beds.
