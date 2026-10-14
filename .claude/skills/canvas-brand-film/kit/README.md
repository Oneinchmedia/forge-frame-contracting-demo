# Brand film kit

A film made of code: each shot is a JavaScript Canvas 2D function of time. Playwright captures every frame, a soundtrack is synthesised in JavaScript, and FFmpeg encodes, loudness-masters and checks the result. The example is an 8-second One Inch Media sting.

```bash
npm install          # Playwright 1.56.1, pinned
node render.mjs      # → out/one-inch-sting.mp4, -web.mp4, -master.mp4, poster, contact sheet, qc.json, render.log
```

| Command | Use |
|---|---|
| `node preview.mjs --sheet` | every shot at start, middle and end |
| `node preview.mjs --cue land --around 3` | the frames around a sync point |
| `node preview.mjs --frames 110-118 --determinism` | consecutive frames, rendered twice and compared |
| `node score.mjs` | the soundtrack alone (`out/work/score.wav`) |
| `node render.mjs --keep-frames` then `--reuse-frames` | re-encode or remaster without recapturing |
| `node qc.mjs file.mp4` | delivery checks on any file: format, BT.709 tags, loudness, true peak, audio-picture sync, ending |

- **Where times live:** in `film.config.cjs`. Shots read cues with `s.cue('name')` and the score with `T('name')`, so picture and sound can't drift apart.
- **Where the picture lives:** in `shots/`, one file per shot.
- **Where the sound lives:** in `score.mjs`, using `lib/synth.mjs`.

The full method, the rules and why they exist are in the skill's `SKILL.md` and `references/`.
