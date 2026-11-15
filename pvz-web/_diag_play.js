/* 实战抽样：复用 _verify_v4150 第 ⑪ 段的自动铺场机器人，检查新配比下这关还打不打得赢 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LEVELS = process.argv.slice(2).map(Number);
const LIST = LEVELS.length ? LEVELS : [1, 2, 4, 7, 10];
(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
    userDataDir: '/tmp/pptr-play-' + Date.now()
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
  await p.waitForFunction('window._pvzGame');
  await sleep(500);
  const REPS = Number(process.env.REPS || 2);
  for (const lvNo of LIST) for (let rep = 0; rep < REPS; rep++) {
    const r = await p.evaluate(async (lvNo) => {
      const g = window._pvzGame;
      g._startVaseLevel(lvNo);
      await new Promise(r => setTimeout(r, 900));
      g.vases.filter(v => v.type !== 'zombie' && !v.smashed).forEach(v => g.smashVase(v.row, v.col));
      await new Promise(r => setTimeout(r, 260));
      const atk = new Set(g._vaseAttackerPool());
      const types = g.vases.filter(v => v.smashed && v.content.kind === 'plant').map(v => v.content.type);
      const isWall = t => /nut|pumpkin|garlic/.test(t);
      const atkTypes = types.filter(t => atk.has(t));
      const wallTypes = types.filter(t => isWall(t));
      const otherTypes = types.filter(t => !atk.has(t) && !isWall(t));
      const rowAtk = [0, 0, 0, 0, 0];
      const vaseCells = new Set(g.vases.filter(v => !v.smashed).map(v => v.row + ',' + v.col));
      const plantAt = (row, type, cols) => {
        for (const c of cols) {
          if (vaseCells.has(row + ',' + c)) continue;
          if (!g.board.grid[row][c] && g.board.canPlant(row, c)) {
            g.board.addPlant(new Plant(g, type), row, c); return c;
          }
        }
        return -1;
      };
      // 只有「有罐子的行」才会出僵尸（setupVases 的 candidates 从 r=1 起，row 0 永远没罐子）——
      // 机器人原来从 row 0 开始铺，等于把一株植物扔进一条永远不会来僵尸的道，白送
      const liveRows = [0, 1, 2, 3, 4].filter(r => g.vases.some(v => v.row === r));
      // 真人能看见哪些罐子是僵尸罐（红光）—— 火力按「这一行的僵尸数」倾斜，
      // 而不是平均撒。平均撒的话，一行三只的那条线必崩（这正是旧机器人翻车的原因）
      // 真人看得见哪些罐子是僵尸罐（红光）→ 火力按「这一行的僵尸数」倾斜，不平均撒
      // v4.0.160：按「血量权重」而不是「只数数」分配 —— 1 只铁桶(1300) ≠ 1 只小鬼(100)，
      // 只数数会让三只锥帽挤在一条线上却只得 1 株（旧机器人就是这样误判 L4 不可解）
      const ZHP = { normal: 200, flag: 200, conehead: 560, buckethead: 1300, newspaper: 300,
                    polevaulting: 340, imp: 100, screendoor: 500 };
      const zhp = t => ZHP[t] || 300;
      const rowZ = {}, rowN = {};
      liveRows.forEach(r => {
        const zs = g.vases.filter(v => v.row === r &&
          (v.type === 'zombie' || (v.content && v.content.kind === 'zombie')));
        rowN[r] = zs.length;
        rowZ[r] = zs.reduce((a, v) => a + (v.type === 'zombie'
          ? zhp(v.content && v.content.type) : zhp(v.content && v.content.type)), 0);
      });
      // v4.0.158 修：首轮「每行给一株」原来按「有罐子的行」发，会把主力白扔进一条根本不来
      // 僵尸的行（第 5 关第 4 行只有绿罐+阳光，被塞了一株输出，导致真该守的第 3 行只剩 1 株、
      // 被啃穿后直接崩）。真人只看得到红光僵尸罐，不会往空行扔输出 —— 首轮只铺有僵尸的行。
      const needRows = liveRows.filter(r => rowZ[r] > 0);
      const orderRows = needRows.slice().sort((a, b) => rowZ[b] - rowZ[a] || a - b);
      // 每株输出「平均要扛多少血」——真人也是这么想的：一堆铁桶那条线先补第二株
      // 两轮：有僵尸的行先各 1 株，再各补第 2 株 —— 真人就是这么摆的。
      // 卡要先看能不能种，种成功才 shift（原来「先 shift 再试种」，种不下这张卡就凭空消失了）
      for (let pass = 0; pass < 2 && atkTypes.length; pass++) {
        for (const row of orderRows) {
          if (!atkTypes.length) break;
          if (plantAt(row, atkTypes[0], [0, 1, 2, 3, 4]) >= 0) { atkTypes.shift(); rowAtk[row]++; }
        }
      }
      // 原来只有「最该补火力那行」种不下就 break，剩下的卡全废 —— 顺着优先级往下试才对
      let guard = 0;
      while (atkTypes.length && guard++ < 200) {
        const per = r => rowZ[r] / (rowAtk[r] + 0.5);
        const order = liveRows.slice().sort((a, b) => per(b) - per(a) || rowAtk[a] - rowAtk[b]);
        let placed = false;
        for (const row of order) {
          if (plantAt(row, atkTypes[0], [0, 1, 2, 3, 4]) >= 0) { atkTypes.shift(); rowAtk[row]++; placed = true; break; }
        }
        if (!placed) break;
      }
      wallTypes.forEach(t => {
        const row = liveRows.slice().sort((a, b) => rowAtk[b] - rowAtk[a] || a - b)[0];
        plantAt(row, t, [5, 6, 4, 7, 3]);
      });
      otherTypes.forEach(t => {
        const row = liveRows.slice().sort((a, b) => rowAtk[b] - rowAtk[a] || a - b)[0];
        plantAt(row, t, [0, 0, 1, 2]);
      });
      g.gameSpeed = 5;
      window.__fail = null;
      const origGo = g.gameOver.bind(g);
      g.gameOver = function (win) {
        if (!win) window.__fail = g.entities.filter(e => e instanceof Zombie)
          .map(e => `${e.type}@r${e.row}x${Math.round(e.x)}hp${Math.round(e.hp)}|yRow${Math.floor((e.y - g.board.offsetY) / g.board.cellHeight)}|cy${Math.round(e.y)}`);
        if (!win) window.__grid = g.board.grid.map((row, i) => i + ':' +
          row.map((c, j) => c ? j + c.constructor.name.replace('Plant', 'P') : '').filter(Boolean).join(',')).join(' / ');
        return origGo(win);
      };
      // 记录每只僵尸是从哪个罐子（行/列/罐型）钻出来的
      window.__spawn = [];
      const origRev = g._revealZombieFromVase.bind(g);
      g._revealZombieFromVase = function (t, v) {
        window.__spawn.push(`${t}@r${v.row}c${v.col}[${v.type}${v.golden ? 'G' : ''}]`);
        return origRev(t, v);
      };
      const zs = g.vases.filter(v => v.type === 'zombie');
      for (const v of zs) {
        if (g.state !== 'PLAYING') break;
        g.smashVase(v.row, v.col);
        const t1 = Date.now();
        while (g.state === 'PLAYING' && g.entities.some(e => e instanceof Zombie && !e.isDead) && Date.now() - t1 < 22000) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      const t0 = Date.now();
      while (g.state === 'PLAYING' && Date.now() - t0 < 15000) await new Promise(r => setTimeout(r, 400));
      const res = {
        lvNo, state: g.state, stars: g.vaseStars, lost: g.vaseLostPlants,
        zsAlive: g.entities.filter(e => e instanceof Zombie && !e.isDead).length,
        plantsAlive: g.board.grid.flat().filter(Boolean).length,
        rowAtk: rowAtk.slice(), planted: types.length,
        gold: g.vases.filter(v => v.golden).map(v => v.content.kind + ':' + (v.content.type || '')),
        fail: window.__fail, spawn: window.__spawn, grid: window.__grid,
        wrappers: g.vases.filter(v => v.pumpkinHp).length,
        win: !!document.querySelector('.vase-win-overlay .vase-win-title')
          && /VICTORY/i.test(document.querySelector('.vase-win-overlay .vase-win-title').textContent)
      };
      g.gameSpeed = 1;
      return res;
    }, lvNo);
    console.log('L' + lvNo, r.win ? 'WIN ' : 'LOSE', JSON.stringify(r));
  }
  await b.close();
})();
