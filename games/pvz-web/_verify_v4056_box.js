// v4.0.56 盲盒奖池专项验证：
// ①结构：毁灭菇彻底不在池中；豌豆射手 Lv1~Lv5（含寒冰豌豆）进主池权重最高；坚果/阳光菇权重调低；向日葵在 rare；高级植物权重 1
// ②10000 次模拟：豌豆 1~5 级占比最高；毁灭菇 0 次；坚果<3%；高级植物总占比>0 且 <15%；攻击类占比明显高于经济类
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
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=sunflower');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(600);

  // ===== 结构断言（读源码） =====
  const src = await p.evaluate(() => {
    const s = window.game._blindBoxType.toString();
    return s;
  });
  ok(!src.includes('doomshroom'), 'T1 毁灭菇已从奖池彻底移除（源码不含 doomshroom）');
  // 豌豆 Lv5（snowpea）在主池：检查 main10 数组
  ok(/main10\s*=\s*\[[\s\S]*?'peashooter'[\s\S]*?'snowpea'/.test(src), 'T2 豌豆射手 1~5 级（含寒冰豌豆）全部在主池（权重 10）');
  ok(/main3\s*=\s*\[[\s\S]*'sunshroom'[\s\S]*'bigsunshroom'/.test(src), 'T3 阳光菇降为权重 3');
  ok(/main1\s*=\s*\[[\s\S]*'wallnut'/.test(src), 'T4 坚果降为权重 1');
  ok(/rare\s*=\s*\[[\s\S]*'twinsunflower'[\s\S]*'sunflower'/.test(src), 'T5 向日葵/双子向日葵按高级植物入 rare（权重 1）');

  // ===== 10000 次概率模拟 =====
  const dist = await p.evaluate(() => {
    const g = window.game;
    const count = {};
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const t = g._blindBoxType();
      count[t] = (count[t] || 0) + 1;
    }
    return JSON.stringify(count);
  });
  const c = JSON.parse(dist);
  const sum = Object.values(c).reduce((a, b) => a + b, 0);
  const pct = t => Math.round((c[t] || 0) * 10000 / sum) / 100;

  // 分组
  const pea15 = ['peashooter', 'cabbagepult', 'kernelpult', 'dualpea', 'snowpea'];
  const puff = ['puffshroom', 'scaredyshroom'];
  const attackMain = [...pea15, ...puff];
  const attackAdv = ['repeater', 'threepeater', 'gatlingpea', 'fumeshroom', 'hypnoshroom', 'sporemine', 'gloompuff', 'icegloom'];
  const econ = ['sunshroom', 'bigsunshroom', 'sunflower', 'twinsunflower'];
  const nut = ['wallnut'];
  const peaPct = pea15.reduce((a, t) => a + pct(t), 0);
  const attackMainPct = attackMain.reduce((a, t) => a + pct(t), 0);
  const attackAdvPct = attackAdv.reduce((a, t) => a + pct(t), 0);
  const econPct = econ.reduce((a, t) => a + pct(t), 0);
  const nutPct = pct('wallnut');
  const doom = pct('doomshroom');

  ok(doom === 0, 'T6 模拟 10000 次毁灭菇出现 0 次（' + doom + '%）');
  ok(peaPct > 40 && peaPct < 52, 'T7 1~5 级豌豆射手合计占比 40%~52%，最容易被抽到（' + peaPct + '%）');
  ok(nutPct < 3, 'T8 坚果占比 <3%（实际 ' + nutPct + '%）');
  ok(econPct < 15, 'T9 阳光系（阳光菇+向日葵+双子向日葵）占比 <15%（实际 ' + econPct + '%）');
  ok(attackAdvPct > 0 && attackAdvPct < 15, 'T10 高级攻击植物总占比 >0 且 <15%（实际 ' + attackAdvPct + '%）——可能抽到但概率很低');
  ok(attackMainPct > econPct, 'T11 攻击类（豌豆1-5+小喷菇，' + attackMainPct + '%）明显高于经济类（' + econPct + '%）');

  console.log('  ——分布摘要：豌豆1-5=' + peaPct + '% 攻击主池=' + attackMainPct + '% 高级攻击=' + attackAdvPct + '% 经济类=' + econPct + '% 坚果=' + nutPct + '% 毁灭菇=' + doom + '%');

  // ===== 兜底路径 =====
  const fallback = await p.evaluate(() => {
    const g = window.game;
    // 找空地种盲盒，检查开出的是合法植物且 non-instant（或 iceshroom）
    for (const rm of g.rooms) {
      for (let r = rm.y; r < rm.y + rm.h; r++) {
        for (let c = rm.x; c < rm.x + rm.w; c++) {
          if (g._insideRoom(c, r) && !g.walls.has(c + ',' + r) && !(c === rm.doorCol && r === rm.doorRow) && !g.plants.some(x => x.c === c && x.r === r)) {
            const before = g.plants.length;
            g.spawnPlant(c, r, 'blindbox', false, g.player);
            const pl = g.plants.find(x => x.c === c && x.r === r);
            const ok1 = pl && HauntedDorm.DEFS[pl.type] && !(HauntedDorm.DEFS[pl.type].instant && pl.type !== 'iceshroom');
            // 拆除还原
            g.plants = g.plants.filter(x => x !== pl);
            if (pl && pl.el1) pl.el1.remove();
            return ok1 ? 'OK' : 'BAD:' + (pl ? pl.type : 'none');
          }
        }
      }
    }
    return 'NO_CELL';
  });
  ok(fallback === 'OK', 'T12 盲盒兜底路径正常（开出合法植物，一次性除外仅寒冰菇）(' + fallback + ')');

  await sleep(300);
  ok(pageErrors.length === 0, 'T13 无 JS 运行错误（' + (pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'clean') + '）');

  await browser.close();
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
