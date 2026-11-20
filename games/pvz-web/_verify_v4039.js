// v4.0.39 验证：植物数值体系全面重构（阳光夜晚限定 0.4s 自动产出 / 豌豆 1→1024·射程 3→8 格 / 坚果 12 级 /
// 小喷菇 0.4s 产包子 / 路灯花 128🦠 / 毁灭菇 2000🦠·2s·2048 全屏 / 寒冰菇 5s 冰冻特效 / 地刺 4→256 / 僵尸血量 ÷10）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  let pass = 0, fail = 0;
  const ok = (c, n) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n); } };

  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => { const g = window.game; g.gameTime = 8000; g.dnNext = 1e12; }); // 快进出生保护+冻结昼夜切换

  // ===== A1 阳光系链：产 1→512 翻倍、每 0.4s、夜晚限定、升费 25/50/100/200 + 800☀+16🦠 起翻倍、10 级封顶 =====
  const a1 = await p.evaluate(() => {
    const D = window.game.constructor.DEFS;
    const out = { suns: [], costs: [], spores: [], everyOk: true, nightOk: true, n: 1 };
    let id = 'sunshroom';
    while (id) {
      const d = D[id];
      out.suns.push(d.produce && d.produce.sun);
      if (!d.produce || d.produce.every !== 0.4) out.everyOk = false;
      if (!d.nightOnly) out.nightOk = false;
      if (d.up) { out.costs.push(d.up.cost || 0); out.spores.push(d.up.sporeCost || 0); id = d.up.to; out.n++; }
      else id = null;
    }
    return out;
  });
  ok(JSON.stringify(a1.suns) === JSON.stringify([1,2,4,8,16,32,64,128,256,512]), 'A1a 向日葵链产出 1→512 翻倍 10 级 (' + JSON.stringify(a1.suns) + ')');
  ok(JSON.stringify(a1.costs) === JSON.stringify([25,50,100,200,800,1600,3200,6400,12800]) &&
     JSON.stringify(a1.spores) === JSON.stringify([0,0,0,0,16,32,64,128,256]), 'A1b 升费 25/50/100/200 后 800☀+16🦠 起翻倍 (' + JSON.stringify(a1.costs) + ')');
  ok(a1.everyOk && a1.nightOk, 'A1c 全链 0.4s 间隔 + nightOnly 夜晚限定');

  // ===== A2 豌豆链：8☀ 种植、伤害 1→1024、射程 3→8 格(240→640)、升费 16→8192、11 级 =====
  const a2 = await p.evaluate(() => {
    const D = window.game.constructor.DEFS;
    const out = { dmg: [], range: [], costs: [], cost: D.peashooter.cost, cdOk: true, n: 1 };
    let id = 'peashooter';
    while (id) {
      const d = D[id];
      if (!d.shoot || d.shoot.cd !== 1.5 || d.shoot.n !== 1) out.cdOk = false;
      out.dmg.push(d.shoot && d.shoot.dmg);
      out.range.push(d.shoot && d.shoot.range);
      if (d.up) { out.costs.push(d.up.cost || 0); id = d.up.to; out.n++; } else id = null;
    }
    return out;
  });
  ok(a2.cost === 8, 'A2a 豌豆种植费 8 ☀ (cost=' + a2.cost + ')');
  ok(JSON.stringify(a2.dmg) === JSON.stringify([1,2,4,8,16,32,64,128,256,512,1024]), 'A2b 伤害 1→1024 翻倍 11 级 (' + JSON.stringify(a2.dmg) + ')');
  ok(JSON.stringify(a2.range) === JSON.stringify([240,280,320,360,400,440,480,520,560,600,640]), 'A2c 射程 3→8 格 (240→640px)');
  ok(JSON.stringify(a2.costs) === JSON.stringify([16,32,64,128,256,512,1024,2048,4096,8192]) && a2.cdOk, 'A2d 升费 16→8192 翻倍 + 全链 1.5s/发');

  // ===== A3 坚果链：12 级、升费 16…256 纯阳光后 512☀+16🦠 起、血量递增 =====
  const a3 = await p.evaluate(() => {
    const D = window.game.constructor.DEFS;
    const out = { costs: [], spores: [], hps: [], n: 1 };
    let id = 'wallnut';
    while (id) {
      const d = D[id];
      out.hps.push(d.hp);
      if (d.up) { out.costs.push(d.up.cost || 0); out.spores.push(d.up.sporeCost || 0); id = d.up.to; out.n++; } else id = null;
    }
    return out;
  });
  ok(a3.n === 12, 'A3a 坚果链 12 级 (n=' + a3.n + ')');
  ok(JSON.stringify(a3.costs) === JSON.stringify([16,32,64,128,256,512,1024,2048,4096,8192,16384]) &&
     JSON.stringify(a3.spores) === JSON.stringify([0,0,0,0,0,16,32,64,128,256,512]), 'A3b 升费 16→16384，512☀+16🦠 起叠包子');
  ok(a3.hps.every((h, i) => i === 0 || h > a3.hps[i - 1]), 'A3c 血量逐级递增 (' + a3.hps.join('/') + ')');

  // ===== A4 小喷菇链：200☀ 建造、产 1→50 包子每 0.4s、升费 400→204800 翻倍 =====
  const a4 = await p.evaluate(() => {
    const D = window.game.constructor.DEFS;
    const out = { ns: [], costs: [], cost: D.puffshroom.cost, everyOk: true, n: 1 };
    let id = 'puffshroom';
    while (id) {
      const d = D[id];
      if (!d.spore || d.spore.every !== 0.4) out.everyOk = false;
      out.ns.push(d.spore && d.spore.n);
      if (d.up) { out.costs.push(d.up.cost || 0); id = d.up.to; out.n++; } else id = null;
    }
    return out;
  });
  ok(a4.cost === 200 && a4.everyOk, 'A4a 小喷菇 200☀ 建造 + 全链 0.4s 产包子');
  ok(JSON.stringify(a4.ns) === JSON.stringify([1,2,4,8,10,15,20,22,30,40,50]), 'A4b 产包子 1→50 (11 级) (' + JSON.stringify(a4.ns) + ')');
  ok(JSON.stringify(a4.costs) === JSON.stringify([400,800,1600,3200,6400,12800,25600,51200,102400,204800]), 'A4c 升费 400→204800 翻倍');

  // ===== A5 路灯花：128🦠 种、8☀/0.4s、升费 1024/2028/4056/4056、产 32/128/512/1024 =====
  const a5 = await p.evaluate(() => {
    const D = window.game.constructor.DEFS;
    const out = { cost: D.plantern.sporeCost, sun: D.plantern.produce.sun, every: D.plantern.produce.every, ups: [], suns: [], n: 1 };
    let id = 'plantern';
    while (id) {
      const d = D[id];
      if (d.up) { out.ups.push(d.up.sporeCost || 0); id = d.up.to; out.suns.push(D[id].produce.sun); out.n++; } else id = null;
    }
    return out;
  });
  ok(a5.cost === 128 && a5.sun === 8 && a5.every === 0.4, 'A5a 路灯花 128🦠 种植、每 0.4s 产 8 ☀');
  ok(JSON.stringify(a5.ups) === JSON.stringify([1024,2028,4056,4056]) && JSON.stringify(a5.suns) === JSON.stringify([32,128,512,1024]) && a5.n === 5,
     'A5b 升费 1024/2028/4056/4056 🦠、产 32/128/512/1024 (5 级)');

  // ===== A6 地刺 / A7 毁灭菇 / A8 寒冰菇 =====
  const a6 = await p.evaluate(() => {
    const D = window.game.constructor.DEFS;
    return { sw: [D.spikeweed.sporeCost, D.spikeweed.spike.dps, D.spikeweed.up.sporeCost, D.firespikeweed.spike.dps, D.firespikeweed.up.sporeCost, D.spikerock.spike.dps, D.spikerock.up.sporeCost, D.ultimatefirespikeweed.spike.dps],
             doom: [D.doomshroom.sporeCost, D.doomshroom.nuke.dmg, D.doomshroom.nuke.cd],
             ice: D.iceshroom.sporeCost, ghostHp: window.game.constructor.GHOST_LEVELS.map(x => x.hp) };
  });
  ok(JSON.stringify(a6.sw) === JSON.stringify([50,4,250,16,1250,64,6250,256]), 'A6 地刺 50🦠/4 → 250/16 → 1250/64 → 6250/256');
  ok(JSON.stringify(a6.doom) === JSON.stringify([2000,2048,2.0]), 'A7 毁灭菇 2000🦠、每次 2048、每 2s（全屏 homeR 9999）');
  ok(a6.ice === 50, 'A8 寒冰菇 50 🦠');
  ok(JSON.stringify(a6.ghostHp) === JSON.stringify([50,120,300,500,800,1200,1800,2800,5000,10000]), 'A9 僵尸血量链 ÷10 (' + a6.ghostHp.join('/') + ')');

  // ===== D1 白天阳光系不产出 =====
  const d1 = await p.evaluate(async () => {
    const g = window.game;
    g.isNight = false; g.dnNext = 1e12; g.waterBoostT = 0;
    const c = Math.floor(g.player.x / 80) + 1, r = Math.floor(g.player.y / 80);
    g.plants = g.plants.filter(pl => !(pl.def && pl.def.produce)); // 清掉干扰产源
    g.spawnPlant(c, r, 'sunshroom', false, g.player);
    const before = g.player.sun;
    await new Promise(res => setTimeout(res, 1600)); // 应有 4 个 tick
    return { delta: g.player.sun - before };
  });
  ok(d1.delta === 0, 'D1 白天向日葵 0 产出（打盹保底已取消）(Δ=' + d1.delta + ')');

  // ===== D2 夜晚自动产出：无需浇水按键，1.6s ≈ 4 tick ≈ +4 =====
  const d2 = await p.evaluate(async () => {
    const g = window.game;
    g.isNight = true; g.dnNext = 1e12;
    const before = g.player.sun;
    g.player.waterOn = false; g.setWatering(g.player, false);
    await new Promise(res => setTimeout(res, 1600));
    return { delta: g.player.sun - before };
  });
  ok(d2.delta >= 3 && d2.delta <= 6, 'D2 夜晚 L1 向日葵 0.4s 自动产阳光、无需按键 (1.6s Δ=' + d2.delta + ')');

  // ===== D3 路灯花白天也产（非 nightOnly）8☀/0.4s =====
  const d3 = await p.evaluate(async () => {
    const g = window.game;
    g.isNight = false; g.dnNext = 1e12;
    g.plants = g.plants.filter(pl => !(pl.def && pl.def.produce));
    const c = Math.floor(g.player.x / 80) + 1, r = Math.floor(g.player.y / 80);
    g.spawnPlant(c, r, 'plantern', false, g.player);
    const before = g.player.sun;
    await new Promise(res => setTimeout(res, 1600));
    return { delta: g.player.sun - before };
  });
  ok(d3.delta >= 24 && d3.delta <= 40, 'D3 路灯花白天 8☀/0.4s 照常产出 (1.6s Δ=' + d3.delta + ')');

  // ===== D4 浇水不再直接产阳光 =====
  const d4 = await p.evaluate(async () => {
    const g = window.game;
    g.plants = g.plants.filter(pl => !(pl.def && pl.def.produce));
    const c = Math.floor(g.player.x / 80) + 1, r = Math.floor(g.player.y / 80);
    g.spawnPlant(c, r, 'puffshroom', false, g.player); // 身边有植物 → 走催熟分支
    g.setWatering(g.player, true);
    const before = g.player.sun;
    await new Promise(res => setTimeout(res, 1500));
    g.setWatering(g.player, false);
    return { delta: g.player.sun - before, day: !g.isNight };
  });
  ok(d4.delta === 0, 'D4 浇水 1.5s 不再 +☀（产出只来自植物）(Δ=' + d4.delta + ' day=' + d4.day + ')');

  // ===== D5 小怪血量 25+lv×25 & 豌豆实弹伤害 1/发（全新页面：前序测试的高频产出/音效会拖慢长会话页面）=====
  await p.goto('about:blank');
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await p.evaluate(() => { const g = window.game; g.gameTime = 8000; g.dnNext = 1e12; });
  const d5 = await p.evaluate(async () => {
    const g = window.game;
    g.zombies.length = 0; g.peas.length = 0;
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    const initHp = zb.hp;
    // 豌豆种在玩家+2 格，僵尸挪到玩家+3 格（距豌豆 80px < 240 射程）
    const c = Math.floor(g.player.x / 80) + 2, r = Math.floor(g.player.y / 80);
    g.spawnPlant(c, r, 'peashooter', false, g.player);
    zb.x = (c + 1) * 80 + 40; zb.y = r * 80 + 40;
    // 钉住僵尸（中弹后 AI 会走位离开射程）
    const hold = setInterval(() => { zb.x = (c + 1) * 80 + 40; zb.y = r * 80 + 40; zb.path = null; }, 100);
    // 轮询等命中（无头 Chrome rAF 偶发停顿，固定等待会假阴性）
    let hits = 0;
    for (let i = 0; i < 24; i++) {
      await new Promise(res => setTimeout(res, 500));
      hits = initHp - Math.max(0, zb.hp);
      if (hits >= 2) break; // ≥2 发即证明伤害=1/发（50 血掉了 ≥2）
    }
    clearInterval(hold);
    return { initHp, hpLeft: Math.max(0, Math.round(zb.hp)), dead: !!zb.dead,
             hits, expect: 25 + (g.ghostLevel || 1) * 25 };
  });
  ok(d5.expect === 50 && d5.initHp === 50, 'D5a Lv1 小怪血量 25+25=50 (initHp=' + d5.initHp + ')');
  ok(d5.hits >= 2 && d5.hits <= 8, 'D5b 豌豆实弹每次 1 点伤害 (命中 ' + d5.hits + ' 发，每发 1 点)');

  // ===== D6 寒冰菇：5s 冰冻 + 全程特效 =====
  const d6 = await p.evaluate(async () => {
    const g = window.game;
    g.zombies.length = 0; g.peas.length = 0;
    g.plants = g.plants.filter(pl => !pl.def.shoot); // 拆掉武器防干扰
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    zb.maxHp = 1e9; zb.hp = 1e9; // 锁血防环境伤害干扰（D5b 已单独验证过伤害结算）
    zb.x = (Math.floor(g.player.x / 80) + 3) * 80 + 40; zb.y = Math.floor(g.player.y / 80) * 80 + 40; // 挪到空格（避开已占用格——占用格会让 spawnPlant 提前 return）
    g.spawnPlant(Math.floor(zb.x / 80), Math.floor(zb.y / 80), 'iceshroom', false, g.player);
    await new Promise(res => setTimeout(res, 600));
    const mid = { stun: zb.stunT, badge: !!zb._iceBadge, filter: !!(zb.imgEl && zb.imgEl.style.filter.includes('hue-rotate')) };
    // 轮询等冰冻结束（无头浏览器长会话 rAF 偶发节流，固定 5.2s 等待会假阴性）
    let after = null;
    for (let i = 0; i < 80; i++) {
      await new Promise(res => setTimeout(res, 250));
      if (!zb._iceBadge && zb.stunT <= 0) { after = { badge: false, stun: zb.stunT }; break; }
    }
    if (!after) after = { badge: !!zb._iceBadge, stun: zb.stunT, dead: !!zb.dead, n: g.zombies.length };
    return { mid, after, waitedMs: 6000 };
  });
  ok(d6.mid.stun > 4 && d6.mid.badge && d6.mid.filter, 'D6a 种下寒冰菇僵尸冰冻 5s + ❄️徽标 + 冰蓝滤镜 (stun=' + d6.mid.stun.toFixed(1) + ' badge=' + d6.mid.badge + ' filter=' + d6.mid.filter + ')');
  ok(!d6.after.badge && d6.after.stun <= 0, 'D6b 5 秒后冰冻解除、特效消失 (badge=' + d6.after.badge + ' stun=' + d6.after.stun.toFixed(2) + ')');

  // ===== D7 毁灭菇：全屏 2048 真伤秒杀 =====
  const d7 = await p.evaluate(async () => {
    const g = window.game;
    g.zombies.length = 0; g.peas.length = 0;
    g._spawnMinion();
    const zb = g.zombies[g.zombies.length - 1];
    zb.x = g.player.x + 600; zb.y = g.player.y; // 600px：远超旧 450 射程、超豌豆满射程 640 内不必，验证全屏即可
    const hold7 = setInterval(() => { zb.x = g.player.x + 600; zb.y = g.player.y; }, 100); // 钉住防走位
    g.isNight = true; g.dnNext = 1e12; // 毁灭菇是菇类白天睡觉——必须夜晚才开火
    const c = Math.floor(g.player.x / 80) + 2, r = Math.floor(g.player.y / 80) + 1;
    g.spawnPlant(c, r, 'doomshroom', false, g.player);
    let dead7 = false;
    for (let i = 0; i < 24; i++) { // 最长 12s：cd 2s + 弹道 ~1.7s + rAF 抖动余量
      await new Promise(res => setTimeout(res, 500));
      if (zb.dead || zb.hp <= 0) { dead7 = true; break; }
    }
    clearInterval(hold7);
    return { dead: dead7, hp: Math.max(0, Math.round(zb.hp)) };
  });
  ok(d7.dead, 'D7 毁灭菇 900px 外全屏命中、2048 真伤秒杀 Lv1 小怪 (hp=' + d7.hp + ')');

  // ===== D8 僵尸玩家血池 = 50×3 = 150（÷10 与 ×3 叠加） =====
  const d8 = await p.evaluate(() => window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' }) !== false);
  await p.waitForFunction('window.game && window.game.isZombieFaction', { timeout: 30000 });
  const d8v = await p.evaluate(() => ({ hp: window.game.player.maxHp }));
  ok(d8v.hp === 150, 'D8 僵尸玩家血池 50×3=150 (maxHp=' + d8v.hp + ')');

  console.log('-----------------------------');
  console.log('TOTAL: ' + pass + ' pass / ' + fail + ' fail');
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
