const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 540, height: 960 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///home/claude/climber/index.html');
  await p.addScriptTag({ content: fs.readFileSync('/home/claude/climber/src/gen.js', 'utf8') + '\nwindow.generateRoom = generateRoom;' });
  const N = +(process.argv[2] || 20);
  const SP = JSON.parse(fs.readFileSync('/home/claude/climber/src/starter-plans.json', 'utf8'));
  const out = await p.evaluate(([N, SP]) => {
    const G = window.__climber; G.manual(true);
    const col = (t, d) => d > 0 ? 1 + t : 25 - t;
    function solve(out) {
      G.load(out.room);
      let s = G.state(), frames = 0, where = 'spawn';
      const I = (o) => Object.assign({ x: 0, y: 0, jump: false, dash: false, grab: false }, o);
      const step = (o) => { s = G.step(I(o), 1); window.__last = s; frames++; if (s.won) throw { won: true }; if (s.dead) throw new Error('died at ' + where); return s; };
      const until = (fn, cond, max) => { let k = 0; while (!cond()) { step(fn(k)); if (++k > (max || 600)) throw new Error('stuck at ' + where); } };
      for (let i = 0; i < 40; i++) step({});
      for (let fi = 0; fi < out.plan.length; fi++) {
        const F = out.plan[fi], d = F.d, y = F.y;
        const lead = () => d > 0 ? s.x + 8 : s.x, trail = () => d > 0 ? s.x : s.x + 8;
        const startEdge = (t) => d > 0 ? col(t, d) * 10 : (col(t, d) + 1) * 10;
        const endEdge = (t) => d > 0 ? (col(t, d) + 1) * 10 : col(t, d) * 10;
        const dist = (t) => d > 0 ? startEdge(t) - lead() : lead() - startEdge(t);
        const past = (t, m) => d > 0 ? trail() >= endEdge(t) + m : trail() <= endEdge(t) - m;
        const mover = (rowY) => s.movers.filter(m => m.y === rowY)[0];
        for (let o of F.obs) {
          if (o.type === 'icespikes') o = { type: 'spikes', t0: o.t0 + o.L, w: o.sw };            // slide along the ice, then it is an ordinary spike jump
          else if (o.type === 'iceblock') o = { type: 'block', t0: o.t0 + o.L, w: 2, h: 2 };
          where = 'floor ' + fi + ' ' + o.type + ' t' + o.t0 + ' w' + o.w;
          const last = o.t0 + o.w - 1;
          if (o.type === 'bridge') {            // never stop on a crumbling bridge
            where = 'floor ' + fi + ' bridge w' + o.w;
            until(() => ({ x: d }), () => past(o.t0 + o.w - 1, 2), 400);
            continue;
          }
          if (o.type === 'ferry') {
            where = 'floor ' + fi + ' ferry w' + o.w;
            const rowY = (y - 2) * 10, cA = col(o.t0, d), cB = col(o.t0 + o.pl - 1, d), cE = col(o.t0 + o.w - 1, d), cE2 = col(o.t0 + o.w - o.pl, d);
            const startX = Math.min(cA, cB) * 10, endX = Math.min(cE, cE2) * 10;
            until(() => ({ x: d }), () => dist(o.t0) <= 9);
            for (let k = 0; k < 8; k++) step({});
            until(() => ({}), () => { const m = mover(rowY); return m && m.x === startX && m.wait > 0.15; }, 900);
            // straight up first (spikes or a pit start right at the edge), then drift onto the platform
            until((k) => ({ x: s.y + 10 <= rowY ? ((d > 0 ? s.x >= startEdge(o.t0) + 8 : s.x + 8 <= startEdge(o.t0) - 8) ? 0 : d) : 0, jump: k < 1 || s.vy < 0 }), () => s.ground && s.y + 10 === rowY, 200);
            until(() => ({}), () => { const m = mover(rowY); return m && m.x === endX; }, 900);
            until(() => ({ x: past(o.t0 + o.w - 1, 2) ? 0 : d }), () => past(o.t0 + o.w - 1, 2) && s.ground && s.y + 10 === y * 10, 300);
            step({});
            continue;
          }
          if (o.type === 'wallspikes') {
            const wallEnd = o.t0 + 1;
            until(() => ({ x: d }), () => dist(o.t0) <= 0);
            until(() => ({ x: d, y: -1, grab: true }), () => s.ground && s.y + 10 <= (y - o.h) * 10, 400);
            until(() => ({ x: d }), () => d > 0 ? s.x + 8 >= endEdge(wallEnd) - 1 : s.x <= endEdge(wallEnd) + 1, 200);
            step({ x: d, jump: true });
            let k = 0;
            while (true) { const gone = past(last, 2); step({ x: gone ? 0 : d, jump: s.vy < 0 }); if (s.ground && gone && s.y + 10 === y * 10) break; if (++k > 300) throw new Error('stuck at ' + where); }
            step({});
          } else if (o.type === 'wall') {
            until(() => ({ x: d }), () => dist(o.t0) <= 0);
            until(() => ({ x: d, y: -1, grab: true }), () => s.ground && s.y + 10 <= (y - o.h) * 10, 400);
            until(() => ({ x: past(last, 0) ? 0 : d }), () => past(last, 0) && s.ground && s.y + 10 === y * 10, 300);
          } else {
            until(() => ({}), () => s.ground, 200);
            if (o.type === 'crown' && dist(o.t0) < 26) { until(() => ({ x: -d }), () => dist(o.t0) >= 30, 200); step({}); step({}); step({}); }
            until(() => ({ x: d }), () => dist(o.t0) <= (o.type === 'crown' ? 24 : 6));
            let dashed = false, k = 0;
            step({ x: d, jump: true });
            while (true) {
              const gone = o.type === 'wide' && dashed ? past(last, -6) : past(last, 2);
              const wantDash = o.type === 'wide' && !dashed && s.vy >= -10 && !s.ground;
              if (wantDash) dashed = true;
              step({ x: gone ? 0 : d, jump: s.vy < 0, dash: wantDash });
              if (s.ground && k > 3 && (gone || o.type === 'block')) break;
              if (++k > 300) throw new Error('stuck at ' + where);
            }
            step({});
            if (o.type === 'block') until(() => ({ x: past(last, 0) ? 0 : d }), () => past(last, 0) && s.ground && s.y + 10 === y * 10, 300);
          }
        }
        if (!F.conn) { where = 'floor ' + fi + ' exit'; until(() => ({ x: d }), () => false, 600); }
        const C = F.conn, yN = y - C.Hf;
        where = 'floor ' + fi + ' ' + C.type + ' W' + C.W + ' Hf' + C.Hf;
        const atWall = () => d > 0 ? s.x >= 252 : s.x <= 10;
        const nearWall = () => d > 0 ? s.x >= 246 : s.x <= 16;
        if (C.type === 'lift') {
          const bottom = (y - 1) * 10;
          until(() => ({ x: d }), () => dist(22) <= 26);
          for (let k = 0; k < 8; k++) step({});
          until(() => ({}), () => { const m = mover(bottom); return m && m.wait > 0.2; }, 1200);
          until((k) => ({ x: d, jump: (dist(22) <= 1 && s.ground && k % 2 === 0) || s.vy < 0 }), () => s.ground && (d > 0 ? s.x >= startEdge(22) + 2 : s.x + 8 <= startEdge(22) - 2) && s.y + 10 <= bottom, 300);
          until(() => ({}), () => s.y + 10 === yN * 10, 900);
          until(() => ({ x: -d }), () => s.ground && s.y + 10 === yN * 10 && (d > 0 ? s.x + 8 <= endEdge(21) : s.x >= endEdge(21)), 300);
          step({});
        } else if (C.type === 'open') {
          until(() => ({ x: d }), atWall);
          until(() => ({ x: d, y: -1, grab: true }), () => s.y + 10 <= yN * 10 - 8, 400);
          const edge = endEdge(24 - C.W);
          until((k) => ({ x: (d > 0 ? s.x + 8 <= edge - 3 : s.x >= edge + 3) ? 0 : -d, jump: k < 12 }), () => s.ground && s.y + 10 === yN * 10, 300);
        } else if (C.type === 'curtain') {
          until(() => ({ x: d }), nearWall);
          step({});
          until((k) => ({ x: -d, y: -1, grab: true, jump: k < 2 || (s.vy < 0 && s.state === 'normal' && k < 30) }), () => s.ground && s.y + 10 === yN * 10, 500);
        } else {
          until(() => ({ x: d }), () => dist(22) <= 0);
          step({});
          const hop = (dir, feet, near) => {
            until((k) => ({ x: (dir > 0 ? s.x >= near + 3 : s.x + 8 <= near - 3) ? 0 : dir, jump: k < 1 || s.vy < 0 }), () => s.ground && s.y + 10 === feet, 200);
            step({}); step({});
          };
          hop(d, (y - 2) * 10, startEdge(22)); hop(-d, (y - 4) * 10, endEdge(20)); hop(-d, yN * 10, endEdge(17));
        }
      }
      return { ok: false, why: 'ran out of plan' };
    }
    const res = { total: 0, fail: [] };
    if (N === 0) { for (let i = 1; i < SP.rooms.length; i++) { res.total++; try { const r = solve({ room: SP.rooms[i], plan: SP.plans[i] }); if (!r.ok) res.fail.push([SP.rooms[i].name, r.why]); } catch (e) { if (!e.won) res.fail.push([SP.rooms[i].name, e.message]); } } return res; }
    const styles = ['mixed', 'jump', 'dash', 'climb'];
    for (let seed = 1; seed <= N; seed++) for (let D = 1; D <= (N === 1 ? 1 : 5); D++) for (const style of styles) for (let ob = 0; ob < 3; ob++) for (let sp = 0; sp < 3; sp++) {
      const el = seed % 4;   // rotate which new pieces are switched on
      const opts = { difficulty: D, obstacles: ob, styles: style === 'mixed' ? [] : (seed % 3 === 0 ? [style, 'jump'] : [style]), spikes: Math.max(1, sp),
                     elements: { spikes: sp > 0, refills: seed % 2 === 0, ice: el === 1 || el === 3, crumble: el === 2 || el === 3, movers: el === 0 || el === 3 } };
      const out = window.generateRoom(opts, seed * 7919 + D * 31 + ob * 7 + sp);
      res.total++;
      try { const r = solve(out); if (!r.ok) res.fail.push([JSON.stringify(opts), r.why]); }
      catch (e) { if (e.won) continue; res.fail.push([JSON.stringify(window.__last) + JSON.stringify(opts) + ' seed ' + (seed * 7919 + D * 31 + ob * 7 + sp), e.message]); }
    }
    return res;
  }, [N, SP]);
  const kinds = {};
  out.fail.forEach(f => { const k = f[1].replace(/floor \d+ /, '').replace(/ t\d+/, ''); kinds[k] = (kinds[k] || 0) + 1; });
  console.log('rooms', out.total, 'failed', out.fail.length, JSON.stringify(kinds, null, 0).slice(0, 1500));
  console.log(out.fail.slice(0, 4).map(f => f.join(' => ')).join('\n'), 'errors', JSON.stringify(errs).slice(0, 300));
  await b.close();
})();
