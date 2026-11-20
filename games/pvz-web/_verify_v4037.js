// v4.0.37 验证：删除「AI 修补」——门板受伤后 AI 不再瞬间回血
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
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=zombie&role1=peashooter');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });

  // W1: 门板打到 40% + AI 满阳光，20 秒内 hp 不得回升、不得出现「AI 修补」飘字
  const w1 = await p.evaluate(async () => {
    const g = window.game;
    const ai = g.ais[0];
    const rm = ai.targetRoom;
    // 直通认领，确保 myPlants 归属该 AI
    ai.room = rm; rm.owners.push(ai);
    const door = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
    if (!door) return { err: 'no door' };
    door.hp = door.maxHp * 0.4;
    ai.sun = 500; ai.actTimer = 0.1; ai.path = []; // 让 AI 立刻、持续行动
    // hook 飘字与升级（升级门=满血换新，是合法机制；修补=原地 +800 回血，已删）
    window._flyLog = []; window._evolveLog = [];
    const orig = g._flyText.bind(g);
    g._flyText = (x, y, txt, color) => { window._flyLog.push(String(txt)); orig(x, y, txt, color); };
    const origEv = g._evolve.bind(g);
    g._evolve = (pl, to) => { if (pl.isDoor) window._evolveLog.push(pl.hp); origEv(pl, to); };
    let maxHpSeen = door.hp;
    for (let i = 0; i < 40; i++) { // 20s 采样
      await new Promise(r => setTimeout(r, 500));
      const d2 = g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80);
      if (d2) maxHpSeen = Math.max(maxHpSeen, d2.hp);
      else { maxHpSeen = -1; break; } // 门被啃没（玩家没啃，不应发生）
    }
    const grewWithoutEvolve = maxHpSeen > door.maxHp * 0.4 + 1 && window._evolveLog.length === 0;
    return {
      repaired: grewWithoutEvolve,
      maxHpSeen: Math.round(maxHpSeen),
      evolveCnt: window._evolveLog.length,
      flyHasRepair: window._flyLog.some(t => t.includes('修补')),
      flyKinds: [...new Set(window._flyLog)].slice(0, 6),
      aiSun: Math.round(ai.sun)
    };
  });
  ok(!w1.repaired, 'W1 无升级时门板血量从未回升（AI 修补已删） (峰值=' + w1.maxHpSeen + ' 升级次数=' + w1.evolveCnt + ')');
  ok(!w1.flyHasRepair, 'W2 全程无「AI 修补」飘字 (飘字种类=' + JSON.stringify(w1.flyKinds) + ')');

  // W3: repair 删除没搞坏 AI 决策链——AI 仍有种植/升级等行动
  const w3 = await p.evaluate(async () => {
    const g = window.game;
    const ai = g.ais[0];
    ai.sun = 500; ai.actTimer = 0.1;
    window._flyLog3 = [];
    const orig = g._flyText.bind(g);
    g._flyText = (x, y, txt, color) => { window._flyLog3.push(String(txt)); orig(x, y, txt, color); };
    for (let i = 0; i < 12; i++) { // 6s
      await new Promise(r => setTimeout(r, 500));
    }
    return { acts: [...new Set(window._flyLog3)] };
  });
  ok(w3.acts.some(t => t.includes('AI ')), 'W3 AI 决策链正常（仍有种植/升级等行动） (飘字=' + JSON.stringify(w3.acts.slice(0, 5)) + ')');

  await browser.close();
  console.log('RESULT ' + pass + ' pass / ' + fail + ' fail');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
