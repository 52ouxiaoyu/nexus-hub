// v4.0.120 验证：守屋大作战「猫尾草子弹 = 原版尖刺」
// 背景：用户反馈「弄猫尾草时，它发射的子弹并不是尖刺，而是一张图片」
// 原因：DEFS.cattail.shoot.img 指向 Plants/Cattail/Cattail.png（220×220 的整张卡面插画）
// 修法：改用经典模式猫尾草同款原版尖刺 Cactus/Projectile32.png（30×16），并用 size 定小弹体
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

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

  // ---------- T1 静态表 ----------
  const t1 = await page.evaluate(async () => {
    const sh = HauntedDorm.DEFS.cattail.shoot;
    const real = await new Promise(res => {
      const im = new Image();
      im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res({ w: 0, h: 0 });
      im.src = 'assets/images/' + sh.img;
    });
    // 全表扫描：还有没有别的植物的子弹用了「整张卡面插画」
    const badBullets = [];
    for (const [k, d] of Object.entries(HauntedDorm.DEFS)) {
      const img = d.shoot && d.shoot.img;
      if (!img) continue;
      if (/Cattail\/Cattail\.png$/i.test(img)) badBullets.push(k + ' → ' + img);
    }
    return {
      img: sh.img, size: sh.size, real,
      plantImg: HauntedDorm.DEFS.cattail.img,
      badBullets,
      // 旧素材尺寸（用来对比"图片 vs 尖刺"）
      oldW: 220
    };
  });
  ok(t1.img === 'Plants/Cactus/Projectile32.png', `T1a 猫尾草子弹素材 = 原版尖刺（${t1.img}）`);
  ok(t1.real.w === 30 && t1.real.h === 16, `T1b 尖刺贴图真能加载且是 30×16 小刺（实测 ${t1.real.w}×${t1.real.h}）`);
  ok(t1.size === 15, `T1c 弹体尺寸单独定小（size=${t1.size} → 盒子 ${(15 * 1.8).toFixed(0)}px，默认 26 会变 47px）`);
  ok(t1.badBullets.length === 0, `T1d 全表再无「子弹用整张卡面插画」的植物（${t1.badBullets.join(',') || '无'}）`);
  ok(/Cattail\/Cattail\.gif$/.test(t1.plantImg), `T1e 猫尾草本体立绘仍是原版 Cattail.gif（${t1.plantImg}）`);

  // ---------- 开局守屋（植物阵营）----------
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.plants && window.game.world1', { timeout: 20000 });
  await sleep(1200);

  // ---------- T2 真种一株猫尾草 + 放一只僵尸，看真实打出来的弹 ----------
  const t2 = await page.evaluate(async () => {
    const g = window.game;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // 清场：先看看能不能找到空位
    const before = g.plants.length;
    // 种在玩家身边（相机跟着玩家走，种太远截图就拍不到）
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
    if (!spot) return { error: '找不到空位' };
    g.spawnPlant(spot.c, spot.r, 'cattail');
    const pl = g.plants.find(p => p.c === spot.c && p.r === spot.r);
    // 注意：HauntedDorm.DEFS 是 static getter，每次访问都返回**新对象**，所以不能用
    // pl.def === HauntedDorm.DEFS.cattail 判身份，只认 pl.type
    if (!pl || pl.type !== 'cattail') return { error: '猫尾草没种上', n: g.plants.length, before };

    const px = spot.c * g.gridSize + 40, py = spot.r * g.gridSize + 40;
    // 正东方向 4 格放一只僵尸
    g._spawnMinion(false, 0, 1, { x: px + 4 * g.gridSize, y: py });
    const zb = g.zombies[g.zombies.length - 1];
    zb.hp = zb.maxHp = 999999; zb.speed = 0;   // 站桩靶子，别让它跑掉

    // 等它自己开火（走真实 _updateShooting 路径）
    let pea = null;
    for (let i = 0; i < 120 && !pea; i++) { await wait(50); if (g.peas.length) pea = g.peas[0]; }
    if (!pea || !pea.el) return { error: '没打出子弹', peas: g.peas.length, spot };

    const img = pea.el.querySelector('img');
    const rc = pea.el.getBoundingClientRect();
    const irc = img ? img.getBoundingClientRect() : { width: 0, height: 0 };
    return {
      spot, src: img ? img.getAttribute('src') : null,
      natural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
      box: { w: +rc.width.toFixed(1), h: +rc.height.toFixed(1) },
      drawn: { w: +irc.width.toFixed(1), h: +irc.height.toFixed(1) },
      cls: pea.el.className,
      dmg: pea.dmg, homing: !!pea.homing,
      peaXY: { x: +pea.x.toFixed(0), y: +pea.y.toFixed(0) }
    };
  });
  ok(!t2.error, `T2a 猫尾草在守屋里真能种下并自动开火（${t2.error || '空位 ' + t2.spot.c + ',' + t2.spot.r + '，子弹 ' + t2.peaXY.x + ',' + t2.peaXY.y + '）'}`);
  ok(/Cactus\/Projectile32\.png$/.test(t2.src || ''), `T2b 打出来的子弹是原版尖刺贴图（${t2.src}）`);
  ok(t2.natural && t2.natural.w === 30, `T2c 贴图原始尺寸 30×16（不是 220×220 的卡面插画；实测 ${t2.natural && t2.natural.w}×${t2.natural && t2.natural.h}）`);
  // object-fit:contain → img 盒子 27×27，真正画出来的尖刺按 30:16 铺成 27×14.4
  ok(t2.box && t2.box.w <= 32, `T2d 弹体盒子只有 ${t2.box && t2.box.w}px（原来一张 220×220 卡面图被压进 47px 方块，糊成一坨）`);
  ok(t2.homing === true && t2.dmg === 1650, `T2e 伤害/追踪不变（${t2.dmg} 伤、homing=${t2.homing}）`);

  // （目视截图交给 _shot_v4120.js，那边会等横幅淡出、按 DOM 页面坐标裁剪）
  // ---------- T4 无页面报错 ----------
  ok(errors.length === 0, `T4 全程 0 页面报错（${errors.slice(0, 3).join(' | ') || '无'}）`);

  console.log(`\n===== v4.0.120 结果：${pass} 通过 / ${fail} 失败 =====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(2); });
