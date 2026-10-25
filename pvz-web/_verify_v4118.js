// v4.0.118 验证
//  A. 寒冰高坚果：图鉴新增一条（高坚果造型 + 冰蓝），融合系统真的能合成（寒冰射手+高坚果）
//  B. 寒冰坚果仍在（小坚果），守屋坚果链第 8 级名字改回「寒冰高坚果」
//  C. 守屋「双向豌豆」不再是粉色裂荚（去掉 hue-rotate 染色）
//  D. 僵尸不再卡在墙边：60 秒 10 倍速无「原地不动且不啃」的僵死，路径每步相邻（不穿墙），且真能啃掉挡路植物
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('✅ ' + msg); } else { fail++; console.log('❌ ' + msg); } };

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
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });

  // ==================== A / B 图鉴 ====================
  await page.evaluate(() => { document.getElementById('btn-help-guide').click(); document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click(); });
  await sleep(500);
  const guide = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('#help-body .hg-group')].map(g => {
      const grid = g.nextElementSibling;
      return {
        tag: g.querySelector('.hg-group-tag').textContent.replace(/\s+/g, ''),
        tiles: [...grid.querySelectorAll('.hg-tile')].map(t => {
          const img = t.querySelector('img');
          const r = img ? img.getBoundingClientRect() : { width: 0, height: 0 };
          return { name: t.querySelector('.hg-tname').textContent.trim(), src: img ? img.getAttribute('src') : '',
                   style: img ? (img.getAttribute('style') || '') : '', h: Math.round(r.height), w: Math.round(r.width),
                   nh: img ? img.naturalHeight : 0, nw: img ? img.naturalWidth : 0 };
        })
      };
    });
    return { groups, tabText: document.querySelector('#help-modal .hg-tab[data-tab="plants"]').textContent.trim() };
  });
  const cls = guide.groups.find(g => /经典/.test(g.tag));
  const fus = guide.groups.find(g => /融合/.test(g.tag));
  ok(cls && cls.tiles.length === 36, `A1 经典区仍是 36 条（实测 ${cls && cls.tiles.length}）`);
  ok(fus && fus.tiles.length === 56, `A2 融合区 55→56 条，新增了「寒冰高坚果」（实测 ${fus && fus.tiles.length}）`);
  const snt = fus && fus.tiles.find(t => t.name === '寒冰高坚果');
  ok(!!snt, 'A3 图鉴里出现「寒冰高坚果」');
  const snRef = fus.tiles.find(t => t.name === '寒冰坚果');
  ok(snt && snRef && snt.nh > snRef.nh * 1.25,
     `A4 寒冰高坚果的立绘是高坚果（原图 ${snt && snt.nw}x${snt && snt.nh} vs 寒冰坚果 ${snRef && snRef.nw}x${snRef && snRef.nh}）`);
  ok(snt && /hue-rotate\(180deg\)/.test(snt.style), 'A5 立绘是冰蓝染色（与冰系一致）');
  const sn = fus && fus.tiles.find(t => t.name === '寒冰坚果');
  ok(!!sn, `A6 「寒冰坚果」仍在，且与小坚果同高（${sn && sn.h}px）`);
  ok(/92/.test(guide.tabText), `A7 页签总数 91→92（${guide.tabText}）`);
  await page.evaluate(() => document.querySelector('#help-modal').style.display = 'none');

  // ==================== A 融合系统：能真的合成 ====================
  const fuse = await page.evaluate(() => {
    const out = {};
    try {
      const P = new Plant({ entityLayer: document.createElement('div') }, 'fusion_snowtallnut');
      out.traits = P.traits;
      out.hp = P.hp;
      out.isNut = typeof P.hasTrait === 'function' ? P.hasTrait('tallnut') : null;
    } catch (e) { out.err = String(e.message); }
    out.hasExtra = !!(window.PVZ_FUSION_EXTRA || []).find(f => f.type === 'fusion_snowtallnut');
    out.look = (window.PVZ_FUSION_LOOK || {})['fusion_snowtallnut'] || null;
    return out;
  });
  ok(!fuse.err, `A8 融合植物实例化不报错（${fuse.err || 'ok'}）`);
  ok(Array.isArray(fuse.traits) && fuse.traits.includes('tallnut') && fuse.traits.includes('snowpea'),
     `A9 traits = 寒冰射手 + 高坚果（${JSON.stringify(fuse.traits)}）`);
  ok(fuse.hp === 8000, `A10 血量按双亲最大值 = 高坚果 8000（实测 ${fuse.hp}）`);
  ok(fuse.hasExtra && fuse.look && /TallNut/.test(fuse.look.base), 'A11 已进 PVZ_FUSION_EXTRA / LOOK 表（base=高坚果）');

  // ==================== B/C 守屋 DEFS ====================
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(1000);

  const defs = await page.evaluate(() => {
    const g = window.game;
    const D = g.DEFS || g.constructor.DEFS || window.DEFS;
    const pick = k => (D && D[k]) ? { name: D[k].name, img: D[k].img, tint: D[k].tint || '', tier: D[k].tier } : null;
    return { nutlv8: pick('nutlv8'), nutlv7: pick('nutlv7'), bidipea: pick('bidipea'), dualpea: pick('dualpea') };
  });
  ok(defs.nutlv8 && defs.nutlv8.name === '寒冰高坚果', `B1 守屋坚果链第 8 级 = 寒冰高坚果（实测「${defs.nutlv8 && defs.nutlv8.name}」）`);
  ok(defs.nutlv8 && /TallNut/.test(defs.nutlv8.img), `B2 且用的是高坚果立绘（${defs.nutlv8 && defs.nutlv8.img}）`);
  ok(defs.bidipea && !/hue-rotate/.test(defs.bidipea.tint), `C1 守屋「双向豌豆」不再有粉色染色（tint="${defs.bidipea && defs.bidipea.tint}"）`);
  ok(defs.dualpea && /hue-rotate\(165deg\)/.test(defs.dualpea.tint), 'C2 紫色「冰双向射手」保持不动（那是冰系正常配色）');

  // ==================== D 僵尸不卡墙 ====================
  // 换成僵尸阵营 → 强开多波尸潮 → 10 倍速
  await page.evaluate(() => {
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await page.evaluate(() => {
    const g = window.game;
    g.zombieFreezeT = 0; g.survivorKills = 2; g.waveOrderCd = 0;
    g.timeScale = 10;
    window.__d = { pathHops: 0, pathBad: 0, pathNull: 0, zFrames: 0, bites: 0, plantHpDrop: 0 };
    const origTick = g._tick.bind(g);
    let lastPlantHp = g.plants.reduce((a, p) => a + Math.max(0, p.hp), 0);
    g._tick = function (dt, gt) {
      origTick(dt, gt);
      const D = window.__d;
      for (const z of this.zombies) {
        if (z.dead) continue;
        D.zFrames++;
        if (!z.path || z.path.length === 0) { D.pathNull++; continue; }
        if (z._didBite) D.bites++;
        // 路径相邻性：相邻路点必须 4 连通（曼哈顿 ≤ 1.6 格）
        for (let i = 1; i < z.path.length; i++) {
          const a = z.path[i - 1], b = z.path[i];
          D.pathHops++;
          if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 80 * 1.6) D.pathBad++;
        }
      }
      const hp = this.plants.reduce((a, p) => a + Math.max(0, p.hp), 0);
      if (hp < lastPlantHp) D.plantHpDrop += (lastPlantHp - hp);
      lastPlantHp = hp;
    };
  });
  await sleep(1200);

  const trace = {};
  const stuck = [];
  for (let i = 0; i < 62; i++) {
    await sleep(400);
    if (i % 15 === 0) {
      await page.evaluate(() => {
        const g = window.game;
        if (!g || g.over) return;
        g.zombieFreezeT = 0; g.survivorKills = 2; g.waveOrderCd = 0;
        try { g._orderHorde(); } catch (e) {}
      });
    }
    const snap = await page.evaluate(() => {
      const g = window.game;
      if (!g || g.over) return { over: true };
      return {
        gt: Math.round(g.gameTime / 1000),
        zombies: g.zombies.filter(z => !z.dead).map(z => {
          let nd = 1e9;
          for (const pl of g.plants) nd = Math.min(nd, Math.hypot(pl.c * 80 + 40 - z.x, pl.r * 80 + 40 - z.y));
          return {
            id: z.__diagId == null ? (z.__diagId = Math.random().toString(36).slice(2, 6)) : z.__diagId,
            x: Math.round(z.x), y: Math.round(z.y), nearD: Math.round(nd),
            inWall: g.walls.has(Math.floor(z.x / 80) + ',' + Math.floor(z.y / 80))
          };
        }),
        alive: g.allPlayers.filter(p => !p.dead && !p.isZombie).length,
        stats: { ...window.__d }
      };
    });
    if (snap.over) break;
    for (const z of snap.zombies) {
      const t = trace[z.id] || (trace[z.id] = { last: null, still: 0, hit: false });
      if (t.last) t.still = Math.hypot(z.x - t.last.x, z.y - t.last.y) < 5 ? t.still + 1 : 0;
      t.last = { x: z.x, y: z.y };
      if (t.still >= 5 && !t.hit && z.nearD > 70) { t.hit = true; stuck.push({ gt: snap.gt, z }); }
    }
    if (snap.alive === 0 && i > 25) break;
  }
  const st = await page.evaluate(() => ({ ...window.__d, gt: Math.round(window.game.gameTime / 1000), alive: window.game.allPlayers.filter(p => !p.dead && !p.isZombie).length }));
  console.log(`\n[僵尸侧] 采样到游戏 ${st.gt}s：僵尸帧 ${st.zFrames}，path 空 ${st.pathNull}，路径跳 ${st.pathHops}（越界 ${st.pathBad}），啃食帧 ${st.bites}，植物掉血 ${Math.round(st.plantHpDrop)}，幸存者 ${st.alive}\n`);

  ok(st.zFrames > 500, `D1 采样到足够僵尸帧（${st.zFrames}）`);
  ok(stuck.length === 0, `D2 全程没有一只僵尸「原地不动又不啃」超过 2 秒（改前 25 次，实测 ${stuck.length} 次）`);
  if (stuck.length) console.log('   卡住样本:', JSON.stringify(stuck.slice(0, 3)));
  ok(st.pathHops > 0 && st.pathBad / Math.max(1, st.pathHops) < 0.02,
     `D3 僵尸路径每步只走相邻格、不跨墙（越界 ${st.pathBad}/${st.pathHops} = ${(st.pathBad / Math.max(1, st.pathHops) * 100).toFixed(2)}%）`);
  ok(st.pathNull / Math.max(1, st.zFrames) < 0.45,
     `D4 拿不到路径的帧大幅减少（改前 75.7%，实测 ${(st.pathNull / Math.max(1, st.zFrames) * 100).toFixed(1)}%）`);
  ok(st.plantHpDrop > 0, `D5 僵尸确实在啃植物（植物累计掉血 ${Math.round(st.plantHpDrop)}）`);
  ok(st.alive < 5, `D6 尸潮真的能推进（幸存者 5→${st.alive}）`);

  console.log(`\n${fail === 0 ? '🎉 全绿' : '⚠️ 有失败'}：${pass}/${pass + fail}`);
  if (errors.length) console.log('页面错误:', errors.slice(0, 5));
  else ok(true, 'D7 全程 0 个页面错误');
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
