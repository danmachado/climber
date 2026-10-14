  // ---- auto-builder: turns a few settings into a random room ----
  // Rooms are stacked floors. Each floor is crossed in one direction past a run of obstacles, and ends at a way
  // up to the next floor. Difficulty sets how big each hazard is and how little safe ground sits between them;
  // the obstacle and piece settings set how many there are and what they are made of.
  // A shaping pass then makes each room look less like a ladder: walls step in and out, ceilings hang down in
  // uneven lumps wherever the route does not need the headroom, and a dim backdrop layer adds depth.
  //
  // RULE: every level element the game supports must also be something this builder can place. When a new
  // element is added to the game, add it here (and to the auto-player in tests/gentest.js) in the same change.
  function generateRoom(opts, seed) {
    var layout = opts.layout || 'floors';
    if (layout === 'mixed') layout = ((seed >>> 3) % 2) ? 'islands' : 'floors';
    if (layout === 'islands') return generateIslands(opts, seed);
    return generateFloors(opts, seed);
  }
  // ---- island rooms: no full-width floors. Floating slabs at staggered heights, pillars to climb, chimneys to
  // bounce up. The route zigzags from island to island; each move is a hop, a climb or a chimney, and the plan
  // records which so the auto-player can follow it. ----
  function generateIslands(opts, seed) {
    var COLS = 27, ROWS = opts.rows === 96 ? 96 : 48, D = Math.max(1, Math.min(5, opts.difficulty | 0)), s = seed >>> 0;
    var EL = opts.elements || { spikes: opts.spikes > 0, refills: !!opts.refills };
    var SP = EL.spikes ? Math.max(1, opts.spikes | 0) : 0;
    var WORLD = opts.world | 0, SHAPE = opts.shape !== false;
    var OWN = { ice: 2, firepits: 3, fireballs: 3, jets: 3, lava: 3, lasers: 4, drones: 4 }, own;
    if (WORLD) for (own in OWN) if (EL[own] && OWN[own] !== WORLD) { EL = Object.assign({}, EL); EL[own] = false; }
    var HZ = SP > 0 ? SP : (EL.firepits ? 1 : 0);
    function rnd() { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function pick(w) { var k, sum = 0, r; for (k in w) sum += w[k]; if (sum <= 0) return null; r = rnd() * sum; for (k in w) { r -= w[k]; if (r < 0) return k; } return null; }
    var g = [], r, c, i;
    for (r = 0; r < ROWS; r++) { g.push([]); for (c = 0; c < COLS; c++) g[r].push((r === 0 || r >= ROWS - 2 || c === 0 || c === COLS - 1) ? '#' : '.'); }
    function set(x, y, ch) { if (x >= 1 && x <= 25 && y >= 1 && y <= ROWS - 3) g[y][x] = ch; }
    function fill(x0, x1, y0, y1, ch) { for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) set(xx, yy, ch); }
    function at(x, y) { return (x >= 0 && x <= 26 && y >= 0 && y < ROWS) ? g[y][x] : '#'; }
    var stats = { floors: 0, obstacles: 0, spikes: 0, ice: 0, crumble: 0, platforms: 0, zips: 0, fire: 0, fireballs: 0, springs: 0, gems: 0, keys: 0, jets: 0, lava: 0, lasers: 0, drones: 0, islands: 0 };
    var HOP = [[3, 4], [3, 5], [4, 5], [4, 6], [5, 6]][D - 1];          // horizontal gap between islands, in tiles (6 needs a dash)
    var RISE = [[1, 2], [1, 2], [2, 3], [2, 3], [2, 3]][D - 1];         // how far up the next island sits (3 is a full jump)
    var plan = [], islands = [];
    // the start island: a short slab at the bottom
    // the floor is the first island (full width), so a fall always lands somewhere the route can restart from
    var dir = rnd() < 0.5 ? 1 : -1, x = 1, w = 25, y = ROWS - 2;
    g[y - 1][dir > 0 ? 3 : 23] = 'S';
    islands.push({ x: x, w: w, y: y, move: 'start', dir: dir }); stats.islands++;
    x = dir > 0 ? 1 : 16; w = 10;                        // the first hop leaves from the start side of the floor
    var usedKey = false, usedGem = false, k = 0;
    while (y > 9) {
      var move = pick({ hop: 6, climb: y > 14 ? 3 : 0, chimney: y > 16 && D >= 2 ? 2 : 0, spring: EL.springs !== false && y > 14 ? 1.5 : 0, zip: (EL.zips || EL.movers) && y > 12 ? 1.5 : 0 });
      var nw = ri(3, 6), nx, ny, gap, rise, isl = { move: move };
      if (move === 'hop') {
        gap = ri(HOP[0], HOP[1]); rise = k === 0 ? 3 : ri(RISE[0], RISE[1]);
        // what a plain jump reaches: rise 3 over a 2 gap, rise 2 over 4, rise 1 over 5; anything wider needs a dash (difficulty 3 up)
        var reach = [6, 5, 4, 2][rise];
        if (gap > reach) { if (D >= 3 && gap <= reach + 3) isl.dash = true; else gap = reach; }
        if (k === 0) { gap = Math.max(gap, 4); rise = 2; isl.dash = false; }   // the first island: clear of the floor, a plain jump away
        nx = dir > 0 ? x + w + gap : x - gap - nw; ny = y - rise;
        if (nx < 1 || nx + nw > 25) { dir = -dir; nx = dir > 0 ? x + w + gap : x - gap - nw; if (nx < 1 || nx + nw > 25) { nx = Math.max(1, Math.min(25 - nw + 1, nx)); } }
        // the next island never hangs over this one (you would hit its underside), and never rises more than a jump
        if (dir > 0 && nx < x + w + 1) nx = x + w + 1; if (dir < 0 && nx + nw > x) nx = x - nw;
        if (nx < 1 || nx + nw > 25) { dir = -dir; nx = dir > 0 ? x + w + gap : x - gap - nw; nx = Math.max(1, Math.min(25 - nw + 1, nx)); if (dir > 0 && nx < x + w + 1) nx = x + w + 1; if (dir < 0 && nx + nw > x) nx = x - nw; }
        if (nx < 1 || nx + nw > 25) { nw = 3; nx = dir > 0 ? Math.min(25 - 2, x + w + 1) : Math.max(1, x - 3); }
        fill(nx, nx + nw - 1, ny, ny, '#');
        // a spike patch on the far side of the landing, never where you land
        if (HZ > 0 && nw >= 5 && rnd() < [0.2, 0.35, 0.5, 0.6, 0.7][D - 1]) { var sw = Math.min(nw - 3, ri(1, 2)), sx = dir > 0 ? nx + nw - sw : nx; fill(sx, sx + sw - 1, ny - 1, ny - 1, EL.firepits ? 'F' : '^'); isl.spikes = [sx, sw]; stats[EL.firepits ? 'fire' : 'spikes'] += sw; }
      } else if (move === 'climb') {                       // a pillar beside this island; climb its face, the next island is on top or past it
        var ph = ri(5, 8); gap = 1; nw = ri(3, 5);
        var px = dir > 0 ? x + w : x - 1;                  // pillar is one tile wide, ph tall, flush with the island edge so you grab it from the island
        if (dir > 0 ? px + 1 + nw > 25 : px - nw < 1) { dir = -dir; px = dir > 0 ? x + w + gap : x - gap - 1; }
        px = Math.max(2, Math.min(24, px));
        fill(px, px, y - ph, y - 1, '#');
        nx = dir > 0 ? px + 1 : px - nw; ny = y - ph;      // the landing joins the pillar top on its far side
        nx = Math.max(1, Math.min(25 - nw + 1, nx));
        fill(nx, nx + nw - 1, ny, ny, '#');
        isl.pillar = px; isl.ph = ph; isl.side = dir;
      } else if (move === 'chimney') {                     // two facing walls hang above the end of this island; jump up into the gap and bounce between them
        var ch = ri(6, 9), cw = 4, cx = dir > 0 ? x + w - cw - 2 : x;          // the chimney straddles the last cw+2 tiles of the island
        if (w < cw + 2) { var ext = cw + 2 - w; if (dir > 0) { fill(x + w, x + w + ext - 1, y, y, '#'); w += ext; cx = x + w - cw - 2; } else { fill(x - ext, x - 1, y, y, '#'); x -= ext; w += ext; cx = x; } }
        var wallBot = y - 4, wallTop = wallBot - ch;                            // the walls start 3 tiles above the island so you can walk under and jump up
        fill(cx, cx, wallTop, wallBot, '#'); fill(cx + cw + 1, cx + cw + 1, wallTop, wallBot, '#');
        nx = cx; nw = cw + 2; ny = wallTop;
        fill(nx, nx + nw - 1, ny, ny, '#'); set(nx + 1 + ri(0, cw - 1), ny, '.');     // a hole in the lid to come up through
        isl.hole = -1; for (i = nx; i < nx + nw; i++) if (at(i, ny) === '.') isl.hole = i;
        isl.cx = cx; isl.cw = cw; isl.ch = ch; isl.wallBot = wallBot;
        nx = cx; ny = wallTop;
      } else if (move === 'spring') {                      // a spring on this island fires you up to a high slab
        var sxp = dir > 0 ? x + w - 1 : x; set(sxp, y - 1, 'u'); stats.springs++;
        nw = ri(3, 5); nx = Math.max(1, Math.min(25 - nw + 1, sxp - Math.floor(nw / 2))); ny = y - ri(9, 11);
        fill(nx, nx + nw - 1, ny, ny, '#'); isl.spring = sxp;
      } else {                                             // a platform (or zip) on a vertical track up to the next slab
        var tx = dir > 0 ? x + w + 1 : x - 2, rise2 = ri(6, 9);
        if (tx < 2 || tx > 24) { dir = -dir; tx = dir > 0 ? x + w + 1 : x - 2; }
        tx = Math.max(2, Math.min(24, tx));
        var zip = EL.zips && (!EL.movers || rnd() < 0.5);
        fill(tx, tx, y - rise2, y - 2, '|'); set(tx, y - 1, zip ? 'z' : '='); if (zip) stats.zips++; else stats.platforms++;
        nw = ri(3, 5); nx = dir > 0 ? tx + 1 : tx - nw; ny = y - rise2 - 1;
        if (nx < 1) nx = 1; if (nx + nw > 25) nx = 25 - nw + 1;
        fill(nx, nx + nw - 1, ny, ny, '#'); isl.track = tx; isl.zip = zip;
      }
      isl.x = nx; isl.w = nw; isl.y = ny; isl.dir = dir;
      if (EL.keys && !usedKey && k >= 2 && rnd() < 0.5) { set(nx + Math.floor(nw / 2), ny - 1, 'k'); usedKey = true; stats.keys++; }
      if (EL.gems !== false && !usedGem && k >= 1 && isl.spikes) { set(isl.spikes[0], ny - 4, 'G'); usedGem = true; stats.gems++; }
      islands.push(isl); stats.islands++;
      x = nx; w = nw; y = ny; k++;
      if (rnd() < 0.3) dir = -dir;                         // zigzag now and then
    }
    // the exit: on the last island, or a slab beside it
    var ex = x + (dir > 0 ? w - 2 : 0); fill(ex, ex + 1, y - 2, y - 1, 'E');
    if (stats.keys) { var dx0 = dir > 0 ? ex - 1 : ex + 2; set(dx0, y - 1, 'D'); set(dx0, y - 2, 'D'); }
    if (EL.lava && ROWS >= 96) { for (var lc = 1; lc < COLS - 1; lc++) g[ROWS - 1][lc] = '~'; stats.lava = 1; }
    // shaping: the side walls bulge in where no island needs the space, and a dim backdrop behind the route
    if (SHAPE) {
      for (r = 2; r < ROWS - 3; r++) {
        var lw = 0, rw = 0;
        for (i = 0; i < islands.length; i++) { var q = islands[i]; if (r >= q.y - 8 && r <= q.y + 1) { lw = Math.max(lw, 0); } }
        var free = true; for (i = 0; i < islands.length && free; i++) { q = islands[i]; if (r >= q.y - 8 && r <= q.y + 1 && q.x <= 5) free = false; }
        var free2 = true; for (i = 0; i < islands.length && free2; i++) { q = islands[i]; if (r >= q.y - 8 && r <= q.y + 1 && q.x + q.w - 1 >= 21) free2 = false; }
        if (r >= ROWS - 9) continue;                        // the floor strip stays open so you can walk back to the start after a fall
        if (free && (r % 7 < 4)) fill(1, 1 + ri(1, 3), r, r, '#');
        if (free2 && ((r + 3) % 7 < 4)) fill(25 - ri(1, 3), 25, r, r, '#');
      }
      for (i = 0; i < islands.length; i++) { q = islands[i]; var bh = ri(2, 5), bx = q.x + ri(0, Math.max(0, q.w - 3)), bw = ri(2, 3); for (r = q.y + 1; r <= q.y + bh; r++) for (c = bx; c < bx + bw; c++) if (at(c, r) === '.') set(c, r, 'b'); }
    }
    for (i = 0; i < islands.length; i++) plan.push(islands[i]);
    return {
      plan: { kind: 'islands', islands: islands }, stats: stats,
      room: { format: 1, id: 'auto-' + seed, name: 'Auto ' + seed, difficulty: D, world: WORLD || 1, grid: { cols: COLS, rows: ROWS, tile: 10 },
              tiles: g.map(function (row) { return row.join(''); }), entities: [] }
    };
  }
  function generateFloors(opts, seed) {
    var COLS = 27, ROWS = opts.rows === 96 ? 96 : 48, D = Math.max(1, Math.min(5, opts.difficulty | 0)), s = seed >>> 0;
    var EL = opts.elements || { spikes: opts.spikes > 0, refills: !!opts.refills };      // which pieces may be used
    var SP = EL.spikes ? Math.max(1, opts.spikes | 0) : 0;                               // 0 none, 1 some, 2 lots
    var styles = opts.styles && opts.styles.length ? opts.styles : (opts.style && opts.style !== 'mixed' ? [opts.style] : []);
    var SHAPE = opts.shape !== false;
    var WORLD = opts.world | 0, ICY = WORLD === 2 ? 4 : 1;                                // a world leans on its own pieces
    var OWN = { ice: 2, firepits: 3, fireballs: 3, jets: 3, lava: 3, lasers: 4, drones: 4 }, own;   // pieces that belong to one world
    if (WORLD) for (own in OWN) if (EL[own] && OWN[own] !== WORLD) { EL = Object.assign({}, EL); EL[own] = false; }
    var HZ = SP > 0 ? SP : (EL.firepits ? 1 : 0);                                        // floor hazards: spikes, or flames in the Furnace                                                    // organic shaping on by default
    function likes(st) { return styles.length && styles.length < 3 && styles.indexOf(st) >= 0; }
    function rnd() { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function rr(p) { return ri(p[0], p[1]); }
    function pick(w) { var k, sum = 0, r; for (k in w) sum += w[k]; if (sum <= 0) return null; r = rnd() * sum; for (k in w) { r -= w[k]; if (r < 0) return k; } return null; }
    var g = [], r, c;
    for (r = 0; r < ROWS; r++) { g.push([]); for (c = 0; c < COLS; c++) g[r].push((r === 0 || r >= ROWS - 2 || c === 0 || c === COLS - 1) ? '#' : '.'); }
    function col(t, d) { return d > 0 ? 1 + t : 25 - t; }
    function put(t, d, row, ch) { var x = col(t, d); if (x >= 1 && x <= 25 && row >= 1 && row <= ROWS - 3) g[row][x] = ch; }
    function box(t0, t1, r0, r1, d, ch) { for (var q = r0; q <= r1; q++) for (var t = t0; t <= t1; t++) put(t, d, q, ch); }
    function get(t, d, row) { var x = col(t, d); return (x >= 0 && x <= 26 && row >= 0 && row < ROWS) ? g[row][x] : '#'; }

    // what each difficulty means, from 1 Gentle to 5 Brutal
    var TUNE = {
      gap:    [[4, 5], [3, 4], [3, 4], [3, 3], [3, 3]][D - 1],            // safe ground between obstacles, in tiles
      spikeW: [[2, 2], [2, 3], [3, 4], [4, 5], [5, 6]][D - 1],            // spike patch you can clear with a jump
      wideW:  [null, [6, 7], [7, 8], [8, 9], [9, 10]][D - 1],             // spike gap that needs a jump and a dash
      crownW: [null, null, [2, 2], [2, 3], [3, 3]][D - 1],                // raised block with spikes on top
      wallH:  [[4, 4], [4, 4], [4, 5], [4, 5], [5, 5]][D - 1],            // wall to climb over
      iceL:   [[3, 4], [3, 4], [4, 5], [4, 6], [5, 6]][D - 1],            // ice you slide along before a hazard
      bridgeW: [[3, 4], [4, 5], [5, 6], [6, 7], [7, 8]][D - 1],           // crumbling bridge
      ferryW: [[8, 8], [8, 9], [9, 10], [10, 11], [11, 12]][D - 1]        // gap crossed on a moving platform
    };
    var target = [1, 2, 9][opts.obstacles];
    var plan = [], y = ROWS - 2, d = rnd() < 0.5 ? 1 : -1, Wprev = 0, prevType = '', off = 0, floor = 0;
    var stats = { floors: 0, obstacles: 0, spikes: 0, ice: 0, crumble: 0, platforms: 0, zips: 0, fire: 0, fireballs: 0, springs: 0, gems: 0, keys: 0, jets: 0, lava: 0, lasers: 0, drones: 0 };
    function zipPick() { return EL.zips && (!EL.movers || rnd() < 0.5); }   // a platform spot becomes a zip mover
    var gemFloor = EL.gems !== false ? ri(0, 2) : -1;                                   // one gem, over a hazard on an early floor
    g[ROWS - 3][col(2, d)] = 'S';
    if (EL.lava && ROWS >= 96) { for (var lc = 1; lc < COLS - 1; lc++) g[ROWS - 1][lc] = '~'; stats.lava = 1; }   // rising lava starts under the first floor of a tall room

    while (true) {
      var maxHf = y - 8, top = maxHf < 6, headroom = top ? y - 1 : maxHf - 1;
      // the way up at the end of this floor
      var conn = null, sh = 0;
      if (!top) {
        conn = { type: pick({
          steps: [5, 3, 2, 1, 0.5][D - 1] * (likes('jump') ? 2 : 1),
          open: 2 * (likes('dash') || likes('climb') ? 2 : 1),
          curtain: maxHf >= 7 ? [1, 2, 3, 4, 5][D - 1] * 0.8 * (likes('climb') ? 2 : 1) : 0,
          lift: EL.movers || EL.zips ? 3 : 0,
          spring: EL.springs !== false ? 2.5 : 0                       // bounce up through the opening
        }) };
        conn.W = conn.type === 'steps' ? 7 : (conn.type === 'lift' || conn.type === 'spring' ? 3 : (conn.type === 'curtain' ? ri(3, 5) : ri(3, 4)));
        // the far wall can step inward by a few tiles, so the room is not a plain box
        if (SHAPE && rnd() < 0.6) sh = ri(2, 6);
      }
      var s0 = floor === 0 ? 6 : off + Wprev + (prevType === 'open' || prevType === 'spring' ? 5 : 3);   // a flying arrival needs more room to land
      function zoneEnd(k) { var F = 25 - k; return top ? 18 : (conn.type === 'steps' ? F - 10 : (conn.type === 'lift' ? F - 8 : (conn.type === 'spring' ? F - 7 : (conn.type === 'curtain' ? F - conn.W - 4 : F - conn.W - 2)))); }
      while (sh > 0 && zoneEnd(sh) - s0 < 7) sh--;
      if (sh === 1) sh = 0;
      var F = 25 - sh, e0 = zoneEnd(sh);
      if (conn) conn.sh = sh;

      // obstacles along the floor
      var obs = [], cur = s0 + (D <= 2 ? ri(0, 1) : 0), minHf = 6, lastGap = 9, spiked = 0;
      while (obs.length < target) {
        var room = e0 - cur;
        var canWall = (top || (conn.type !== 'steps' && conn.type !== 'spring')) && headroom >= 7;   // these ways up fix the floor height, so no tall walls
        var canDrop = canWall && SP > 0 && D >= 4 && headroom >= 8;
        var w = {
          spikes: HZ > 0 && room >= 3 ? (likes('jump') ? 5 : 3) * (SP > 1 ? 2 : 1) : 0,
          wide: HZ > 0 && TUNE.wideW && room >= TUNE.wideW[0] + 2 ? (likes('dash') ? 8 : 2) * (D >= 4 ? 1.5 : 1) : 0,
          crown: SP > 0 && TUNE.crownW && room >= TUNE.crownW[0] + 1 ? 2 : 0,
          block: room >= 3 ? (SP > 1 ? 0 : (SP === 1 ? 1 : 3)) * (likes('jump') ? 1.5 : 1) : 0,
          wall: canWall && room >= 3 ? (likes('climb') ? 6 : 2) * (SP > 1 ? 0.3 : 1) : 0,
          wallspikes: canDrop && room >= 5 ? (likes('climb') ? 6 : 2) : 0,
          icespikes: EL.ice && SP > 0 && room >= TUNE.iceL[0] + 3 ? 3 * ICY : 0,                    // slide in, jump the spikes at the end
          iceblock: EL.ice && SP < 2 && room >= TUNE.iceL[0] + 3 ? (SP ? 1 : 3) * ICY : 0,           // slide into a block to hop
          bridge: EL.crumble && floor > 0 && room >= 4 ? 3 : 0,                                // crumbling stretch of floor
          ferry: (EL.movers || EL.zips) && (HZ > 0 || floor > 0) && room >= TUNE.ferryW[0] + 1 ? 4 : 0,    // ride a platform across a gap
          fireball: EL.fireballs && room >= 2 && headroom >= 6 ? 4 : 0,                      // time a run under a fireball on a track
          jet: (EL.jets || EL.lasers) && room >= 2 && headroom >= 6 ? 4 : 0,                 // wait for a fire jet (or a laser) to die down, then run past
          drone: EL.drones && room >= 2 && headroom >= 6 ? 4 : 0                              // time a run under a patrol drone
        };
        // "Some" spikes means every floor has at least one; "Lots" removed the harmless options above
        if (HZ === 1 && SP < 2 && !spiked && (w.spikes || w.wide || w.crown || w.wallspikes || w.icespikes)) { w.block = 0; w.wall = 0; w.iceblock = 0; }
        // a spiked block needs a run-up, so it gets extra clear ground in front or is swapped for plain spikes
        var runup = obs.length ? Math.max(0, 5 - lastGap) : (floor === 0 ? 0 : 2);
        if (room - runup < (TUNE.crownW ? TUNE.crownW[0] : 99) + 1) w.crown = 0;
        var type = pick(w);
        if (!type) break;
        if (type === 'crown') { cur += runup; room -= runup; }
        var o = { type: type, t0: cur }, after = rr(TUNE.gap);
        if (type === 'spikes') { o.w = Math.min(rr(TUNE.spikeW), room - 1, lastGap <= 3 ? 5 : 6); } // the last tile before the way up stays clear
        else if (type === 'wide') { o.w = Math.min(rr(TUNE.wideW), room - 2); after = Math.max(6, after); } // a dash carries you further, so more room to land
        else if (type === 'crown') { o.w = Math.min(rr(TUNE.crownW), room - 1); }
        else if (type === 'block') { o.w = 2; o.h = 2; }
        else if (type === 'icespikes') { o.L = Math.min(rr(TUNE.iceL), room - 3); o.sw = Math.min(rr(TUNE.spikeW), 4, room - o.L - 1); o.w = o.L + o.sw; }
        else if (type === 'iceblock') { o.L = Math.min(rr(TUNE.iceL), room - 3); o.w = o.L + 2; o.h = 2; }
        else if (type === 'bridge') { o.w = Math.min(rr(TUNE.bridgeW), room - 1); }
        else if (type === 'ferry') { o.w = Math.min(rr(TUNE.ferryW), room - 1); o.pl = D >= 4 ? 2 : 3; o.pit = HZ === 0; o.zip = zipPick(); after = Math.max(3, after); }
        else if (type === 'fireball') { o.w = 1; after = Math.max(3, after); }
        else if (type === 'jet') { o.w = 1; o.laser = !!EL.lasers; after = Math.max(3, after); }
        else if (type === 'drone') { o.w = 4; after = Math.max(3, after); }
        else if (type === 'wall') { o.w = 2; o.h = Math.min(rr(TUNE.wallH), headroom - 3); minHf = Math.max(minHf, o.h + 4); after = 5; }
        else { o.h = 4; o.sw = Math.min(D >= 5 ? ri(3, 4) : ri(2, 3), room - 3); o.w = 2 + o.sw; minHf = Math.max(minHf, 9); }
        if (type !== 'block' && type !== 'wall' && type !== 'iceblock' && type !== 'bridge' && !(type === 'ferry' && o.pit)) spiked++;
        // in the Furnace most floor hazards are flames
        if (EL.firepits && (type === 'spikes' || type === 'wide' || type === 'ferry')) o.fire = SP === 0 || rnd() < 0.75;
        obs.push(o);
        cur += o.w + after; lastGap = after;
      }

      // height of this floor
      var Hf = 0, yN = 0;
      if (!top) {
        if (conn.type === 'steps' || conn.type === 'spring') Hf = 6;
        else {
          var lo = Math.max(minHf, conn.type === 'curtain' ? 7 : 6), hi = Math.max(lo, Math.min(9, maxHf));
          if (conn.type === 'open' && likes('dash') && lo <= 7 && hi >= 7) Hf = 7;
          else if (SHAPE && rnd() < 0.55) Hf = hi;          // a tall floor now and then, so the ceiling has room to hang down
          else if (D >= 4) Hf = lo;                       // tight floors, so more of them fit
          else if (D <= 2) Hf = ri(Math.min(hi, Math.max(lo, 7)), hi);
          else Hf = ri(lo, hi);
        }
        yN = y - Hf;
      }

      // the stepped-in wall from the floor below carries on up this floor too, so walls step every two floors
      if (off > 0) box(0, off - 1, top ? 1 : yN + 1, y - 1, d, '#');

      // draw obstacles
      for (var i = 0; i < obs.length; i++) {
        var ob = obs[i], e = ob.t0 + ob.w - 1;
        if (ob.type === 'spikes' || ob.type === 'wide') {
          box(ob.t0, e, y - 1, y - 1, d, ob.fire ? 'F' : '^'); stats[ob.fire ? 'fire' : 'spikes'] += ob.w;
          if (gemFloor >= 0 && floor >= gemFloor && !stats.gems && ob.type === 'spikes') { put(ob.t0 + Math.floor(ob.w / 2), d, y - 4, 'G'); stats.gems++; }
          if (ob.type === 'wide' && EL.refills) put(ob.t0 + Math.floor(ob.w / 2), d, y - 4, 'o');
        } else if (ob.type === 'crown') {
          box(ob.t0, e, y - 1, y - 1, d, '#'); box(ob.t0, e, y - 2, y - 2, d, '^'); stats.spikes += ob.w;
        } else if (ob.type === 'wallspikes') {
          box(ob.t0, ob.t0 + 1, y - ob.h, y - 1, d, '#'); box(ob.t0 + 2, e, y - 1, y - 1, d, '^'); stats.spikes += ob.sw;
        } else if (ob.type === 'icespikes') {
          box(ob.t0, ob.t0 + ob.L - 1, y, y, d, 'I'); box(ob.t0 + ob.L, e, y - 1, y - 1, d, '^'); stats.spikes += ob.sw; stats.ice += ob.L;
        } else if (ob.type === 'iceblock') {
          box(ob.t0, ob.t0 + ob.L - 1, y, y, d, 'I'); box(ob.t0 + ob.L, e, y - 2, y - 1, d, '#'); stats.ice += ob.L;
        } else if (ob.type === 'bridge') {
          box(ob.t0, e, y, y, d, 'C'); stats.crumble += ob.w;
        } else if (ob.type === 'ferry') {
          if (ob.pit) box(ob.t0, e, y, y, d, '.'); else { box(ob.t0, e, y - 1, y - 1, d, ob.fire ? 'F' : '^'); stats[ob.fire ? 'fire' : 'spikes'] += ob.w; }
          box(ob.t0, e, y - 2, y - 2, d, '-'); box(ob.t0, ob.t0 + ob.pl - 1, y - 2, y - 2, d, ob.zip ? 'z' : '='); if (ob.zip) stats.zips++; else stats.platforms++;
        } else if (ob.type === 'fireball') {
          box(ob.t0, ob.t0, y - 5, y - 1, d, '|'); put(ob.t0, d, y - 5, '*'); stats.fireballs++;
        } else if (ob.type === 'jet') {
          put(ob.t0, d, y - 1, ob.laser ? 'L' : 'J'); if (ob.laser) stats.lasers++; else stats.jets++;
        } else if (ob.type === 'drone') {                       // a track along the ceiling of the floor, the drone starts at one end
          box(ob.t0, ob.t0 + 3, y - 5, y - 5, d, '-'); put(ob.t0 + 3, d, y - 5, 'O'); stats.drones++;   // home (firing) end is the far side; you run under while it is away
        } else box(ob.t0, e, y - ob.h, y - 1, d, '#');
      }
      stats.floors++; stats.obstacles += obs.length;
      // a key on the landing strip of a middle floor, before the first obstacle; the door then guards the exit
      if (EL.keys && !top && floor >= 1 && !stats.keys && (rnd() < 0.5 || maxHf < 15)) { put(s0 - 2, d, y - 1, 'k'); stats.keys++; }

      // How much open air the route needs above the floor at each column. Anything above that is free to fill.
      var need = [], t;
      for (t = 0; t <= 24; t++) need.push(t < off ? 2 : (t < s0 + 1 ? 6 : 5));
      if (conn && conn.type === 'spring') for (t = Math.max(0, F - 6); t <= F - 1; t++) need[t] = Math.max(need[t], 6);
      for (i = 0; i < obs.length; i++) {
        var q = obs[i], n = q.type === 'wall' ? q.h + 3 : (q.type === 'wallspikes' ? q.h + 5 : (q.type === 'ferry' || q.type === 'crown' || q.type === 'fireball' || q.type === 'jet' || q.type === 'drone' ? 6 : 5));
        for (t = Math.max(0, q.t0 - 3); t <= Math.min(24, q.t0 + q.w + 2); t++) need[t] = Math.max(need[t], n);
      }

      if (top) {
        box(21, 22, y - 2, y - 1, d, 'E');
        if (stats.keys) box(19, 19, y - 2, y - 1, d, 'D');     // the door stands in front of the exit
        if (SHAPE) {                                     // the space above the last floor becomes a lumpy mass of rock
          var lump = ri(0, 2);
          for (t = 0; t <= 24; t++) {
            lump = Math.max(0, Math.min(3, lump + ri(-1, 1)));
            var keep = Math.max(need[t], t >= 18 ? 6 : 5) + 1 + lump;
            if (y - 1 - keep >= 1) box(t, t, 1, y - 1 - keep, d, '#');
          }
        }
        backdrop(1, y - 1, 0, 24);
        plan.push({ y: y, d: d, obs: obs, conn: null });
        break;
      }

      // next floor slab, with an opening by the far wall
      box(0, F - conn.W - 1, yN, yN, d, '#');
      if (sh > 0) box(F, 24, yN, y - 1, d, '#');           // the stepped-in wall, solid from this floor up to the next
      if (conn.type === 'curtain') {
        box(F - conn.W - 2, F - conn.W - 1, yN + 1, y - 3, d, '#');
        var spikeWall = (SP > 0 && D >= 3) || (SP > 1 && D >= 2);
        if (EL.ice && D >= 2 && (!spikeWall || rnd() < 0.5)) {   // an ice outer wall cannot be climbed either
          for (var qq = yN + 1; qq <= y - 3; qq++) { g[qq][col(F, d)] = 'I'; stats.ice++; }
        } else if (spikeWall) {
          var r1 = D >= 4 ? y - 5 : Math.min(y - 5, yN + 3);
          if (r1 >= yN + 2) { box(F - 1, F - 1, yN + 2, r1, d, d > 0 ? '<' : '>'); stats.spikes += r1 - yN - 1; }
        }
      } else if (conn.type === 'steps') {
        box(F - 3, F - 1, y - 2, y - 1, d, '#');
        conn.crumble = !!EL.crumble && D >= 2;                   // the floating step gives way if you linger
        box(F - 7, F - 5, y - 4, y - 4, d, conn.crumble ? 'C' : '#'); if (conn.crumble) stats.crumble += 3;
      } else if (conn.type === 'spring') {                       // a spring under the opening throws you up to the next floor
        put(F - 2, d, y - 1, 'u'); stats.springs++;
      } else if (conn.type === 'lift') {                         // a platform that rides up through the opening (or a zip mover that shoots up)
        conn.zip = zipPick();
        box(F - 3, F - 1, y - 1, y - 1, d, conn.zip ? 'z' : '='); box(F - 3, F - 3, yN, y - 2, d, '|'); if (conn.zip) stats.zips++; else stats.platforms++;
      } else if (EL.refills && Hf >= 8) put(F - 2, d, y - 5, 'o');

      if (SHAPE) {                                         // the ceiling hangs down in uneven lumps where the route allows
        var hang = ri(0, 2);
        for (t = 0; t <= e0 - 1 && t <= F - conn.W - 1; t++) {
          hang = Math.max(0, Math.min(4, hang + ri(-2, 2)));
          var kmax = Hf - 1 - need[t], k = Math.min(hang, kmax);
          for (var hr = yN + 1; hr <= yN + k; hr++) if (get(t, d, hr) === '.') put(t, d, hr, '#');
        }
      }
      backdrop(yN + 1, y - 1, off, F - 1);

      conn.Hf = Hf;
      plan.push({ y: y, d: d, obs: obs, conn: conn });
      y = yN; d = -d; Wprev = conn.W; prevType = conn.type; off = sh; floor++;
    }

    // Backdrop: dim brickwork behind the action (pillars and broken wall panels). It is scenery only.
    function backdrop(r0, r1, t0, t1) {
      if (!SHAPE || r1 - r0 < 3) return;
      var n = ri(2, 4), j, t, rw;
      for (j = 0; j < n; j++) {
        if (rnd() < 0.5) {                                 // a pillar from floor to ceiling
          var pt = ri(t0, t1), pw = ri(1, 2);
          for (t = pt; t < pt + pw && t <= t1; t++) for (rw = r0; rw <= r1; rw++) if (get(t, d, rw) === '.') put(t, d, rw, 'b');
        } else {                                           // a ragged panel hanging from the ceiling or rising from the floor
          var bw = ri(3, 7), bt = ri(t0, Math.max(t0, t1 - bw)), bh = ri(2, Math.max(2, r1 - r0 - 1)), fromTop = rnd() < 0.5;
          for (t = bt; t < bt + bw && t <= t1; t++) {
            var hh = Math.max(1, bh - ri(0, 2));
            for (var m = 0; m < hh; m++) { rw = fromTop ? r0 + m : r1 - m; if (rw >= r0 && rw <= r1 && get(t, d, rw) === '.') put(t, d, rw, 'b'); }
          }
        }
      }
    }

    return {
      plan: plan, stats: stats,
      room: { format: 1, id: 'auto-' + seed, name: 'Auto ' + seed, difficulty: D, world: WORLD || 1, grid: { cols: COLS, rows: ROWS, tile: 10 },
              tiles: g.map(function (row) { return row.join(''); }), entities: [] }
    };
  }
