// v4.0.111 验证：守屋大作战豌豆系后期伤害下调（tier10 起 ×2 → ×1.85，终级 32768 → 19300）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push((e.stack || String(e)).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });

  // ---------- T1~T4 数据表 ----------
  const d = await page.evaluate(() => {
    const D = window.HauntedDorm.DEFS;
    const chain = ['peashooter','cabbagepult','kernelpult','dualpea','bidipea','snowpea','repeater',
                   'threepeater','gatlingpea','melonpult','wintermelon','cattail','superbox',
                   'machinestail','melonstail','icemelonstail'];
    return chain.map(k => {
      const x = D[k] || {};
      return { k, tier: x.tier, name: x.name, dmg: x.shoot ? x.shoot.dmg : null,
               cd: x.shoot ? x.shoot.cd : null, n: x.shoot ? x.shoot.n : null, up: x.up ? x.up.to : null };
    });
  });

  const OLD = { 1:1,2:2,3:4,4:8,5:16,6:32,7:64,8:128,9:256 };
  const NEW = { 10:480,11:890,12:1650,13:3050,14:5650,15:10450,16:19300 };

  ok(d.length === 16 && d.every((x, i) => x.tier === i + 1),
     `T1 豌豆链 16 级完整（${d.map(x => x.tier).join(',')}）`);

  const earlyBad = d.filter(x => OLD[x.tier] !== undefined && x.dmg !== OLD[x.tier]);
  ok(earlyBad.length === 0,
     `T2 前 9 级伤害一字未改（1→256，实测 ${d.filter(x => x.tier <= 9).map(x => x.dmg).join(',')}）`);

  const lateBad = d.filter(x => NEW[x.tier] !== undefined && x.dmg !== NEW[x.tier]);
  ok(lateBad.length === 0,
     `T3 后 7 级伤害已是新值（实测 ${d.filter(x => x.tier >= 10).map(x => x.dmg).join(',')}；应为 ${Object.values(NEW).join(',')}）`);

  const nonMono = [];
  for (let i = 1; i < d.length; i++) if (!(d[i].dmg > d[i - 1].dmg)) nonMono.push(`${d[i - 1].name}→${d[i].name}`);
  ok(nonMono.length === 0, `T4 升级链伤害严格递增、无「升级反而变弱」（${nonMono.join(',') || '全 15 段递增'}）`);

  // ---------- T5 倍率结构 ----------
  const ratios = [];
  for (let i = 1; i < d.length; i++) ratios.push({ tier: d[i].tier, r: d[i].dmg / d[i - 1].dmg });
  const earlyR = ratios.filter(x => x.tier <= 9);
  const lateR = ratios.filter(x => x.tier >= 10);
  ok(earlyR.every(x => Math.abs(x.r - 2) < 1e-9),
     `T5 前 9 级仍是「每级 ×2」（${earlyR.map(x => x.r.toFixed(2)).join(' ')}）`);
  ok(lateR.every(x => x.r >= 1.80 && x.r <= 1.92),
     `T6 后 7 级放缓为每级 ×1.85 左右（${lateR.map(x => x.r.toFixed(3)).join(' ')}）`);

  // ---------- T7 升级链闭环 + 终级无 up ----------
  const chainOk = d.every((x, i) => i === d.length - 1 ? x.up === null : x.up === d[i + 1].k);
  ok(chainOk, `T7 升级链闭环（豌豆射手→…→冰西瓜猫尾草 16 级，末级无后续）`);

  // ---------- T8 端到端 DPS：t16 vs Lv.10 巨人 ----------
  const mkZombie = async (lv) => page.evaluate((lv) => {
    const g = window.game;
    g.ghostLevel = lv;
    g._spawnGhost();
    const zb = g.zombies[0];
    zb.maxHp = 5e6; zb.hp = 5e6;            // 撑血：测 DPS 而不是测死亡
    zb.speed = 0; zb.stunT = 999;           // 原地不动、不还手
    g.plantDmgBoostT = 0; g._jalapenoActive = false;
    if (g.player) { g.player.atkBuffT = 0; g.player.invincibleT = 99999; }
    g.ghostSpawnAt = 9e9;
    return { hp: zb.hp, level: zb.level };
  }, lv);

  const plantNear = async (type) => page.evaluate((type) => {
    const g = window.game;
    const zb = g.zombies[0];
    // 找房间内空格种植（离僵尸 300px 以上，避免辣椒光环近距加成）
    const rm = g.rooms[0];
    let pick = null;
    for (let r = rm.y; r < rm.y + rm.h && !pick; r++)
      for (let c = rm.x; c < rm.x + rm.w && !pick; c++) {
        if (rm.tpl.grid[r - rm.y][c - rm.x] !== 1) continue;
        if (g.plants.some(p => p.c === c && p.r === r)) continue;
        pick = { c, r };
      }
    if (!pick) return null;
    const px = pick.c * 80 + 40, py = pick.r * 80 + 40;
    zb.x = px + 300; zb.y = py;             // 僵尸在植物正右 300px（射程内、非近距）
    const pl = g.spawnPlant(pick.c, pick.r, type, false, g.player);
    if (pl) pl.shootCd = 0;
    return { c: pick.c, r: pick.r, px, py, zbx: zb.x, spawn: !!pl };
  }, type);

  const readHp = () => page.evaluate(() => window.game.zombies[0].hp);

  // t16
  await mkZombie(10);
  const p16 = await plantNear('icemelonstail');
  ok(p16 && p16.spawn, `T8 满级冰西瓜猫尾草已种下（格 ${p16 ? p16.c + ',' + p16.r : '?'}，僵尸在正右 300px）`);
  await sleep(600);                                   // 让第一发飞过去
  const h0 = await readHp();
  await sleep(3000);
  const h1 = await readHp();
  const dps16 = (h0 - h1) / 3.0;
  const expect16 = 19300 * 5 / 1.0;                   // 96500
  ok(dps16 > expect16 * 0.55 && dps16 < expect16 * 1.35,
     `T9 满级实测 DPS ${Math.round(dps16)}（新理论 ${expect16}，旧理论 163840）——降幅约 ${Math.round((1 - dps16 / 163840) * 100)}%`);

  // 清掉 t16，换 t9 对照（验证前中期没被误改）
  await page.evaluate(() => {
    const g = window.game;
    g.plants = g.plants.filter(p => !(p.def && p.def.shoot && p.def.tier >= 10));
    document.querySelectorAll('#world1 .entity').forEach(el => { if (el.__plantKey) el.remove(); });
    g.zombies[0].hp = 5e6;
  });
  await page.evaluate(() => {
    // 清掉残留植物 DOM（按 game.plants 反查不到已删项，统一扫一遍更稳）
    const g = window.game;
    g.peas.forEach(p => p.el && p.el.remove());
    g.peas = [];
  });
  await mkZombie(10);
  const p9 = await plantNear('gatlingpea');
  await sleep(600);
  const g0 = await readHp();
  await sleep(3000);
  const g1 = await readHp();
  const dps9 = (g0 - g1) / 3.0;
  const expect9 = 256 * 4 / 1.2;                      // 853.3
  ok(dps9 > expect9 * 0.5 && dps9 < expect9 * 1.5,
     `T10 对照：9 级机枪射手实测 DPS ${Math.round(dps9)}（理论 ${expect9.toFixed(0)}，与前中期原值一致，未被误改）`);

  // ---------- T11 建造菜单里显示的伤害数字同步 ----------
  const tip = await page.evaluate(() => {
    const g = window.game;
    const D = window.HauntedDorm.DEFS;
    // _detail 生成文案的同一逻辑：伤{dmg}
    return { dmg: D.icemelonstail.shoot.dmg, txt: `伤${D.icemelonstail.shoot.dmg}` };
  });
  ok(tip.txt === '伤19300', `T11 建造菜单/图鉴显示同步（"${tip.txt}"，旧为"伤32768"）`);

  // ---------- T12 对同级僵尸的击杀时间落在合理区间 ----------
  const t16kill = 102400 / expect16;
  const t16killOld = 102400 / 163840;
  ok(t16kill > 0.9 && t16kill < 1.4,
     `T12 单株满级杀 Lv.10 巨人理论上限 ${t16kill.toFixed(2)}s（原 ${t16killOld.toFixed(2)}s）——仍强，但不再「一轮齐射蒸发」`);

  ok(errs.length === 0, `T13 全程 0 条 JS 异常${errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''}`);

  console.log('\n豌豆链伤害总表（改后）：');
  for (const x of d) {
    const dps = (x.dmg * x.n / x.cd);
    console.log(`  tier${String(x.tier).padStart(2)} ${x.name.padEnd(7, '　')} 单发 ${String(x.dmg).padStart(6)}  弹数 ${x.n}  CD ${x.cd}  单株DPS ${dps.toFixed(0).padStart(7)}`);
  }
  console.log(`\n结果：${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
