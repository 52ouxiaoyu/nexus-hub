// v4.0.101 验证：守屋 2p 挂机托管——任一玩家 10s 无本方键位输入 → AI 托管（实力≈人机）；一按本方键立即归还
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await p.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await p.evaluate(() => {
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'sunflower' });
  });
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0 && window.game.player2', { timeout: 30000 });

  // T1 初始无托管
  let r = await p.evaluate(() => ({
    mode: window.game.gameMode,
    host1: !!window.game.player._afkHost,
    host2: !!window.game.player2._afkHost
  }));
  ok(`T1 2p 模式开局双方均未托管（mode=${r.mode}）`, r.mode === '2p' && !r.host1 && !r.host2);

  // T2 前 6 秒：P1 定期按键保持活跃 → P1 不托管；P2 完全不动 → 仍不足 10s 不托管
  for (let i = 0; i < 4; i++) {
    await p.keyboard.press('KeyW');
    await sleep(1500);
  }
  r = await p.evaluate(() => ({ host1: !!window.game.player._afkHost, host2: !!window.game.player2._afkHost }));
  ok('T2 P1 持续按键 6s 不托管', !r.host1);
  ok('T2b P2 静默 6s（<10s）尚未托管', !r.host2);

  // T3 继续静默到 11s+：P2 应被托管；P1 继续按键不托管
  for (let i = 0; i < 5; i++) { await p.keyboard.press('KeyW'); await sleep(1200); }
  r = await p.evaluate(() => ({
    host1: !!window.game.player._afkHost,
    host2: !!window.game.player2._afkHost,
    ann: window.game.announcementUI ? window.game.announcementUI.innerText : ''
  }));
  ok('T3a P2 静默 10s+ → AI 托管激活', r.host2 === true);
  ok('T3b P1 全程按键 → 始终不托管', r.host1 === false);
  // 播报走 #wave-announce（2.2s 后移除）或仍在 announceQueue
  r = await p.evaluate(() => {
    const w = document.getElementById('wave-announce');
    const q = (window.game.announceQueue || []).map(a => a.text).join('|');
    return { seen: (w && w.innerText.includes('AI 开始托管')) || q.includes('AI 开始托管') };
  });
  ok('T3c 播报出现「AI 开始托管」', r.seen);

  // T4 托管 AI 真的在干活：观察 12s。给 P2 无敌防 AI 带出门被咬死（托管行为本身不受影响）
  await p.evaluate(() => { window.game.player2.invincibleT = 99999; });
  const before = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    return { x: p2.x, y: p2.y, sun: p2.sun, plants: g.plants.filter(pl => pl.owner === g.player2).length, path: !!(p2.path && p2.path.length) };
  });
  await sleep(12000);
  const after = await p.evaluate(() => {
    const g = window.game, p2 = g.player2;
    return { x: p2.x, y: p2.y, sun: p2.sun, plants: g.plants.filter(pl => pl.owner === g.player2).length, path: !!(p2.path && p2.path.length) };
  });
  const acted = after.sun !== before.sun || after.plants !== before.plants ||
    Math.hypot(after.x - before.x, after.y - before.y) > 8 || after.path;
  ok(`T4 托管期间 P2 有 AI 行动（sun ${before.sun}→${after.sun}，植物 ${before.plants}→${after.plants}，移动 ${Math.hypot(after.x - before.x, after.y - before.y).toFixed(0)}px）`, acted);

  // T5 按 P2 键（方向键）→ 立即归还控制权，path 清空
  await p.keyboard.press('ArrowUp');
  await sleep(300);
  r = await p.evaluate(() => ({ host2: !!window.game.player2._afkHost, path: window.game.player2.path }));
  ok('T5a P2 按本方键 → 托管立即解除', r.host2 === false);
  ok('T5b 归还时 AI 寻路已清空（不再自动走）', !r.path || r.path.length === 0);

  // T6 归还后再次静默 → 10s 后再次托管（无敌续期防死）
  await p.evaluate(() => { window.game.player2.invincibleT = 99999; });
  await sleep(10500);
  r = await p.evaluate(() => ({ host2: !!window.game.player2._afkHost, dead: window.game.player2.dead }));
  ok(`T6 归还后再静默 10s → 再次托管（P2 dead=${r.dead}）`, r.host2 === true);

  // T7 P1 全程活跃（每 3s 按键）验证到底：P1 永不托管
  for (let i = 0; i < 4; i++) { await p.keyboard.press('KeyS'); await sleep(2800); }
  r = await p.evaluate(() => ({ host1: !!window.game.player._afkHost, host2: !!window.game.player2._afkHost, dead2: window.game.player2.dead }));
  ok(`T7 P1 持续活跃仍不托管（P2 保持托管，dead=${r.dead2}）`, r.host1 === false && r.host2 === true);

  ok('T8 无 JS 错误' + (errs.length ? ': ' + errs[0] : ''), errs.length === 0);
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
