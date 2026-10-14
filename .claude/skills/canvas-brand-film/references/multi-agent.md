# Building a film with several agents

Use this when a film is long enough (about 30 s or more), or important enough, that several agents should build it in parallel. Use a workflow only when the user has opted into multi-agent orchestration; otherwise build the shots yourself in sequence. These rules come from the ONE INCH v2 audit; `lessons.md` says what each one prevents.

## Shape

1. **Freeze the contract first, yourself.** Write `film.config.cjs` (shots, cues, shared motion), copy the kit, and render the example or a stub of every shot. Smoke-test the toolchain with a change you can see: override one shot with a solid colour, preview it, and confirm the pixel changed. Do this before any agent starts.
2. **Ask the owner** any question whose answer changes a brief, such as which way an object travels or what the payoff frame is, before fanning out. An agent cannot ask them.
3. **One pipeline per shot, not one barrier per phase.** Each shot runs build → review → fix → re-review on its own, so a slow shot never holds up a fast one, and each fix receives its own review through the closure. Never match reviews back to shots by text.
4. **Give the hero shot more than one build.** For the shot the owner cares most about, run two or three independent builds from different approaches. Render them at identical times, label them A/B/C, and have judges score them per lens. Take the winner and graft in the best ideas from the others.
5. **Every agent previews the whole film.** `preview.mjs` always builds every shot, so a shot that depends on another (a tile showing a frame of an earlier shot) is judged with the real dependency. Each agent writes only its own `shots/NN-name.js`; give each agent its own `--out out/preview-<shot>` folder so their runs don't collide.
6. **Score last, or in parallel from the frozen cues only.** The sound designer reads times and motion only from the config, never from a prompt. If a builder needs to move a cue, the change goes into the config (by you), and the score is regenerated.
7. **Close with an integration loop.** Render the whole film and run the QC. Then run critics with distinct lenses over the whole film (`critique.md`), each asked to disprove. Route each verified finding to the shot that owns it (a lookup from shot name to file, kept in code), fix, re-render, and loop until a pass has no verified majors (at most about 3 rounds).
8. **Build the report from data.** The summary to the owner comes from `qc.json`, `render.log` and the verified findings list, with deferred decisions named.

## Sketch

```js
const SHOTS = [{ name: 'open', file: 'shots/01-open.js', brief: '...' }, /* ... */]
const HERO = 'slide'

// 3 and 5: each shot runs straight through, keeping its identity in the closure
const built = await pipeline(SHOTS,
  s => s.name === HERO ? judgePanel(s) : agent(buildPrompt(s), { schema: BUILD }),
  (b, s) => agent(reviewPrompt(s, b), { schema: REVIEW }),       // asked to disprove the builder's claims
  (r, s) => r.issues.length ? agent(fixPrompt(s, r), { schema: FIX }) : { applied: [] },
  (f, s) => agent(reReviewPrompt(s, f), { schema: REVIEW }))      // verify the fix

// 7: the integration loop
for (let round = 1; round <= 3; round++) {
  const qc = await agent('cd film && node render.mjs; return out/qc.json', { schema: QC })
  const lenses = ['sync', 'motion and physics', 'light and material', 'type and brand', 'story and pacing', 'mastering']
  const found = (await parallel(lenses.map(l => () => agent(critiquePrompt(l, qc), { schema: FINDINGS })))).filter(Boolean).flatMap(r => r.findings)
  const verified = (await parallel(found.map(f => () => agent(refutePrompt(f), { schema: VERDICT }).then(v => v.real ? f : null)))).filter(Boolean)
  if (!verified.some(f => f.severity !== 'minor') && qc.ok) break
  await parallel(groupBy(verified, f => f.shot).map(([shot, fs]) => () => agent(fixPrompt(SHOTS.find(s => s.name === shot), fs), { schema: FIX })))
}
```

## Briefing an agent

- Give it the kit's rules from `SKILL.md` (determinism, `frameT`, no grain in shots, cues only from the config). Give it the shot's brief, the cues it uses, and the exact preview commands with its own `--out` folder.
- Ask for at least three render-look-change iterations on hero work. Ask it to return the preview commands it ran and the cost per frame it measured. A claim of "deterministic" must come with `preview.mjs --determinism` output, and a claim of "fixed" must come with the frame it looked at.
- Reviewers get the builder's claims and are asked to refute them, looking at the frames themselves.
