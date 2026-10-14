# Whole-film critique

Run this after every passing render, before delivering. A section that looks right on its own can still be wrong in the film: a hit out of step with its picture, grain that changes at a cut, a fade that ends on grey. The audited film shipped all three because nobody reviewed it as a whole.

## What to look at

1. `out/<name>-contact.png`, the whole film at a glance: pacing, palette, where the eye goes.
2. For every cue: `node preview.mjs --cue <name> --around 2`. Does the change happen exactly on the cue frame? Is the frame before it clean, with no early leak?
3. Every cut between shots: the last 2 frames of one shot and the first 2 of the next (`--frames`). Check exposure, grain, black level and scale.
4. The hero shot, frame by frame through its fastest moment (`--frames a-b`). Look at motion blur, contact and physics.
5. The last second: the final frame must be what the brief says it is (black, or the lockup).
6. `out/qc.json` and `out/render.log`: loudness, true peak, limiter reduction, every sync offset.

Open the PNGs with the Read tool. Crop and view at 1:1 anything with fine detail (type, edges, grain). A 480 px strip hides most defects.

## Lenses

Take each lens separately. With several agents, give each lens to its own agent and ask it to **disprove** that the film passes that lens: list what fails, with the frame or time, and the fix.

| Lens | Questions |
|---|---|
| Sync | Does every sound with an onset have a visible cause on the same frame? Are there sounds without pictures, or big picture events without sound? Does any sound follow motion (a pan or pitch tied to speed) and actually match it? |
| Motion and physics | Do objects have weight? Is the anticipation, overshoot and settle believable? Is there contact (shadows, reflections) where things touch the floor? Is the blur visible at the fastest moments? Does anything strobe, jitter or pop between neighbouring frames? |
| Light and material | Is there one consistent key light? Do materials read as metal, wood, glass or paper? Do blacks sit at the same level from shot to shot? Does the grain match across cuts? |
| Type and brand | Are colours exactly the brand hexes (check in the PNG frames, not a decoded video)? Is the logo used as supplied, never redrawn or distorted? Is all type legible at the delivery size for at least 1.5 s? Is the slash, angle or other brand geometry consistent? |
| Story and pacing | Is the idea readable on one viewing, with no sound? Does each shot hand off to the next? Is there dead air? Does the payoff land, and does it hold long enough to read? |
| Mastering | Is loudness within ±1 LU of target and true peak at or under target? Did the limiter take more than about 6 dB? Is there a click at the head or tail? Does the fade end in silence? |

## Writing findings

Write each finding as: severity (blocker, major or minor), the time or frame, what is wrong, why it matters, and the specific fix. Fix the blockers and majors, re-render, and critique again. Stop when a whole pass finds no majors. Keep the findings list: it becomes the honest summary for the user, including anything left as their decision.
