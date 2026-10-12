  // ---- shared tile art (used by the game and the builder so both always match) ----
  // Built the way Celeste-style tilesets are: one flat dark fill inside every wall, a one-pixel highlight on the
  // exposed edge (light on top, dark underneath, as if lit from above), a few random variants of each edge tile
  // so repeats do not show, and a ring of sparse "infill" detail just inside the edge. Each terrain type is its
  // own tileset with the same layout, so new looks can be swapped in without touching the rules.
  var TILESETS = {
    brick: { face: '#4a5ad0', hi: '#aab6ff', side: '#6d7be6', lo: '#2a348c', line: '#161c4a', core: '#10142c', infill: '#1b2254' },
    ice:   { face: '#86cdee', hi: '#f2fdff', side: '#b9e8fa', lo: '#3f86bd', line: '#5eb0dd', core: '#102c44', infill: '#1b4866' }
  };
  var SOLID_KIND = { '#': 'brick', 'I': 'ice' };
  function tileHash(c, r) { var h = (c * 374761393 + r * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // solidAt(c, r) says whether a neighbouring cell is part of a wall (anything off the map counts as wall)
  function drawSolid(b, x, y, kind, solidAt, c, r) {
    var S = TILESETS[kind] || TILESETS.brick, v = tileHash(c, r);
    var up = !solidAt(c, r - 1), dn = !solidAt(c, r + 1), lf = !solidAt(c - 1, r), rt = !solidAt(c + 1, r);
    var edge = up || dn || lf || rt || !solidAt(c - 1, r - 1) || !solidAt(c + 1, r - 1) || !solidAt(c - 1, r + 1) || !solidAt(c + 1, r + 1);
    if (!edge) {
      b.fillStyle = S.core; b.fillRect(x, y, 10, 10);
      var near = false;
      for (var dy = -2; dy <= 2 && !near; dy++) for (var dx = -2; dx <= 2; dx++) if (!solidAt(c + dx, r + dy)) { near = true; break; }
      if (near && v > 0.15) { // infill ring: a fragment or two of the edge pattern, in a colour close to the fill
        b.fillStyle = S.infill;
        var k = Math.floor(v * 4);
        if (k === 0) { b.fillRect(x + 1, y + 1, 5, 3); b.fillRect(x + 6, y + 6, 3, 3); }
        else if (k === 1) { b.fillRect(x + 4, y + 1, 5, 3); }
        else if (k === 2) { b.fillRect(x + 1, y + 5, 4, 4); b.fillRect(x + 7, y + 2, 2, 2); }
        else { b.fillRect(x + 2, y + 2, 6, 3); b.fillRect(x + 1, y + 7, 3, 2); }
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
      b.fillStyle = S.line; b.fillRect(x, y, 10, 10);       // mortar, then two courses of brick with the joints shifted per variant
      b.fillStyle = S.face;
      var j1 = v < 0.34 ? 9 : (v < 0.67 ? 6 : 3), j2 = v < 0.34 ? 4 : (v < 0.67 ? 2 : 7);
      b.fillRect(x, y, j1, 4); if (j1 < 9) b.fillRect(x + j1 + 1, y, 9 - j1, 4);
      b.fillRect(x, y + 5, j2, 4); b.fillRect(x + j2 + 1, y + 5, 9 - j2, 4);
    }
    // one-pixel edge light: bright on top, dimmer on the sides, dark underneath
    if (lf) { b.fillStyle = S.side; b.fillRect(x, y, 1, 10); }
    if (rt) { b.fillStyle = S.side; b.fillRect(x + 9, y, 1, 10); }
    if (dn) { b.fillStyle = S.lo; b.fillRect(x, y + 9, 10, 1); }
    if (up) { b.fillStyle = S.hi; b.fillRect(x, y, 10, 1); }
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
  function drawPlank(b, x, y, left, right) {
    b.fillStyle = '#3a4258'; b.fillRect(x, y, 10, 10);
    b.fillStyle = '#9aa5bb'; b.fillRect(x + (left ? 0 : 1), y + 1, 10 - (left ? 0 : 1) - (right ? 0 : 1), 7);
    b.fillStyle = '#e6ebf5'; b.fillRect(x + (left ? 0 : 1), y + 1, 10 - (left ? 0 : 1) - (right ? 0 : 1), 1);
    b.fillStyle = '#5c667d'; b.fillRect(x + (left ? 0 : 1), y + 7, 10 - (left ? 0 : 1) - (right ? 0 : 1), 1);
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
    b.fillStyle = '#171e47'; b.fillRect(x, y, 10, 10);
    b.fillStyle = '#0f1432';
    var j1 = v < 0.34 ? 7 : (v < 0.67 ? 3 : 5), j2 = v < 0.34 ? 2 : (v < 0.67 ? 8 : 6);
    b.fillRect(x, y + 4, 10, 1); b.fillRect(x, y + 9, 10, 1);
    b.fillRect(x + j1, y, 1, 4); b.fillRect(x + j2, y + 5, 1, 4);
    b.fillStyle = '#262f68';
    if (!sameAt(c, r - 1)) b.fillRect(x, y, 10, 1);
    if (!sameAt(c - 1, r)) b.fillRect(x, y, 1, 10);
    if (!sameAt(c + 1, r)) b.fillRect(x + 9, y, 1, 10);
  }
