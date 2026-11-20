// v4.0.121 诊断 2：内鬼卡在自己屋里不动 —— 逐帧看清进了哪条分支
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.allPlayers', { timeout: 20000 });
  await sleep(1200);

  // 给 _updateTraitor 套一层探针（不改行为）
  await page.evaluate(() => {
    const g = window.game;
    const orig = g._updateTraitor.bind(g);
    window.__dbg = { calls: 0, samples: [] };
    g._updateTraitor = function (dt) {
      const t = this.traitor;
      if (!t) return orig(dt);
      const gs = this.gridSize;
      const b = {
        x: Math.round(t.x), y: Math.round(t.y),
        pathLen: t.path ? t.path.length : -1,
        fleeing: !!t.fleeing,
        pathTimer: +(t.pathTimer || 0).toFixed(2),
        stuck: +(t.stuck || 0).toFixed(2),
        insideOwn: !!(t.room && this._insideRoom(Math.floor(t.x / gs), Math.floor(t.y / gs)) === t.room),
        hasRoom: !!t.room,
        pad: t.room && t.room.jumpPad ? Math.round(Math.hypot(t.x - (t.room.jumpPad.c * gs + 40), t.y - (t.room.jumpPad.r * gs + 40))) : -1,
        doorHp: (() => { const d = t.room ? this.getPlantAt(t.room.doorCol * gs, t.room.doorRow * gs) : null; return d && d.isDoor ? d.hp : -1; })()
      };
      orig(dt);
      b.afterX = Math.round(t.x); b.afterY = Math.round(t.y);
      b.moved = (b.afterX !== b.x || b.afterY !== b.y);
      window.__dbg.calls++;
      if (window.__dbg.samples.length < 4000) window.__dbg.samples.push(b);
      // 只留最近 400 帧
      if (window.__dbg.samples.length > 400) window.__dbg.samples.shift();
    };
    g.traitorRevealAt = g.gameTime + 300;
  });
  await page.waitForFunction('window.game.traitorRevealed === true', { timeout: 20000 });

  // 等它跑一阵（够它杀人＋回屋）
  await sleep(12000);
  const out = await page.evaluate(() => {
    const g = window.game, t = g.traitor, gs = g.gridSize;
    const dbg = window.__dbg;
    const s = dbg.samples;
    // 找"连续 30 帧以上位移为 0"的时段
    let frozenRuns = [], run = 0;
    for (const f of s) { if (!f.moved) run++; else { if (run >= 30) frozenRuns.push(run); run = 0; } }
    if (run >= 30) frozenRuns.push(run);
    const last = s[s.length - 1] || {};
    // 手动复算那条出门分支的每个条件
    const inside = g._insideRoom(Math.floor(t.x / gs), Math.floor(t.y / gs));
    const check = {
      hasRoom: !!t.room,
      fleeing: !!t.fleeing,
      insideOwn: !!(t.room && inside === t.room),
      doorOk: (() => { const d = t.room ? g.getPlantAt(t.room.doorCol * gs, t.room.doorRow * gs) : null; return !!(d && d.isDoor && d.hp > 0); })(),
      padOk: !!(t.room && t.room.jumpPad),
      padDist: t.room && t.room.jumpPad ? Math.round(Math.hypot(t.x - (t.room.jumpPad.c * gs + 40), t.y - (t.room.jumpPad.r * gs + 40))) : -1
    };
    // 到跳板的路径能不能找到
    let padPath = null;
    if (t.room && t.room.jumpPad) {
      const px = t.room.jumpPad.c * gs + 40, py = t.room.jumpPad.r * gs + 40;
      const p = g._findPath(t.x, t.y, px, py);
      padPath = p ? p.length : null;
    }
    // 到"最近目标"的路径
    let best = null, bd = Infinity;
    for (const p of g.allPlayers) { if (p.dead || p === t || p.traitor) continue; const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < bd) { bd = d; best = p; } }
    const tgtPath = best ? (g._findPath(t.x, t.y, best.x, best.y, false) || []).length : null;
    return {
      calls: dbg.calls, kept: s.length,
      traitor: { x: Math.round(t.x), y: Math.round(t.y), hp: t.hp, isTraitor: !!t.isTraitor, dead: !!t.dead },
      last, frozenRuns, check, padPath, tgtDist: best ? Math.round(bd) : null, tgtPath,
      tgt: best ? { isAi: !!best.isAi, x: Math.round(best.x), y: Math.round(best.y), dead: best.dead } : null
    };
  });
  console.log(JSON.stringify(out, null, 1));
  console.log('页面报错：', errors.length ? errors.slice(0, 3) : '无');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
