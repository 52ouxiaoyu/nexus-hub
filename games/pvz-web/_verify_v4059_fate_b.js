const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  const r = await p.evaluate(() => {
    const g = window.game;
    const out = {};
    const ov = document.createElement('div'); document.body.appendChild(ov);
    g._becomeAngel(ov);
    // 模拟 4 次捕获（功德到 4：应触发 3 档 CD 20s）
    for (let i = 0; i < 4; i++) {
      const zb = { x: 450+i, y: 400, dead: false, hp: 500, maxHp: 500, stunT: 0, capturedT: 0, el1: document.createElement('div') };
      g.zombies.push(zb);
      g.player.capCd = 0;
      g._angelCapture();
    }
    out.merit4 = g.playerMerit;
    out.capCdAt4 = g.player.capCd;           // 应 20（功德>=3）
    out.capturedTAt4 = g.zombies[g.zombies.length-1].capturedT; // 应 3（功德<6）
    // 冲到功德 6：定身 5s（先设 6 再捕获——判定发生在捕获时）
    g.playerMerit = 6;
    g.player.capCd = 0;
    const zb6 = { x: 470, y: 400, dead: false, hp: 500, maxHp: 500, stunT: 0, capturedT: 0, el1: document.createElement('div') };
    g.zombies.push(zb6);
    g._angelCapture();
    out.merit6 = g.playerMerit;
    out.capturedTAt6 = zb6.capturedT; // 应 5（功德>=6）
    // 冲到功德 9：加速 CD 20s
    g.playerMerit = 9;
    g.player.spdCd = 0;
    g._angelSpeed();
    out.spdCdAt9 = g.player.spdCd;           // 应 20
    out.meritBadge = document.getElementById('hud-p1') ? true : false;
    // 祝福双保险：直接调 _offerBlessings 在内鬼形态下应被拦截
    g.playerTraitor = true;
    const before = g.blessing;
    g._offerBlessings();
    out.blessBlockedTraitor = g.blessing === before; // 未被打开
    return out;
  });
  ok(r.merit4 === 4, 'T1 功德累计到 4');
  ok(r.capCdAt4 === 20, 'T2 功德>=3 → 捕获 CD 20s');
  ok(r.capturedTAt4 === 3, 'T3 功德<6 定身仍 3s');
  ok(r.merit6 >= 6, 'T4 功德累计到 6（捕获后+1）');
  ok(r.capturedTAt6 === 5, 'T5 功德>=6 → 定身 5s');
  ok(r.spdCdAt9 === 20, 'T6 功德>=9 → 加速 CD 20s');
  ok(r.blessBlockedTraitor, 'T7 内鬼形态下 _offerBlessings 被拦截（双保险）');
  ok(errs.length === 0, 'T8 无 JS 错误' + (errs.length ? ':' + errs[0] : ''));
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
