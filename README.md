# THE CAMPSITE HAS QUESTIONS

A cosy miniature mystery game about physical evidence and unreliable campers. You arrive at a tiny campground where something ridiculous has happened. You inspect evidence, hear the campers out, then test your reconstruction against the scene.

**Status:** v1 is complete and playable. It has one procedural 3D campground, a recurring cast of three, and three short cases: the picnic in the afternoon, the tent in the rain, the bell at dawn. Each case has three fair clues and two possible explanations, and ends in an animated reconstruction and an illustrated incident report. It has music, ambience for each time of day, and effects for every meaningful interaction. Nothing has been deployed.

## How to play

1. **Read the incident form**, then press *Begin investigation*.
2. **Inspect evidence.** Every clue has a red **?** tag in the scene, so there is no pixel hunting. Tap or click a tag to pick up a small sample and read what it shows. Turn the sample by dragging, with the arrow keys, or with the ◀ ▲ ▼ ▶ buttons.
3. **Talk to the campers.** Tap a name tag to hear a short statement. Some witnesses are very confident and wrong. Once you've found the evidence that disproves a statement, it is stamped *doubtful*.
4. **Open the Incident Board** (the button, or press `B`). Put the three events in order with ▲ ▼, then choose who did it and why.
5. **Test against the scene.** The camp resets and replays your version. If a beat contradicts evidence you have found, the replay stops and a red ring marks the clue. A beat that no evidence backs up yet is shown as unproven.
6. **File the report.** A wrong report is returned by the Campground Committee and costs an acorn. A correct report plays the official reconstruction and shows your illustrated report. Close three cases to finish the season, then *Play again*.

The answer always comes from how the evidence relates: one clue orders two events, a second clue orders another pair, and the third decides the explanation. No single clue settles a case. Unit tests check that exactly one reconstruction survives all three clues.

Controls: mouse, touch or keyboard. Tab moves through every tag and control, Esc closes a panel, `B` opens the board, `M` or the corner button mutes (remembered per browser), and the arrow keys look around or turn the evidence. With `prefers-reduced-motion`, the replay jumps straight to each beat's outcome and the idle motion stops.

## Development

```sh
bun install --frozen-lockfile
bun run dev      # http://127.0.0.1:4519/
bun run check    # tsc, Biome, bun test, production build into dist/
bun run preview  # http://127.0.0.1:4619/
```

- `src/game/`: pure rules and case data (tested in `tests/rules.test.ts`)
- `src/scene/`: the three.js campground, cast, per-case staging, and the evidence turntable
- `src/ui/`: the React incident-book interface
- `src/loader.ts` + `index.html`: the arrival veil, lifted after the first rendered frame

## Sound

Audio starts on the first click, tap or key press. That's also when the files load (28 mono MP3s, about 1.2 MB). Each case has its own ambient bed: birds in the afternoon, rain for the tent, crickets and birds at dawn. The music ducks under reconstructions and reports, and everything pauses while the tab is hidden. The event animations trigger their own effects (footsteps, the bell, the kettle, the creaking chair). Each file was downmixed to mono and re-encoded from the originals listed below.

## Credits

All geometry, materials and animation are authored procedurally in code for this project. There are no external models, textures or fonts. Libraries: three.js, GSAP, React, Tailwind CSS (MIT / standard GSAP licence).

Audio (all **CC0 1.0**, public domain dedication; credited with thanks, though not required):

| File(s) in `public/audio/` | Source | Author | Licence |
| --- | --- | --- | --- |
| `music-cozy.mp3` ("Cozy Puzzle In-Game 1") | https://opengameart.org/content/cozy-puzzle-in-game-1 | MintoDog | CC0 |
| `amb-birds.mp3` ("Ambient Bird Sounds") | https://opengameart.org/content/ambient-bird-sounds | isaiah658 | CC0 |
| `amb-rain.mp3` ("Rain (loopable)") | https://opengameart.org/content/rain-loopable | Ylmir | CC0 |
| `amb-crickets.mp3` ("Crickets Ambient Noise - loopable") | https://opengameart.org/content/crickets-ambient-noise-loopable | Wolfgang_ | CC0 |
| `sfx-click`, `sfx-turn`, `sfx-talk`, `sfx-tick`, `sfx-select`, `sfx-beat-ok`, `sfx-beat-unproven`, `sfx-contradiction`, `sfx-returned`, `sfx-begin` | Interface Sounds, https://kenney.nl/assets/interface-sounds | Kenney (kenney.nl) | CC0 |
| `sfx-pickup`, `sfx-board-open`, `sfx-board-close`, `sfx-kettle`, `sfx-creak`, `sfx-book`, `sfx-cloth`, `sfx-peg` | RPG Audio, https://kenney.nl/assets/rpg-audio | Kenney (kenney.nl) | CC0 |
| `sfx-stamp`, `sfx-bell`, `sfx-step`, `sfx-thud` | Impact Sounds, https://kenney.nl/assets/impact-sounds | Kenney (kenney.nl) | CC0 |
| `sfx-jingle-closed`, `sfx-jingle-finale` | Music Jingles (Pizzicato), https://kenney.nl/assets/music-jingles | Kenney (kenney.nl) | CC0 |
