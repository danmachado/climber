# Climber: project brief

Paste this into the Climber Game project's instructions, or add it as project knowledge. It points at everything
else; the code itself carries the detailed rules in CLAUDE.md.

## What it is

A single-screen precision platformer (Celeste-style movement, original art and levels) for Dan's wall-mounted
Tokenframe, a 55 inch portrait Android display running Chrome as a PWA. Plus a room builder that publishes levels.
Repo: danmachado/climber on GitHub, served by GitHub Pages from main.

## Where the knowledge lives

- `CLAUDE.md` in the repo: the rules of the codebase (build pipeline, tests, every mechanic and world, the frame's
  performance limits, reply style). Any session with the repo attached reads it automatically. Keep it current.
- Research reports (Claude Docs):
  - Celeste Movement Report: https://claude.ai/artifact/WXE5vrhWKFG1gsxUSfZXC9
  - Celeste Level Design Report: https://claude.ai/artifact/3r47QJcGcrht8vH2powQ23
  - Celeste Aesthetic Report: https://claude.ai/artifact/MLXRM7ZVP6pR2Mk8A7b8KQ
  - Celeste Character Report: https://claude.ai/artifact/BpFht5FFqds5G4Hk7W4ENC
  - Death Fight Forever Report (world 4, Temple): https://claude.ai/artifact/Phg4TAT78vSfPFmP8sxXob
  - Neon City Report (world 5, Neon Row): https://claude.ai/artifact/BJJEWg4w4RFnMa5JZBAaU3
- Diagnostic pages for the frame: `controller-test/` and `perf/` in the repo.

## Standing rules from Dan

- Dan does account setup, sign-in, purchases and anything that costs money. Claude never enters passwords or
  creates accounts.
- Inspiration only: all art, levels, characters, names and sounds are original. Nothing copied from other games.
- Say plainly what was tested and what was not, especially anything not yet seen on the frame.
- The frame is slow at repainting: no full-screen redraws per frame, no flashing or strobing, mark dirty rectangles.
- Every new level element goes into the game, the builder palette, the auto-builder (`src/gen.js`) and the
  auto-player (`tests/gentest.js`), with a large sweep at zero failures before shipping.
- Reply style: short, casual, bullets for steps, no em dashes, no emoji.

## State as of 2026-10-13

- Five worlds: Brickyard, Icehouse, Furnace, Temple, Neon Row. Nine levels each (one tall), half of them island
  layouts (floating slabs, pillars, shelves) and half floors.
- Hero: hero-wolf, the lone climber with the bandana (two one-pixel tails and a lock of hair simulated in code).
- Not yet seen on the frame: Temple, Neon Row, island layouts, the hero restyle, lasers and drones readability.
- Next up when Dan says so: a smarter auto-player for island rooms (option A), more island hazards (drones,
  lasers on slabs), and whatever he brings.
