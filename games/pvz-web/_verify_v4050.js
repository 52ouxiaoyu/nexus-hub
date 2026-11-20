// v4.0.50 验证：①房间封闭性（v4.0.49 洞格不生成墙→中间扣洞未封闭，用户实报；v4.0.50 洞格按实心邻居生成墙→中间庭院四面围死、房间外墙闭合） ②回归：大招/圆圈/控制框/布局多样性
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
    userDataDir: '/tmp/pptr-prof-' + Date.now()
  });

  // ============ 页面 A：植物方主流程（布局/圆圈/控制框/大招） ============
  const p = await browser.newPage();
  p.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p.setViewport({ width: 1600, height: 1000 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=1p&faction=plant&role1=chomper');
  await p.waitForFunction('window.game && window.game.ais && window.game.ais.length>0', { timeout: 30000 });
  await sleep(800);

  // ===== T1 房间布局多样化 =====
  const layout = await p.evaluate(() => {
    const g = window.game;
    const shapes = g.rooms.map(rm => {
      const holes = rm.tpl.grid.flat().filter(v => v === 0).length;
      return { w: rm.w, h: rm.h, holes, door: rm.tpl.door, beds: rm.tpl.beds.length };
    });
    const sizes = new Set(shapes.map(s => s.w + 'x' + s.h));
    const doorDirs = new Set(shapes.map(s => (s.door.r >= s.h ? 'down' : s.door.r < 0 ? 'up' : s.door.c >= s.w ? 'right' : 'left')));
    // 门对门对数：两门朝向相对且门格处于同一条线上（间距≤3 格过道）
    let facingPairs = 0;
    for (let i = 0; i < g.rooms.length; i++) for (let j = i + 1; j < g.rooms.length; j++) {
      const a = g.rooms[i], b = g.rooms[j];
      const dC = a.tpl.door.c, dR = a.tpl.door.r;
      const eC = b.tpl.door.c, eR = b.tpl.door.r;
      const aRight = dC >= a.w, aLeft = dC < 0, bRight = eC >= b.w, bLeft = eC < 0;
      if ((aRight && bLeft) || (aLeft && bRight)) {
        if (Math.abs((a.x + dC) - (b.x + eC)) + Math.abs((a.y + dR) - (b.y + eR)) <= 3) facingPairs++;
      }
    }
    // v4.0.50：E 房中间庭院 4 个洞格必须全部有墙（庭院四面围死、封闭）；G 房 L 形缺口内壁有墙属正常
    let eHoleWall = 0;
    for (const rm of g.rooms) if (rm.x === 14) for (let r = 0; r < rm.h; r++) for (let c = 0; c < rm.w; c++)
      if (rm.tpl.grid[r][c] === 0 && g.walls.has(`${rm.x + c},${rm.y + r}`)) eHoleWall++;
    // v4.0.50：封闭图形核心断言——每个房间实心区边界完全闭合：
    // 每个实心格的上下左右邻格，若非实心且非门，则该邻格必须有墙；内部从门口 BFS 可达全部实心格
    let closedFail = 0, connFail = 0;
    for (const rm of g.rooms) {
      const inR = (r, c) => r >= 0 && r < rm.h && c >= 0 && c < rm.w && rm.tpl.grid[r][c] === 1;
      const isDoor = (r, c) => r === rm.tpl.door.r && c === rm.tpl.door.c;
      for (let r = 0; r < rm.h; r++) for (let c = 0; c < rm.w; c++) {
        if (!inR(r, c)) continue;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = r + dr, nc = c + dc;
          if (isDoor(nr, nc)) continue;
          if (!inR(nr, nc) && !g.walls.has(`${rm.x + nc},${rm.y + nr}`)) closedFail++;
        }
      }
      // 内部连通：从门口内侧的实心格 BFS
      let start = null;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const rr = rm.tpl.door.r + dr, cc = rm.tpl.door.c + dc;
        if (inR(rr, cc)) { start = [rr, cc]; break; }
      }
      if (!start) { connFail++; continue; }
      const seen = new Set([start[0] + ',' + start[1]]);
      const q = [start];
      while (q.length) {
        const [rr, cc] = q.shift();
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = rr + dr, nc = cc + dc;
          if (inR(nr, nc) && !seen.has(nr + ',' + nc)) { seen.add(nr + ',' + nc); q.push([nr, nc]); }
        }
      }
      if (seen.size !== rm.tpl.grid.flat().filter(v => v === 1).length) connFail++;
    }
    // 房间不重叠
    let overlap = 0;
    for (let i = 0; i < g.rooms.length; i++) for (let j = i + 1; j < g.rooms.length; j++) {
      const a = g.rooms[i], b = g.rooms[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
    }
    return { count: g.rooms.length, sizes: [...sizes].join(','), doorDirs: [...doorDirs].join(','), facingPairs, eHoleWall, closedFail, connFail, overlap };
  });
  ok(layout.count === 10, 'T1a 房间总数 10（实际 ' + layout.count + '）');
  ok(layout.sizes.split(',').length >= 4, 'T1b 大小不一（尺寸：' + layout.sizes + '）');
  ok(layout.eHoleWall === 4, 'T1c E 房中间庭院 4 洞格全部有墙（封闭，eHoleWall=' + layout.eHoleWall + '）');
  ok(layout.closedFail === 0, 'T1d 房间外墙全部闭合（封闭图形，closedFail=' + layout.closedFail + '）');
  ok(layout.connFail === 0, 'T1e 房间内部从门口连通全部实心格（connFail=' + layout.connFail + '）');
  ok(layout.overlap === 0, 'T1f 房间互不重叠');
  ok(layout.facingPairs === 1, 'T1g 仅 1 对门对门（实际 ' + layout.facingPairs + '）');
  ok(layout.doorDirs.split(',').length >= 3, 'T1h 门朝向多样（' + layout.doorDirs + '）');

  // ===== T2 回血圆圈上移至最上排房间正中心 =====
  const center = await p.evaluate(() => {
    const g = window.game;
    const sc = g.spawnCenter;
    const scPx = g._spawnCenterPx();
    const topY = Math.min(...g.rooms.map(r => r.y));
    const topRooms = g.rooms.filter(r => r.y === topY);
    const minX = Math.min(...topRooms.map(r => r.x)), maxX = Math.max(...topRooms.map(r => r.x + r.w));
    const minY = Math.min(...topRooms.map(r => r.y)), maxY = Math.max(...topRooms.map(r => r.y + r.h));
    const expectedC = Math.round((minX + maxX) / 2), expectedR = Math.round((minY + maxY) / 2);
    const centerEl = document.querySelector('.tile.center');
    const onWall = g.walls.has(`${sc.c},${sc.r}`);
    const inRoom = !!g._insideRoom(sc.c, sc.r);
    return { c: sc.c, r: sc.r, expectedC, expectedR, scPx: scPx.x + ',' + scPx.y,
             onWall, inRoom, centerElLeft: centerEl ? centerEl.style.left : null, centerElTop: centerEl ? centerEl.style.top : null,
             oldCenterGone: !g.rooms.some(rm => Math.hypot((rm.x + rm.w/2)*80 - 2400, (rm.y + rm.h/2)*80 - 1800) < 10) };
  });
  ok(center.c === center.expectedC && center.r === center.expectedR, 'T2a spawnCenter=最上排房间正中心 (' + center.c + ',' + center.r + ')，期望 (' + center.expectedC + ',' + center.expectedR + ')');
  ok(!center.onWall && !center.inRoom, 'T2b 圆圈中心不在墙内/房内');
  ok(center.centerElLeft === (center.scPx.split(',')[0] - 120) + 'px', 'T2c 圆圈 DOM 已移到新位置（left=' + center.centerElLeft + '）');

  // ===== T3 控制框：出生隐藏 → 认领后显示且按房间位置落角 =====
  const hud0 = await p.evaluate(() => ({
    p1: document.getElementById('hud-p1') ? getComputedStyle(document.getElementById('hud-p1')).display : 'missing',
    p2: document.getElementById('p2-hud') ? getComputedStyle(document.getElementById('p2-hud')).display : 'missing'
  }));
  ok(hud0.p1 === 'none' && hud0.p2 === 'none', 'T3a 出生时 P1/P2 控制框隐藏（p1=' + hud0.p1 + ' p2=' + hud0.p2 + '）');

  // 玩家认领左侧房间 → hud-p1 应显示在左边
  const hudLeft = await p.evaluate(() => {
    const g = window.game;
    g.player.room = null; g.player.room2 = null;
    const leftRm = g.rooms.find(rm => (rm.x + rm.w / 2) * 80 < g.worldWidth / 2);
    g._claimRoom(g.player, leftRm);
    const el = document.getElementById('hud-p1');
    return { display: getComputedStyle(el).display, left: el.style.left, right: el.style.right,
             roomX: leftRm.x, isLeft: (leftRm.x + leftRm.w / 2) * 80 < g.worldWidth / 2 };
  });
  ok(hudLeft.display === 'flex' && hudLeft.left === '20px' && hudLeft.right === 'auto', 'T3b 认领左房后 P1 框显示在左上角（left=' + hudLeft.left + ' right=' + hudLeft.right + '）');

  const hudRight = await p.evaluate(() => {
    const g = window.game;
    g.player.room = null; g.player.room2 = null;
    const rightRm = g.rooms.find(rm => (rm.x + rm.w / 2) * 80 >= g.worldWidth / 2);
    g._claimRoom(g.player, rightRm);
    const el = document.getElementById('hud-p1');
    return { display: getComputedStyle(el).display, left: el.style.left, right: el.style.right };
  });
  ok(hudRight.display === 'flex' && hudRight.right === '20px' && hudRight.left === 'auto', 'T3c 认领右房后 P1 框显示在右上角（left=' + hudRight.left + ' right=' + hudRight.right + '）');

  // ===== T4 大嘴花大招重做：CD30、赶跑全场10s、目标=别人门口/回血台 =====
  const chomp = await p.evaluate(() => {
    const g = window.game;
    const p1 = g.player;
    p1.skillCd = 0;
    // 造两只僵尸
    const z1 = { x: 2000, y: 1600, hp: 500, maxHp: 500, dead: false, retreating: false, lockedTarget: p1 };
    const z2 = { x: 2600, y: 1600, hp: 500, maxHp: 500, dead: false, retreating: false, lockedTarget: p1 };
    g.zombies.push(z1, z2);
    // 一个 AI 幸存者（有房间）
    const ai = g.ais.find(a => !a.dead) || g.ais[0];
    if (ai.room) ai.room2 = ai.room;
    const othersCount = g.ais.filter(v => !v.dead && v !== p1).length;
    g._useSkill(p1);
    const cdSet = p1.skillCd; // 先记 CD，再跑帧
    const scareOK = z1.chomperScareT === 10 && z2.chomperScareT === 10;
    // 赶跑目标应指向某 AI 房间门口或回血台
    let targetIsDoorOrCenter = true;
    for (const z of [z1, z2]) {
      const onDoor = g.rooms.some(rm => Math.hypot(z.scareX - (rm.doorCol * 80 + 40), z.scareY - (rm.doorRow * 80 + 40)) < 1);
      const onCenter = Math.hypot(z.scareX - g._spawnCenterPx().x, z.scareY - g._spawnCenterPx().y) < 1;
      if (!onDoor && !onCenter) targetIsDoorOrCenter = false;
    }
    // 跑一帧验证递减与不回血
    const before = z1.chomperScareT;
    g._tick(0.5);
    const after = z1.chomperScareT;
    const dec = after < before && after >= 9.49;
    // 清理
    g.zombies = g.zombies.filter(z => z !== z1 && z !== z2);
    return { cd: cdSet, scareOK, targetIsDoorOrCenter, othersCount, dec, retreatingReset: !z1.retreating };
  });
  ok(chomp.cd === 30, 'T4a 大嘴花 CD=30s（实际 ' + chomp.cd + '）');
  ok(chomp.scareOK, 'T4b 全场僵尸 chomperScareT=10s');
  ok(chomp.targetIsDoorOrCenter, 'T4c 赶跑目标=别人房间门口/回血台');
  ok(chomp.dec, 'T4d 赶跑计时随帧递减');
  ok(chomp.retreatingReset, 'T4e 赶跑不触发撤退回血（retreating 被清零）');

  // ===== T5 僵尸出生/回血引用同步 =====
  const sync = await p.evaluate(() => {
    const g = window.game;
    const sc = g._spawnCenterPx();
    const ghost = g._ghostSpawnPoint();
    const nearCircle = Math.hypot(ghost.x - sc.x, ghost.y - sc.y) <= 240;
    return { nearCircle };
  });
  ok(sync.nearCircle, 'T5a 僵尸出生点落在圆圈附近');

  // 截图留档
  await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4049_layout.png' });
  await p.close();

  // ============ 页面 B：2p 植物方——双框按房间位置 + 上下住房校正 ============
  const p2 = await browser.newPage();
  p2.on('pageerror', e => console.log('[PAGE ERROR]', e.message));
  await p2.setViewport({ width: 1600, height: 1000 });
  await p2.goto('file:///Users/clawbox/nexus-hub/pvz-web/haunted-dorm.html?mode=2p&faction=plant&role1=chomper&role2=peashooter');
  await p2.waitForFunction('window.game && window.game.player2 && window.game.ais.length>0', { timeout: 30000 });
  await sleep(800);

  const twoP = await p2.evaluate(() => {
    const g = window.game;
    const lRm = g.rooms.find(rm => (rm.x + rm.w / 2) * 80 < g.worldWidth / 2);
    const rRm = g.rooms.find(rm => (rm.x + rm.w / 2) * 80 >= g.worldWidth / 2);
    g.player.room = null; g.player.room2 = null;
    g.player2.room = null; g.player2.room2 = null;
    g._claimRoom(g.player, lRm);
    g._claimRoom(g.player2, rRm);
    const p1el = document.getElementById('hud-p1'), p2el = document.getElementById('p2-hud');
    const res = {
      p1d: getComputedStyle(p1el).display, p1l: p1el.style.left, p1r: p1el.style.right,
      p2d: getComputedStyle(p2el).display, p2l: p2el.style.left, p2r: p2el.style.right
    };
    // 上下住房场景：P1 上房、P2 下房（强制 P1 左 P2 右）
    const upRm = [...g.rooms].sort((a, b) => a.y - b.y)[0];
    const downRm = [...g.rooms].sort((a, b) => b.y - b.h - (a.y - a.h))[0];
    if (upRm === downRm) downRm.y = upRm.y + 12;
    g.player.room = upRm; g.player.room2 = null;
    g.player2.room = downRm; g.player2.room2 = null;
    g._fixVerticalPairHuds();
    res.vp1l = p1el.style.left; res.vp1r = p1el.style.right;
    res.vp2l = p2el.style.left; res.vp2r = p2el.style.right;
    return res;
  });
  ok(twoP.p1d === 'flex' && twoP.p1l === '20px', 'T6a 2p：P1 左房 → P1 框在左上角');
  ok(twoP.p2d === 'flex' && twoP.p2r === '20px', 'T6b 2p：P2 右房 → P2 框在右上角');
  ok(twoP.vp1l === '20px' && twoP.vp1r === 'auto' && twoP.vp2r === '20px' && twoP.vp2l === 'auto', 'T6c 上下住房 → 自动 P1 左、P2 右');
  await p2.close();

  console.log(`\n===== 验证结果: ${pass} PASS / ${fail} FAIL =====`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(2); });
