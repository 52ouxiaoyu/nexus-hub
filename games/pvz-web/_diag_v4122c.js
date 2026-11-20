// v4.0.122 探针3：P1 倒下→抉择（天使/内鬼）后 P2 血量与血条 DOM
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const boot = async (page) => {
  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"');
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ gameMode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await page.waitForFunction('window.game && window.game.player2');
  await sleep(1200);
};

const snap = () => {
  const g = window.game, p1 = g.player, p2 = g.player2;
  return {
    p1: { hp: Math.round(p1.hp), max: p1.maxHp, dead: !!p1.dead, fate: !!p1.pendingFate, angel: !!p1.angelic, traitor: !!p1.traitor },
    p2: { hp: Math.round(p2.hp), max: p2.maxHp, dead: !!p2.dead, angel: !!p2.angelic, traitor: !!p2.traitor },
    dom: {
      f1: document.getElementById('hp-fill').style.width, n1: document.getElementById('hp-num').innerText,
      f2: document.getElementById('hp-fill2').style.width, n2: document.getElementById('hp-num2').innerText
    }
  };
};

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message)));

  // ---- 场景 1：P1 倒下 → 按 N 变天使 ----
  await boot(p);
  const s1 = await p.evaluate(async () => {
    const g = window.game;
    g.player2.hp = 40; g.player2.maxHp = 100; g.setHp();
    g.player.hp = -5; g._checkP1Down();
    await new Promise(r => setTimeout(r, 300));
    return { step: 'after-down', snap: null };
  });
  const before1 = await p.evaluate(snap);
  await p.keyboard.press('KeyN');
  await sleep(900);
  const after1 = await p.evaluate(snap);

  // ---- 场景 2：重开 → P1 倒下 → 按 M 变内鬼 ----
  await boot(p);
  await p.evaluate(() => {
    const g = window.game;
    g.player2.hp = 40; g.player2.maxHp = 100; g.setHp();
    g.player.hp = -5; g._checkP1Down();
  });
  await sleep(300);
  const before2 = await p.evaluate(snap);
  await p.keyboard.press('KeyM');
  await sleep(900);
  const after2 = await p.evaluate(snap);

  // ---- 场景 3：P2 自己倒下 → 按 1 变天使（对照）----
  await boot(p);
  await p.evaluate(() => {
    const g = window.game;
    g.player2.hp = -5; g._checkPlayerDown(g.player2);
  });
  await sleep(300);
  const before3 = await p.evaluate(snap);
  await p.keyboard.press('Digit1');
  await sleep(900);
  const after3 = await p.evaluate(snap);

  console.log('S1 变天使 before:', JSON.stringify(before1, null, 1));
  console.log('S1 变天使 after :', JSON.stringify(after1, null, 1));
  console.log('S2 变内鬼 before:', JSON.stringify(before2, null, 1));
  console.log('S2 变内鬼 after :', JSON.stringify(after2, null, 1));
  console.log('S3 P2天使 before:', JSON.stringify(before3, null, 1));
  console.log('S3 P2天使 after :', JSON.stringify(after3, null, 1));
  console.log('pageerrors:', errs.slice(0, 4));
  await b.close();
})();
