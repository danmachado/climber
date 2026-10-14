// Trial rooms: hand-made rooms that each lean on one move (fall steering, dash, needle landings, climbing,
// jump height, wall bounce and super). Writes src/trials/<id>.json (level format 1) and tests/trial-routes.json
// (the waypoints the solver in tests/trials.js steers through). Run: node src/trials-make.js [id] to also print maps.
var fs = require('fs'), d = __dirname;
var COLS = 27, ROWS = 48, T = 10;
var LEGEND = { '.': 'empty', '#': 'solid', '^': 'spike_up', 'v': 'spike_down', '<': 'spike_left', '>': 'spike_right',
  'S': 'start', 'E': 'exit', 'o': 'dash_refill', 'C': 'crumble', 'G': 'gem', 'b': 'backdrop', 'I': 'ice' };
// Tiles each room's recorded run touches (tests/trialkeep.js writes this). The texture pass keeps clear of them.
var KEEP = {}; try { KEEP = JSON.parse(fs.readFileSync(d + '/trial-keep.json', 'utf8')); } catch (e) {}

// ---- texture: the layouts are drawn as clean boxes; this pass makes them read as rock ----
// Everything it does stays a set distance from every tile the recorded run touches, so the run plays the same.
//  rag:     the frame and big masses grow lumpy outcrops into dead air (low-frequency noise, so lumps not specks)
//  fillet:  inner corners where a wall meets a floor or a ceiling fill in, one or two steps, so joins look worn round
//  pocket:  deep inside thick rock, hollows open onto the backdrop (sealed in, nothing can reach them)
//  back:    ragged panels of dim back wall in the open air, clinging to the rock, for depth (scenery only)
// opts: { rag: depth in tiles (0 = off), clear: tiles kept from the run, back: amount 0..1, pockets: bool }
function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hashStr(t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function noise2(seed, scale) {              // smooth value noise on a coarse lattice, 0..1
  var R = rng(seed), lat = {};
  function v(i, j) { var k = i + ',' + j; if (lat[k] === undefined) lat[k] = R(); return lat[k]; }
  function sm(t) { return t * t * (3 - 2 * t); }
  return function (c, r) {
    var x = c / scale, y = r / scale, i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    var a = v(i, j) + (v(i + 1, j) - v(i, j)) * fx, b = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * fx;
    return a + (b - a) * fy;
  };
}
function texture(g, id, o) {
  o = o || {};
  var rows = g.length, cols = g[0].length, seed = hashStr(id), c, r, k;
  var keepList = KEEP[id] || null, clear = o.clear === undefined ? 2 : o.clear;
  var near = [];                              // Chebyshev distance (tiles) to the nearest tile the run touches
  for (r = 0; r < rows; r++) { near.push([]); for (c = 0; c < cols; c++) near[r].push(keepList ? 99 : 0); }
  if (keepList) keepList.forEach(function (n) {
    var kr = Math.floor(n / 100), kc = n % 100;
    for (var rr = Math.max(0, kr - 4); rr <= Math.min(rows - 1, kr + 4); rr++) for (var cc = Math.max(0, kc - 4); cc <= Math.min(cols - 1, kc + 4); cc++)
      near[rr][cc] = Math.min(near[rr][cc], Math.max(Math.abs(rr - kr), Math.abs(cc - kc)));
  });
  function at(c, r) { return r < 0 || r >= rows || c < 0 || c >= cols ? '#' : g[r][c]; }
  function solid(c, r) { var t = at(c, r); return t === '#'; }
  function special(c, r) { var t = at(c, r); return t !== '.' && t !== '#' && t !== 'b'; }
  function nearSpecial(c, r) { for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) if (special(c + dc, r + dr)) return true; return false; }
  function open(c, r, m) { return at(c, r) === '.' && near[r][c] >= m && !nearSpecial(c, r); }
  var added = 0;
  // air over a spike or flame floor is a pit: rock there would be a new place to stand
  function overPit(c, r) { for (var rr = r + 1; rr < rows; rr++) { var t = g[rr][c]; if (t === '^' || t === 'F') return true; if (t !== '.' && t !== 'b') return false; } return false; }
  // rag: outcrops grow from rock that is at least two tiles thick, into dead air
  if (o.rag && keepList) {
    var N = noise2(seed, 3.2), N2 = noise2(seed + 7, 1.6);
    for (k = 1; k <= o.rag; k++) {
      var grow = [];
      for (r = 1; r < rows - 1; r++) for (c = 1; c < cols - 1; c++) {
        if (!open(c, r, clear)) continue;
        var from = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].filter(function (q) { return solid(q[0], q[1]); });
        if (!from.length) continue;
        var thick = from.some(function (q) { var dc = q[0] - c, dr = q[1] - r; return solid(q[0] + dc, q[1] + dr) && solid(q[0] + dc * 2, q[1] + dr * 2); });
        var under = solid(c, r - 1);               // hanging under a shelf or plate: lumps of rock, like it has weathered
        if (!thick && !under && k === 1) continue;
        // anything else makes a new ledge top: well away from the route it can stay bare; nearer, or over a pit,
        // it gets a crown of spikes so it is never a new place to stand
        var crown = !under && (near[r][c] < 4 || overPit(c, r));
        if (crown && (o.crown === false || k > 1 || near[r][c] < 3 || at(c, r - 1) !== '.' || near[r - 1][c] < clear || nearSpecial(c, r - 1))) continue;
        if (0.65 * N(c, r) + 0.35 * N2(c, r) > 0.42 + k * 0.08) grow.push([c, r]);
      }
      grow.forEach(function (q) { g[q[1]][q[0]] = '#'; added++; });
      grow.forEach(function (q) { var c = q[0], r = q[1]; if (at(c, r - 1) === '.' && (near[r][c] < 4 || overPit(c, r))) g[r - 1][c] = '^'; });
    }
    // no lone specks: a grown tile with one solid neighbour or none goes back to air
    for (r = 1; r < rows - 1; r++) for (c = 1; c < cols - 1; c++) if (g[r][c] === '#' && near[r][c] >= clear) {
      var n4 = (solid(c - 1, r) ? 1 : 0) + (solid(c + 1, r) ? 1 : 0) + (solid(c, r - 1) ? 1 : 0) + (solid(c, r + 1) ? 1 : 0);
      if (n4 <= 1 && !special(c, r)) { var orig = o.base && o.base[r][c]; if (orig === '.') { g[r][c] = '.'; added--; } }
    }
  }
  // rounding: the outer corners of thick rock wear away, one or two steps
  if (o.round !== false && keepList) {
    for (k = 0; k < 2; k++) {
      var cut = [];
      for (r = 1; r < rows - 1; r++) for (c = 1; c < cols - 1; c++) {
        if (g[r][c] !== '#' || near[r][c] < clear || nearSpecial(c, r)) continue;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
          var dx = q[0], dy = q[1];
          if (at(c + dx, r) !== '.' || at(c, r + dy) !== '.') return;                 // open on both sides of this corner
          if (!solid(c - dx, r) || !solid(c, r - dy) || !solid(c - dx, r - dy) || !solid(c - 2 * dx, r) || !solid(c, r - 2 * dy)) return;   // and thick behind it
          if (rng(seed + c * 131 + r * 17 + k)() < (k ? 0.5 : 0.8)) cut.push([c, r]);
        });
      }
      cut.forEach(function (q) { g[q[1]][q[0]] = '.'; });
    }
  }
  // fillets: an inner corner (rock below or above, and rock beside) fills in, then once more a step out
  if (o.fillet !== false && keepList) {
    for (k = 0; k < 2; k++) {
      var fill = [];
      for (r = 1; r < rows - 1; r++) for (c = 1; c < cols - 1; c++) {
        if (!open(c, r, Math.max(2, clear - 1)) || overPit(c, r)) continue;
        var vert = solid(c, r + 1) || solid(c, r - 1), side = solid(c - 1, r) || solid(c + 1, r);
        if (vert && side && rng(seed + r * 31 + c * 7 + k)() < (k ? 0.45 : 0.85)) fill.push([c, r]);
      }
      fill.forEach(function (q) { g[q[1]][q[0]] = '#'; added++; });
    }
  }
  // pockets: hollows deep inside thick rock
  if (o.pockets !== false) {
    var P = noise2(seed + 3, 2.5), hollow = [];
    for (r = 2; r < rows - 2; r++) for (c = 2; c < cols - 2; c++) {
      var deep = true;
      for (var dr = -2; dr <= 2 && deep; dr++) for (var dc = -2; dc <= 2; dc++) if (!solid(c + dc, r + dr)) { deep = false; break; }
      if (deep && P(c, r) > 0.64) hollow.push([c, r]);
    }
    hollow.forEach(function (q) { g[q[1]][q[0]] = 'b'; });
  }
  // backdrop: ragged panels of back wall clinging to the rock
  var amt = o.back === undefined ? 0.5 : o.back;
  if (amt > 0) {
    var B = noise2(seed + 11, 4.5), B2 = noise2(seed + 13, 1.8);
    var dist = [];                            // distance in tiles to the nearest rock, capped
    for (r = 0; r < rows; r++) { dist.push([]); for (c = 0; c < cols; c++) dist[r].push(solid(c, r) ? 0 : 9); }
    for (var pass = 0; pass < 8; pass++) for (r = 1; r < rows - 1; r++) for (c = 1; c < cols - 1; c++)
      dist[r][c] = Math.min(dist[r][c], dist[r - 1][c] + 1, dist[r + 1][c] + 1, dist[r][c - 1] + 1, dist[r][c + 1] + 1);
    for (r = 1; r < rows - 1; r++) for (c = 1; c < cols - 1; c++) {
      if (g[r][c] !== '.') continue;
      var v = 0.7 * B(c, r) + 0.3 * B2(c, r) + amt * 0.5 - dist[r][c] * 0.07;
      if (v > 0.62) g[r][c] = 'b';
    }
  }
  return added;
}

function Room(id, name, world, difficulty) {
  var g = [], r;
  for (r = 0; r < ROWS; r++) g.push(new Array(COLS + 1).join('.').split(''));
  var api = {
    g: g, wp: [], needs: [],
    fill: function (c0, c1, r0, r1, ch) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) g[r][c] = ch; return api; },
    put: function (c, r, ch) { g[r][c] = ch; return api; },
    shell: function () { api.fill(0, 26, 0, 0, '#').fill(0, 0, 0, 47, '#').fill(26, 26, 0, 47, '#').fill(0, 26, 46, 47, '#'); return api; },
    // a waypoint in tiles: the hero's feet must pass through columns c0..c1, rows r0..r1 (stand = on the ground there)
    via: function (c0, r0, c1, r1, stand) { var w = [c0 * T, r0 * T, (c1 + 1) * T, (r1 + 1) * T]; if (stand) w.push('g'); api.wp.push(w); return api; },
    tex: { rag: 2 },
    done: function () {
      if (api.tex) { api.tex.base = g.map(function (row) { return row.slice(); }); texture(g, id, api.tex); }
      return { room: { format: 1, id: id, name: name, difficulty: difficulty, world: world, trial: true,
        grid: { cols: COLS, rows: ROWS, tile: T }, legend: LEGEND, tiles: g.map(function (row) { return row.join(''); }), entities: [] },
        route: { wp: api.wp, needs: api.needs } };
    }
  };
  return api;
}

var rooms = [];

// 1. Freefall: drop down a spiked shaft steering between alternating spike plates (no wall to grab, every wall
// is spiked), then wall-jump up a chimney with spiked stretches on alternate sides and dash over the last spikes.
(function () {
  var R = Room('trial-freefall', 'Freefall', 4, 4).shell();
  R.fill(1, 3, 4, 4, '#').put(2, 3, 'S');                 // start ledge
  R.fill(1, 2, 5, 45, '#');                               // left wall of the drop
  R.fill(12, 13, 1, 37, '#');                             // the spine between the drop and the chimney
  R.fill(3, 3, 6, 37, '>').fill(11, 11, 6, 37, '<');      // spikes down both walls of the drop
  [[10, 'L'], [18, 'R'], [26, 'L'], [34, 'R']].forEach(function (p) {
    var r = p[0];
    if (p[1] === 'L') R.fill(3, 7, r, r, '#').fill(4, 7, r - 1, r - 1, '^');   // gap on the right (cols 8-10)
    else R.fill(7, 11, r, r, '#').fill(7, 10, r - 1, r - 1, '^');               // gap on the left (cols 4-6)
  });
  R.fill(8, 12, 45, 45, '^');                             // floor spikes between the drop and the chimney
  R.fill(18, 25, 9, 45, '#');                             // the block the chimney climbs beside
  R.fill(14, 14, 18, 25, '>');                            // spiked stretch on the spine side of the chimney
  R.fill(17, 17, 29, 36, '<');                            // and on the block side, lower down
  R.fill(18, 23, 8, 8, '^');                              // spikes on the block top
  R.fill(24, 25, 7, 8, 'E');
  R.via(4, 5, 10, 8).via(8, 10, 10, 13).via(4, 18, 6, 21).via(8, 26, 10, 29).via(4, 34, 6, 37).via(3, 45, 7, 45, true)
   .via(14, 44, 17, 45, true).via(14, 30, 17, 36).via(14, 18, 17, 24).via(14, 9, 17, 12).via(24, 6, 25, 9);
  R.needs = [];
  rooms.push(R.done());
})();

// 2. Cascade: the exit is at the bottom. Each shelf is spiked wall to wall except one hole; under every hole
// sits a one-tile post, set off to the side so you steer onto it as you fall, then jump and dash across the
// spikes to the next hole on the far side.
(function () {
  var R = Room('trial-cascade', 'Cascade', 5, 4).shell();
  R.fill(1, 8, 5, 5, '#').put(2, 4, 'S');                  // start ledge, room for a run-up
  // shelf row, hole columns, post column (on this shelf, under the hole above)
  var shelves = [[10, [22, 23], -1], [18, [4, 5], 20], [26, [22, 23], 7], [34, [6, 7], 20], [41, [20, 21], 9]];
  shelves.forEach(function (s) {
    var r = s[0];
    R.fill(1, 25, r, r, '#').fill(1, 25, r - 1, r - 1, '^');
    s[1].forEach(function (c) { R.put(c, r, '.').put(c, r - 1, '.'); });
    if (s[2] >= 0) R.put(s[2], r - 1, '#');
  });
  R.fill(16, 18, 30, 33, '#').fill(16, 18, 29, 29, '^').fill(15, 15, 30, 33, '<').fill(19, 19, 30, 32, '>');   // a spiked block in the way on the fourth shelf
  R.fill(1, 18, 45, 45, '^');                              // spikes on the floor except under the last hole
  R.fill(23, 24, 44, 45, 'E');
  R.via(9, 1, 21, 9).via(22, 10, 23, 12).via(20, 17, 20, 17, true).via(4, 18, 5, 20).via(7, 25, 7, 25, true).via(22, 26, 23, 28)
   .via(20, 33, 20, 33, true).via(6, 34, 7, 36).via(9, 40, 9, 40, true).via(20, 41, 21, 43);
  R.needs = ['dash'];
  rooms.push(R.done());
})();

// 3. Dash Only: one-tile posts over a spike floor, under a spike ceiling, between spiked walls. Every gap is
// too far or too high to jump, so every move is a jump and a dash, and each post is where the dash comes back.
(function () {
  var R = Room('trial-dashonly', 'Dash Only', 3, 4).shell();
  R.fill(1, 1, 1, 45, '>').fill(25, 25, 1, 45, '<').fill(2, 24, 45, 45, '^').fill(2, 24, 1, 1, 'v');
  R.fill(1, 4, 42, 45, '#').put(2, 41, 'S');              // start ledge
  var posts = [[15, 42], [21, 34], [10, 30], [16, 22], [5, 17], [13, 11]];
  posts.forEach(function (p) { R.put(p[0], p[1], '#'); });
  R.fill(20, 25, 7, 7, '#').fill(25, 25, 1, 6, '#').fill(23, 24, 5, 6, 'E');   // exit ledge
  R.via(15, 42, 15, 42, true).via(21, 34, 21, 34, true).via(10, 30, 10, 30, true).via(16, 22, 16, 22, true)
   .via(5, 17, 5, 17, true).via(13, 11, 13, 11, true).via(20, 4, 25, 7);
  R.needs = ['dash'];
  rooms.push(R.done());
})();

// 4. Pinpoint: three tiers of one-tile posts over spikes, each tier under a spiked ceiling just high enough
// for a short hop. A full jump is death, so every hop is a tap. The steps between tiers are full jumps.
(function () {
  var R = Room('trial-pinpoint', 'Pinpoint', 1, 3).shell(); R.tex.rag = 3;
  function posts(top, cols) { cols.forEach(function (c) { R.fill(c, c, top, top + 3, '#'); }); }
  R.fill(1, 25, 45, 45, '^');
  R.fill(1, 2, 41, 45, '#').put(1, 40, 'S');              // start
  posts(41, [6, 10, 14, 18]);                             // tier 1, left to right
  R.fill(1, 18, 37, 37, '#').fill(1, 18, 38, 38, 'v');    // its ceiling, which is tier 2's floor
  R.fill(21, 21, 39, 44, '#');                            // step up at the right
  R.fill(23, 25, 36, 44, '#');                            // ledge at the right
  R.fill(1, 18, 36, 36, '^');
  posts(33, [17, 13, 9, 5]);                              // tier 2, right to left
  R.fill(4, 25, 29, 29, '#').fill(5, 18, 30, 30, 'v');    // its ceiling, which is tier 3's floor
  R.fill(1, 2, 33, 36, '#');                              // ledge at the left
  R.put(3, 30, '#');                                      // nub
  R.fill(1, 2, 27, 28, '#');                              // step
  R.fill(4, 21, 28, 28, '^');
  posts(25, [6, 10, 14, 18]);                             // tier 3, left to right
  R.fill(6, 17, 21, 21, '#').fill(6, 17, 22, 22, 'v');    // its ceiling
  R.fill(22, 25, 22, 28, '#').fill(24, 25, 20, 21, 'E');  // exit ledge
  R.via(6, 41, 6, 41, true).via(10, 41, 10, 41, true).via(14, 41, 14, 41, true).via(18, 41, 18, 41, true)
   .via(21, 39, 21, 39, true).via(23, 36, 25, 36, true).via(17, 33, 17, 33, true).via(13, 33, 13, 33, true)
   .via(9, 33, 9, 33, true).via(5, 33, 5, 33, true).via(1, 33, 2, 33, true).via(3, 30, 3, 30, true).via(1, 27, 2, 27, true)
   .via(6, 25, 6, 25, true).via(10, 25, 10, 25, true).via(14, 25, 14, 25, true).via(18, 25, 18, 25, true).via(22, 19, 25, 22);
  R.needs = ['+dash'];
  rooms.push(R.done());
})();

// 5. Handhold: two tall walls with spiked tops over a spike floor. The only footholds are one-tile nubs, each far
// enough below the next wall's top that a jump and a dash fall short: grab the face, climb most of the meter
// away, then climb-jump over the spikes. The meter is the puzzle: climb too slowly and it runs out.
(function () {
  var R = Room('trial-handhold', 'Handhold', 1, 4).shell(); R.tex.rag = 3;
  R.fill(1, 25, 45, 45, '^');
  R.fill(1, 3, 42, 45, '#').put(1, 41, 'S');
  R.fill(7, 8, 22, 45, '#').fill(7, 8, 21, 21, '^').put(6, 36, '#');      // first wall, its nub on the near face
  R.fill(15, 16, 12, 45, '#').fill(15, 16, 11, 11, '^').put(14, 26, '#'); // second wall, its nub on the near face
  R.fill(21, 25, 20, 45, '#').fill(21, 25, 19, 19, '.').fill(24, 25, 18, 19, 'E');   // exit ledge
  R.fill(17, 20, 44, 44, '#').fill(17, 20, 43, 43, '^');
  R.via(6, 36, 6, 36, true).via(9, 12, 14, 24).via(14, 26, 14, 26, true).via(17, 4, 20, 17).via(21, 14, 25, 20);
  R.needs = ['grab,bounce'];   // a wall bounce off a face can stand in for part of a climb, so the check takes both away
  rooms.push(R.done());
})();

// 6. Kickback: momentum. A spike pit under a low spiked ceiling that only a hyper clears (dash along the ground,
// jump while holding down: long and low), a climb up the far wall, then a pit too wide for a jump and a dash that a
// super clears (dash along the ledge, jump: long and high). Neither gap can be crossed any other way.
(function () {
  var R = Room('trial-kickback', 'Kickback', 2, 5).shell(); R.tex.rag = 4;
  R.fill(1, 1, 14, 45, '>');                              // the left wall is spiked: no climbing up to the exit
  R.put(3, 45, 'S');
  R.fill(6, 18, 45, 45, '^');                             // the low pit
  R.fill(4, 20, 41, 41, '#').fill(4, 20, 42, 42, 'v').fill(4, 20, 40, 40, '^');   // its ceiling, spiked both sides
  R.fill(19, 23, 33, 33, '#').fill(19, 23, 34, 34, 'v');  // the ledge, reached up the right wall
  R.fill(2, 4, 33, 33, '#').fill(2, 4, 34, 34, 'v').fill(2, 3, 31, 32, 'E');   // the far side of the high pit
  R.via(19, 45, 23, 45, true).via(24, 30, 25, 40).via(19, 33, 23, 33, true).via(2, 30, 4, 33);
  R.needs = ['super'];
  rooms.push(R.done());
})();

if (require.main === module) {
  fs.mkdirSync(d + '/trials', { recursive: true });
  var routes = {};
  rooms.forEach(function (o) {
    fs.writeFileSync(d + '/trials/' + o.room.id + '.json', JSON.stringify(o.room, null, 1));
    routes[o.room.id] = o.route;
    if (!process.argv[2] || process.argv[2] === o.room.id) {
      console.log(o.room.name + ' (world ' + o.room.world + ')');
      console.log('    ' + '0123456789'.repeat(3).slice(0, COLS));
      o.room.tiles.forEach(function (t, i) { console.log((i < 10 ? ' ' : '') + i + '  ' + t); });
    }
  });
  fs.writeFileSync(d + '/../tests/trial-routes.json', JSON.stringify(routes, null, 1));
}
module.exports = rooms;
