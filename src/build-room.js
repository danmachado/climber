// Builds the sample room as level-format v1 JSON.
var COLS = 27, ROWS = 48;
var g = [];
for (var r = 0; r < ROWS; r++) { g.push(new Array(COLS + 1).join('.').split('')); }
function fill(c0, c1, r0, r1, ch) { for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) g[r][c] = ch; }
// shell
fill(0, 26, 0, 0, '#'); fill(0, 0, 0, 47, '#'); fill(26, 26, 0, 47, '#'); fill(0, 26, 46, 47, '#');
// A: ground floor
fill(7, 9, 44, 45, '#');           // step
fill(14, 17, 45, 45, '^');          // floor spikes
fill(20, 25, 41, 45, '#');          // block to climb
g[45][3] = 'S';
// B: long shelf
fill(1, 15, 39, 39, '#');
// C: shaft between the left wall and this block
fill(5, 8, 28, 36, '#');
// D: spike gap with a dash refill
fill(9, 18, 32, 32, '#'); fill(9, 18, 31, 31, '^');
g[25][13] = 'o';
fill(19, 25, 28, 28, '#');
// E: stepping stone and ledge
fill(23, 25, 26, 26, '#');
fill(11, 17, 21, 21, '#');
// F: chimney to the exit
fill(9, 10, 6, 17, '#'); fill(16, 17, 6, 17, '#');
fill(11, 11, 10, 12, '>');
fill(16, 25, 6, 6, '#');
fill(21, 23, 4, 5, 'E');
var room = {
  format: 1,
  id: 'starter-01',
  name: 'First Light',
  difficulty: 1,
  grid: { cols: COLS, rows: ROWS, tile: 10 },
  legend: { '.': 'empty', '#': 'solid', '^': 'spike_up', 'v': 'spike_down', '<': 'spike_left', '>': 'spike_right',
            'S': 'start', 'E': 'exit', 'o': 'dash_refill' },
  tiles: g.map(function (row) { return row.join(''); }),
  entities: []
};
require('fs').writeFileSync(__dirname + '/starter-01.json', JSON.stringify(room, null, 1));
console.log(room.tiles.map(function (t, i) { return (i < 10 ? ' ' : '') + i + ' ' + t; }).join('\n'));
