# THE CAMPSITE HAS QUESTIONS — v1 brief for a cloud build session

You are building this project's v1 in one focused session. Ship a small, polished, complete experience — not a prototype and not a sprawling one. Read this brief once, write a plan of 5–10 lines, then build. Stop when the definition of done is met.

## The idea

**09 — THE CAMPSITE HAS QUESTIONS.** Develop one detailed campground, a small expressive cast and three compact mysteries. Players inspect and rotate evidence, hear concise statements and test a reconstruction against the scene. Clues must support fair deduction; animated reconstructions provide the payoff. Begin with one incident, three sufficient clues and two distinguishable explanations. Avoid pixel hunting and answers that depend on unseen facts.

### G6. THE CAMPSITE HAS QUESTIONS

**A cosy miniature mystery with physical evidence and unreliable campers.**

You arrive at a tiny campground where something ridiculous has happened. The emergency bell rang, the picnic table moved, and somebody is wearing the missing tent.

**What you do:** inspect a small 3D scene, pick up and rotate objects, compare physical clues and reconstruct a sequence on a simple incident board. Talk to a few short, expressive characters, then propose what happened.

**First case:** the “stolen” picnic was relocated by a camper trying to follow the shade. A trail of drips, a shifted chair and the direction of a clock's shadow establish the order. A witness confidently describes an event they were asleep for.

**Depth:** the answer depends on relationships between evidence, rather than clicking every item and choosing a random dialogue option. Let the player test a reconstruction against the scene: the kettle tips, a chair moves, a bell rings. Contradictory timing becomes visible.

**Humour:** self-important incident forms, overconfident witness statements and recognisable camping mishaps. The characters can be charming without constant exposition.

**Small complete version:** one campground, three short cases and a small recurring cast. Reuse the location at different times with changed object arrangements.

**Payoff:** a short animated reconstruction and an illustrated incident report. No gruesome crime or harsh accusation is necessary.

**What would ruin it:** pixel hunting, an answer that depends on unseen facts, or explanations longer than the investigation. This direction carries a greater writing and clue-design burden than a simple physics game.

**First proof:** one tiny incident with three fair clues and two possible explanations. A player should be able to reason to the answer without being told it.

---

Art direction: **THE CAMPSITE HAS QUESTIONS:** an illustrated miniature stage with readable evidence and a characterful incident-book interface.

## Definition of done (v1)

1. One focused scene delivering the idea above, with a complete loop: start → core interaction → a visible result or ending → replay. A short first-time hint teaches the controls in place.
2. Arrival loader: keep the veil in `index.html` and `src/loader.ts`; restyle the veil to the art direction and call `worldReady()` after the first rendered frame.
3. Desktop (1440×900) and phone (390×844) layouts; mouse, touch and keyboard; honour `prefers-reduced-motion`; visible focus and labelled controls.
4. `bun run check` passes: strict `tsc`, Biome, `bun test`, production build into `dist/`.
5. Unit tests of the game rules (pure TypeScript, no DOM) replace `tests/scaffold.test.ts`.
6. `README.md`: one status paragraph, how to play, and credits for any asset used.
No extra modes, settings screens, accounts, leaderboards, backends, analytics or network calls.

## Technical rules

- The stack is installed and pinned: Vite, React, strict TypeScript, three.js 0.186 (direct, no React Three Fiber), GSAP, Tailwind v4, Biome, Bun. Add a dependency only if essential, pinned exactly.
- `bun run dev` serves the real app (`index.html` → `src/main.tsx`); `bun run build` builds it into `dist/`. `development/` is old tooling: leave it alone.
- Single responsibility: `src/game/` pure rules and state (tested), `src/scene/` three.js scene, camera, lights and meshes, `src/ui/` React HUD and panels, `src/main.tsx` wiring. Files under ~300 lines.
- Visuals: author forms procedurally in code (geometry, instancing, small shaders where they clearly help), AgX or ACES tone mapping, one key light plus hemisphere or environment light, soft shadows where cheap, a cohesive palette and strong silhouettes. Type: a system font stack. External assets only if CC0 or public domain, with the source in README.
- Performance: 60 fps on a mid laptop; cap devicePixelRatio at 2.
- Do not change `wrangler.jsonc`, deploy or publish anything.

## Working method

- There is no GPU here. Do not loop on screenshots: at most two headless checks (desktop, phone) if Chromium is available (software WebGL is fine).
- Commit in small, clear steps. Finish with a message: what was built, how to play, known gaps.
