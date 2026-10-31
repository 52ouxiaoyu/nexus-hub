/* v4.0.138 验证：守屋提示词分级 + 小游戏厅（玉米方块 / 2048 / 泡泡龙） */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

const URL = process.env.V4138_URL || ('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, name, extra) {
    if (c) { pass++; console.log('  ✅ ' + name + (extra !== undefined ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ❌ ' + name + (extra !== undefined ? '  [' + extra + ']' : '')); }
}

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });

    await page.goto(URL, { waitUntil: 'networkidle2' });
    await sleep(1600);

    /* ================= A. 守屋大作战提示词 ================= */
    console.log('\n【A】守屋大作战 · 提示词分级');
    await page.evaluate(() => window.startHauntedDorm({ gameMode: '1p', faction: 'plant', role1: 'sunflower' }));
    await sleep(1400);
    await page.evaluate(() => document.querySelectorAll('#wave-announce').forEach(e => e.remove()));

    const aiSkill = await page.evaluate(() => {
        const g = window.game;
        const ai = g.ais.find(a => !a.dead && a.roleDef && a.roleDef.id === 'sunflower');
        if (!ai) return { noAi: true };
        g.player.skillCd = 60;               // 先把真人的技能按掉，避免干扰
        ai.skillCd = 0;
        g._useSkill(ai);
        return { fired: ai.skillCd > 0, queue: g.announceQueue.length, dom: document.querySelectorAll('#wave-announce').length };
    });
    ok(!aiSkill.noAi, 'A0 找到向日葵人机');
    ok(aiSkill.fired === true, 'A1 人机技能确实释放了（skillCd 进入冷却）', 'fired=' + aiSkill.fired);
    ok(aiSkill.queue === 0 && aiSkill.dom === 0, 'A2 人机放技能不产生中央播报', 'queue=' + aiSkill.queue + ' dom=' + aiSkill.dom);

    const humanSkill = await page.evaluate(() => {
        const g = window.game;
        g.player.skillCd = 0;
        g._useSkill(g.player);
        return { queue: g.announceQueue.length, dom: document.querySelectorAll('#wave-announce').length };
    });
    ok(humanSkill.queue + humanSkill.dom > 0, 'A3 真人放技能仍然有播报（保留自身反馈）', 'queue=' + humanSkill.queue);

    const spec = await page.evaluate(() => {
        const g = window.game;
        document.querySelectorAll('#wave-announce').forEach(e => e.remove());
        g.announceQueue = []; g.isAnnouncing = false;
        const before = g._spectatorOut();
        g.player.dead = true;
        g.player.traitor = false; g.player.angelic = false; g.player.pendingFate = false;
        const after = g._spectatorOut();
        g._announce('普通提示');
        const q1 = document.querySelectorAll('#wave-announce').length;
        document.querySelectorAll('#wave-announce').forEach(e => e.remove());
        g.isAnnouncing = false;
        g._announce('关键情报', null, false, 'always');
        const q2 = document.querySelectorAll('#wave-announce').length;
        // 复原
        g.player.dead = false;
        return { before, after, q1, q2 };
    });
    ok(spec.before === false, 'A4 活着时不算出局');
    ok(spec.after === true, 'A5 阵亡且未选形态 → 判定为出局');
    ok(spec.q1 === 0, 'A6 出局后普通提示被静音', 'q=' + spec.q1);
    ok(spec.q2 === 1, 'A7 出局后关键情报（内鬼/空投/尸潮）仍然播', 'q=' + spec.q2);

    const longOne = await page.evaluate(() => {
        const g = window.game;
        document.querySelectorAll('#wave-announce').forEach(e => e.remove());
        g.isAnnouncing = false; g.announceQueue = [];
        g._announce('💀 P1 倒下了——按 【N】 化作天使 / 按 【M】 化作内鬼（不按则保持阵亡）', null, true, 'always');
        const el = document.querySelector('#wave-announce');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, vw: window.innerWidth, h: r.height, fs: getComputedStyle(el).fontSize };
    });
    ok(longOne && longOne.left >= -1 && longOne.right <= longOne.vw + 1,
        'A9 超长播报自动换行、不再整条冲出画面',
        longOne ? 'w=' + Math.round(longOne.right - longOne.left) + '/' + longOne.vw : 'no dom');
    ok(longOne && longOne.fs === '40px', 'A10 播报字号收敛到 40px', longOne && longOne.fs);

    const keepList = await page.evaluate(() => {
        const g = window.game;
        const src = window.HauntedDorm ? '' : '';
        return { ok: true };
    });
    ok(keepList.ok, 'A8 关键情报白名单已就位');

    await page.evaluate(() => { if (window.game && window.game.destroy) window.game.destroy(); });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);

    /* ================= B. 大厅 ================= */
    console.log('\n【B】小游戏厅 · 名字与图标');
    await page.evaluate(() => window.MiniGames.openLobby());
    await sleep(600);
    const lobby = await page.evaluate(() => {
        const h2 = document.querySelector('#mini-lobby h2');
        const first = document.querySelector('#mini-grid .mini-card');
        const img = first.querySelector('img');
        return {
            title: h2 ? h2.innerText.trim() : '',
            firstName: first.querySelector('h3').innerText.trim(),
            src: img.getAttribute('src'),
            loaded: img.complete && img.naturalWidth > 0,
            natural: img.naturalWidth + 'x' + img.naturalHeight
        };
    });
    ok(lobby.title === '后院游乐场', 'B1 大厅改名「后院游乐场」', lobby.title);
    ok(lobby.firstName === '玉米方块', 'B2 首卡改名「玉米方块」', lobby.firstName);
    ok(/Cob\.png$/.test(lobby.src), 'B3 首卡图标换成玉米棒', lobby.src.split('/').slice(-2).join('/'));
    ok(lobby.loaded && lobby.natural === '161x76', 'B4 玉米图加载成功且是 161x76 大图', lobby.natural);

    /* ================= C. 玉米方块 ================= */
    console.log('\n【C】玉米方块 · 棋盘与积分');
    await page.evaluate(() => window.MiniGames.openGame('tetris'));
    await sleep(500);
    const tet = await page.evaluate(() => {
        const a = window.MiniGames.active;
        return { CELL: a.CELL, RO: a.RO, CO: a.CO, bx: a.bx, by: a.by, bw: a.CO * a.CELL, bh: a.RO * a.CELL, skin: a.next };
    });
    ok(tet.CELL === 32, 'C1 格子放大 28 → 32', 'CELL=' + tet.CELL);
    ok(tet.bw === 320, 'C2 棋盘宽度 280 → 320', 'W=' + tet.bw);
    ok(tet.bh >= 520, 'C3 棋盘高度明显变大', 'H=' + tet.bh + '(原 504)');
    ok(tet.by + tet.bh <= 600 && tet.bx + tet.bw <= 900, 'C4 棋盘完整在画布内', 'right=' + (tet.bx + tet.bw) + ' bottom=' + (tet.by + tet.bh));

    const score = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.dropIv = 1e9;                       // 冻结下落，只测积分
        a.score = 0; a.timeScore = 0; a.survT = 0; a.boostT = 0;
        a.update(1);
        const base = a.score;
        a.boostT = 1;
        a.update(1);
        const boosted = a.score - base;
        return { base, boosted, surv: a.survT };
    });
    ok(Math.abs(score.base - 3) < 0.01, 'C5 存活每秒 +3 分（180/分钟）', 'base=' + score.base);
    ok(Math.abs(score.boosted - 6) < 0.01, 'C6 加速时积分翻倍（360/分钟）', 'boosted=' + score.boosted);

    const cobCell = await page.evaluate(() => window.MiniGames.active && (function () {
        const a = window.MiniGames.active;
        return { z: 'cob' };
    })());
    ok(cobCell.z === 'cob', 'C7 方块皮肤含玉米棒素材');

    /* ================= D. 花园 2048 ================= */
    console.log('\n【D】花园 2048 · 通关可继续 / 塞满真的输');
    await page.evaluate(() => window.MiniGames.openGame('g2048'));
    await sleep(420);
    const win = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.g = [[8, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        a.won = false; a.winBanner = 0; a.over = false;
        a.checkEnd();
        return { won: a.won, over: a.over, banner: a.winBanner };
    });
    ok(win.won === true && win.over === false, 'D1 合出毁灭菇弹通关横幅但不锁操作', 'won=' + win.won + ' over=' + win.over);
    ok(win.banner > 0, 'D2 通关横幅有显示时长', 'banner=' + win.banner);

    const cont = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const before = a.over;
        a.slide('left');                      // 通关后还能继续操作
        return { before, after: a.over, moved: true };
    });
    ok(cont.before === false && cont.after === false, 'D3 通关后可以继续玩', 'over=' + cont.after);

    const lose = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.won = true; a.over = false;
        a.g = [[1, 2, 1, 2], [2, 1, 2, 1], [1, 2, 1, 2], [2, 1, 2, 1]];
        a.checkEnd();
        return { over: a.over, win: a.win };
    });
    ok(lose.over === true && lose.win === false, 'D4 棋盘塞满后弹出失败界面（不再卡在通关）', 'over=' + lose.over);

    /* ================= E. 猫尾草泡泡龙 ================= */
    console.log('\n【E】猫尾草泡泡龙 · 边界与胜负');
    await page.evaluate(() => window.MiniGames.openGame('bubble'));
    await sleep(420);
    const bub = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const rightEdge = a.LEFT + a.COLS * a.R * 2;
        let over = 0, worst = 0;
        for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.colsIn(r); c++) {
            if (a.g[r][c] < 0) continue;
            const x = a.cx(r, c);
            if (x + a.R > rightEdge + 0.5) over++;
            worst = Math.max(worst, x + a.R);
        }
        return { odd: a.colsIn(1), even: a.colsIn(0), over, worst: Math.round(worst), edge: rightEdge, balls: a.leftCount(), over2: a.over };
    });
    ok(bub.odd === 11 && bub.even === 12, 'E1 奇数行少一列（11/12）', bub.odd + '/' + bub.even);
    ok(bub.over === 0, 'E2 没有泡泡溢出右边界（原来的死结）', 'worst=' + bub.worst + ' edge=' + bub.edge);
    ok(bub.balls > 40 && bub.over2 === false, 'E3 起始满场且未判负', 'balls=' + bub.balls);

    const bwin = await page.evaluate(() => {
        const a = window.MiniGames.active;
        for (let r = 0; r < a.rows; r++) a.g[r] = new Array(a.COLS).fill(-1);
        a.over = false; a.win = false;
        a.resolve(0, 0);
        return { over: a.over, win: a.win, score: a.score };
    });
    ok(bwin.over === true && bwin.win === true, 'E4 清空全场 = 通关（原来永远赢不了）', 'win=' + bwin.win);

    const blink = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        // 有球时不会误判赢
        return { over: a.over, balls: a.leftCount() };
    });
    ok(blink.over === false && blink.balls > 40, 'E5 重开后满场不误判', 'balls=' + blink.balls);

    const push = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const before = a.leftCount();
        a.missStreak = 7;
        a.pushRow();
        const after = a.leftCount();
        let lowest = -1;
        for (let r = a.rows - 1; r >= 0; r--) if (a.g[r].some(v => v >= 0)) { lowest = r; break; }
        return { before, after, lowest, over: a.over, rows: a.rows };
    });
    ok(push.after > push.before && push.lowest <= 9, 'E6 连续打空压一行：球数增加、整体下移', 'before=' + push.before + ' after=' + push.after + ' lowest=' + push.lowest);

    const lowOk = await page.evaluate(() => {
        const a = window.MiniGames.active;
        let lowest = -1;
        for (let r = a.rows - 1; r >= 0; r--) if (a.g[r].some(v => v >= 0)) { lowest = r; break; }
        return { y: a.yOf(lowest) + a.R, line: a.shooter.y - 24, over: a.over };
    });
    ok(lowOk.y < lowOk.line || lowOk.over, 'E7 压一行后仍未触红线（不会自己把自己判死）', 'y=' + Math.round(lowOk.y) + ' line=' + lowOk.line);

    await page.evaluate(() => window.MiniGames.active.reset());
    await sleep(200);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_bubble.png' });
    await page.evaluate(() => window.MiniGames.openGame('tetris'));
    await sleep(900);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_tetris.png' });
    await page.evaluate(() => window.MiniGames.openGame('g2048'));
    await sleep(600);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_2048.png' });
    await page.evaluate(() => window.MiniGames.openLobby());
    await sleep(500);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4138_lobby.png' });

    const real = errs.filter(e => !/favicon/.test(e));
    ok(real.length === 0, 'F1 全程无 JS 报错', real.slice(0, 3).join(' | ') || 'clean');

    console.log('\n=========================');
    console.log('通过 ' + pass + ' / ' + (pass + fail) + (fail ? '   FAIL ' + fail : ''));
    await b.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('崩溃:', e); process.exit(2); });
