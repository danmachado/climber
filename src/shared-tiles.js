  // ---- shared tile art (used by the game and the builder so both always match) ----
  // Built the way Celeste-style tilesets are: one flat dark fill inside every wall, a one-pixel highlight on the
  // exposed edge (light on top, dark underneath, as if lit from above), a few random variants of each edge tile
  // so repeats do not show, and a ring of sparse "infill" detail just inside the edge. Each terrain type is its
  // own tileset with the same layout, so new looks can be swapped in without touching the rules.
  var TILESETS = {
    brick: { face: '#4a5ad0', deep: '#2a3590', hi: '#aab6ff', side: '#6d7be6', lo: '#2a348c', line: '#1e2666', core: '#141a3e', infill: '#1b2254', mark: '#5a6ad8', moss: '#5f9a74' },
    frost: { face: '#587a9e', deep: '#345070', hi: '#f4fcff', side: '#86a9c9', lo: '#2a4361', line: '#243d58', core: '#0e1f33', infill: '#14283c', mark: '#7a9ab8', snow: '#f4fcff', snowLo: '#b9d9ec', icicle: '#a8d6ee' },
    ember: { face: '#8c3b2c', deep: '#542016', hi: '#ffb48c', side: '#b9573e', lo: '#4c1c15', line: '#3a1410', core: '#1c0c0a', infill: '#2c1311', mark: '#a84a30', soot: '#2b0f0c', drip: '#d4531f', dripHi: '#ff9a3c' },
    jungle: { face: '#d9c23a', deep: '#a8922a', hi: '#fff39a', side: '#e8d45a', lo: '#6b5a14', line: '#1a1408', core: '#2a2410', infill: '#3a3214', mark: '#c4ad30', vine: '#2fa84f', vineLo: '#1c6b32', glyph: '#1a1408' },
    neon:   { face: '#3c4260', deep: '#2a2f45', hi: '#8a93b8', side: '#565d80', lo: '#161a2a', line: '#1e2236', core: '#141726', infill: '#1c2034', mark: '#6a7398', strip: '#38f0ff', stripLo: '#1c6b78' },
    ice:   { face: '#86cdee', hi: '#f2fdff', side: '#b9e8fa', lo: '#3f86bd', line: '#5eb0dd', core: '#102c44', infill: '#1b4866' }
  };
  var SOLID_KIND = { '#': 'brick', 'I': 'ice' };
  // The world theme swaps the look of plain walls and the backdrop; ice always looks like ice.
  var TILE_THEME = { tiles: 'brick', back: ['#171e47', '#0f1432', '#262f68'] };
  function setTileTheme(th) { TILE_THEME = th; }
  function tileHash(c, r) { var h = (c * 374761393 + r * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // solidAt(c, r) says whether a neighbouring cell is part of a wall (anything off the map counts as wall)
  function drawSolid(b, x, y, kind, solidAt, c, r) {
    if (kind !== 'ice') kind = TILE_THEME.tiles;
    var S = TILESETS[kind] || TILESETS.brick, v = tileHash(c, r);
    var up = !solidAt(c, r - 1), dn = !solidAt(c, r + 1), lf = !solidAt(c - 1, r), rt = !solidAt(c + 1, r);
    var edge = up || dn || lf || rt || !solidAt(c - 1, r - 1) || !solidAt(c + 1, r - 1) || !solidAt(c - 1, r + 1) || !solidAt(c + 1, r + 1);
    if (!edge) {
      b.fillStyle = S.core; b.fillRect(x, y, 10, 10);
      var near = false;
      for (var dy = -2; dy <= 2 && !near; dy++) for (var dx = -2; dx <= 2; dx++) if (!solidAt(c + dx, r + dy)) { near = true; break; }
      if (v > 0.3) {                                        // mottle: a blob or two of the lighter infill colour, denser near the edge
        b.fillStyle = S.infill;
        var k = Math.floor(v * 5);
        if (k === 1) { b.fillRect(x + 1, y + 2, 4, 3); b.fillRect(x + 6, y + 6, 3, 2); }
        else if (k === 2) { b.fillRect(x + 4, y + 1, 4, 3); b.fillRect(x + 1, y + 7, 2, 2); }
        else if (k === 3) { b.fillRect(x + 2, y + 5, 5, 3); }
        else { b.fillRect(x + 5, y + 4, 4, 4); if (near) b.fillRect(x + 1, y + 1, 2, 2); }
        if (!near && v > 0.6) { b.fillStyle = S.core; b.fillRect(x + 3, y + 3, 2, 2); }   // deeper in, the blobs thin out
      }
      return;
    }
    if (kind === 'ice') {
      b.fillStyle = S.face; b.fillRect(x, y, 10, 10);
      b.fillStyle = S.line;
      if (v < 0.34) { b.fillRect(x + 2, y + 7, 3, 1); b.fillRect(x + 6, y + 4, 2, 1); }
      else if (v < 0.67) { b.fillRect(x + 5, y + 6, 4, 1); b.fillRect(x + 1, y + 3, 2, 1); }
      else { b.fillRect(x + 3, y + 5, 2, 1); b.fillRect(x + 7, y + 8, 2, 1); }
      b.fillStyle = S.hi;                                   // a glint, in one of three places
      var gx = v < 0.34 ? 2 : (v < 0.67 ? 5 : 3);
      b.fillRect(x + gx + 1, y + 2, 1, 1); b.fillRect(x + gx, y + 3, 1, 1);
    } else {
      // Celeste-style edge tile: a lit rim, a band of face colour whose inner edge wanders, then the darker interior
      // with one or two marks per tile (a mortar joint, a frost fleck, a crack) instead of a repeating pattern.
      var cUL = !solidAt(c - 1, r - 1), cUR = !solidAt(c + 1, r - 1), cDL = !solidAt(c - 1, r + 1), cDR = !solidAt(c + 1, r + 1);
      var t0 = 2 + Math.floor(v * 2), px, py, deep = [];
      for (py = 0; py < 10; py++) for (px = 0; px < 10; px++) {
        var d = 99;
        if (up) d = Math.min(d, py); if (dn) d = Math.min(d, 9 - py); if (lf) d = Math.min(d, px); if (rt) d = Math.min(d, 9 - px);
        if (cUL && !up && !lf) d = Math.min(d, Math.max(px, py)); if (cUR && !up && !rt) d = Math.min(d, Math.max(9 - px, py));
        if (cDL && !dn && !lf) d = Math.min(d, Math.max(px, 9 - py)); if (cDR && !dn && !rt) d = Math.min(d, Math.max(9 - px, 9 - py));
        var along = (up || dn) ? px : py, t = t0 + Math.floor(tileHash(c * 3 + (along >> 1), r * 5 + 1) * 3);   // 2 to 5 px, wandering along the edge
        var isDeep = d >= t; deep.push(isDeep);
        b.fillStyle = isDeep ? S.deep : S.face;
        b.fillRect(x + px, y + py, 1, 1);
      }
      // a mark or two per tile, only in the interior band, in one of four patterns so no two tiles repeat side by side
      var k = Math.floor(v * 4), marks = [], mi;
      if (kind === 'brick') {                               // joints of large stones
        marks = k === 0 ? [[2, 5, 6, 1], [4, 2, 1, 3]] : k === 1 ? [[1, 4, 5, 1], [6, 4, 1, 4]] : k === 2 ? [[3, 6, 5, 1], [5, 3, 1, 3]] : [[4, 1, 1, 6]];
      } else if (kind === 'jungle') {                       // carved glyph fragments and heavy mortar
        marks = k === 0 ? [[2, 4, 3, 1], [3, 5, 1, 2], [2, 7, 3, 1]] : k === 1 ? [[5, 3, 1, 4], [4, 5, 3, 1]] : k === 2 ? [[2, 3, 5, 1], [6, 4, 1, 3]] : [[3, 6, 4, 1], [4, 3, 2, 2]];
      } else if (kind === 'neon') {                         // panel seams and a rivet
        marks = k === 0 ? [[2, 3, 5, 1], [4, 4, 1, 4]] : k === 1 ? [[1, 6, 6, 1], [3, 2, 1, 4]] : k === 2 ? [[2, 4, 1, 4], [3, 4, 4, 1]] : [[5, 2, 1, 5], [2, 6, 3, 1]];
      } else if (kind === 'frost') {                        // hairline cracks and a frost fleck
        marks = k === 0 ? [[3, 4, 1, 3], [4, 7, 2, 1]] : k === 1 ? [[2, 5, 3, 1], [6, 3, 1, 2]] : k === 2 ? [[5, 2, 1, 4]] : [[3, 6, 4, 1]];
      } else {                                              // cracks running down through the rock
        marks = k === 0 ? [[3, 2, 1, 3], [4, 5, 1, 3]] : k === 1 ? [[6, 3, 1, 2], [5, 5, 1, 3], [4, 8, 1, 1]] : k === 2 ? [[2, 4, 3, 1], [5, 5, 1, 2]] : [[6, 2, 1, 5]];
      }
      b.fillStyle = S.line;
      for (mi = 0; mi < marks.length; mi++) { var m = marks[mi]; for (py = m[1]; py < m[1] + m[3]; py++) for (px = m[0]; px < m[0] + m[2]; px++) if (deep[py * 10 + px]) b.fillRect(x + px, y + py, 1, 1); }
      if (v > 0.55) {                                       // a lighter fleck: a worn stone face, a frost glint, an ember in the crack
        var fx = 2 + Math.floor(v * 6), fy = 3 + Math.floor((v * 13) % 4);
        if (deep[fy * 10 + fx]) { b.fillStyle = kind === 'ember' && v > 0.85 ? S.dripHi : S.mark; b.fillRect(x + fx, y + fy, 1, 1); }
      }
    }
    // one-pixel edge light: bright on top, dimmer on the sides, dark underneath
    if (lf) { b.fillStyle = S.side; b.fillRect(x, y, 1, 10); }
    if (rt) { b.fillStyle = S.side; b.fillRect(x + 9, y, 1, 10); }
    if (dn) { b.fillStyle = S.lo; b.fillRect(x, y + 9, 10, 1); }
    if (up) { b.fillStyle = S.hi; b.fillRect(x, y, 10, 1); }
    if (kind !== 'ice') roughen(b, x, y, S, up, dn, lf, rt, c, r);
  }
  // Roughen: the silhouette of a wall is never a straight line. Exposed corners get chipped, top edges get small
  // dips and bumps, sides get a nick or a knob, and each world adds its own edge art: moss tufts on the Brickyard,
  // snow caps and icicles in the Icehouse, soot and glowing drips in the Furnace. Chips are cleared to transparent,
  // so walls must be drawn on their own transparent layer over the sky. None of this changes collision: the edge
  // moves by one or two pixels of art, the same way Celeste's tiles do.
  function roughen(b, x, y, S, up, dn, lf, rt, c, r) {
    var a = tileHash(c * 7 + 3, r * 11 + 5), d = tileHash(c * 13 + 9, r * 3 + 1), e = tileHash(c + 101, r + 203);
    function chip(cx, cy, w, h, dir) {                       // clear a corner, then relight the two new faces
      b.clearRect(cx, cy, w, h);
      if (dir === 'tl') { b.fillStyle = S.hi; b.fillRect(cx, cy + h, w, 1); b.fillStyle = S.side; b.fillRect(cx + w, cy, 1, h); }
      if (dir === 'tr') { b.fillStyle = S.hi; b.fillRect(cx, cy + h, w, 1); b.fillStyle = S.side; b.fillRect(cx - 1, cy, 1, h); }
      if (dir === 'bl') { b.fillStyle = S.lo; b.fillRect(cx, cy - 1, w, 1); b.fillStyle = S.side; b.fillRect(cx + w, cy, 1, h); }
      if (dir === 'br') { b.fillStyle = S.lo; b.fillRect(cx, cy - 1, w, 1); b.fillStyle = S.side; b.fillRect(cx - 1, cy, 1, h); }
    }
    if (up && lf && a < 0.6) chip(x, y, a < 0.2 ? 2 : 1, a < 0.4 ? 1 : 2, 'tl');
    if (up && rt && d < 0.6) chip(x + (d < 0.2 ? 8 : 9), y, d < 0.2 ? 2 : 1, d < 0.4 ? 1 : 2, 'tr');
    if (dn && lf && e < 0.5) chip(x, y + (e < 0.25 ? 9 : 8), e < 0.25 ? 2 : 1, e < 0.25 ? 1 : 2, 'bl');
    if (dn && rt && a > 0.5) chip(x + (a > 0.75 ? 8 : 9), y + (a > 0.75 ? 9 : 8), a > 0.75 ? 2 : 1, a > 0.75 ? 1 : 2, 'br');
    if (up && !lf && !rt) {                                  // along a top run: a dip, or a knob standing one pixel proud
      var dx = 2 + Math.floor(d * 5), dw = 2 + Math.floor(e * 2);
      if (d < 0.22) { b.clearRect(x + dx, y, dw, 1); b.fillStyle = S.hi; b.fillRect(x + dx, y + 1, dw, 1); }
      else if (d > 0.7) { b.fillStyle = S.hi; b.fillRect(x + dx, y - 1, dw, 1); b.fillStyle = S.face; b.fillRect(x + dx, y, dw, 1); }
    }
    if (dn && !lf && !rt && e > 0.72) { var bx = 2 + Math.floor(a * 5); b.fillStyle = S.lo; b.fillRect(x + bx, y + 10, 2 + Math.floor(d * 2), 1); }
    if (lf && !up && !dn) {                                  // along a side: a nick in, or a knob out
      var sy = 2 + Math.floor(a * 5), sh = 2 + Math.floor(d * 2);
      if (a < 0.2) { b.clearRect(x, y + sy, 1, sh); b.fillStyle = S.side; b.fillRect(x + 1, y + sy, 1, sh); }
      else if (a > 0.78) { b.fillStyle = S.side; b.fillRect(x - 1, y + sy, 1, sh); }
    }
    if (rt && !up && !dn) {
      var ty = 2 + Math.floor(e * 5), th = 2 + Math.floor(a * 2);
      if (e < 0.2) { b.clearRect(x + 9, y + ty, 1, th); b.fillStyle = S.side; b.fillRect(x + 8, y + ty, 1, th); }
      else if (e > 0.78) { b.fillStyle = S.side; b.fillRect(x + 10, y + ty, 1, th); }
    }
    // world edge art
    if (S.snow) {
      if (up) {                                              // a snow cap: two pixels deep, mounded, with a little overhang
        var sx = lf ? 1 : 0, sw = 10 - sx - (rt ? 1 : 0);
        b.fillStyle = S.snow; b.fillRect(x + sx, y, sw, 2);
        b.fillStyle = S.snowLo; b.fillRect(x + sx, y + 2, sw, 1);
        if (e > 0.5) { b.fillStyle = S.snow; b.fillRect(x + 2 + Math.floor(a * 5), y - 1, 2 + Math.floor(d * 2), 1); }
      }
      if (dn && d > 0.55) { var ix = 1 + Math.floor(a * 8), ih = 2 + Math.floor(e * 3); b.fillStyle = S.icicle; b.fillRect(x + ix, y + 10, 1, ih); b.fillStyle = S.snow; b.fillRect(x + ix, y + 10, 1, 1); }
    } else if (S.moss) {
      if (up && a > 0.62) { var mx = 1 + Math.floor(d * 6); b.fillStyle = S.moss; b.fillRect(x + mx, y, 2 + Math.floor(e * 3), 1); b.fillRect(x + mx + 1, y - 1, 1, 1); }
      if (lf && e > 0.8) { b.fillStyle = S.moss; b.fillRect(x, y + 2 + Math.floor(a * 6), 1, 2); }
    } else if (S.vine) {
      if (up && a > 0.55) { var vx = 1 + Math.floor(d * 6); b.fillStyle = S.vine; b.fillRect(x + vx, y, 3, 1); b.fillRect(x + vx + 1, y - 1, 1, 1); b.fillStyle = S.vineLo; b.fillRect(x + vx + 2, y, 1, 1); }
      if (dn && d > 0.6) { var vy = 2 + Math.floor(e * 4); b.fillStyle = S.vineLo; b.fillRect(x + 2 + Math.floor(a * 6), y + 10, 1, vy); b.fillStyle = S.vine; b.fillRect(x + 2 + Math.floor(a * 6) + (e > 0.5 ? 1 : -1), y + 10 + vy - 1, 1, 1); }
      if ((lf || rt) && e > 0.75) { b.fillStyle = S.vine; b.fillRect(lf ? x : x + 9, y + 1 + Math.floor(a * 6), 1, 3); }
    } else if (S.strip) {                                   // a lit kerb: a cyan strip along the top with a dim run under it, a rare drip below
      if (up) { var kx = lf ? 1 : 0, kw = 10 - kx - (rt ? 1 : 0); b.fillStyle = S.strip; b.fillRect(x + kx, y, kw, 1); b.fillStyle = S.stripLo; b.fillRect(x + kx, y + 1, kw, 1); if (d < 0.22) { b.fillStyle = S.stripLo; b.fillRect(x + 2 + Math.floor(e * 5), y, 1, 1); } }
      if (dn && d > 0.8) { var kd = 1 + Math.floor(a * 8); b.fillStyle = S.stripLo; b.fillRect(x + kd, y + 10, 1, 1 + Math.floor(e * 2)); b.fillStyle = S.strip; b.fillRect(x + kd, y + 10, 1, 1); }
    } else if (S.soot) {
      if (up && d > 0.5) { var ox = Math.floor(a * 7); b.fillStyle = S.soot; b.fillRect(x + ox, y, 2 + Math.floor(e * 3), 1); }
      if (dn && a > 0.68) { var px = 1 + Math.floor(e * 8), ph = 2 + Math.floor(d * 3); b.fillStyle = S.drip; b.fillRect(x + px, y + 10, 1, ph); b.fillStyle = S.dripHi; b.fillRect(x + px, y + 10, 1, 1); }
    }
  }
  // Crumbling block: every tile has its own outline and cracks so it reads as loose.
  function drawCrumble(b, x, y, c, r) {
    var v = tileHash(c, r);
    b.fillStyle = '#5a3516'; b.fillRect(x, y, 10, 10);
    b.fillStyle = '#c98f4a'; b.fillRect(x + 1, y + 1, 8, 8);
    b.fillStyle = '#f0c27a'; b.fillRect(x + 1, y + 1, 8, 1);
    b.fillStyle = '#8f5f2a'; b.fillRect(x + 1, y + 8, 8, 1);
    b.fillStyle = '#5a3516';
    if (v < 0.5) { b.fillRect(x + 3, y + 2, 1, 2); b.fillRect(x + 4, y + 4, 1, 2); b.fillRect(x + 6, y + 6, 1, 2); }
    else { b.fillRect(x + 6, y + 2, 1, 2); b.fillRect(x + 5, y + 4, 1, 2); b.fillRect(x + 3, y + 5, 1, 3); }
  }
  // Moving platform: one tile of a plank; left and right say whether it continues on that side.
  // zip: 0 ordinary plank, 1 a zip mover waiting (amber stripe), 2 a zip mover on the move (stripe lit)
  function drawPlank(b, x, y, left, right, zip) {
    var x0 = x + (left ? 0 : 1), w = 10 - (left ? 0 : 1) - (right ? 0 : 1);
    if (zip) {
      b.fillStyle = '#2a2016'; b.fillRect(x, y, 10, 10);
      b.fillStyle = '#6b5236'; b.fillRect(x0, y + 1, w, 7);
      b.fillStyle = zip === 2 ? '#ffe08a' : '#d9a24a'; b.fillRect(x0, y + 1, w, 1); b.fillRect(x0, y + 4, w, 1);   // stripes
      b.fillStyle = '#3a2a1e'; b.fillRect(x0, y + 7, w, 1);
      b.fillStyle = zip === 2 ? '#ffe08a' : '#d9a24a'; b.fillRect(x + 4, y + 2, 2, 1); b.fillRect(x + 3, y + 5, 1, 2); b.fillRect(x + 6, y + 5, 1, 2);   // a wound-up coil
      return;
    }
    b.fillStyle = '#3a4258'; b.fillRect(x, y, 10, 10);
    b.fillStyle = '#9aa5bb'; b.fillRect(x0, y + 1, w, 7);
    b.fillStyle = '#e6ebf5'; b.fillRect(x0, y + 1, w, 1);
    b.fillStyle = '#5c667d'; b.fillRect(x0, y + 7, w, 1);
    b.fillStyle = '#3a4258'; b.fillRect(x + 4, y + 4, 2, 2);
  }
  function drawTrack(b, x, y, vertical) {
    b.fillStyle = '#2f3a6b';
    if (vertical) { b.fillRect(x + 4, y + 1, 2, 3); b.fillRect(x + 4, y + 6, 2, 3); }
    else { b.fillRect(x + 1, y + 4, 3, 2); b.fillRect(x + 6, y + 4, 3, 2); }
  }
  // Backdrop: dim brickwork that sits behind the action. Scenery only, nothing collides with it.
  // sameAt(c, r) says whether a neighbouring cell is backdrop or wall, so only the ragged outer edge gets a rim.
  function drawBack(b, x, y, sameAt, c, r) {
    var v = tileHash(c + 31, r + 17);
    b.fillStyle = TILE_THEME.back[0]; b.fillRect(x, y, 10, 10);
    if (TILE_THEME.backKind === 'windows') {               // a dark office grid: 3 px panes, 1 px mullions, a pane or two lit
      b.fillStyle = TILE_THEME.back[1];
      b.fillRect(x, y + 4, 10, 1); b.fillRect(x, y + 9, 10, 1); b.fillRect(x + 4, y, 1, 10); b.fillRect(x + 9, y, 1, 10);
      if (v < 0.12) { b.fillStyle = '#6a5a3a'; b.fillRect(x + 1, y + 1, 3, 3); } else if (v > 0.9) { b.fillStyle = '#3a5a6a'; b.fillRect(x + 5, y + 5, 4, 4); }
      b.fillStyle = TILE_THEME.back[2];
      if (!sameAt(c, r - 1)) b.fillRect(x, y, 10, 1);
      if (!sameAt(c - 1, r)) b.fillRect(x, y, 1, 10);
      if (!sameAt(c + 1, r)) b.fillRect(x + 9, y, 1, 10);
      return;
    }
    b.fillStyle = TILE_THEME.back[1];
    var j1 = v < 0.34 ? 7 : (v < 0.67 ? 3 : 5), j2 = v < 0.34 ? 2 : (v < 0.67 ? 8 : 6);
    b.fillRect(x, y + 4, 10, 1); b.fillRect(x, y + 9, 10, 1);
    b.fillRect(x + j1, y, 1, 4); b.fillRect(x + j2, y + 5, 1, 4);
    b.fillStyle = TILE_THEME.back[2];
    if (!sameAt(c, r - 1)) b.fillRect(x, y, 10, 1);
    if (!sameAt(c - 1, r)) b.fillRect(x, y, 1, 10);
    if (!sameAt(c + 1, r)) b.fillRect(x + 9, y, 1, 10);
  }
  // Sky: the layer behind everything. A soft vertical gradient (dark at the top, a faint glow at the horizon),
  // a few dim stars, and two bands of flat far silhouettes in the world's own shape: rooftops and chimneys for the
  // Brickyard, snowy peaks for the Icehouse, jagged cave rock with hanging stalactites for the Furnace. It is
  // painted once per room into the static layer, so it costs nothing per frame. The silhouettes only rise about a
  // third of one screen (h0), so a tall room opens into clear sky as you climb. seed picks the skyline so rooms
  // do not all share one. Everything here stays darker than the terrain, which keeps the terrain edge the brightest
  // line on screen.
  var SKY_SIGNS = [];                                      // spots inside the near towers where drawDecals may hang a sign (set by drawSky)
  function skyHash(s) { var h = 7; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0) || 1; }
  function drawSky(b, w, h, h0, seed) {
    var th = TILE_THEME, sky = th.sky, far = th.far, i, x;
    if (!sky) { b.fillStyle = th.bg || '#0a0d1c'; b.fillRect(0, 0, w, h); return; }
    var gr = b.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, sky[0]); gr.addColorStop(Math.max(0, 1 - h0 / h), sky[1]); gr.addColorStop(1, sky[2]);
    b.fillStyle = gr; b.fillRect(0, 0, w, h);
    var s = (Math.abs(seed) % 2147483646) + 1;             // keep the generator in range, or widths could go negative
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    function between(a, c) { return a + Math.floor(rnd() * (c - a + 1)); }
    b.fillStyle = th.dot;                                   // stars (embers in the Furnace), only in the open sky
    for (i = 0; i < 70 * (h / 480); i++) { var sx = Math.floor(rnd() * w), sy = Math.floor(rnd() * (h - h0 * 0.45)); b.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1); }
    if (!far) return;
    var kind = th.skyline || 'town';
    SKY_SIGNS = [];
    // heights(top) builds a one-pixel-column heightmap for one band whose tallest point is about top pixels
    function heights(top) {
      var hm = [], seg, hh, x0, px;
      if (kind === 'town') {                               // flat-topped blocks of random width, some with a chimney
        for (x0 = 0; x0 < w; x0 += seg) {
          seg = between(8, 30); hh = between(Math.round(top * 0.25), top);
          var chim = rnd() < 0.5 ? between(1, seg - 4) : -1, cw = between(2, 3), ch = between(4, 9);
          for (px = 0; px < seg && x0 + px < w; px++) hm[x0 + px] = hh + (px >= chim && px < chim + cw ? ch : 0);
        }
      } else if (kind === 'peaks') {                        // straight slopes between random summits
        var pts = [[0, between(Math.round(top * 0.2), top)]];
        for (x0 = 0; x0 < w;) { x0 += between(22, 60); pts.push([Math.min(x0, w + 20), between(Math.round(top * 0.15), top)]); }
        for (i = 0; i + 1 < pts.length; i++) for (x = pts[i][0]; x < pts[i + 1][0] && x < w; x++) hm[x] = Math.round(pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]));
      } else if (kind === 'pyramid') {                      // one big stepped pyramid and a few palms
        var pw = between(60, 90), pxc = between(60, w - 60), steps = 6, sh = Math.round(top / steps);
        for (x = 0; x < w; x++) { var dx = Math.abs(x - pxc), lvl = Math.max(0, steps - Math.ceil(dx / (pw / 2 / steps))); hm[x] = lvl * sh; }
        for (x = 0; x < w;) { x += between(14, 40); if (Math.abs(x - pxc) > pw / 2 + 6 && x < w) { var th = between(Math.round(top * 0.3), Math.round(top * 0.7)); hm[x] = th; hm[x + 1] = th; for (var fr = -5; fr <= 5; fr++) if (x + fr >= 0 && x + fr < w) hm[x + fr] = Math.max(hm[x + fr], th - Math.abs(fr) * 2 + (fr ? 0 : 2)); } }
      } else if (kind === 'towers') {                       // flat-topped towers of many widths, a few with a mast
        for (x0 = 0; x0 < w; x0 += seg) {
          seg = between(14, 44); hh = between(Math.round(top * 0.45), top);
          var mast = rnd() < 0.35 ? between(2, seg - 3) : -1, mh = between(5, 14);
          for (px = 0; px < seg && x0 + px < w; px++) hm[x0 + px] = hh + (px === mast ? mh : 0);
        }
      } else {                                              // cave: narrow jagged spires
        for (x0 = 0; x0 < w; x0 += seg) {
          seg = between(2, 7); hh = between(Math.round(top * 0.15), top);
          for (px = 0; px < seg && x0 + px < w; px++) hm[x0 + px] = hh - Math.abs(px - seg / 2) * 2;
        }
      }
      return hm;
    }
    function band(col, top, cap) {
      var hm = heights(top);
      b.fillStyle = col;
      for (x = 0; x < w; x++) if (hm[x] > 0) b.fillRect(x, h - hm[x], 1, hm[x]);
      if (!cap) return;
      b.fillStyle = cap;
      if (kind === 'peaks') { for (x = 0; x < w; x++) if (hm[x] > top * 0.62) b.fillRect(x, h - hm[x], 1, 1); } // snow on the summits
      else if (kind === 'pyramid') { for (x = 0; x < w; x++) if (hm[x] > 0 && hm[x] !== hm[x - 1]) b.fillRect(x, h - hm[x], 1, hm[x] > 6 ? 2 : 1); }   // the lit edge of each step
      else if (kind === 'town') { for (i = 0; i < w / 9; i++) { x = Math.floor(rnd() * w); var wy = between(4, hm[x] - 3); if (hm[x] > 8 && wy > 0) b.fillRect(x, h - wy, 1, 2); } } // a few dim windows
      else if (kind === 'towers') {                        // pin-dot windows on a 3 px grid, cyan and pink, and room for signs
        for (x = 2; x < w; x += 3) for (var wy2 = 3; wy2 < hm[x] - 2; wy2 += 3) { var dv = rnd(); if (dv < 0.1) { b.fillStyle = dv < 0.06 ? cap : '#ff7ad0'; b.fillRect(x, h - wy2, 1, 1); } }
        for (i = 0; i < 12; i++) { x = Math.floor(rnd() * (w - 30)); var sy2 = between(8, Math.max(9, hm[x + 12] - 14)); if (hm[x] > 24 && hm[x + 24] > 24 && sy2 < hm[x] - 10) SKY_SIGNS.push([x + 2, h - sy2 - 9]); }
      }
      else { for (x = 0; x < w; x++) if (hm[x] > 2) b.fillRect(x, h - 2, 1, 2); }                       // a lip of glow at the cave floor
    }
    if (kind === 'towers') {                                 // one pale beam tower far back, and two soft cloud bands
      var bx = between(60, w - 60), bw = between(8, 14), bh = Math.round(h0 * 0.9);
      b.fillStyle = 'rgba(120,200,230,0.12)'; b.fillRect(bx, h - bh, bw, bh); b.fillStyle = 'rgba(160,230,255,0.16)'; b.fillRect(bx + 2, h - bh, bw - 4, bh);
      b.fillStyle = 'rgba(255,255,255,0.05)'; for (i = 0; i < 2; i++) { var cy = Math.round(h - h0 * (0.5 + i * 0.3)), cx = between(0, w / 2), cwid = between(60, 150); b.fillRect(cx, cy, cwid, 2); b.fillRect(cx + 10, cy - 2, cwid - 30, 2); }
    }
    if (kind === 'towers') {                                 // the city fills the screen: we are down in it, towers rising past the top
      band(far[0], Math.round(h0 * 0.75), far[2]);
      band(far[1], Math.round(h0 * 1.0), far[2]);
      b.fillStyle = '#07060f';                               // overhead cables sagging across the alley
      for (i = 0; i < 4; i++) { var cy0 = between(Math.round(h0 * 0.1), Math.round(h0 * 0.6)), cy1 = cy0 + between(-30, 30), sag = between(6, 18); for (x = 0; x < w; x++) { var tt = x / w; b.fillRect(x, Math.round(cy0 + (cy1 - cy0) * tt + Math.sin(tt * Math.PI) * sag), 1, 1); } }
    } else {
      band(far[0], Math.round(h0 * 0.34), far[2]);
      band(far[1], Math.round(h0 * 0.2), kind === 'cave' ? far[2] : null);
    }
    if (kind === 'towers') {                                 // baked rain: thin diagonal streaks at two densities, still, like a held frame
      b.fillStyle = 'rgba(200,220,255,0.10)';
      for (i = 0; i < 90 * (h / 480); i++) { x = Math.floor(rnd() * w); var ry = Math.floor(rnd() * h), rl = between(5, 10); for (var k = 0; k < rl; k++) b.fillRect(x - (k >> 2), ry + k, 1, 1); }
      b.fillStyle = 'rgba(200,220,255,0.05)';
      for (i = 0; i < 140 * (h / 480); i++) { x = Math.floor(rnd() * w); ry = Math.floor(rnd() * h); rl = between(3, 6); for (k = 0; k < rl; k++) b.fillRect(x - (k >> 2), ry + k, 1, 1); }
    }
    if (kind === 'cave') {                                   // stalactites hang from the top of the room
      b.fillStyle = far[0];
      for (x = 0; x < w;) { var sw = between(3, 9), sh = between(4, Math.round(h0 * 0.12)); for (i = 0; i < sw; i++) b.fillRect(x + i, 0, 1, Math.max(1, sh - Math.abs(i - sw / 2) * 2)); x += sw + between(0, 10); }
    }
  }
  // Painted light: a soft disc baked into the static layer under anything that glows. Nothing is computed per frame.
  function drawGlow(b, cx, cy, rad, rgb, alpha) {
    var gr = b.createRadialGradient(cx, cy, 1, cx, cy, rad);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')'); gr.addColorStop(0.5, 'rgba(' + rgb + ',' + (alpha * 0.35) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    b.fillStyle = gr; b.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // Decals: small no-collision props placed by hash wherever the room has a natural spot for them, so every level
  // gets them without authoring and the same room always gets the same ones. Floor props stand on a wall top, hanging
  // props drop from a wall bottom, lamps sit on a wall side (and cast a painted glow), backdrop props sit inside a
  // patch of backdrop. All of it stays dim and desaturated so hazards and pickups keep the brightest colours.
  // at(c, r) returns the level character of a cell ('#' off the map). Returns the lamps so callers can light them.
  var DECAL_GLOW = { brick: '255,190,110', frost: '150,220,255', ember: '255,140,70', jungle: '255,90,170', neon: '255,58,184' };
  // ---- neon signs (Neon Row): small lit rectangles with a frame and a few glyphs of a made-up alphabet. Placed by
  // hash on backdrop patches, inside wall masses and on the far towers, baked into the static layer in their "on"
  // state. Some are given an animation kind; the game redraws just those few rectangles when their frame changes
  // (signFrame says which frame a tick shows, drawSign paints it), so the cost is a handful of small blits. ----
  var SIGN_COLS = { cyan: ['#38f0ff', '#1c7a85', '#2bb5c4', '28,240,255'], magenta: ['#ff3ab8', '#8a1f66', '#c42f8f', '255,58,184'], gold: ['#ffd56a', '#8a6a2a', '#c4a24a', '255,213,106'], red: ['#ff5a5a', '#8a2a2a', '#c44444', '255,90,90'] };
  var GLYPHS = ['101|010|101|010|101', '111|000|111|000|111', '100|110|111|110|100', '010|111|010|111|010', '110|011|110|011|110', '111|101|000|101|111', '001|011|111|011|001', '100|100|110|111|111',
                '111|010|010|010|111', '011|110|000|011|110', '101|101|010|101|101', '111|100|100|100|100', '110|100|111|001|011', '010|010|111|010|010', '111|001|001|001|111', '100|111|000|111|001'];   // a made-up alphabet, no letters or digits
  function drawGlyph(b, x, y, g) { var rows = GLYPHS[g & 15].split('|'); for (var yy = 0; yy < 5; yy++) for (var xx = 0; xx < 3; xx++) if (rows[yy].charAt(xx) === '1') b.fillRect(x + xx, y + yy, 1, 1); }
  // s: { x, y, n (glyphs), g (glyph list), col, kind, phase, w, h }. f: the frame to paint (0 is the baked "on" look).
  function drawSign(b, s, f) {
    var C = SIGN_COLS[s.col], bright = C[0], dim = C[1], mid = C[2], i;
    var onCol = bright, glyphCol = bright, off = -1, shift = 0, frameCol = bright;
    if (s.kind === 'pulse') { onCol = f === 1 ? mid : (f === 2 ? dim : bright); glyphCol = onCol; frameCol = onCol; }
    else if (s.kind === 'buzz' && f === 1) off = s.phase % s.n;
    else if (s.kind === 'scroll') shift = f;
    else if (s.kind === 'cycle' && f === 1) { var alt = SIGN_COLS[s.alt]; frameCol = alt[0]; glyphCol = alt[0]; }
    b.fillStyle = '#07070f'; b.fillRect(s.x, s.y, s.w, s.h);
    b.fillStyle = frameCol; b.fillRect(s.x, s.y, s.w, 1); b.fillRect(s.x, s.y + s.h - 1, s.w, 1); b.fillRect(s.x, s.y, 1, s.h); b.fillRect(s.x + s.w - 1, s.y, 1, s.h);
    b.fillStyle = dim; b.fillRect(s.x + 1, s.y + 1, s.w - 2, 1);
    for (i = 0; i < s.n; i++) { if (i === off) continue; b.fillStyle = glyphCol; drawGlyph(b, s.x + 2 + i * 4, s.y + 2, s.g[(i + shift) % s.n]); }
  }
  function signFrame(s, tick) {
    var t = tick + s.phase;
    if (s.kind === 'buzz') return t % s.period < 2 ? 1 : 0;                                   // one glyph drops out for two ticks
    if (s.kind === 'pulse') return [0, 1, 2, 2, 1, 0][Math.floor((t % 180) / 30)];              // a slow breath over three seconds
    if (s.kind === 'scroll') return Math.floor(t / 24) % s.n;                                    // the glyphs step along
    if (s.kind === 'cycle') return Math.floor(t / 42) % 2;                                       // two colours take turns
    if (s.kind === 'dot') return Math.floor(t / s.period) % 2;                                   // a far window goes on and off
    return 0;
  }
  function drawDot(b, s, f) { b.fillStyle = f ? '#1a1038' : (s.col === 'cyan' ? '#38f0ff' : '#ff7ad0'); b.fillRect(s.x, s.y, s.w, s.h); }
  function placeSigns(b, cols, rows, at, seed) {
    var signs = [], used = {}, c, r, i, salt = (seed % 1000) | 0, cnt = 0;
    function cell(cc, rr) { return at(cc, rr); }
    function wall(cc, rr) { var ch = cell(cc, rr); return ch === '#'; }
    function inner(cc, rr) { for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) if (!wall(cc + dx, rr + dy)) return false; return true; }
    function free(cc, rr, n) { for (var k = 0; k < n; k++) if (used[(rr) * 100 + cc + k]) return false; return true; }
    function add(x, y, n, v, onWall) {
      var cols2 = ['cyan', 'magenta', 'gold', 'red'], col = cols2[Math.floor(v * 97) % 4], g = [], k;
      for (k = 0; k < n; k++) g.push(Math.floor(tileHash(x * 3 + k, y * 7 + salt) * 16));
      var kv = tileHash(x + salt * 7, y + 13), kind = kv < 0.45 ? 'still' : (kv < 0.6 ? 'buzz' : (kv < 0.75 ? 'pulse' : (kv < 0.9 ? 'scroll' : 'cycle')));
      var sg = { x: x, y: y, n: n, g: g, col: col, alt: col === 'cyan' ? 'magenta' : 'cyan', kind: kind, phase: Math.floor(v * 1000), period: 120 + Math.floor(v * 240), w: 4 * n + 3, h: 9, wall: onWall };
      signs.push(sg); drawSign(b, sg, 0);
      if (!onWall) drawGlow(b, x + sg.w / 2, y + 5, 10, SIGN_COLS[col][3], 0.18);
      cnt++;
    }
    for (r = 1; r < rows - 2; r++) for (c = 1; c < cols - 1; c++) {
      var v = tileHash(c * 5 + salt, r * 9 + salt * 3), n = 2 + Math.floor(v * 4), span = Math.ceil((4 * n + 4) / 10);
      if (v > 0.5 && v < 0.56) {                             // on a run of backdrop
        var ok = true; for (i = 0; i < span; i++) if (cell(c + i, r) !== 'b' || !free(c + i, r, 1)) ok = false;
        if (ok) { add(c * 10 + 1, r * 10, n, v, false); for (i = 0; i < span; i++) used[r * 100 + c + i] = 1; }
      } else if (v > 0.9 && v < 0.93) {                      // inside a wall mass, as a panel set into the steel
        ok = true; for (i = 0; i < span; i++) if (!inner(c + i, r) || !free(c + i, r, 1)) ok = false;
        if (ok) { add(c * 10 + 1, r * 10, n, v, true); for (i = 0; i < span; i++) used[r * 100 + c + i] = 1; }
      }
    }
    for (i = 0; i < SKY_SIGNS.length; i++) {               // on the far towers: smaller, and behind the terrain
      var p = SKY_SIGNS[i], vv = tileHash(p[0] + salt, p[1]); var nn = 2 + Math.floor(vv * 3);
      var okSky = true; for (r = Math.floor(p[1] / 10); r <= Math.floor((p[1] + 9) / 10); r++) for (c = Math.floor(p[0] / 10); c <= Math.floor((p[0] + 4 * nn + 3) / 10); c++) if (cell(c, r) !== '.' ) okSky = false;
      if (okSky) add(p[0], p[1], nn, vv, false);
    }
    for (i = 0; i < 6; i++) {                                // blinking far windows
      var dv = tileHash(i * 17 + salt, salt * 3 + i), dx = Math.floor(dv * (cols * 10 - 20)) + 10, dr = rows - 3 - Math.floor(tileHash(i + salt, dv * 1000) * 8);
      if (cell(Math.floor(dx / 10), dr) === '.') signs.push({ x: dx, y: dr * 10 + 4, w: 1, h: 1, kind: 'dot', col: i % 2 ? 'cyan' : 'magenta', phase: Math.floor(dv * 500), period: 60 + Math.floor(dv * 120) });
    }
    return signs;
  }
  function drawDecals(b, cols, rows, at, seed) {
    var kind = TILE_THEME.tiles, lamps = [], c, r, salt = (seed % 1000) | 0;
    function wall(cc, rr) { var ch = at(cc, rr); return ch === '#' || ch === 'I'; }
    function open(cc, rr) { var ch = at(cc, rr); return ch === '.' || ch === 'b'; }
    function quiet(cc, rr) { for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var ch = at(cc + dx, rr + dy); if ('^v<>SEoGu*F='.indexOf(ch) >= 0) return false; } return true; }
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      if (!open(c, r) || !quiet(c, r)) continue;
      var v = tileHash(c * 5 + salt, r * 9 + salt * 3), x = c * 10, y = r * 10;
      if (wall(c, r + 1) && v < 0.07) floorProp(x, y, v / 0.07);
      else if (wall(c, r - 1) && open(c, r + 1) && v > 0.95) hangProp(x, y, (v - 0.95) / 0.05);
      else if ((wall(c - 1, r) || wall(c + 1, r)) && open(c, r - 1) && open(c, r + 1) && v > 0.3 && v < 0.325) lamp(x, y, wall(c - 1, r) ? -1 : 1);
      else if (at(c, r) === 'b' && at(c - 1, r) === 'b' && at(c + 1, r) === 'b' && at(c, r - 1) === 'b' && v > 0.6 && v < 0.65) backProp(x, y, (v - 0.6) / 0.05);
    }
    function floorProp(x, y, t) {
      if (kind === 'frost') {                                 // a crystal cluster, or a drift of snow
        if (t < 0.5) { b.fillStyle = '#a8d6ee'; b.fillRect(x + 3, y + 5, 2, 5); b.fillRect(x + 6, y + 7, 2, 3); b.fillRect(x + 1, y + 8, 2, 2); b.fillStyle = '#f4fcff'; b.fillRect(x + 3, y + 5, 1, 2); b.fillRect(x + 6, y + 7, 1, 1); }
        else { b.fillStyle = '#dceef8'; b.fillRect(x + 1, y + 8, 8, 2); b.fillRect(x + 3, y + 7, 4, 1); b.fillStyle = '#f4fcff'; b.fillRect(x + 3, y + 7, 2, 1); }
      } else if (kind === 'jungle') {                        // a rifle crate, or a clump of leaves
        if (t < 0.5) { b.fillStyle = '#1a1408'; b.fillRect(x + 2, y + 5, 6, 5); b.fillStyle = '#6b5a14'; b.fillRect(x + 3, y + 6, 4, 3); b.fillStyle = '#1a1408'; b.fillRect(x + 5, y + 6, 1, 3); }
        else { b.fillStyle = '#1c6b32'; b.fillRect(x + 2, y + 7, 6, 3); b.fillRect(x + 4, y + 5, 2, 2); b.fillStyle = '#2fa84f'; b.fillRect(x + 3, y + 7, 2, 1); b.fillRect(x + 6, y + 8, 2, 1); }
      } else if (kind === 'neon') {                          // an air-con unit, or a vending box with a lit panel
        if (t < 0.5) { b.fillStyle = '#1e2236'; b.fillRect(x + 2, y + 5, 6, 5); b.fillStyle = '#565d80'; b.fillRect(x + 3, y + 6, 4, 3); b.fillStyle = '#1e2236'; b.fillRect(x + 3, y + 7, 4, 1); b.fillRect(x + 5, y + 6, 1, 3); }
        else { b.fillStyle = '#1e2236'; b.fillRect(x + 3, y + 3, 5, 7); b.fillStyle = '#38f0ff'; b.fillRect(x + 4, y + 4, 3, 3); b.fillStyle = '#ff3ab8'; b.fillRect(x + 4, y + 8, 1, 1); b.fillStyle = '#0d0f18'; b.fillRect(x + 6, y + 8, 1, 1); }
      } else if (kind === 'ember') {                         // ember stones, or a cracked slab
        if (t < 0.5) { b.fillStyle = '#4c1c15'; b.fillRect(x + 2, y + 7, 3, 3); b.fillRect(x + 6, y + 8, 3, 2); b.fillStyle = '#c25a24'; b.fillRect(x + 3, y + 8, 1, 1); b.fillRect(x + 7, y + 9, 1, 1); }
        else { b.fillStyle = '#5e2419'; b.fillRect(x + 1, y + 8, 7, 2); b.fillStyle = '#2b0f0c'; b.fillRect(x + 4, y + 8, 1, 2); }
      } else {                                               // loose bricks, or a tuft of weeds
        if (t < 0.5) { b.fillStyle = '#3a47a8'; b.fillRect(x + 2, y + 7, 4, 3); b.fillRect(x + 6, y + 8, 3, 2); b.fillStyle = '#6d7be6'; b.fillRect(x + 2, y + 7, 4, 1); }
        else { b.fillStyle = '#4f8a64'; b.fillRect(x + 4, y + 6, 1, 4); b.fillRect(x + 2, y + 8, 1, 2); b.fillRect(x + 6, y + 7, 1, 3); b.fillRect(x + 3, y + 7, 1, 1); b.fillRect(x + 5, y + 8, 1, 1); }
      }
    }
    function hangProp(x, y, t) {
      var h = 4 + Math.floor(t * 6);
      if (kind === 'frost') { b.fillStyle = '#86a9c9'; b.fillRect(x + 4, y, 1, h); b.fillStyle = '#dceef8'; b.fillRect(x + 3, y + h - 1, 3, 2); }          // a frozen chain and knot
      else if (kind === 'jungle') { b.fillStyle = '#1c6b32'; b.fillRect(x + 4, y, 1, h); b.fillStyle = '#2fa84f'; b.fillRect(x + 3, y + 2, 1, 1); b.fillRect(x + 5, y + h - 2, 1, 1); b.fillRect(x + 3, y + h, 3, 1); }   // a hanging vine with leaves
      else if (kind === 'neon') { b.fillStyle = '#161a2a'; b.fillRect(x + 3, y, 1, h); b.fillRect(x + 5, y, 1, h - 1); b.fillStyle = '#3c4260'; b.fillRect(x + 2, y + h, 5, 1); b.fillStyle = '#38f0ff'; b.fillRect(x + 4, y + h + 1, 1, 1); }   // a cable bundle with a dripping junction
      else if (kind === 'ember') { b.fillStyle = '#4c1c15'; for (var i = 0; i < h; i += 2) b.fillRect(x + 4 + (i % 4 ? 1 : 0), y + i, 1, 2); b.fillStyle = '#7a3a2a'; b.fillRect(x + 3, y + h, 3, 2); } // a hanging chain
      else { b.fillStyle = '#3f7a56'; b.fillRect(x + 3, y, 1, h); b.fillRect(x + 6, y, 1, h - 2); b.fillStyle = '#4f8a64'; b.fillRect(x + 2, y + 2, 1, 1); b.fillRect(x + 7, y + 3, 1, 1); b.fillRect(x + 4, y + h - 1, 1, 1); } // ivy
    }
    function lamp(x, y, side) {
      var lx = side < 0 ? x : x + 7;
      if (kind === 'frost') { b.fillStyle = '#2a4361'; b.fillRect(lx, y + 2, 3, 1); b.fillRect(lx + 1, y + 3, 1, 1); b.fillStyle = '#9fe3ff'; b.fillRect(lx, y + 4, 3, 3); b.fillStyle = '#f4fcff'; b.fillRect(lx + 1, y + 5, 1, 1); }
      else if (kind === 'jungle') { b.fillStyle = '#1a1408'; b.fillRect(lx + 1, y + 3, 1, 5); b.fillStyle = '#ff4fa3'; b.fillRect(lx, y + 1, 3, 3); b.fillStyle = '#ffd6ea'; b.fillRect(lx + 1, y + 1, 1, 2); }   // a flare torch, pink
      else if (kind === 'neon') { b.fillStyle = '#1e2236'; b.fillRect(lx, y + 1, 3, 1); b.fillRect(lx + 1, y + 2, 1, 1); b.fillStyle = '#ff3ab8'; b.fillRect(lx + 1, y + 3, 1, 5); b.fillStyle = '#ffd6ea'; b.fillRect(lx + 1, y + 4, 1, 2); }   // a magenta tube
      else if (kind === 'ember') { b.fillStyle = '#2b0f0c'; b.fillRect(lx + 1, y + 3, 1, 5); b.fillStyle = '#e2491f'; b.fillRect(lx, y + 1, 3, 3); b.fillStyle = '#ffe08a'; b.fillRect(lx + 1, y + 1, 1, 2); }
      else { b.fillStyle = '#161c4a'; b.fillRect(lx, y + 2, 3, 1); b.fillRect(lx + 1, y + 3, 1, 1); b.fillStyle = '#ffb74a'; b.fillRect(lx, y + 4, 3, 3); b.fillStyle = '#fff1c4'; b.fillRect(lx + 1, y + 5, 1, 1); }
      lamps.push({ x: lx + 1.5, y: y + 5 });
    }
    function backProp(x, y, t) {
      if (kind === 'frost') { b.fillStyle = '#1f4460'; b.fillRect(x + 2, y + 2, 6, 6); b.fillStyle = '#2f6a8a'; b.fillRect(x + 3, y + 3, 4, 4); b.fillStyle = '#5a93b6'; b.fillRect(x + 4, y + 4, 1, 1); }   // a frosted pane
      else if (kind === 'jungle') { b.fillStyle = '#1a1408'; b.fillRect(x + 1, y + 1, 8, 8); b.fillStyle = '#6b5a14'; b.fillRect(x + 2, y + 2, 6, 6); b.fillStyle = '#1a1408'; b.fillRect(x + 4, y + 3, 2, 1); b.fillRect(x + 3, y + 5, 1, 2); b.fillRect(x + 6, y + 5, 1, 2); }   // a carved glyph block
      else if (kind === 'neon') { b.fillStyle = '#0d0f18'; b.fillRect(x + 1, y + 2, 8, 6); b.fillStyle = '#2a2f45'; for (var i = 0; i < 3; i++) b.fillRect(x + 2, y + 3 + i * 2, 6, 1); b.fillStyle = '#8a93b8'; b.fillRect(x + 2, y + 3, 2, 1); }   // a steam vent grille
      else if (kind === 'ember') { b.fillStyle = '#2b0f0c'; b.fillRect(x + 1, y + 2, 8, 6); b.fillStyle = '#4a2119'; for (var i = 0; i < 3; i++) b.fillRect(x + 2, y + 3 + i * 2, 6, 1); }              // a vent grate
      else { b.fillStyle = '#0f1432'; b.fillRect(x + 2, y + 1, 6, 8); b.fillStyle = t < 0.5 ? '#2d3576' : '#4a3a2a'; b.fillRect(x + 3, y + 2, 4, 6); b.fillStyle = '#0f1432'; b.fillRect(x + 5, y + 2, 1, 6); b.fillRect(x + 3, y + 5, 4, 1); } // a boarded window
    }
    if (kind === 'neon') lamps.signs = placeSigns(b, cols, rows, at, seed);   // the signs ride along with the lamps so callers can animate them
    return lamps;
  }
  // Spikes: two teeth per tile with a dark outline, a pale body, a shadowed side and a white tip, so they read against
  // snow caps and bright walls as well as dark sky. dir: 0 up, 1 right (from the left edge), 2 down, 3 left.
  var SPIKE_UP = ['..........', '..........', '..........', '..........', '..w....w..', '.owo..owo.', '.oco..oco.', 'osccooscco', 'osccooscco', 'oooooooooo'];
  var SPIKE_COL = { o: '#0d0f18', w: '#ffffff', c: '#cfd8ee', s: '#8f9bb8' };
  function drawSpike(b, tx, ty, dir) {
    for (var y = 0; y < 10; y++) for (var x = 0; x < 10; x++) {
      var ch = dir === 0 ? SPIKE_UP[y][x] : dir === 2 ? SPIKE_UP[9 - y][x] : dir === 1 ? SPIKE_UP[9 - x][y] : SPIKE_UP[x][y];
      if (ch !== '.') { b.fillStyle = SPIKE_COL[ch]; b.fillRect(tx + x, ty + y, 1, 1); }
    }
  }
  // Locked door: a stone block with a lock plate; up and down say whether the door continues (so the plate sits once, in the middle).
  function drawDoor(b, x, y, up, dn) {
    b.fillStyle = '#2a2016'; b.fillRect(x, y, 10, 10);
    b.fillStyle = '#6b5236'; b.fillRect(x + 1, y + (up ? 0 : 1), 8, 10 - (up ? 0 : 1) - (dn ? 0 : 1));
    b.fillStyle = '#8c6e48'; b.fillRect(x + 1, y + (up ? 0 : 1), 1, 10 - (up ? 0 : 1) - (dn ? 0 : 1));
    b.fillStyle = '#4a3624'; for (var i = (up ? 0 : 3); i < 10; i += 3) b.fillRect(x + 2, y + i, 7, 1);
    if (!up || !dn) { b.fillStyle = '#d9a24a'; b.fillRect(x + 4, y + (up ? 2 : 4), 3, 3); b.fillStyle = '#2a2016'; b.fillRect(x + 5, y + (up ? 3 : 5), 1, 1); }   // the lock plate
  }
  // Key: gold, bow at the top, two teeth.
  function drawKey(b, x, y) {
    b.fillStyle = '#2a2016'; b.fillRect(x + 2, y + 1, 5, 4); b.fillRect(x + 3, y + 5, 3, 4);
    b.fillStyle = '#ffd27a'; b.fillRect(x + 3, y + 2, 3, 2); b.fillRect(x + 4, y + 4, 1, 4); b.fillRect(x + 5, y + 6, 1, 1); b.fillRect(x + 5, y + 8, 1, 1);
    b.fillStyle = '#d9a24a'; b.fillRect(x + 4, y + 3, 1, 1);
  }
  // Fire jet: a floor vent (static) that fires a three tile column of flame on a cycle (drawn per frame while it burns).
  function drawVent(b, x, y) {
    b.fillStyle = '#2b0f0c'; b.fillRect(x + 1, y + 6, 8, 4);
    b.fillStyle = '#5a2a1e'; b.fillRect(x + 2, y + 7, 6, 2);
    b.fillStyle = '#2b0f0c'; b.fillRect(x + 3, y + 7, 1, 2); b.fillRect(x + 5, y + 7, 1, 2); b.fillRect(x + 7, y + 7, 1, 2);
  }
  function drawJetWarn(b, x, y, f) {                     // a sputter at the grate just before it fires
    b.fillStyle = '#ff9a3c'; b.fillRect(x + (f ? 3 : 5), y + 4, 2, 2); b.fillRect(x + (f ? 6 : 2), y + 5, 1, 1);
  }
  function drawJet(b, x, y, f) {
    var top = y - 20;
    b.fillStyle = '#e2491f'; b.fillRect(x + 2, top + 2, 6, 27); b.fillRect(x + 1, top + 8, 8, 16);
    b.fillStyle = '#ff9a3c'; b.fillRect(x + 3, top + 4, 4, 24); if (f) { b.fillRect(x + 2, top + 12, 1, 4); b.fillRect(x + 7, top + 18, 1, 4); } else { b.fillRect(x + 7, top + 10, 1, 4); b.fillRect(x + 2, top + 20, 1, 3); }
    b.fillStyle = '#ffe08a'; b.fillRect(x + 4, top + (f ? 8 : 12), 2, 18);
    b.fillStyle = '#e2491f'; b.fillRect(x + (f ? 3 : 5), top, 2, 2); b.fillRect(x + (f ? 6 : 2), top + 1, 1, 1);   // licks at the tip
  }
  // Laser emitter (Temple): a squat black box with a pink lens; the beam is a one pixel magenta line three tiles tall.
  function drawEmitter(b, x, y) {
    b.fillStyle = '#1a1408'; b.fillRect(x + 2, y + 5, 6, 5);
    b.fillStyle = '#6b5a14'; b.fillRect(x + 3, y + 6, 4, 2);
    b.fillStyle = '#ff4fa3'; b.fillRect(x + 4, y + 5, 2, 1);
  }
  function drawLaserWarn(b, x, y, f) { if (f) { b.fillStyle = '#b8306f'; b.fillRect(x + 4, y - 20, 2, 25); } b.fillStyle = '#ffd6ea'; b.fillRect(x + 4, y + 4, 2, 1); }
  function drawLaser(b, x, y, f) {
    b.fillStyle = '#b8306f'; b.fillRect(x + 3, y - 20, 4, 25);
    b.fillStyle = '#ff4fa3'; b.fillRect(x + 4, y - 20, 2, 25);
    b.fillStyle = '#ffd6ea'; b.fillRect(x + (f ? 4 : 5), y - 20, 1, 25);
  }
  // Neon Row pieces: a spark that runs along a cable (plays like a fireball) and a holo sign that projects a solid
  // column while lit (plays like a laser): a base plate, a flickering outline as the warning, then a cyan beam.
  function drawSpark(b, x, y, f, dx, dy) {
    b.fillStyle = '#1c7a85'; b.fillRect(x + 2, y + 2, 6, 6);
    b.fillStyle = '#38f0ff'; b.fillRect(x + 3, y + 3, 4, 4); b.fillRect(x + 4 - dx * 4, y + 4 - dy * 4, 2, 2);
    b.fillStyle = '#ffffff'; b.fillRect(x + 4 + (f ? 1 : 0), y + 4, 2, 2); if (f) { b.fillRect(x + 1 + dx * 2, y + 2, 1, 1); b.fillRect(x + 8 - dx * 2, y + 7, 1, 1); }
  }
  function drawHoloBase(b, x, y) {
    b.fillStyle = '#1e2236'; b.fillRect(x + 1, y + 6, 8, 4);
    b.fillStyle = '#565d80'; b.fillRect(x + 2, y + 7, 6, 1);
    b.fillStyle = '#38f0ff'; b.fillRect(x + 4, y + 6, 2, 1);
  }
  function drawHoloWarn(b, x, y, f) { if (f) { b.fillStyle = '#1c7a85'; b.fillRect(x + 2, y - 20, 1, 26); b.fillRect(x + 7, y - 20, 1, 26); } b.fillStyle = '#ffffff'; b.fillRect(x + 4, y + 5, 2, 1); }
  function drawHolo(b, x, y, f) {
    b.fillStyle = '#1c7a85'; b.fillRect(x + 2, y - 20, 6, 26);
    b.fillStyle = '#38f0ff'; b.fillRect(x + 3, y - 20, 4, 26);
    b.fillStyle = '#d8fbff'; for (var k = 0; k < 26; k += 4) b.fillRect(x + 3 + ((k >> 2) + f) % 4, y - 20 + k, 1, 2);   // scan lines crawling up the column
  }
  // Patrol drone (Temple): a black saucer with a pink eye that looks the way it moves; fires a burst straight down.
  function drawDrone(b, x, y, dir, f) {
    b.fillStyle = '#1a1408'; b.fillRect(x + 1, y + 3, 8, 4); b.fillRect(x + 3, y + 1, 4, 2); b.fillRect(x + 2, y + 7, 6, 1);
    b.fillStyle = '#4a4030'; b.fillRect(x + 2, y + 4, 6, 2); b.fillRect(x + 4, y + 2, 2, 1);
    b.fillStyle = '#ff4fa3'; b.fillRect(x + (dir > 0 ? 6 : 2), y + 4, 2, 2);
    b.fillStyle = '#ffd6ea'; b.fillRect(x + (dir > 0 ? 6 : 3), y + 4, 1, 1);
    b.fillStyle = f ? '#ff4fa3' : '#b8306f'; b.fillRect(x + 4, y + 8, 2, 1);
  }
  function drawDroneBeam(b, x, y, f) {
    b.fillStyle = '#b8306f'; b.fillRect(x + 3, y + 10, 4, 30);
    b.fillStyle = '#ff4fa3'; b.fillRect(x + 4, y + 10, 2, 30);
    b.fillStyle = '#ffd6ea'; b.fillRect(x + (f ? 4 : 5), y + 10, 1, 30);
  }
  // Lava: a tile for the builder and the static layer, and the rising body the game draws over everything below the surface.
  function drawLava(b, x, y, surface) {
    b.fillStyle = '#c2401c'; b.fillRect(x, y, 10, 10);
    b.fillStyle = '#e2491f'; b.fillRect(x + 1, y + 3, 3, 2); b.fillRect(x + 6, y + 6, 3, 2);
    if (surface) { b.fillStyle = '#ffb347'; b.fillRect(x, y, 10, 2); b.fillStyle = '#ffe08a'; b.fillRect(x + 2, y, 2, 1); b.fillRect(x + 7, y + 1, 2, 1); }
  }
  function drawLavaBody(b, ly, w, h, tick) {
    b.fillStyle = '#c2401c'; b.fillRect(0, ly, w, h - ly);
    b.fillStyle = '#ffb347'; b.fillRect(0, ly, w, 2);
    b.fillStyle = '#ffe08a';
    for (var x = 0; x < w; x += 12) b.fillRect(x + ((tick >> 3) + x) % 7, ly + ((x + (tick >> 4)) % 3 === 0 ? 1 : 0), 3, 1);   // slow glints
    b.fillStyle = '#e2491f';
    for (var y = ly + 6; y < h; y += 9) for (var k = ((y * 7) % 11); k < w; k += 23) b.fillRect(k, y, 4, 2);
  }
  // Fire: a flame that sits on the ground. Two shapes that swap slowly so it flickers without flashing.
  function drawFlame(b, x, y, f) {
    b.fillStyle = '#5a1a12'; b.fillRect(x, y + 8, 10, 2);
    b.fillStyle = '#e2491f';
    if (f) { b.fillRect(x + 1, y + 4, 8, 4); b.fillRect(x + 2, y + 2, 3, 2); b.fillRect(x + 6, y + 3, 2, 1); b.fillRect(x + 3, y, 1, 2); }
    else { b.fillRect(x + 1, y + 4, 8, 4); b.fillRect(x + 5, y + 2, 3, 2); b.fillRect(x + 2, y + 3, 2, 1); b.fillRect(x + 6, y, 1, 2); }
    b.fillStyle = '#ff9a3c'; b.fillRect(x + 2, y + 5, 6, 3); b.fillRect(x + (f ? 3 : 5), y + 4, 2, 1);
    b.fillStyle = '#ffe08a'; b.fillRect(x + 3, y + 6, 4, 2);
  }
  // Fireball: a moving flame that travels along a track. dir is the way it is heading, so the tail trails behind.
  function drawFireball(b, x, y, f, dx, dy) {
    b.fillStyle = '#e2491f'; b.fillRect(x + 2, y + 1, 6, 8); b.fillRect(x + 1, y + 2, 8, 6);
    b.fillRect(x + 4 - dx * 4, y + 4 - dy * 4, 2, 2); if (f) b.fillRect(x + 4 - dx * 6 + (dy ? 2 : 0), y + 4 - dy * 6 + (dx ? 2 : 0), 1, 1);
    b.fillStyle = '#ff9a3c'; b.fillRect(x + 2, y + 2, 6, 6);
    b.fillStyle = '#ffe08a'; b.fillRect(x + 3 + (f ? 1 : 0), y + 3, 3, 3);
  }
