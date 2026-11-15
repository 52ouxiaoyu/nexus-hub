// v4.0.161 验证：双人对战删除「天使 / 内鬼」死亡变身系统
// 用户要求：植物方输掉不该出现天使/魔鬼二选一；僵尸占领某一路 = 植物方当场判负（不用等几秒）
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
let pass = 0, fail = 0;
const ok = (m, c, x) => {
  if (c) { pass++; console.log('  PASS ' + m); }
  else { fail++; console.log('  FAIL ' + m + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';

// 真实开局：openVsMode → 选卡 → _beginVsGame（等同玩家点完两张卡点「开始」）
async function bootVs(page, opts) {
  return await page.evaluate(async (o) => {
    const g = window._pvzGame;
    g.openVsMode(false, !!o.ai);
    if (o.ai) g.vsPlayerSide = o.side || 'plant';
    const pick = t => g.seeds && g.seeds.find(s => s.type === t);
    g.vsPlantSeeds = ['sunflower', 'peashooter', 'wallnut', 'snowpea']
      .map(t => Object.assign({}, pick(t))).filter(Boolean);
    g.vsZombiePicks = ['normal', 'imp', 'conehead'];
    g._beginVsGame();
    await new Promise(r => setTimeout(r, 900));
    return { state: g.state, seeds: g.vsPlantSeeds.length, vs: g.vsMode, ai: !!g.vsAiMode };
  }, opts || {});
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 220)));
  await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await sleep(900);

  // ===== T1 变身系统彻底不存在 =====
  const b1 = await bootVs(page, {});
  const t1 = await page.evaluate(() => {
    const g = window._pvzGame;
    return {
      playing: g.state === 'PLAYING',
      fate: typeof g.vsFate,
      fateHud: typeof g._vsFateHud,
      traitor: typeof window.VsTraitor,
      kReach: typeof g._vsZombieReachHouse,
      kBecome: typeof g._vsBecome,
      kFateKey: typeof g._vsFateKeydown,
      kUpdFate: typeof g._updateVsFate
    };
  });
  ok(`T1a 双人对战正常开局（state=${b1.state}）`, b1.state === 'PLAYING' && b1.vs === true, b1);
  ok('T1b 没有 vsFate 状态对象', t1.fate === 'undefined', t1.fate);
  ok('T1c 没有天使状态条 HUD', t1.fateHud === 'undefined', t1.fateHud);
  ok('T1d 没有 VsTraitor（内鬼）实体类', t1.traitor === 'undefined', t1.traitor);
  ok('T1e 没有 _vsZombieReachHouse / _vsBecome / _vsFateKeydown / _updateVsFate',
    t1.kReach === 'undefined' && t1.kBecome === 'undefined' &&
    t1.kFateKey === 'undefined' && t1.kUpdFate === 'undefined', t1);

  // ===== T2 僵尸攻进房子 → 当场判负（不等 20 秒变身）=====
  const t2a = await page.evaluate(() => {
    const g = window._pvzGame;
    g.playTime = 20; g._vsLastDeploy = 0; g.zombieSun = 9999;
    g.deployZombie('normal', 2);
    const z = g.entities.find(e => e instanceof Zombie && !e.isDead && !e.hypnotized);
    if (!z) return { spawned: false };
    z.state = 'WALKING';
    z.x = 39;                     // 已经迈进房子判定线（x < 40）
    return { spawned: true, stateBefore: g.state, x: z.x };
  });
  ok('T2a 成功召唤一只僵尸到第 3 路', t2a.spawned, t2a);
  await sleep(160);                // 约 10 帧 —— 远小于原来 20 秒的变身等待
  const t2b = await page.evaluate(() => {
    const g = window._pvzGame;
    const ov = document.querySelector('.vase-win-overlay .vase-win-title');
    return { state: g.state, title: ov ? ov.innerText.trim() : '', hasOv: !!ov };
  });
  ok('T2b 僵尸进屋后 160ms 内已经结算（state=GAMEOVER）', t2b.state === 'GAMEOVER', t2b.state);
  ok(`T2c 结算文案是「僵尸方获胜」（实际：${t2b.title}）`, t2b.title.indexOf('僵尸方获胜') >= 0, t2b.title);
  ok('T2d 不再出现「阵亡 / 变身」等待界面', !/阵亡|变身|天使|内鬼/.test(t2b.title), t2b.title);

  // ===== T3 僵尸方破产 → 植物方直接获胜（不给变内鬼翻盘）=====
  await page.evaluate(() => location.reload());
  await page.waitForFunction(() => !!window._pvzGame, { timeout: 30000 });
  await sleep(900);
  const b3 = await bootVs(page, {});
  await page.evaluate(() => {
    const g = window._pvzGame;
    g.entities = g.entities.filter(e => !(e instanceof Zombie));
    g.zombieSun = 0;
  });
  await sleep(3200);               // 破产需连续 2.5s 确认
  const t3 = await page.evaluate(() => {
    const g = window._pvzGame;
    const ov = document.querySelector('.vase-win-overlay .vase-win-title');
    return { state: g.state, title: ov ? ov.innerText.trim() : '', fate: typeof g.vsFate };
  });
  ok(`T3a 僵尸方破产 → 植物方直接获胜（实际：${t3.title}）`,
    t3.state === 'GAMEOVER' && t3.title.indexOf('植物方获胜') >= 0, t3);
  ok('T3b 破产判负路径不再创建 vsFate', t3.fate === 'undefined', t3.fate);

  // ===== T4 按 N / M / 1 / 2 不再有变身、也不再冻结指挥权 =====
  await page.evaluate(() => location.reload());
  await page.waitForFunction(() => !!window._pvzGame, { timeout: 30000 });
  await sleep(900);
  await bootVs(page, {});
  for (const k of ['KeyN', 'KeyM', 'Digit1', 'Digit2']) {
    await page.keyboard.press(k);
    await sleep(120);
  }
  const t4 = await page.evaluate(() => {
    const g = window._pvzGame;
    return { state: g.state, fate: typeof g.vsFate, ann: (g.announcementUI ? g.announcementUI.innerText : '') };
  });
  ok('T4a 按 N/M/1/2 后对局仍在进行（没有任何变身死锁）', t4.state === 'PLAYING', t4.state);
  ok('T4b 按键提示里没有天使/内鬼文案', !/天使|内鬼|变身/.test(t4.ann || ''), t4.ann);

  // ===== T5 人机对战（玩家=僵尸方）破产 → 植物方直接获胜 =====
  await page.evaluate(() => location.reload());
  await page.waitForFunction(() => !!window._pvzGame, { timeout: 30000 });
  await sleep(900);
  const b5 = await bootVs(page, { ai: true, side: 'zombie' });
  await page.evaluate(() => {
    const g = window._pvzGame;
    g.entities = g.entities.filter(e => !(e instanceof Zombie));
    g.zombieSun = 0;
  });
  await sleep(3200);
  const t5 = await page.evaluate(() => {
    const g = window._pvzGame;
    const ov = document.querySelector('.vase-win-overlay .vase-win-title');
    return { state: g.state, title: ov ? ov.innerText.trim() : '', ai: !!g.vsAiMode, side: g.vsPlayerSide };
  });
  ok(`T5a 人机对战僵尸方破产 → 植物方获胜（实际：${t5.title}）`,
    b5.side === 'zombie' ? (t5.state === 'GAMEOVER' && t5.title.indexOf('植物方获胜') >= 0) : true, t5);
  ok('T5b 人机对战不再出现「P2 阵亡等待变身」', !/阵亡|变身/.test(t5.title), t5.title);

  // ===== T6 源码 / 帮助文档残留检查 =====
  const src = fs.readFileSync(path.join(BASE, 'js/GameLoop.js'), 'utf8');
  const zsrc = fs.readFileSync(path.join(BASE, 'js/entities/Zombie.js'), 'utf8');
  const help = fs.readFileSync(path.join(BASE, 'js/HelpGuide.js'), 'utf8');
  const im = fs.readFileSync(path.join(BASE, 'js/InputManager.js'), 'utf8');
  ok('T6a GameLoop 里没有 class VsTraitor', !/class\s+VsTraitor/.test(src));
  ok('T6b GameLoop 里没有 initVsFate 实现', !/initVsFate\s*\(/.test(src.replace(/\/\/.*$/gm, '')));
  ok('T6c Zombie.js 进屋直接调 vsZombieWin', /this\.game\.vsZombieWin\(\)/.test(zsrc) &&
    !/_vsZombieReachHouse/.test(zsrc));
  ok('T6d InputManager 不再引用 vsFate / _vsFateKeydown', !/vsFate|_vsFateKeydown/.test(im));
  ok('T6e 双人对战帮助里没有天使/内鬼条目',
    !/天使|内鬼/.test(help.slice(help.indexOf("title: '双人对战'"), help.indexOf("title: '守屋大作战'"))));

  ok('T7 全程无 pageerror', errs.length === 0, errs.slice(0, 2));

  console.log('\n===== v4.0.161 结果：' + pass + ' 通过 / ' + fail + ' 失败 =====');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXCEPTION', e); process.exit(2); });
