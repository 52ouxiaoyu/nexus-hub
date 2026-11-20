// v4.0.120 出图：猫尾草子弹「旧 = 整张卡面插画 / 新 = 原版尖刺」对比 + 实战弹道截图
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
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });

  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.plants && window.game.world1', { timeout: 20000 });
  await sleep(1200);

  // 种一株猫尾草 + 正东放一只站桩僵尸
  const info = await page.evaluate(() => {
    const g = window.game;
    const pc = Math.floor(g.player.x / g.gridSize), pr0 = Math.floor(g.player.y / g.gridSize);
    let spot = null;
    for (let ring = 1; ring <= 4 && !spot; ring++) {
      for (let dr = -ring; dr <= ring && !spot; dr++) {
        for (let dc = -ring; dc <= ring && !spot; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const c = pc + dc, r = pr0 + dr;
          if (g.checkCollision(c * g.gridSize + 40, r * g.gridSize + 40, 20, false)) continue;
          if (g.plants.some(p => p.c === c && p.r === r)) continue;
          spot = { c, r };
        }
      }
    }
    g.spawnPlant(spot.c, spot.r, 'cattail');
    const px = spot.c * g.gridSize + 40, py = spot.r * g.gridSize + 40;
    g._spawnMinion(false, 0, 1, { x: px + 4 * g.gridSize, y: py });
    const zb = g.zombies[g.zombies.length - 1];
    zb.hp = zb.maxHp = 999999; zb.speed = 0;
    return { spot, px, py };
  });
  await sleep(7000);   // 开局的「新房客」手把手横幅 5 秒后自动淡出，等它消失再拍，别挡住子弹

  // ① 弹体特写：把旧素材与新素材并排放大 6 倍贴到左上角（不挡 HUD）
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'v4120-cmp';
    box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;display:flex;gap:10px;'
      + 'background:rgba(12,28,10,.94);padding:10px 12px;border:2px solid #4a7a2a;border-radius:10px;'
      + 'font:13px/1.4 sans-serif;color:#ffe9a8;';
    const cell = (title, src, okColor) => `
      <div style="text-align:center;width:120px;">
        <div style="color:${okColor};font-weight:bold;margin-bottom:4px;">${title}</div>
        <div style="width:120px;height:96px;display:flex;align-items:center;justify-content:center;background:#20301a;border-radius:6px;">
          <img src="${src}" style="width:108px;height:58px;object-fit:contain;image-rendering:pixelated;">
        </div>
      </div>`;
    box.innerHTML = cell('旧：整张卡面图', 'assets/images/Plants/Cattail/Cattail.png', '#ff9a9a')
      + cell('新：原版尖刺', 'assets/images/Plants/Cactus/Projectile32.png', '#9ce07a');
    document.body.appendChild(box);
  });
  await sleep(300);
  const cmp = await page.$('#v4120-cmp');
  await cmp.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4120_compare.png' });
  await page.evaluate(() => document.getElementById('v4120-cmp').remove());

  // ② 实战：等子弹飞出一段再拍，画面里同时有猫尾草和飞行的尖刺
  //     （子弹寿命约 1.46s，轮询到"刚飞出 100px+"的那一发再截）
  let shot = null;
  for (let i = 0; i < 80 && !shot; i++) {
    shot = await page.evaluate(() => {
    const g = window.game;
    const pea = g.peas.find(p => p && p.el && p.el.isConnected);
    if (pea) {
      const r = pea.el.getBoundingClientRect();
      const pl = g.plants.find(p => p.type === 'cattail');
      const pr = pl && pl.el1 ? pl.el1.getBoundingClientRect() : null;
      if (pr) {
        const dx = Math.abs((r.x + r.width / 2) - (pr.x + pr.width / 2));
        if (dx < 90) return null;   // 还糊在植株身上，等它飞开
      }
    }
    if (!pea || !pea.el) return null;
    const r = pea.el.getBoundingClientRect();
    const pl = g.plants.find(p => p.type === 'cattail');
    const pr = pl && pl.el1 ? pl.el1.getBoundingClientRect() : null;
    return { bx: r.x + r.width / 2, by: r.y + r.height / 2, px: pr ? pr.x + pr.width / 2 : null, py: pr ? pr.y + pr.height / 2 : null };
    });
    if (!shot) await sleep(60);
  }
  if (shot) {
    const lx = Math.max(0, Math.min(shot.px, shot.bx) - 80), ly = Math.max(0, Math.min(shot.py, shot.by) - 70);
    const rx = Math.max(shot.px, shot.bx) + 80, ry = Math.max(shot.py, shot.by) + 70;
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4120_fly.png', clip: { x: lx, y: ly, width: rx - lx, height: ry - ly } });
    console.log('实战截图 →', lx, ly, rx - lx, ry - ly);
  }
  console.log('对比图 → _v4120_compare.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
