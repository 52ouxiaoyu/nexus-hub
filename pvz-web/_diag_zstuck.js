// 诊断：僵尸「卡在墙边不动、不吃人、门开了也不挠」
// 手法：僵尸阵营开局 → 强开多波尸潮 → 10 倍速跑 → 每 0.4s 采样每只僵尸
//       判定「卡住」= 连续 5 次采样位移 < 5px 且 60px 内没有活植物（不在啃）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
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

  await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
  await page.waitForFunction('typeof window.startHauntedDorm === "function"', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.clear();
    document.getElementById('start-menu').style.display = 'block';
    document.getElementById('dorm-screen').style.display = 'block';
    window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
  });
  await page.waitForFunction('window.game && window.game.ais.length > 0', { timeout: 30000 });

  // 观察期结束 + 解锁号令尸潮 + 10 倍速
  await page.evaluate(() => {
    const g = window.game;
    g.zombieFreezeT = 0; g.survivorKills = 2; g.waveOrderCd = 0;
    g.timeScale = 10;
  });
  await sleep(1500);

  // 装采样探针
  await page.evaluate(() => {
    const g = window.game;
    window.__st = { samples: 0, stuckEvents: [], frames: 0, pathNull: 0, zombieFrames: 0 };
    const origTick = g._tick.bind(g);
    g._tick = function (dt, gt) {
      origTick(dt, gt);
      const S = window.__st;
      S.frames++;
      for (const z of this.zombies) {
        if (z.dead) continue;
        S.zombieFrames++;
        if (!z.path || z.path.length === 0) S.pathNull++;
      }
    };
  });

  const desc = (t) => {
    if (!t) return 'null';
    if (t._isPlant) return 'plant:' + (t._plant && t._plant.def && t._plant.def.name);
    if (t.isAi) return 'ai:' + (t.roleDef && t.roleDef.name);
    if (t === 'p') return 'player';
    return (t.isZombie ? 'zombieP' : 'player') + ':' + (t.roleDef && t.roleDef.name);
  };

  const trace = {};
  const stuckList = [];
  for (let i = 0; i < 120; i++) {   // 120 × 0.4s = 48s 真实 → 480s 游戏内
    await sleep(400);
    if (i % 15 === 0) {
      // 每 6 秒真实时间强开一波尸潮（否则僵尸阵营里场上根本没有僵尸）
      await page.evaluate(() => {
        const g = window.game;
        if (!g || g.over) return;
        g.zombieFreezeT = 0; g.survivorKills = 2; g.waveOrderCd = 0;
        try { g._orderHorde(); } catch (e) {}
      });
    }
    const snap = await page.evaluate(() => {
      const g = window.game;
      if (!g || g.over) return { over: true };
      const P = (x, y) => Math.floor(x / 80) + ',' + Math.floor(y / 80);
      return {
        gt: Math.round(g.gameTime / 1000),
        zombies: g.zombies.filter(z => !z.dead).map((z, i) => {
          const c = Math.floor(z.x / 80), r = Math.floor(z.y / 80);
          // 周边植物
          let nearPlant = null, nd = 1e9;
          for (const pl of g.plants) {
            const d = Math.hypot(pl.c * 80 + 40 - z.x, pl.r * 80 + 40 - z.y);
            if (d < nd) { nd = d; nearPlant = pl.def.name + '@' + pl.c + ',' + pl.r; }
          }
          const lt = z.lockedTarget;
          return {
            id: z.__diagId == null ? (z.__diagId = Math.random().toString(36).slice(2, 7)) : z.__diagId,
            x: Math.round(z.x), y: Math.round(z.y), cell: c + ',' + r,
            inWall: g.walls.has(c + ',' + r),
            path: z.path ? z.path.length : -1,
            pathHead: z.path && z.path[0] ? Math.round(z.path[0].x) + ',' + Math.round(z.path[0].y) : '-',
            stuck: +(z.stuck || 0).toFixed(2),
            biteT: +(z.biteT || 0).toFixed(2),
            minion: !!z.isMinion, boss: !!z.isBoss,
            lt: lt ? (lt._isPlant ? 'plant:' + (lt._plant && lt._plant.def && lt._plant.def.name) : (lt.isAi ? 'ai:' + (lt.roleDef && lt.roleDef.name) : 'player')) : 'null',
            ltInRoom: lt ? (g._insideRoom(Math.floor(lt.x / 80), Math.floor(lt.y / 80)) ? 1 : 0) : -1,
            near: nearPlant, nearD: Math.round(nd)
          };
        }),
        rooms: g.rooms.map(rm => ({
          x: rm.x, y: rm.y, door: rm.doorCol + ',' + rm.doorRow,
          doorPlant: !!g.getPlantAt(rm.doorCol * 80, rm.doorRow * 80),
          plants: g.plants.filter(pl => pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h).length,
          owner: rm.owner ? (rm.owner.isAi ? 'ai' : 'human') : '-'
        })),
        alive: g.allPlayers.filter(p => !p.dead && !p.isZombie).map(p => ({ n: p.roleDef && p.roleDef.name, ai: !!p.isAi, room: !!p.room })),
        stats: { pathNull: window.__st.pathNull, zombieFrames: window.__st.zombieFrames }
      };
    });
    if (snap.over) { console.log('对局结束于', i * 0.4, 's'); break; }

    for (const z of snap.zombies) {
      const t = trace[z.id] || (trace[z.id] = { last: null, still: 0, reported: false, samples: [] });
      if (t.last) {
        const d = Math.hypot(z.x - t.last.x, z.y - t.last.y);
        t.still = d < 5 ? t.still + 1 : 0;
      }
      t.last = { x: z.x, y: z.y };
      t.samples.push(z);
      if (t.samples.length > 40) t.samples.shift();
      // 卡住：连续 5 次采样几乎不动，且不在啃（附近没有 <70px 的植物）
      if (t.still >= 5 && !t.reported && z.nearD > 70) {
        t.reported = true;
        stuckList.push({ gt: snap.gt, z, hist: t.samples.slice(-6) });
      }
    }
    if (i % 20 === 0) {
      console.log(`[${snap.gt}s] 僵尸 ${snap.zombies.length} 只, 活人 ${snap.alive.length}, 植物 ${snap.rooms.reduce((a, r) => a + r.plants, 0)}, path空 ${snap.stats.pathNull}/${snap.stats.zombieFrames}`);
    }
    if (snap.alive.length === 0 && i > 30) { console.log('幸存者全灭 @', snap.gt, 's'); break; }
  }

  console.log('\n===== 卡住事件 =====', stuckList.length);
  for (const ev of stuckList.slice(0, 6)) {
    console.log(`\n--- 游戏 ${ev.gt}s 卡住 ---`);
    console.log('僵尸', JSON.stringify(ev.z));
    console.log('轨迹', ev.hist.map(h => `${h.x},${h.y}(p${h.path}/s${h.stuck})`).join(' → '));
  }
  const finalStats = await page.evaluate(() => ({
    pathNull: window.__st.pathNull, zombieFrames: window.__st.zombieFrames,
    zombies: window.game ? window.game.zombies.filter(z => !z.dead).length : 0
  }));
  console.log('\npath 为空的僵尸帧占比：', (finalStats.pathNull / Math.max(1, finalStats.zombieFrames) * 100).toFixed(1) + '%');
  console.log('errors:', errors.slice(0, 5));
  await browser.close();
})();
