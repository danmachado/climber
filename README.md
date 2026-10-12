# Climber

A single-screen precision platformer for the wall frame, plus its room builder.

- `index.html` is the game.
- `builder/` is the room builder (paint, auto-build, play test, publish).
- `controller-test/` and `perf/` are diagnostic pages for the frame.
- `playground.json` is a sample room using ice, crumble blocks and moving platforms. Import it in the builder.

These files are built output. Published rooms live in Supabase and are fetched by the game at start.
