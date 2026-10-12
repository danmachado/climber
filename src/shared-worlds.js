  // ---- worlds: each world is a theme and an ordered list of levels (shared by the game and the builder) ----
  // A room says which world and level it is with two plain fields in its data: world (1, 2, ...) and level (1, 2, ...).
  // Rooms without them belong to world 1 and go after the numbered levels.
  var WORLDS = [
    { id: 1, name: 'Brickyard', theme: 'brick', tiles: [], elements: [] },
    { id: 2, name: 'Icehouse',  theme: 'frost', tiles: ['I'], elements: ['ice'] },
    { id: 3, name: 'Furnace',   theme: 'ember', tiles: ['F', '*'], elements: ['firepits', 'fireballs'] }
  ];
  // Pieces that belong to one world only. tiles are level characters, elements are the auto-builder's piece names.
  // Everything not listed by any world is common and can be used anywhere. A new world lists its own pieces here.
  function tileWorld(ch) { for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].tiles.indexOf(ch) >= 0) return WORLDS[i].id; return 0; }
  function elementWorld(name) { for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].elements.indexOf(name) >= 0) return WORLDS[i].id; return 0; }
  var THEMES = {
    brick: { tiles: 'brick', bg: '#0a0d1c', dot: '#1b2145', back: ['#171e47', '#0f1432', '#262f68'], accent: '#ffb74a', accentLo: '#c47f24' },
    ember: { tiles: 'ember', bg: '#120909', dot: '#3a1714', back: ['#2b1513', '#1b0c0b', '#4a2119'], accent: '#ff8a4a', accentLo: '#c25a24' },
    frost: { tiles: 'frost', bg: '#07121d', dot: '#16324a', back: ['#12283c', '#0b1a29', '#1f4460'], accent: '#9fe3ff', accentLo: '#5aa3c4' }
  };
  function worldOf(room) { var n = (room && room.world) | 0; return WORLDS[n - 1] ? n : 1; }
  function themeOf(room) { return THEMES[WORLDS[worldOf(room) - 1].theme] || THEMES.brick; }
  // Stars: one for beating the level, one for few falls, one for beating the par time.
  var STAR_FALLS = 2;
  function parOf(room) { return room.par > 0 ? room.par : 20 + 6 * (room.difficulty || 1); }
