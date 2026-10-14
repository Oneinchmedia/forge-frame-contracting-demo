# Lessons from the ONE INCH v2 audit

ONE INCH v2 was a 30-second canvas film for One Inch Media. Sixteen agents built it: five section builders, a sound designer, five reviewers and five fixers. A ten-agent audit then measured the delivered file; no finding was refuted. Each row below is a defect the audit found, and what this kit does so it cannot ship again.

| What went wrong in v2 | Measured | What the kit does now |
|---|---|---|
| The lockup's hit played before the blades landed: a builder moved the landing, while the score kept the time written into its prompt | Audio led picture by 260 ms (8 frames) | One cue sheet read by picture and score; sync cues snapped to frames; QC measures every sync cue on the finished file and fails beyond one frame |
| The heartbeat ring, the counter clicks and the panel sounds were all out of step, for the same reason | 3 heartbeats against 2 pulses; clicks up to 640 ms early; panel cues 140–650 ms early | Same as above; shared motion functions (like `slideAt`) drive sound that follows movement |
| The delivery message claimed "clicks locked to the counter" and miscounted the review notes (48 claimed, 40 real) | False claims to the owner | Report only numbers from `qc.json` and `render.log`; describe only what you have looked at |
| Untagged BT.601 encodes: most players showed the brand red #E72722 lighter and more orange | ΔE2000 about 5 | BT.709 matrix plus tags on every encode; QC checks the tags; poster and contact sheet come from the PNGs |
| Audio far too quiet, with a peak over full scale after AAC encoding | -21.7 LUFS, +0.1 dBTP | Mastering to -14 LUFS / -1 dBTP, verified on the AAC itself, with a limiter-reduction warning |
| The chair's motion blur was invisible: four faint grey ghosts | Edges crisp at 28 px per frame, so it strobed | Real sub-frame accumulation, per-shot samples, sample bursts after impacts, `frameT` for type |
| Module overrides silently did nothing: frame functions were bound at load time, and every builder had to find and patch it | 1–3.5 min lost per builder | Shots are looked up by name at draw time |
| The preview strip mixed in stale PNGs from earlier runs | The chair builder's last strip had no stop frames | The preview output folder is emptied every run |
| Section previews loaded only their own module, so one section showed the old chair inside a later shot | Wrong chair in the reviewers' renders | Preview always builds the whole film |
| The 60 ms frame budget timed only draw-call recording | Real cost 26–143 ms per frame | Timings include a forced rasterise |
| The 1080p delivery was re-encoded from a lossy master by an undocumented command | Second-generation file, 20% larger | Every deliverable is encoded from the PNG frames by `render.mjs` |
| Playwright was unpinned and tool versions were not recorded | A fresh install would render with a different browser | Exact pin plus lockfile; `render.log` records Node, Playwright, Chromium and FFmpeg versions plus checksums |
| Grain was inconsistent across shots, and frozen or missing in four of them | Seen in the contact sheet | The finish is applied once per frame by the kit, never by shots |
| The web encode banded in dark gradients and lost the grain | crf 24 at 720p | `-tune grain`, `aq-mode=3`, crf 20 |
| A missing asset fell back silently, and a run with page errors still overwrote the deliverables | Possible silent v1 output | The build fails on a missing image; the page fails on a missing font; capture stops on the first page error |
| Nothing ever judged the whole film; the promised final critic was skipped | Every serious defect crossed sections | Workflow step 7 and `references/critique.md` |
| Reviews were critique, not verification; fixes were never re-reviewed | 2 false "verified" claims from fixers | Critics are asked to disprove; re-render and critique again until a pass finds no majors |
| Review notes were matched back to sections by text, and section A's notes once reached the chair fixer | A near miss | See `multi-agent.md`: keep each section's identity in code, and give each fix its own review by closure |
