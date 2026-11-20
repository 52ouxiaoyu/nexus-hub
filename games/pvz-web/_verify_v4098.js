// v4.0.98 验证：①内鬼跳板乒乓修复（出房后不再回房，正常走向目标挠门）②揭露播报只说「XX变成了内鬼」
const path = require('path');
const puppeteer = require('puppeteer');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGE ERROR]', String(e).slice(0, 200)));
  await page.goto('file://' + path.join(BASE, 'haunted-dorm.html?mode=1p&faction=plant&role1=peashooter'), { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(1000);

  // 场景：玩家入住一个空房并装门（内鬼目标），快进揭露
  const setup = await page.evaluate(() => {
    const g = window.game;
    // 找一个无主空房，与内鬼的房不同
    const t = g.traitor;
    const free = g.rooms.find(rm => (!rm.owners || rm.owners.length === 0) && rm !== t.room);
    // 玩家入住：占床
    const bed = free.tpl.grid.map((row, r) => ({ row, cols: row.reduce((a, v, c) => (v === 2 ? [...a, c] : a), []) }))
      .flatMap(x => x.cols.map(c => ({ c: free.x + x.c, r: free.y + x.row })));
    const bedCell = bed[0] || { c: free.x + 1, r: free.y + 1 };
    g.player.x = bedCell.c * 80 + 40;
    g.player.y = bedCell.r * 80 + 40;
    if (!free.owners.includes(g.player)) free.owners.push(g.player);
    g.player.room = free;
    // 装门（真实种植通道，免费门板）
    g.spawnPlant(free.doorCol, free.doorRow, 'wallnut', true, g.player);
    const door = g.plants.find(q => q.isDoor && q.c === free.doorCol && q.r === free.doorRow);
    // 关干扰
    g.zombiesPerMin = 0;
    g.ais.forEach(a => { if (a !== t) a.actTimer = 9999; });
    // 快进揭露 + hook 播报（announcementUI 会被后续播报覆盖，必须 hook 记录）
    window._annLog = [];
    const _origAnn = g._announce.bind(g);
    g._announce = (txt, sfx, big) => { window._annLog.push(txt); return _origAnn(txt, sfx, big); };
    g.traitorRevealAt = g.gameTime + 2000;
    return { doorOk: !!door, freeId: g.rooms.indexOf(free), traitorRoomId: g.rooms.indexOf(t.room) };
  });
  ok('S0 玩家入住空房且门板就位', setup.doorOk);

  await sleep(3500); // 等揭露

  // ===== T1 揭露播报文案 =====
  const ann = await page.evaluate(() => {
    const g = window.game;
    const line = (window._annLog || []).find(s => s.includes('变成了内鬼')) || '';
    return { text: line, all: (window._annLog || []).join(' | '), revealed: g.traitorRevealed, name: g.traitor.roleDef.name };
  });
  ok('T1a 内鬼已揭露', ann.revealed);
  ok(`T1b 播报为「😈 【${ann.name}】变成了内鬼！」`, ann.text.includes(`【${ann.name}】变成了内鬼`));
  ok('T1c 揭露播报不含行为说明书（挠门/护好/重赏/反水了）', ann.text !== '' && !ann.text.includes('挠门') && !ann.text.includes('护好') && !ann.text.includes('重赏') && !ann.text.includes('反水了'));

  // ===== T2/T3 行为观测 24 秒：出房不回房（无乒乓）+ 走到目标门口挠门 =====
  const obs = await (async () => {
    let flyCount = 0, inRoomFrames = 0, frames = 0, minDoorPct = 100, doorGone = false;
    let lastPos = null, totalDist = 0, stuckFrames = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const s = await page.evaluate(() => {
        const g = window.game;
        const t = g.traitor;
        if (!t || t.dead) return { dead: true };
        const bcol = Math.floor(t.x / g.gridSize), brow = Math.floor(t.y / g.gridSize);
        const rm = g._insideRoom(bcol, brow);
        // 目标房门血量
        const free = g.rooms.find(r => r.owners.includes(g.player));
        const door = g.plants.find(q => q.isDoor && q.c === free.doorCol && q.r === free.doorRow);
        return {
          dead: false, fly: !!t._jumpFly, inTarget: rm === free, inOwn: t.room ? rm === t.room : false,
          x: Math.round(t.x), y: Math.round(t.y),
          doorPct: door ? Math.max(0, door.hp / door.maxHp * 100) : (doorGoneLocal(g, free) ? -1 : 0)
        };
        function doorGoneLocal(g, free) {
          return !g.plants.some(q => q.isDoor && q.c === free.doorCol && q.r === free.doorRow);
        }
      });
      if (s.dead) break;
      frames++;
      if (s.fly) flyCount++;
      if (s.inOwn) inRoomFrames++;
      if (s.doorPct >= 0 && s.doorPct < minDoorPct) minDoorPct = s.doorPct;
      if (s.doorPct === -1) doorGone = true;
      if (lastPos) {
        const d = Math.hypot(s.x - lastPos.x, s.y - lastPos.y);
        if (d < 2) stuckFrames++; else totalDist += d;
      }
      lastPos = { x: s.x, y: s.y };
      // 门破或内鬼进目标房即可提前结束
      if (doorGone || s.inTarget) break;
      await sleep(1000);
    }
    return { frames, flyCount, inRoomFrames, minDoorPct, doorGone, totalDist: Math.round(totalDist), stuckFrames };
  })();
  console.log(`  [观测] ${obs.frames}帧 fly=${obs.flyCount} 在自己房=${obs.inRoomFrames}帧 移动=${obs.totalDist}px 门血最低=${obs.minDoorPct.toFixed(0)}% 门破=${obs.doorGone}`);

  ok(`T2a 内鬼持续移动（24s 内累计位移 ${obs.totalDist}px，非站桩）`, obs.totalDist > 400);
  ok(`T2b 跳板乒乓消失（fly 帧数=${obs.flyCount}，≤2 次属正常出门；修复前 24s 内 3~4 次）`, obs.flyCount <= 2);
  ok('T2c 内鬼大部分时间不在自己房里（去外面挠目标了）', obs.inRoomFrames <= obs.frames * 0.4);
  ok(`T3 目标门被挠（血量降到 ${obs.minDoorPct.toFixed(0)}% 或已破）`, obs.doorGone || obs.minDoorPct < 95);

  await browser.close();
  console.log(`\n${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
