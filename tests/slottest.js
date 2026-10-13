// The builder's game map: open a slot, edit it, publish over it, and the game shows it in that slot only.
const { chromium } = require('playwright');
const mock = require('./mock.js');
(async () => {
  await mock.start(8792);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { window.CLIMBER_BACKEND = { url: 'http://localhost:8792', key: 'k' }; });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const status = async () => (await p.locator('#status').innerText());
  const slots = async () => p.evaluate(() => [...document.querySelectorAll('#slots button')].map(b => (b.className === 'live' ? '*' : '') + b.querySelector('b').textContent + ':' + b.querySelector('span').textContent).join(' | '));
  const gameWorld = async (w) => { const g = await ctx.newPage(); await g.goto('file:///home/claude/climber/index.html'); await g.waitForTimeout(800); const r = await g.evaluate((w) => window.__climber.view().levels[w], w); await g.close(); return r.join(', '); };
  const beat = async () => { await p.click('#play'); await p.waitForTimeout(1200); const fr = p.frames().find(f => f.url().endsWith('/climber/index.html'));
    await fr.evaluate(() => { window.__climber.manual(true); window.__climber.demoRun(3000); window.__climber.manual(false); }); await p.waitForTimeout(300); await p.click('#play'); };
  await p.goto('file:///home/claude/climber/builder/index.html'); await p.waitForTimeout(500);
  mock.db.admins.push('u1'); await p.fill('#p-email', 'dan@example.com'); await p.fill('#p-pass', 'pw'); await p.click('#p-in'); await p.waitForTimeout(500);
  console.log('1 map at start:', await slots());
  await p.locator('#slots button').nth(0).click(); await p.waitForTimeout(200);
  console.log('2 open 1-1 ->', await status(), '| name', await p.inputValue('#name'), '| publish button:', await p.locator('#p-publish').innerText());
  await p.fill('#name', 'Dans First'); await p.dispatchEvent('#name', 'input');
  await p.locator('#slots button').nth(1).click(); await p.waitForTimeout(150);
  console.log('3 leaving with changes ->', await status());
  await beat(); await p.click('#p-publish'); await p.waitForTimeout(800);
  console.log('4 publish ->', await status());
  console.log('5 map now:', await slots());
  console.log('6 game world 1:', await gameWorld(0));
  // edit the same slot again: it must save over the same room, not make a second one
  await p.locator('#slots button').nth(2).click(); await p.waitForTimeout(150); await p.locator('#slots button').nth(0).click(); await p.waitForTimeout(300);
  console.log('7 reopen 1-1 ->', await status());
  await p.fill('#name', 'Dans First v2'); await p.dispatchEvent('#name', 'input'); await beat(); await p.click('#p-publish'); await p.waitForTimeout(800);
  console.log('8 publish again ->', await status(), '| db rooms', mock.db.rooms.length, 'versions', mock.db.versions.length);
  console.log('9 game world 1:', await gameWorld(0), '| game world 2 untouched:', (await gameWorld(1)).split(', ').length, 'levels');
  await p.screenshot({ path: __dirname + '/slots.png' });
  console.log('errors', JSON.stringify(errs));
  await b.close(); process.exit(0);
})();
