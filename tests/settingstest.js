// Settings: a category list (CONTROLS, GRAPHICS, BACK), each opening its own page; back steps up one level at a time.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 540, height: 960 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('**/rest/v1/**', r => r.abort());
  await p.goto('file:///home/claude/climber/index.html'); await p.waitForTimeout(700);
  const nav = o => p.evaluate(o => window.__climber.nav(o), o);
  const shot = async n => { await p.waitForTimeout(120); await p.screenshot({ path: __dirname + '/set-' + n + '.png' }); };
  let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  let v = await nav({}); ok(v.scene === 'menu', 'starts on the menu');
  await nav({ y: 1 }); v = await nav({ y: 1 }); v = await nav({ jump: true });
  ok(v.scene === 'settings' && v.set.page === 'top' && v.set.row === 0, 'SETTINGS opens the category list');
  await shot('1-list');
  v = await nav({ jump: true }); ok(v.set.page === 'controls', 'CONTROLS opens the controls page');
  await shot('2-controls');
  v = await nav({ dash: true }); ok(v.set.page === 'top' && v.set.row === 0, 'back from controls returns to the list on CONTROLS');
  v = await nav({ y: 1 }); v = await nav({ jump: true }); ok(v.set.page === 'graphics', 'GRAPHICS opens the graphics page');
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem('climber.shake.v1')));
  v = await nav({ y: 1 }); v = await nav({ jump: true });
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem('climber.shake.v1')));
  ok(v.set.note.indexOf('SCREEN SHAKE') === 0 && before !== after, 'SHAKE toggles and saves (' + before + ' -> ' + after + ')');
  await shot('3-graphics');
  v = await nav({ jump: true }); ok(v.set.note === 'SCREEN SHAKE ON' || before === after, 'SHAKE toggles back');
  v = await nav({ y: -1 }); v = await nav({ y: -1 }); ok(v.set.row === 4, 'up from the top row wraps to BACK');
  v = await nav({ jump: true }); ok(v.set.page === 'top' && v.set.row === 1, 'BACK row returns to the list on GRAPHICS');
  v = await nav({ back: true }); ok(v.scene === 'menu', 'back from the list returns to the menu');
  // the mouse: click CONTROLS on the list
  v = await nav({ jump: true }); ok(v.scene === 'settings' && v.set.page === 'top', 'menu remembers SETTINGS');
  await p.waitForTimeout(150);
  const bx = await p.evaluate(() => { const c = document.getElementById('stage').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; });
  for (let k = 0; k < 2; k++) { await p.mouse.click(bx.x + 135 / 270 * bx.w, bx.y + 165 / 480 * bx.h); await p.waitForTimeout(150); }   // the first click asks for fullscreen
  v = await p.evaluate(() => window.__climber.view()); ok(v.set.page === 'controls', 'mouse click on CONTROLS opens it (page ' + v.set.page + ')');
  console.log('errors', JSON.stringify(errs));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await b.close();
})();
