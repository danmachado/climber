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
    var COLS = 27, ROWS = 48, D = Math.max(1, Math.min(5, opts.difficulty | 0)), s = seed >>> 0;
    var EL = opts.elements || { spikes: opts.spikes > 0, refills: !!opts.refills };      // which pieces may be used
    var SP = EL.spikes ? Math.max(1, opts.spikes | 0) : 0;                               // 0 none, 1 some, 2 lots
    var styles = opts.styles && opts.styles.length ? opts.styles : (opts.style && opts.style !== 'mixed' ? [opts.style] : []);
    var SHAPE = opts.shape !== false;
    var WORLD = opts.world | 0, ICY = WORLD === 2 ? 4 : 1;                                // a world leans on its own pieces
    if (WORLD && WORLD !== 2 && EL.ice) { EL = Object.assign({}, EL); EL.ice = false; }   // and never borrows another world's (ice is Icehouse only)                                                    // organic shaping on by default
    function likes(st) { return styles.length && styles.length < 3 && styles.indexOf(st) >= 0; }
    function rnd() { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
    function rr(p) { return ri(p[0], p[1]); }
    function pick(w) { var k, sum = 0, r; for (k in w) sum += w[k]; if (sum <= 0) return null; r = rnd() * sum; for (k in w) { r -= w[k]; if (r < 0) return k; } return null; }
    var g = [], r, c;
    for (r = 0; r < ROWS; r++) { g.push([]); for (c = 0; c < COLS; c++) g[r].push((r === 0 || r >= ROWS - 2 || c === 0 || c === COLS - 1) ? '#' : '.'); }
    function col(t, d) { return d > 0 ? 1 + t : 25 - t; }
    function put(t, d, row, ch) { var x = col(t, d); if (x >= 1 && x <= 25 && row >= 1 && row <= 45) g[row][x] = ch; }
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
    var plan = [], y = 46, d = rnd() < 0.5 ? 1 : -1, Wprev = 0, prevType = '', off = 0, floor = 0;
    var stats = { floors: 0, obstacles: 0, spikes: 0, ice: 0, crumble: 0, platforms: 0 };
    g[45][col(2, d)] = 'S';

    while (true) {
      var maxHf = y - 8, top = maxHf < 6, headroom = top ? y - 1 : maxHf - 1;
      // the way up at the end of this floor
      var conn = null, sh = 0;
      if (!top) {
        conn = { type: pick({
          steps: [5, 3, 2, 1, 0.5][D - 1] * (likes('jump') ? 2 : 1),
          open: 2 * (likes('dash') || likes('climb') ? 2 : 1),
          curtain: maxHf >= 7 ? [1, 2, 3, 4, 5][D - 1] * 0.8 * (likes('climb') ? 2 : 1) : 0,
          lift: EL.movers ? 3 : 0
        }) };
        conn.W = conn.type === 'steps' ? 7 : (conn.type === 'lift' ? 3 : (conn.type === 'curtain' ? ri(3, 5) : ri(3, 4)));
        // the far wall can step inward by a few tiles, so the room is not a plain box
        if (SHAPE && rnd() < 0.6) sh = ri(2, 6);
      }
      var s0 = floor === 0 ? 6 : off + Wprev + (prevType === 'open' ? 5 : 3);
      function zoneEnd(k) { var F = 25 - k; return top ? 18 : (conn.type === 'steps' ? F - 10 : (conn.type === 'lift' ? F - 8 : (conn.type === 'curtain' ? F - conn.W - 4 : F - conn.W - 2))); }
      while (sh > 0 && zoneEnd(sh) - s0 < 7) sh--;
      if (sh === 1) sh = 0;
      var F = 25 - sh, e0 = zoneEnd(sh);
      if (conn) conn.sh = sh;

      // obstacles along the floor
      var obs = [], cur = s0 + (D <= 2 ? ri(0, 1) : 0), minHf = 6, lastGap = 9, spiked = 0;
      while (obs.length < target) {
        var room = e0 - cur;
        var canWall = (top || conn.type !== 'steps') && headroom >= 7;
        var canDrop = canWall && SP > 0 && D >= 4 && headroom >= 8;
        var w = {
          spikes: SP > 0 && room >= 3 ? (likes('jump') ? 5 : 3) * (SP > 1 ? 2 : 1) : 0,
          wide: SP > 0 && TUNE.wideW && room >= TUNE.wideW[0] + 2 ? (likes('dash') ? 8 : 2) * (D >= 4 ? 1.5 : 1) : 0,
          crown: SP > 0 && TUNE.crownW && room >= TUNE.crownW[0] + 1 ? 2 : 0,
          block: room >= 3 ? (SP > 1 ? 0 : (SP === 1 ? 1 : 3)) * (likes('jump') ? 1.5 : 1) : 0,
          wall: canWall && room >= 3 ? (likes('climb') ? 6 : 2) * (SP > 1 ? 0.3 : 1) : 0,
          wallspikes: canDrop && room >= 5 ? (likes('climb') ? 6 : 2) : 0,
          icespikes: EL.ice && SP > 0 && room >= TUNE.iceL[0] + 3 ? 3 * ICY : 0,                    // slide in, jump the spikes at the end
          iceblock: EL.ice && SP < 2 && room >= TUNE.iceL[0] + 3 ? (SP ? 1 : 3) * ICY : 0,           // slide into a block to hop
          bridge: EL.crumble && floor > 0 && room >= 4 ? 3 : 0,                                // crumbling stretch of floor
          ferry: EL.movers && (SP > 0 || floor > 0) && room >= TUNE.ferryW[0] + 1 ? 4 : 0     // ride a platform across a gap
        };
        // "Some" spikes means every floor has at least one; "Lots" removed the harmless options above
        if (SP === 1 && !spiked && (w.spikes || w.wide || w.crown || w.wallspikes || w.icespikes)) { w.block = 0; w.wall = 0; w.iceblock = 0; }
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
        else if (type === 'ferry') { o.w = Math.min(rr(TUNE.ferryW), room - 1); o.pl = D >= 4 ? 2 : 3; o.pit = SP === 0; after = Math.max(3, after); }
        else if (type === 'wall') { o.w = 2; o.h = Math.min(rr(TUNE.wallH), headroom - 3); minHf = Math.max(minHf, o.h + 4); after = 5; }
        else { o.h = 4; o.sw = Math.min(D >= 5 ? ri(3, 4) : ri(2, 3), room - 3); o.w = 2 + o.sw; minHf = Math.max(minHf, 9); }
        if (type !== 'block' && type !== 'wall' && type !== 'iceblock' && type !== 'bridge' && !(type === 'ferry' && o.pit)) spiked++;
        obs.push(o);
        cur += o.w + after; lastGap = after;
      }

      // height of this floor
      var Hf = 0, yN = 0;
      if (!top) {
        if (conn.type === 'steps') Hf = 6;
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
          box(ob.t0, e, y - 1, y - 1, d, '^'); stats.spikes += ob.w;
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
          if (ob.pit) box(ob.t0, e, y, y, d, '.'); else { box(ob.t0, e, y - 1, y - 1, d, '^'); stats.spikes += ob.w; }
          box(ob.t0, e, y - 2, y - 2, d, '-'); box(ob.t0, ob.t0 + ob.pl - 1, y - 2, y - 2, d, '='); stats.platforms++;
        } else box(ob.t0, e, y - ob.h, y - 1, d, '#');
      }
      stats.floors++; stats.obstacles += obs.length;

      // How much open air the route needs above the floor at each column. Anything above that is free to fill.
      var need = [], t;
      for (t = 0; t <= 24; t++) need.push(t < off ? 2 : (t < s0 + 1 ? 6 : 5));
      for (i = 0; i < obs.length; i++) {
        var q = obs[i], n = q.type === 'wall' ? q.h + 3 : (q.type === 'wallspikes' ? q.h + 5 : (q.type === 'ferry' || q.type === 'crown' ? 6 : 5));
        for (t = Math.max(0, q.t0 - 3); t <= Math.min(24, q.t0 + q.w + 2); t++) need[t] = Math.max(need[t], n);
      }

      if (top) {
        box(21, 22, y - 2, y - 1, d, 'E');
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
      } else if (conn.type === 'lift') {                         // a platform that rides up through the opening
        box(F - 3, F - 1, y - 1, y - 1, d, '='); box(F - 3, F - 3, yN, y - 2, d, '|'); stats.platforms++;
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
