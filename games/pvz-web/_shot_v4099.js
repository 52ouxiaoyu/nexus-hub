// v4.0.99 截图：①主菜单版本徽标 ②天使形态技能栏（CD 20s + 功德 /6）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));
  // ① 主菜单徽标
  const badge = await p.evaluate(() => (document.getElementById('start-version') || {}).innerText || '');
  console.log('版本徽标:', badge);
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4099_menu.png' });
  // ② 进守屋 → 天使形态 → 技能栏
  await p.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => {
    const g = window.game;
    const ov = document.createElement('div'); document.body.appendChild(ov);
    g._becomeAngel(ov);
    // 放一只僵尸 + 触发一次捕获，展示 CD:20s
    g.zombies.push({ x: g.player.x + 60, y: g.player.y, dead: false, hp: 500, maxHp: 500, stunT: 0, capturedT: 0, el1: document.createElement('div') });
    g._angelCapture();
    g.playerMerit = 6; g._refreshHud();
  });
  await new Promise(r => setTimeout(r, 1200));
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4099_angel.png' });
  const hud = await p.evaluate(() => (document.getElementById('skill-hud') || {}).innerText || '');
  console.log('技能栏:', hud);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
