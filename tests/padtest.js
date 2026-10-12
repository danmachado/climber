// Controller setup with awkward hardware: d-pad on one device, face buttons on a second, one button arriving as a key.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 540, height: 960 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('**/rest/v1/**', r => r.abort());
  await p.addInitScript(() => {
    const mk = (index, nb, na) => ({ index, id: 'Fake Pad ' + index, mapping: '', buttons: Array.from({ length: nb }, () => ({ pressed: false, value: 0 })), axes: Array(na).fill(0) });
    window.__pads = [mk(0, 0, 4), mk(1, 16, 0)];
    navigator.getGamepads = () => window.__pads;
  });
  await p.goto('file:///home/claude/climber/index.html'); await p.waitForTimeout(600);
  const press = async (fn, undo) => { await p.waitForTimeout(450); await p.evaluate(fn); await p.waitForTimeout(150); await p.evaluate(undo); };
  const B = (i, v) => `window.__pads[1].buttons[${i}] = { pressed: ${v}, value: ${v ? 1 : 0} }`;
  const A = (i, v) => `window.__pads[0].axes[${i}] = ${v}`;
  await p.waitForTimeout(300);
  console.log('setup started by itself:', await p.evaluate(() => !!document.querySelector('canvas')) && true);
  await press(B(1, true), B(1, false));                       // jump: button on the second device
  await p.waitForTimeout(450); await p.keyboard.down('Enter'); await p.waitForTimeout(150); await p.keyboard.up('Enter');   // dash: arrives as a key
  await press(B(5, true), B(5, false));                       // grab
  await press(A(1, -1), A(1, 0)); await press(A(1, 1), A(1, 0)); await press(A(0, -1), A(0, 0)); await press(A(0, 1), A(0, 0));
  await p.waitForTimeout(400);
  const map = await p.evaluate(() => JSON.parse(localStorage.getItem('climber.padmap.v1')));
  console.log('saved map', JSON.stringify(map));
  // use it: jump on the menu (selects MAP), then start 1-1 and jump in the level
  await p.evaluate(B(1, true)); await p.waitForTimeout(150); await p.evaluate(B(1, false)); await p.waitForTimeout(200);
  let v = await p.evaluate(() => window.__climber.view()); console.log('jump on menu ->', v.scene);
  await p.evaluate(B(1, true)); await p.waitForTimeout(150); await p.evaluate(B(1, false)); await p.waitForTimeout(900);
  v = await p.evaluate(() => window.__climber.view()); console.log('jump on map ->', v.scene, v.room);
  await p.evaluate(B(1, true)); await p.waitForTimeout(120); const st = await p.evaluate(() => window.__climber.state()); await p.evaluate(B(1, false));
  console.log('jump in level, off the ground:', !st.ground, 'errors', JSON.stringify(errs));
  await b.close();
})();
