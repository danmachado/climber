var fs = require('fs'), d = __dirname;
var tilesJs = fs.readFileSync(d + '/shared-tiles.js', 'utf8'), gen = fs.readFileSync(d + '/gen.js', 'utf8'), cfg = fs.readFileSync(d + '/shared-config.js', 'utf8'), heroJs = fs.readFileSync(d + '/shared-hero.js', 'utf8');
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
var starters = [first], plans = [null];
SET.forEach(function (s, i) {
  var out = generateRoom(s[1], s[2]);
  out.room.id = 'starter-0' + (i + 2); out.room.name = s[0];
  starters.push(out.room); plans.push(out.plan);
});
fs.writeFileSync(d + '/starter-plans.json', JSON.stringify({ rooms: starters, plans: plans }));

var one = JSON.stringify(first), all = JSON.stringify(starters);
function fill(t, rooms) {
  return t.split('/*ROOM_JSON*/').join(rooms).split('/*SHARED_TILES*/').join(tilesJs).split('/*GEN*/').join(gen).split('/*SHARED_CONFIG*/').join(cfg).split('/*SHARED_HERO*/').join(heroJs);
}
fs.writeFileSync(d + '/../index.html', fill(fs.readFileSync(d + '/template.html', 'utf8'), all.slice(1, -1)));
fs.mkdirSync(d + '/../builder', { recursive: true });
fs.writeFileSync(d + '/../builder/index.html', fill(fs.readFileSync(d + '/builder-template.html', 'utf8'), one));
