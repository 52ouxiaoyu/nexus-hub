// v4.0.117 验证：僵尸阵营开局观察期「技能全锁」+「号令尸潮需击杀 2 人解锁」
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✅ ' + msg); } else { fail++; console.log('  ❌ ' + msg); } };

const launch = async () => {
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
  return { browser, page, errors };
};

const startZombie = async (page) => {
  await page.evaluate(() => {
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(400);
};

const snap = (page) => page.evaluate(() => {
  const g = window.game;
  return {
    fz: +g.zombieFreezeT.toFixed(2),
    skillCd: +g.player.skillCd.toFixed(2),
    speedy: +g.player.speedBuffT.toFixed(2),
    waveOrderCd: +g.waveOrderCd.toFixed(1),
    cmd: g.commandTarget ? (g.commandTarget.roleDef ? g.commandTarget.roleDef.name : 'x') : null,
    zombies: g.zombies.length,
    kills: g.survivorKills,
    unlocked: g._hordeUnlocked(),
    hud: (document.getElementById('skill-hud') || {}).innerText.replace(/\s+/g, ' ') || '',
    x: Math.round(g.player.x), y: Math.round(g.player.y)
  };
});

(async () => {
  let { browser, page, errors } = await launch();
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
  });
  await startZombie(page);

  // ---------- T1 观察期内：技能键全部无效 ----------
  const a0 = await snap(page);
  ok(a0.fz > 5, `T1a 开局处于观察期（剩余 ${a0.fz}s）`);
  await page.keyboard.press('m'); await sleep(150);
  await page.keyboard.press('g'); await sleep(150);
  await page.keyboard.press('h'); await sleep(250);
  const a1 = await snap(page);
  ok(a1.speedy === 0 && a1.skillCd === 0, `T1b 观察期内 M 狂暴冲刺放不出来（speedBuffT=${a1.speedy}，改前能放）`);
  ok(a1.cmd === null, `T1c 观察期内 G 令旗不响应（目标=${a1.cmd}，改前会切到某位幸存者）`);
  ok(a1.waveOrderCd === 0 && a1.zombies === 0, `T1d 观察期内 H 号令尸潮不响应（CD=${a1.waveOrderCd}，场上僵尸 ${a1.zombies}，改前立刻刷 3~6 只）`);
  ok(/观察期/.test(a1.hud) && /锁定/.test(a1.hud), `T1e 技能栏显示观察期锁定：${a1.hud.slice(0, 40)}`);

  // ---------- T2 观察期内依然不能移动（老行为保持） ----------
  const m0 = await snap(page);
  await page.keyboard.down('d'); await sleep(900); await page.keyboard.up('d'); await sleep(120);
  const m1 = await snap(page);
  ok(Math.abs(m1.x - m0.x) < 3 && Math.abs(m1.y - m0.y) < 3, `T2 观察期内不能移动（x ${m0.x}→${m1.x}）`);

  // ---------- T3 观察期结束：能动，但号令尸潮仍锁着（0/2） ----------
  await sleep(10500);
  const b0 = await snap(page);
  ok(b0.fz <= 0, `T3a 观察期已结束（剩余 ${b0.fz}s）`);
  ok(b0.unlocked === false && b0.kills === 0, `T3b 未击杀幸存者 → 号令尸潮仍锁定（${b0.kills}/2）`);
  ok(/0\/2|1\/2/.test(b0.hud) && /解锁/.test(b0.hud), `T3c HUD 提示解锁进度：${b0.hud.slice(0, 60)}`);
  await page.keyboard.press('h'); await sleep(300);
  const b1 = await snap(page);
  ok(b1.zombies === 0 && b1.waveOrderCd === 0, `T3d 锁定状态下按 H 不出僵尸（场上 ${b1.zombies} 只，CD ${b1.waveOrderCd}）`);

  // ---------- T4 观察期结束后 G 令旗恢复可用（不能因为封锁把正常指挥也锁死） ----------
  await page.keyboard.press('g'); await sleep(300);
  const b2 = await snap(page);
  ok(b2.cmd !== null, `T4 观察期结束后 G 令旗可用（目标 → ${b2.cmd}）`);

  // ---------- T5 真实咬死 1 名幸存者 → 进度 1/2，仍锁定 ----------
  const biteOne = () => page.evaluate(async () => {
    const g = window.game;
    const ai = g.ais.find(a => !a.dead && !a.isTraitor);
    if (!ai) return { skip: true };
    ai.room = null; ai.pinned = false; ai.path = null; ai.fleeing = false;
    ai.maxHp = 600;
    // 人机每帧都会跑开 → 每帧把它按回玩家嘴边并压低血量，让「接触啃咬」自然触发（biteT 累加 1.5s）
    let frames = 0;
    while (!ai.dead && frames < 240) {          // 最多 4 秒
      ai.x = g.player.x + 40; ai.y = g.player.y;
      ai.hp = Math.min(ai.hp, 40);
      await new Promise(r => requestAnimationFrame(r));
      frames++;
    }
    return { kills: g.survivorKills, unlocked: g._hordeUnlocked(), aiDead: ai.dead, frames };
  });
  const k1 = await biteOne();
  ok(!k1.skip && k1.kills === 1 && k1.unlocked === false,
     `T5 亲手咬死 1 人 → 进度 ${k1.kills}/2，仍锁定（aiDead=${k1.aiDead}）`);
  await page.keyboard.press('h'); await sleep(300);
  const c1 = await snap(page);
  ok(c1.zombies === 0, `T5b 1/2 时按 H 仍不出僵尸（场上 ${c1.zombies}）`);

  // ---------- T6 咬死第 2 人 → 解锁，H 生效 ----------
  const k2 = await biteOne();
  ok(!k2.skip && k2.kills === 2 && k2.unlocked === true,
     `T6a 咬死第 2 人 → 解锁（进度 ${k2.kills}/2）`);
  await page.evaluate(() => window.game._refreshHud());
  await sleep(200);
  const c2 = await snap(page);
  ok(!/解锁/.test(c2.hud) && /号令尸潮/.test(c2.hud), `T6b HUD 不再显示解锁进度：${c2.hud.slice(0, 60)}`);
  await page.keyboard.press('h'); await sleep(400);
  const c3 = await snap(page);
  ok(c3.zombies > 0 && c3.waveOrderCd > 0, `T6c 解锁后按 H 真的出尸潮（场上 ${c3.zombies} 只，CD ${c3.waveOrderCd}s）`);

  // ---------- T7 重开一局：解锁进度归零，观察期重新计 ----------
  await startZombie(page);
  const d0 = await snap(page);
  ok(d0.kills === 0 && d0.unlocked === false && d0.fz > 5,
     `T7 重开一局进度归零且回到观察期（kills=${d0.kills}，冻结 ${d0.fz}s）`);

  // ---------- T8 植物阵营不受影响：技能照常可放 ----------
  await page.evaluate(() => {
    window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'sunflower' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });
  await sleep(1200);
  const e0 = await snap(page);
  await page.keyboard.press('m'); await sleep(400);
  const e1 = await snap(page);
  ok(e0.fz === 0 && e1.skillCd > 0, `T8 植物阵营无观察期、M 技能正常（CD ${e1.skillCd}s）`);

  ok(errors.length === 0, `T9 全程 0 报错（${errors.slice(0, 2).join(' | ')}）`);

  console.log(`\n===== v4.0.117 结果：${pass} 通过 / ${fail} 失败 =====`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
