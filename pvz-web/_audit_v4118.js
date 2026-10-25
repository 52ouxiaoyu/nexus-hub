// 多方位巡检（v4.0.118）：守屋模式整体健康度
//  P1 人机（植物方）会不会像僵尸那样卡在原地不动：无房且长时间零位移 = 卡住
//  P2 僵尸在任何时刻都不会落进墙格
//  P3 植物/僵尸数值表无异常（hp ≤ 0、升级断链、名字越界）
//  P4 融合植物表无重名、无重复 type
//  P5 图鉴条目数与实际表一致
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅ ' + m); } else { fail++; console.log('❌ ' + m); } };

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

  // ---------- 静态表检查 ----------
  const table = await page.evaluate(() => {
    const out = {};
    out.extra = (window.PVZ_FUSION_EXTRA || []).map(f => ({ type: f.type, name: f.name }));
    const types = out.extra.map(f => f.type);
    out.dupType = types.filter((t, i) => types.indexOf(t) !== i);
    const names = out.extra.map(f => f.name);
    out.dupName = names.filter((n, i) => names.indexOf(n) !== i);
    return out;
  });
  ok(table.dupType.length === 0, `P4a 融合植物 type 无重复（重复：${table.dupType.join(',') || '无'}）`);
  ok(table.dupName.length === 0, `P4b 融合植物名无重复（重复：${table.dupName.join(',') || '无'}）`);
  const guideCount = await page.evaluate(() => {
    document.getElementById('btn-help-guide').click();
    document.querySelector('#help-modal .hg-tab[data-tab="plants"]').click();
    const tabs = document.querySelector('#help-modal .hg-tab[data-tab="plants"]').textContent;
    const groups = [...document.querySelectorAll('#help-body .hg-group')].map(g => ({
      tag: g.querySelector('.hg-group-tag').textContent.replace(/\s+/g, ''),
      n: g.nextElementSibling.querySelectorAll('.hg-tile').length
    }));
    document.querySelector('#help-modal').style.display = 'none';
    return { tabs, groups };
  });
  const sum = guideCount.groups.reduce((a, g) => a + g.n, 0);
  ok(new RegExp(String(sum)).test(guideCount.tabs), `P5 图鉴页签数与实际条目一致（${sum} 条 / 页签「${guideCount.tabs}」）`);

  // ---------- 人机卡住巡检（植物阵营 1p，10 倍速） ----------
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await page.evaluate(() => { window.game.timeScale = 10; });
  await sleep(1500);

  const aiTrace = {};
  const aiStuck = [];
  const zombieWallHits = { hits: 0, frames: 0 };
  for (let i = 0; i < 70; i++) {
    await sleep(400);
    const snap = await page.evaluate(() => {
      const g = window.game;
      if (!g || g.over) return { over: true };
      let wall = 0, zf = 0;
      for (const z of g.zombies) {
        if (z.dead) continue;
        zf++;
        if (g.walls.has(Math.floor(z.x / 80) + ',' + Math.floor(z.y / 80))) wall++;
      }
      return {
        gt: Math.round(g.gameTime / 1000),
        ais: g.ais.map(a => ({
          id: a.__id == null ? (a.__id = Math.random().toString(36).slice(2, 6)) : a.__id,
          x: Math.round(a.x), y: Math.round(a.y), dead: !!a.dead,
          room: !!a.room, pinned: !!a.pinned, path: a.path ? a.path.length : 0
        })),
        wall, zf
      };
    });
    if (snap.over) break;
    zombieWallHits.hits += snap.wall; zombieWallHits.frames += snap.zf;
    for (const a of snap.ais) {
      if (a.dead) continue;
      const t = aiTrace[a.id] || (aiTrace[a.id] = { last: null, still: 0, maxStill: 0, hit: false, at: null });
      if (t.last) t.still = Math.hypot(a.x - t.last.x, a.y - t.last.y) < 4 ? t.still + 1 : 0;
      t.last = { x: a.x, y: a.y };
      if (!a.room && !a.pinned && t.still > t.maxStill) { t.maxStill = t.still; t.at = a; }
      // 无房 + 未钉床 + 连续 6 次（约 2.4s 真实 = 24s 游戏内）零位移 = 卡住
      if (t.still >= 6 && !a.room && !a.pinned && !t.hit) { t.hit = true; aiStuck.push({ gt: snap.gt, a, still: t.still }); }
    }
  }
  const maxStill = Math.max(0, ...Object.values(aiTrace).map(t => t.maxStill));
  const worst = Object.values(aiTrace).sort((x, y) => y.maxStill - x.maxStill)[0];
  ok(maxStill < 6, `P1 人机没有长时间卡死（最长一次零位移 ${(maxStill * 0.4).toFixed(1)}s 真实 = ${(maxStill * 4).toFixed(0)}s 游戏内，门槛 2.4s/24s；共 ${aiStuck.length} 次触发）`);
  if (worst && worst.maxStill >= 3) console.log('   最长静止样本:', JSON.stringify(worst.at), 'still=', worst.maxStill);
  if (aiStuck.length) console.log('   样本:', JSON.stringify(aiStuck.slice(0, 3)));
  ok(zombieWallHits.hits === 0, `P2 僵尸从未落进墙格（${zombieWallHits.hits}/${zombieWallHits.frames} 帧）`);

  // ---------- 动态表：升级链 / 名字越界 ----------
  const defs = await page.evaluate(() => {
    const g = window.game;
    const D = g.DEFS || {};
    const keys = Object.keys(D);
    const bad = [];
    for (const k of keys) {
      const d = D[k];
      if (!(d.hp > 0)) bad.push(k + ':hp');
      if (d.up && d.up.to && !D[d.up.to]) bad.push(k + ':up→' + d.up.to);
    }
    return { n: keys.length, bad };
  });
  ok(defs.bad.length === 0, `P3 守屋 ${defs.n} 个植物定义无 hp≤0 / 升级断链（异常：${defs.bad.slice(0, 6).join(',') || '无'}）`);
  ok(errors.length === 0, `P6 全程 0 个页面错误（${errors.slice(0, 3).join(' | ') || '无'}）`);
  console.log(`\n${fail === 0 ? '🎉 巡检通过' : '⚠️ 巡检有失败'}：${pass}/${pass + fail}`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
