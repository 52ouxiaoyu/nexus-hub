// v4.0.99 验证：天使「捕获(N)/加速(M)」冷却固定 20s——删功德 3/9 的 CD 档位，功德仅剩 6→定身5s
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
    // T1：功德 0 时捕获 → CD 应 20（旧版 30）
    const zb = { x: 450, y: 400, dead: false, hp: 500, maxHp: 500, stunT: 0, capturedT: 0, el1: document.createElement('div') };
    g.zombies.push(zb);
    g._angelCapture();
    out.capCdAtMerit0 = g.player.capCd;       // 应 20
    out.meritAfter1 = g.playerMerit;          // 捕获 +1 = 1
    out.stunT = zb.stunT;                     // 定身 3s（功德<6）
    // T2：功德 5 时捕获 → CD 仍 20（旧版 3 档位边界附近）
    g.playerMerit = 5;
    g.player.capCd = 0;
    const zb2 = { x: 460, y: 400, dead: false, hp: 500, maxHp: 500, stunT: 0, capturedT: 0, el1: document.createElement('div') };
    g.zombies.push(zb2);
    g._angelCapture();
    out.capCdAtMerit5 = g.player.capCd;       // 应 20
    out.stunAtMerit5 = zb2.stunT;             // 应 3（功德 5<6 捕获时判定）
    out.meritAfter5 = g.playerMerit;          // 5→6，本次捕获触发定身5s档（bonus 文案）
    // T3：功德任意值加速 → CD 应 20（旧版 <9 时 30）
    g.playerMerit = 0;
    g.player.spdCd = 0;
    g._angelSpeed();
    out.spdCdAtMerit0 = g.player.spdCd;       // 应 20
    out.speedBuffT = g.player.speedBuffT;     // 疾跑 6s 不变
    // T4：HUD 技能栏文案——功德 /6 且无 3:捕获CD/9:加速CD 档位字样
    g._refreshHud();
    const hud = (document.getElementById('skill-hud') || {}).innerHTML || '';
    out.hud = hud;
    return out;
  });
  ok(r.capCdAtMerit0 === 20, 'T1 功德0 捕获 CD=20s（旧30s）');
  ok(r.meritAfter1 === 1, 'T2 捕获成功功德 +1');
  ok(r.stunT === 3, 'T3 功德<6 定身 3s 不变');
  ok(r.capCdAtMerit5 === 20, 'T4 功德5 捕获 CD=20s（旧30s）');
  ok(r.stunAtMerit5 === 3, 'T5 功德5 定身仍 3s');
  ok(r.meritAfter5 === 6, 'T6 功德 5→6');
  ok(r.spdCdAtMerit0 === 20, 'T7 功德0 加速 CD=20s（旧30s）');
  ok(r.speedBuffT === 6, 'T8 疾跑持续 6s 不变');
  ok(r.hud.includes('/6') && !r.hud.includes('/9') && !r.hud.includes('3:捕获CD') && !r.hud.includes('9:加速CD'), 'T9 技能栏功德显示 /6 且无旧档位');
  ok(errs.length === 0, 'T10 无 JS 错误' + (errs.length ? ':' + errs[0] : ''));
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
