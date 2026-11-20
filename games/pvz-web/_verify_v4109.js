// v4.0.109 验证：房间「敞开凹口」（L 形缺角）不再铺室内木地板；封闭庭院（中庭）仍铺
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

  const r = await page.evaluate(() => {
    const g = window.game;
    const G = 80;
    // 页面上实际铺了木地板的格子
    const floored = new Set();
    document.querySelectorAll('#world1 .tile.room, .tile.room').forEach(el => {
      const c = Math.round(parseFloat(el.style.left) / G);
      const rr = Math.round(parseFloat(el.style.top) / G);
      floored.add(rr * 1000 + c);
    });
    const rooms = g.rooms.map((rm, i) => {
      const isHole = (r0, c0) => r0 >= 0 && r0 < rm.h && c0 >= 0 && c0 < rm.w && rm.tpl.grid[r0][c0] !== 1;
      // 外部洞格 = 边界洞格 flood fill 连通到的洞格
      const open = new Set(); const st = [];
      for (let r0 = 0; r0 < rm.h; r0++) for (let c0 = 0; c0 < rm.w; c0++)
        if (isHole(r0, c0) && (r0 === 0 || r0 === rm.h - 1 || c0 === 0 || c0 === rm.w - 1)) { open.add(r0 * 1000 + c0); st.push([r0, c0]); }
      while (st.length) {
        const [r0, c0] = st.pop();
        for (const d of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nr = r0 + d[0], nc = c0 + d[1];
          if (!isHole(nr, nc)) continue;
          const k = nr * 1000 + nc;
          if (open.has(k)) continue;
          open.add(k); st.push([nr, nc]);
        }
      }
      let openCnt = 0, openFloored = 0, solidCnt = 0, solidMissing = 0, innerHole = 0, innerFloored = 0;
      for (let r0 = 0; r0 < rm.h; r0++) for (let c0 = 0; c0 < rm.w; c0++) {
        const k = (rm.y + r0) * 1000 + (rm.x + c0);
        const has = floored.has(k);
        if (isHole(r0, c0)) {
          if (open.has(r0 * 1000 + c0)) { openCnt++; if (has) openFloored++; }
          else { innerHole++; if (has) innerFloored++; }
        } else {
          solidCnt++;
          if (!has) solidMissing++;
        }
      }
      return { i, x: rm.x, y: rm.y, w: rm.w, h: rm.h, openCnt, openFloored, solidCnt, solidMissing, innerHole, innerFloored };
    });
    return { rooms, floorTotal: floored.size };
  });

  const lshape = r.rooms.filter(x => x.openCnt > 0);
  const inner = r.rooms.filter(x => x.innerHole > 0);

  ok(lshape.length > 0, `T1 场景里存在带敞开凹口的房间（L 形）：${lshape.map(x => `房${x.i} 缺角 ${x.openCnt} 格`).join(' / ')}`);
  ok(lshape.every(x => x.openFloored === 0),
     `T2 敞开凹口一格木地板都没有（${lshape.map(x => `房${x.i}: ${x.openFloored}/${x.openCnt} 铺了`).join('，')}）—— 改前是全铺`);
  ok(inner.length > 0, `T3 场景里存在封闭庭院（中庭）：${inner.map(x => `房${x.i} 庭院 ${x.innerHole} 格`).join(' / ')}`);
  ok(inner.every(x => x.innerFloored === x.innerHole),
     `T4 封闭庭院仍照旧铺木地板（${inner.map(x => `房${x.i}: ${x.innerFloored}/${x.innerHole}`).join('，')}，不回退 v4.0.71）`);
  ok(r.rooms.every(x => x.solidMissing === 0),
     `T5 所有房间实心格都铺满地板（缺失 ${r.rooms.filter(x => x.solidMissing > 0).map(x => `房${x.i}:${x.solidMissing}`).join(',') || 0} 格）`);

  const expectTotal = r.rooms.reduce((a, x) => a + x.solidCnt + x.innerHole, 0);
  ok(r.floorTotal === expectTotal, `T6 地板总数对得上（实测 ${r.floorTotal} = 实心格+封闭庭院 ${expectTotal}）`);

  // T7 凹口格确实属于「屋外」——_insideRoom 返回 null（不能种植），与"不铺地板"一致
  const t7 = await page.evaluate(() => {
    const g = window.game;
    // 遍历所有房间找「边界洞格」= 敞开凹口（中庭的洞格在内部，不在此列）
    for (const rm of g.rooms) {
      for (let r0 = 0; r0 < rm.h; r0++) for (let c0 = 0; c0 < rm.w; c0++) {
        if (rm.tpl.grid[r0][c0] !== 1 && (r0 === 0 || r0 === rm.h - 1 || c0 === 0 || c0 === rm.w - 1)) {
          return { inRoom: !!g._insideRoom(rm.x + c0, rm.y + r0), c: rm.x + c0, r: rm.y + r0 };
        }
      }
    }
    return null;
  });
  ok(t7 && t7.inRoom === false, `T7 凹口格不属于房间（格 (${t7 ? t7.c + ',' + t7.r : '?'}) _insideRoom=null，种植判定与视觉一致）`);

  ok(errs.length === 0, `T8 全程 0 条 JS 异常${errs.length ? '：' + errs.slice(0, 2).join(' | ') : ''}`);

  // 输出各房明细，便于人工核对
  console.log('\n各房间明细：');
  for (const x of r.rooms) {
    if (x.openCnt || x.innerHole) console.log(`  房${x.i} (${x.x},${x.y}) ${x.w}×${x.h}  敞开凹口 ${x.openFloored}/${x.openCnt} 铺  庭院 ${x.innerFloored}/${x.innerHole} 铺`);
  }
  console.log(`\n结果：${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
