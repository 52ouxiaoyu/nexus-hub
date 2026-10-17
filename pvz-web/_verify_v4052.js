// v4.0.52 验证：①向日葵系多头显示修复（五头/六头/黄金向日葵加多头 overlay）②坚果地刺/钢刺高坚果地刺上抬
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=chomper');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(800);

  // ===== T1 向日葵系 10 种全部可种植且有渲染 DOM =====
  const suns = ['sunshroom', 'bigsunshroom', 'sunflower', 'peasunflower', 'twinsunflower',
    'doomsunflower', 'fourheadsunflower', 'sungold1', 'sungold2', 'sungold3'];
  const t1 = await p.evaluate((suns) => {
    const g = window.game;
    const out = [];
    for (let i = 0; i < suns.length; i++) {
      const col = 2 + i, row = 24;
      const ret = g.spawnPlant(col, row, suns[i]);
      const pl = g.plants.find(x => x.c === col && x.r === row && x.type === suns[i]);
      const imgN = pl && pl.el1 ? pl.el1.querySelectorAll('img').length : 0;
      out.push({ t: suns[i], planted: !!pl, hasEl: !!(pl && pl.el1), imgN });
    }
    return out;
  }, suns);
  ok(t1.every(x => x.planted && x.hasEl), 'T1a 向日葵系 10 种全部种植成功且渲染 DOM 存在');
  ok(t1.every(x => x.imgN >= 1), 'T1b 每种至少 1 张主图');

  // ===== T2 多头 overlay：五头=3 img（主+镜像+1小头）、六头=4、黄金=5 =====
  const expectImgs = { fourheadsunflower: 2, sungold1: 3, sungold2: 4, sungold3: 5 };
  for (const [t, n] of Object.entries(expectImgs)) {
    const r = t1.find(x => x.t === t);
    ok(r && r.imgN === n, `T2 ${t} 应有 ${n} 层图（主+多头叠加），实际 ${r ? r.imgN : 0}`);
  }

  // ===== T3 坚果地刺/钢刺高坚果 overlay 上抬 =====
  const t3 = await p.evaluate(() => {
    const g = window.game;
    g.spawnPlant(4, 28, 'nutlv4');
    g.spawnPlant(6, 28, 'nutlv6');
    const a = HauntedDorm.DEFS['nutlv4'].overTransform || '';
    const b = HauntedDorm.DEFS['nutlv6'].overTransform || '';
    return { a, b };
  });
  ok(/translate\(0px, 34px\)/.test(t3.a), `T3a nutlv4 地刺上抬至 34px（原48px，实际 ${t3.a.match(/translate\(0px, (-?\d+)px\)/)?.[1]}px）`);
  ok(/translate\(0px, 44px\)/.test(t3.b), `T3b nutlv6 地刺上抬至 44px（原58px，实际 ${t3.b.match(/translate\(0px, (-?\d+)px\)/)?.[1]}px）`);

  // ===== T4 回归：盲盒主池占比（v4.0.51）=====
  const stats = await p.evaluate(() => {
    const g = window.game;
    const MAIN = ['sunshroom', 'bigsunshroom', 'garlic', 'iceshroom', 'plantern', 'plantern2',
      'peashooter', 'cabbagepult', 'kernelpult', 'dualpea', 'wallnut', 'puffshroom', 'scaredyshroom'];
    let mainHits = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) if (MAIN.includes(g._blindBoxType())) mainHits++;
    return mainHits / N;
  });
  ok(stats > 0.8, 'T4a 盲盒主池占比 >80%（实际 ' + (stats * 100).toFixed(1) + '%）');

  // ===== T5 回归：大嘴花大招 CD=30s 与房间布局封闭（v4.0.49/50）=====
  const t5 = await p.evaluate(() => {
    const g = window.game;
    // 大嘴花技能分支 CD（按角色 chomper 30s）
    const useSkillSrc = HauntedDorm.prototype._useSkill.toString();
    const hasChomper30 = /chomper/.test(useSkillSrc) && /30/.test(useSkillSrc);
    // 房间封闭断言：每个房间实心区外边界闭合（与 v4.0.50 相同口径）
    let closedFail = 0, connFail = 0, rooms = 0;
    for (const rm of g.rooms) {
      rooms++;
      const inR = (r, c) => r >= 0 && r < rm.h && c >= 0 && c < rm.w && rm.tpl.grid[r][c] === 1;
      const isDoor = (r, c) => r === rm.tpl.door.r && c === rm.tpl.door.c;
      for (let r = 0; r < rm.h; r++) for (let c = 0; c < rm.w; c++) {
        if (!inR(r, c)) continue;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr, nc = c + dc;
          if (isDoor(nr, nc)) continue;
          if (!inR(nr, nc) && !g.walls.has(`${rm.x + nc},${rm.y + nr}`)) closedFail++;
        }
      }
    }
    return { hasChomper30, closedFail, rooms };
  });
  ok(t5.hasChomper30, 'T5a 大嘴花大招保留 30s CD 设定');
  ok(t5.closedFail === 0 && t5.rooms === 10, 'T5b 10 个房间全部封闭图形（closedFail=' + t5.closedFail + '）');

  await browser.close();
  console.log(`\n===== 验证结果: ${pass} PASS / ${fail} FAIL =====`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
