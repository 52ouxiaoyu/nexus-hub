// v4.0.43 验证（终版）：玩家进内鬼旁空房装门 → 观测 挠门→破门→进屋咬人
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

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
  await new Promise(r => setTimeout(r, 1000));

  // 揭露内鬼
  await p.evaluate(() => {
    const g = window.game;
    g.traitor = g.ais[0];
    g.traitorRevealAt = 0;
    g.traitorRevealed = false;
  });
  await new Promise(r => setTimeout(r, 1200));

  // 把玩家安置到距内鬼最近的空房：认领 + 装门（这样内鬼的最近目标必是玩家且目标在房内）
  const t0 = await p.evaluate(() => {
    const g = window.game, t = g.traitor;
    let best = null, bd = Infinity;
    for (const r of g.rooms) {
      if (r.owners && r.owners.length) continue;
      const d = Math.hypot((r.x + r.w / 2) * 80 - t.x, (r.y + r.h / 2) * 80 - t.y);
      if (d < bd) { bd = d; best = r; }
    }
    g.player.x = (best.x + best.w / 2) * 80;
    g.player.y = (best.y + best.h / 2) * 80;
    g._claimRoom(g.player, best);
    if (!g.getPlantAt(best.doorCol * 80, best.doorRow * 80)) {
      g.spawnPlant(best.doorCol, best.doorRow, 'wallnut', true, g.player);
    }
    window._prm = best;
    return { door: !!g.getPlantAt(best.doorCol * 80, best.doorRow * 80), dist: Math.round(bd) };
  });
  ok(t0.door, 'T0 玩家已入住内鬼旁空房(距' + t0.dist + 'px)且装好门板');

  // ===== T1-T4 挠门：门血量下降 + 飘字 + 内鬼贴门 =====
  const t2 = await p.evaluate(async () => {
    const g = window.game, t = g.traitor, rm = window._prm;
    window._flyLog = [];
    const orig = g._flyText.bind(g);
    g._flyText = (x, y, txt, color) => { window._flyLog.push(String(txt)); orig(x, y, txt, color); };
    const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    const hp0 = door.hp;
    let scratched = false, doorGone = false, minPct = 100, nearDoor = false;
    for (let i = 0; i < 60 && !t.dead; i++) {
      await new Promise(res => setTimeout(res, 500));
      t.hp = t.maxHp; if (t.trHpFg) t.trHpFg.style.width = '100%'; // 维持内鬼存活（防玩家火力击杀干扰）
      const d2 = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
      if (!d2) { doorGone = true; scratched = true; }
      else {
        minPct = Math.min(minPct, Math.round(d2.hp / d2.maxHp * 100));
        if (d2.hp < hp0) scratched = true;
      }
      nearDoor = Math.hypot(t.x - (rm.doorCol * 80 + 40), t.y - (rm.doorRow * 80 + 40)) < 130;
      if (scratched && window._flyLog.some(s => s.includes('挠门'))) break;
    }
    return { scratched, doorGone, minPct, nearDoor, flyScratch: window._flyLog.some(s => s.includes('挠门')), dead: !!t.dead };
  });
  ok(!t2.dead, 'T1 内鬼存活');
  ok(t2.scratched || t2.doorGone, 'T2 内鬼挠门：门血量下降或被拆 (门血最低=' + t2.minPct + '% doorGone=' + t2.doorGone + ')');
  ok(t2.flyScratch, 'T3 出现「挠门」飘字');
  ok(t2.nearDoor, 'T4 内鬼贴在门口而非卡墙');

  // ===== T5/T6 破门后进屋咬人 =====
  const t5 = await p.evaluate(async () => {
    const g = window.game, t = g.traitor, rm = window._prm;
    if (t.dead) return { dead: true };
    const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    if (door) { door.el1.remove(); g.plants = g.plants.filter(pl => pl !== door); } // 模拟破门
    t.path = null;
    const hp0 = g.player.hp;
    let bitten = false, inside = false;
    for (let i = 0; i < 30 && !t.dead; i++) {
      await new Promise(res => setTimeout(res, 500));
      t.hp = t.maxHp; if (t.trHpFg) t.trHpFg.style.width = '100%';
      inside = !!g._insideRoom(Math.floor(t.x / 80), Math.floor(t.y / 80));
      if (g.player.hp < hp0 - 0.5) { bitten = true; break; }
    }
    return { bitten, inside, hpDropped: Math.round(hp0 - Math.max(0, g.player.hp)), dead: !!t.dead };
  });
  ok(!t5.dead && t5.bitten, 'T5 破门后内鬼进屋咬到玩家 (掉血=' + (t5.hpDropped || 0) + ')');
  ok(t5.inside, 'T6 内鬼进入玩家房间 (inside=' + t5.inside + ')');

  console.log(`\nTOTAL: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
