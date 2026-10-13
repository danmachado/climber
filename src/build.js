var fs = require('fs'), d = __dirname;
var tilesJs = fs.readFileSync(d + '/shared-tiles.js', 'utf8'), gen = fs.readFileSync(d + '/gen.js', 'utf8'), cfg = fs.readFileSync(d + '/shared-config.js', 'utf8'), heroJs = fs.readFileSync(d + '/shared-hero.js', 'utf8'), worldsJs = fs.readFileSync(d + '/shared-worlds.js', 'utf8');
var generateRoom = new Function(gen + '\nreturn generateRoom;')();

// Built-in starter set: the hand-made first room plus generated rooms (each one is cleared by the auto-player in tests).
var first = JSON.parse(fs.readFileSync(d + '/starter-01.json', 'utf8'));
var SET = [
  ['Low Road',    { difficulty: 1, obstacles: 0, style: 'jump',  spikes: 1, refills: true }, 4101],
  ['Brickwork',   { difficulty: 1, obstacles: 1, style: 'mixed', spikes: 1, refills: true }, 4102],
  ['Switchback',  { difficulty: 2, obstacles: 1, style: 'climb', spikes: 1, refills: true }, 4203],
  ['Long Reach',  { difficulty: 2, obstacles: 1, style: 'dash',  spikes: 1, refills: true }, 4204],
  ['Needle Row',  { difficulty: 3, obstacles: 2, style: 'jump',  spikes: 2, refills: true }, 4305],
  ['Updraft',     { difficulty: 3, obstacles: 1, style: 'climb', spikes: 1, refills: true }, 4306],
  ['High Wire',   { difficulty: 4, obstacles: 2, style: 'mixed', spikes: 2, refills: true }, 4407]
];
// World 2 placeholders: ice-heavy rooms from the auto-builder, until hand-made levels are published.
var ALL = { spikes: true, ice: true, refills: true };
var SET2 = [
  ['Cold Snap',   { difficulty: 1, obstacles: 0, styles: ['jump'],  spikes: 1, elements: ALL }, 5101],
  ['Glaze',       { difficulty: 1, obstacles: 1, styles: [],        spikes: 1, elements: ALL }, 5102],
  ['Slipstream',  { difficulty: 2, obstacles: 1, styles: ['dash'],  spikes: 1, elements: ALL }, 5203],
  ['Rime',        { difficulty: 2, obstacles: 1, styles: ['climb'], spikes: 1, elements: ALL }, 5204],
  ['Black Ice',   { difficulty: 3, obstacles: 1, styles: [],        spikes: 1, elements: { spikes: true, ice: true, refills: true, crumble: true } }, 5305],
  ['Hard Frost',  { difficulty: 3, obstacles: 2, styles: ['jump'],  spikes: 2, elements: ALL }, 5306],
  ['Whiteout',    { difficulty: 4, obstacles: 1, styles: [],        spikes: 1, elements: { spikes: true, ice: true, refills: true, movers: true } }, 5407],
  ['Deep Freeze', { difficulty: 4, obstacles: 2, styles: [],        spikes: 2, elements: { spikes: true, ice: true, refills: true, crumble: true, movers: true } }, 5408]
];
// World 3 placeholders: flames and fireballs.
var HOT = { spikes: true, firepits: true, fireballs: true, refills: true };
var SET3 = [
  ['Pilot Light', { difficulty: 1, obstacles: 0, styles: ['jump'],  spikes: 1, elements: { firepits: true, refills: true } }, 6101],
  ['Cinders',     { difficulty: 1, obstacles: 1, styles: [],        spikes: 1, elements: { firepits: true, fireballs: true, refills: true } }, 6102],
  ['Flashpoint',  { difficulty: 2, obstacles: 1, styles: ['dash'],  spikes: 1, elements: HOT }, 6203],
  ['Bellows',     { difficulty: 2, obstacles: 1, styles: ['climb'], spikes: 1, elements: HOT }, 6204],
  ['Slag Run',    { difficulty: 3, obstacles: 1, styles: [],        spikes: 1, elements: { spikes: true, firepits: true, fireballs: true, refills: true, movers: true } }, 6305],
  ['Backdraft',   { difficulty: 3, obstacles: 2, styles: ['jump'],  spikes: 2, elements: HOT }, 6306],
  ['Crucible',    { difficulty: 4, obstacles: 1, styles: [],        spikes: 1, elements: { spikes: true, firepits: true, fireballs: true, refills: true, crumble: true } }, 6407],
  ['Meltdown',    { difficulty: 4, obstacles: 2, styles: [],        spikes: 2, elements: { spikes: true, firepits: true, fireballs: true, refills: true, crumble: true, movers: true } }, 6408]
];
first.world = 1; first.level = 1;
var starters = [first], plans = [null];
SET.forEach(function (s, i) {
  var out = generateRoom(s[1], s[2]);
  out.room.id = 'starter-0' + (i + 2); out.room.name = s[0]; out.room.world = 1; out.room.level = i + 2;
  starters.push(out.room); plans.push(out.plan);
});
SET2.forEach(function (s, i) {
  s[1].world = 2;
  var out = generateRoom(s[1], s[2]);
  out.room.id = 'ice-0' + (i + 1); out.room.name = s[0]; out.room.level = i + 1;
  starters.push(out.room); plans.push(out.plan);
});
// Par times: the auto-player's time on each level (written by `tests/gentest.js 0`) plus a margin, so a clean,
// unhurried run earns the time star. The hand-made first room uses the demo's time instead.
var PAR_MARGIN = 1.4, times = {};
try { times = JSON.parse(fs.readFileSync(d + '/starter-times.json', 'utf8')); } catch (e) {}
first.par = 29;
starters.forEach(function (r) { if (times[r.id]) r.par = Math.ceil(times[r.id] * PAR_MARGIN); });
SET3.forEach(function (s, i) {
  s[1].world = 3;
  var out = generateRoom(s[1], s[2]);
  out.room.id = 'fire-0' + (i + 1); out.room.name = s[0]; out.room.level = i + 1;
  starters.push(out.room); plans.push(out.plan);
});
starters.forEach(function (r) { if (times[r.id]) r.par = Math.ceil(times[r.id] * PAR_MARGIN); });
fs.writeFileSync(d + '/starter-plans.json', JSON.stringify({ rooms: starters, plans: plans }));

var one = JSON.stringify(first), all = JSON.stringify(starters);
var demos = '{}';
try { demos = fs.readFileSync(d + '/starter-demos.json', 'utf8'); } catch (e) {}
function fill(t, rooms) {
  return t.split('/*ALL_ROOMS*/').join(all.slice(1, -1)).split('/*DEMOS*/').join(demos).split('/*ROOM_JSON*/').join(rooms).split('/*SHARED_TILES*/').join(tilesJs).split('/*GEN*/').join(gen).split('/*SHARED_CONFIG*/').join(cfg).split('/*SHARED_HERO*/').join(heroJs).split('/*SHARED_WORLDS*/').join(worldsJs);
}
fs.writeFileSync(d + '/../index.html', fill(fs.readFileSync(d + '/template.html', 'utf8'), all.slice(1, -1)));
fs.mkdirSync(d + '/../builder', { recursive: true });
fs.writeFileSync(d + '/../builder/index.html', fill(fs.readFileSync(d + '/builder-template.html', 'utf8'), one));
