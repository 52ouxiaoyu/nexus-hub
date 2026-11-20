// v4.0.40 验证：飘字单跳真实产出 + Lv 徽标 + 升级飘字报新等级
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg); } }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));

  // ===== T1 床铺菇 Lv1 徽标存在 =====
  const t1 = await p.evaluate(() => {
    const g = window.game;
    const bed = g.plants.find(pl => pl.type === 'sunshroom');
    if (!bed || !bed.el1) return { found: false };
    const badge = [...bed.el1.querySelectorAll('div')].find(d => d.textContent === 'Lv1');
    return { found: true, badge: !!badge };
  });
  ok(t1.found && t1.badge, 'T1 床铺菇带 Lv1 徽标');

  // ===== T2 飘字显示单跳真实产出（+1 而非 +4）=====
  const t2 = await p.evaluate(async () => {
    const g = window.game;
    g.player.x = 6 * 80 + 160; g.player.y = 10 * 80 + 120; // 进房认领
    window._flyLog = [];
    const orig = g._flyText.bind(g);
    g._flyText = (x, y, txt, color) => { window._flyLog.push(String(txt)); orig(x, y, txt, color); };
    await new Promise(res => setTimeout(res, 7500)); // 采样 ~4 次飘字
    const sunFlies = window._flyLog.filter(t => t.includes('☀') && t.includes('+'));
    return { sunFlies: [...new Set(sunFlies)] };
  });
  ok(t2.sunFlies.length > 0 && t2.sunFlies.every(t => t === '+1 ☀'),
     'T2 阳光飘字全部是 +1 ☀（单跳真实产出，无 +4 累计误读）飘字=' + JSON.stringify(t2.sunFlies));

  // ===== T3 升级瞬间：徽标变 Lv2 + 飘字报新等级新产出 =====
  const t3 = await p.evaluate(async () => {
    const g = window.game;
    const bed = g.plants.find(pl => pl.type === 'sunshroom');
    g._evolve(bed, 'bigsunshroom');
    const nb = g.plants.find(pl => pl.type === 'bigsunshroom');
    const badge = nb && nb.el1 ? [...nb.el1.querySelectorAll('div')].find(d => d.textContent === 'Lv2') : null;
    const lastFly = window._flyLog[window._flyLog.length - 1] || '';
    return { badge: !!badge, fly: lastFly, produced2: nb && nb.def.produce.sun === 2 };
  });
  ok(t3.badge && t3.produced2, 'T3 升级后徽标变 Lv2、产出 2 点/0.4s');
  ok(t3.fly.includes('Lv2') && t3.fly.includes('大阳光菇') && t3.fly.includes('2☀'),
     'T4 升级飘字报新等级+新产出: "' + t3.fly + '"');

  // ===== T5 升级面板标题带等级 =====
  const t5 = await p.evaluate(() => {
    const g = window.game;
    const nb = g.plants.find(pl => pl.type === 'bigsunshroom');
    g.plantClick(nb, g.player.x, g.player.y);
    const title = g.ppTitle ? g.ppTitle.innerText : '';
    g._closePopup();
    return { title };
  });
  ok(t5.title.startsWith('Lv2'), 'T5 升级面板标题带等级: "' + t5.title + '"');

  console.log(`\nTOTAL: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
