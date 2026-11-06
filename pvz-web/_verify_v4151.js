/* v4.0.151 验证：猫尾草泡泡龙 —— 整个界面都可以打（场地铺满 + 瞄准锥覆盖全格） */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

const URL = 'file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html');
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
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });

    await page.goto(URL, { waitUntil: 'networkidle2' });
    await sleep(1600);
    await page.evaluate(() => window.MiniGames.openGame('bubble'));
    await sleep(400);

    /* ---------- ① 场地铺满整个画面 ---------- */
    console.log('\n① 场地铺满');
    const geo = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const w = a.COLS * a.R * 2;
        return {
            left: a.LEFT, w, right: a.LEFT + w, canvasW: 900,
            wallL: a.wallL, wallR: a.wallR,
            row0y: a.yOf(0), hud: a.TOP,
            minX: a.cx(0, 0) - a.R, maxX: a.cx(0, a.colsIn(0) - 1) + a.R,
            balls: a.leftCount()
        };
    });
    ok(geo.w >= 900 * 0.95, '泡泡场地横向 ≥ 95% 画面宽（旧版仅 59%）', geo.w + 'px / 900');
    ok(geo.minX >= 0 && geo.maxX <= 900, '泡泡不越出画布左右边界', geo.minX + ' ~ ' + geo.maxX);
    ok(geo.left >= 8 && geo.right <= 892, '左右各留边但不多（≤18px）', geo.left + ' / ' + (900 - geo.right));
    ok(geo.wallL === geo.minX + 24 && geo.wallR === geo.maxX - 24,
        '反弹墙正好压在最外侧球心上（球贴墙不穿墙）', geo.wallL + '/' + geo.wallR);

    /* ---------- ② 顶部 HUD 不侵占场地 ---------- */
    console.log('\n② HUD 改成顶部横栏');
    const hud = await page.evaluate(() => {
        const a = window.MiniGames.active;
        return { top: a.TOP, topRowY: a.yOf(0) - a.R, hudH: a.TOP - 44 };
    });
    ok(hud.topRowY >= hud.top - 0.5, '第一行泡泡顶边不压到顶栏', hud.topRowY + ' vs ' + hud.top);
    ok(hud.hudH <= 56, '顶栏高度 ≤56px（旧版右侧竖栏占 260×440）', hud.hudH + 'px');

    /* ---------- ③ 瞄准锥覆盖每一格（核心） ---------- */
    console.log('\n③ 瞄准锥：场上每一格都能直接指到');
    const cone = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const th = a._aimLimit();
        const worst = [];
        let maxNeed = 0, maxAt = '';
        for (let r = 0; r < a.rows - 1; r++) {
            for (let c = 0; c < a.colsIn(r); c++) {
                const dx = a.cx(r, c) - a.shooter.x;
                const dy = a.shooter.y - a.yOf(r);
                if (dy <= 0) continue;
                const need = Math.abs(Math.atan2(dx, dy));
                if (need > maxNeed) { maxNeed = need; maxAt = r + ',' + c; }
                if (need > th + 1e-6) worst.push(r + ',' + c + '=' + (need * 180 / Math.PI).toFixed(1) + '°');
            }
        }
        return { th: th * 180 / Math.PI, maxNeed: maxNeed * 180 / Math.PI, maxAt, worst: worst.slice(0, 6), worstN: worst.length };
    });
    ok(cone.worstN === 0, '全部格子都在瞄准锥内（0 个死角）',
        `锥=${cone.th.toFixed(1)}° 最刁钻=${cone.maxNeed.toFixed(1)}°@${cone.maxAt}` + (cone.worstN ? ' 死角:' + cone.worst.join(',') : ''));
    ok(cone.th > 60, '瞄准锥比旧版（28.7°）大得多', cone.th.toFixed(1) + '°');

    /* ---------- ③b 全盘扫射：逐一验证每一个格子都真能打到 ---------- */
    console.log('\n③b 全盘扫射（每一个格子都实打一发）');
    const sweep = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const bad = [];
        let total = 0;
        for (let r = 0; r < a.rows - 1; r++) for (let c = 0; c < a.colsIn(r); c++) {
            for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.COLS; j++) a.g[i][j] = -1;
            a.g[r][c] = 2; a.ball = null; a.over = false; a.win = false;
            // 每次都是「打空的一发」，不清零的话第 8 发会触发 pushRow 把整盘下移，
            // 目标格就跑到别的行去了（这是玩法，不是 bug，扫射测试必须排除）
            a.missStreak = 0;
            const before = a.g.map(row => row.slice());
            a.onDown(a.cx(r, c), a.yOf(r));
            for (let i = 0; i < 1200 && a.ball; i++) a.update(1 / 120);
            let added = null;
            for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.colsIn(i); j++) {
                if (a.g[i][j] >= 0 && (before[i][j] < 0 || before[i][j] !== a.g[i][j])) added = [i, j];
            }
            total++;
            if (!added) { bad.push(r + ',' + c + ':没落子'); continue; }
            const d = Math.hypot(a.cx(added[0], added[1]) - a.cx(r, c), a.yOf(added[0]) - a.yOf(r));
            if (d > 48.5) bad.push(r + ',' + c + '→' + added.join(',') + '(' + Math.round(d) + 'px)');
        }
        return { total, bad: bad.slice(0, 8), badN: bad.length };
    });
    ok(sweep.badN === 0, '场上每一个格子实打验证：都能打中（' + sweep.total + ' 格全过）',
        sweep.badN ? sweep.bad.join(' ') : '0 死角');

    /* ---------- ④ 点击任意位置都能瞄准（含最边角） ---------- */
    console.log('\n④ 鼠标指到最边角也能对上');
    const aimCases = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const test = (x, y) => {
            a.onMove(x, y);
            const want = Math.atan2(y - a.shooter.y, x - a.shooter.x);
            // 与炮口角度比较（只比较"指向目标"的方向误差，被钳制的按钳制后算）
            const th = a._aimLimit();
            let d = Math.atan2(Math.sin(want + Math.PI / 2), Math.cos(want + Math.PI / 2));
            d = Math.max(-th, Math.min(th, d));
            const expect = -Math.PI / 2 + d;
            return Math.abs(a.shooter.ang - expect) * 180 / Math.PI;
        };
        const cells = [];
        for (const [r, c] of [[0, 0], [0, 17], [5, 0], [5, 17], [8, 0], [8, 17], [9, 0], [9, 17]]) {
            if (c >= a.colsIn(r)) continue;
            const err = test(a.cx(r, c), a.yOf(r));
            cells.push({ cell: r + ',' + c, err: +err.toFixed(3) });
        }
        return cells;
    });
    const worstErr = Math.max(...aimCases.map(c => c.err));
    ok(worstErr < 0.5, '最边角 8 个格子的瞄准误差 <0.5°', 'max=' + worstErr.toFixed(3) + '°');

    // 直接瞄准屏幕四角也不崩、不指到下半圈
    const corners = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const out = [];
        for (const [x, y] of [[0, 600], [900, 600], [0, 0], [900, 0], [450, 600]]) {
            a.onMove(x, y);
            out.push({ x, y, ang: +a.shooter.ang.toFixed(3), up: Math.sin(a.shooter.ang) < 0 });
        }
        return out;
    });
    ok(corners.every(c => c.up), '瞄准画面任意角（含正下方）炮口始终朝上，不会朝地面开炮',
        corners.map(c => '(' + c.x + ',' + c.y + ')=' + c.ang).join(' '));

    /* ---------- ⑤ 实打：真的能打到最左上 / 最右上那颗 ---------- */
    console.log('\n⑤ 实打：最左 / 最右上的泡泡真能打中');
    const shoot = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const run = (r, c) => {
            // 场上只留目标那一颗：整行铺满时球会先蹭到旁边的球，
            // 落点必然偏一格，测不出「指不指得到」这件事本身
            for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.COLS; j++) a.g[i][j] = -1;
            a.g[r][c] = 2;
            a.ball = null; a.over = false; a.win = false;
            // 记录落子前的盘面，落子后 diff 出真正新增的那一颗
            const before = a.g.map(row => row.slice());
            a.onDown(a.cx(r, c), a.yOf(r));
            for (let i = 0; i < 900 && a.ball; i++) a.update(1 / 120);
            let added = null;
            for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.colsIn(i); j++) {
                if (a.g[i][j] >= 0 && (before[i][j] < 0 || before[i][j] !== a.g[i][j])) added = [i, j];
            }
            if (!added) return { target: r + ',' + c, hit: 'none', err: 1e9 };
            const bd = Math.hypot(a.cx(added[0], added[1]) - a.cx(r, c), a.yOf(added[0]) - a.yOf(r));
            return { target: r + ',' + c, hit: added.join(','), err: Math.round(bd) };
        };
        return [run(0, 0), run(0, 17)];
    });
    ok(shoot.every(s => s.hit !== 'none' && s.err <= 52),
        '左上角 / 右上角的球都能被打中（新球落在目标旁边一格内）',
        shoot.map(s => s.target + '→' + s.hit + '(' + s.err + 'px)').join('  '));

    /* ---------- ⑥ 左右边界仍然正常反弹 ---------- */
    console.log('\n⑥ 边界反弹与清场');
    const bounce = await page.evaluate(() => {
        const a = window.MiniGames.active;
        for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.COLS; j++) a.g[i][j] = -1;
        a.g[0][3] = 0; a.over = false;
        a.ball = { x: a.wallL + 30, y: 300, vx: -600, vy: -300, col: 1 };
        let minX = 9999;
        for (let i = 0; i < 120 && a.ball; i++) { a.update(1 / 240); if (a.ball) minX = Math.min(minX, a.ball.x); }
        return { minX, wallL: a.wallL };
    });
    ok(bounce.minX >= bounce.wallL - 0.6, '球在左墙反弹不穿墙', 'minX=' + bounce.minX.toFixed(1) + ' wall=' + bounce.wallL);

    const pad = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        let holes = 0, undefinedCells = [];
        for (let k = 0; k < 4; k++) {
            a.pushRow();
            for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.COLS; c++) {
                if (typeof a.g[r][c] !== 'number') { holes++; if (undefinedCells.length < 4) undefinedCells.push(r + ',' + c); }
            }
        }
        return { holes, undefinedCells };
    });
    ok(pad.holes === 0, '连压 4 行后盘面没有 undefined 空洞（旧版会留下打不掉的「幽灵绿球」）',
        pad.holes ? pad.holes + ' 个：' + pad.undefinedCells.join(' ') : '0 空洞');

    const clearAfterPush = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        a.pushRow(); a.pushRow(); a.pushRow();
        for (let r = 0; r < a.rows; r++) a.g[r] = new Array(a.COLS).fill(-1);
        a.over = false; a.win = false;
        a.resolve(0, 0);
        return { win: a.win, left: a.leftCount() };
    });
    ok(clearAfterPush.win && clearAfterPush.left === 0, '压过 3 行之后清空全场依然判定通关', 'win=' + clearAfterPush.win);

    const win = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        for (let r = 0; r < a.rows; r++) a.g[r] = new Array(a.COLS).fill(-1);
        a.over = false; a.win = false;
        a.resolve(0, 0);
        return { over: a.over, win: a.win, score: a.score };
    });
    ok(win.over && win.win, '清空全场仍然判定通关', 'win=' + win.win + ' score=' + win.score);

    /* ---------- ⑦ 起始状态与重开 ---------- */
    console.log('\n⑦ 起始 / 重开 / 渲染');
    const start = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        let out = 0, bad = 0;
        for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.colsIn(r); c++) {
            if (a.g[r][c] < 0) continue;
            const x = a.cx(r, c);
            if (x - a.R < 0 || x + a.R > 900) out++;
            if (a.yOf(r) - a.R < a.TOP - 0.5) bad++;
        }
        return { over: a.over, balls: a.leftCount(), out, bad, score: a.score };
    });
    ok(!start.over && start.balls >= 90, '开局 90+ 颗且未判负', 'balls=' + start.balls);
    ok(start.out === 0 && start.bad === 0, '没有泡泡越界或被顶栏盖住', 'out=' + start.out + ' bad=' + start.bad);

    // 连续改角度 + 抽帧渲染，确认瞄准虚线不抛异常
    const drawErr = await page.evaluate(() => {
        const a = window.MiniGames.active;
        let n = 0;
        for (let i = 0; i < 240; i++) {
            a.onMove(450 + Math.cos(i / 40) * 500, 556 - Math.abs(Math.sin(i / 40)) * 520);
            a.draw(); n++;
        }
        return n;
    });
    ok(drawErr === 240, '瞄准虚线在 240 个角度下渲染无异常', drawErr + ' 帧');

    /* ---------- ⑦b 实战：真实射击能不能打通关 ---------- */
    console.log('\n⑦b 实战：靠一发发打能不能清空');
    // (1) 受控盘面：3 行同色 + 手牌固定同色 —— 验证「射击 → 消除 → 清空 → 判胜」这条链路
    const play = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.COLS; c++) a.g[r][c] = -1;
        // 第一行铺成 [0,0,0,1,1,1,2,2,2,3,3,3,...] 的三连 —— 每发只消一组，链路才测得出来
        for (let c = 0; c < a.colsIn(0); c++) a.g[0][c] = Math.floor(c / 3) % 4;
        a.over = false; a.win = false; a.score = 0; a.ball = null; a.pops = []; a.drops = [];
        let shots = 0;
        while (!a.over && shots < 80) {
            const cands = [];
            for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.colsIn(r); c++) {
                if (a.g[r][c] >= 0) cands.push([r, c]);
            }
            if (!cands.length) break;
            cands.sort((p, q) => q[0] - p[0]);           // 先打最下面那颗
            const [r, c] = cands[0];
            a.cur = a.next = a.g[r][c];                   // 手牌跟着目标同色，只测链路不测运气
            a.ball = null;
            a.onDown(a.cx(r, c), a.yOf(r));
            shots++;
            for (let i = 0; i < 600 && a.ball; i++) a.update(1 / 120);
            a.missStreak = 0;
        }
        return { shots, left: a.leftCount(), over: a.over, win: a.win, score: a.score };
    });
    ok(play.left === 0 && play.win, '真实射击能把整盘打空并触发通关',
        `${play.shots} 发 · 剩 ${play.left} 颗 · 分数 ${play.score} · win=${play.win}`);

    // (2) 随机盘面连打 100 发：不崩、不出现非有限坐标、盘面有推进
    const soak = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        const start = a.leftCount();
        let bad = 0, shots = 0;
        for (; shots < 100 && !a.over; shots++) {
            const cands = [];
            for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.colsIn(r); c++) {
                if (a.g[r][c] >= 0) cands.push([r, c]);
            }
            if (!cands.length) break;
            const [r, c] = cands[(Math.random() * cands.length) | 0];
            a.ball = null;
            a.onDown(a.cx(r, c), a.yOf(r));
            for (let i = 0; i < 600 && a.ball; i++) a.update(1 / 120);
            if (a.ball || !isFinite(a.shooter.ang)) bad++;
            a.missStreak = 0;
        }
        return { shots, bad, start, left: a.leftCount(), over: a.over };
    });
    ok(soak.bad === 0 && isFinite(soak.left) && soak.shots >= 8, '随机乱打直到分出胜负：没有卡住的球、没有非法角度',
        `${soak.shots} 发 · 球 ${soak.start}→${soak.left} · 异常 ${soak.bad}`);

    /* ---------- ⑧ 回归：其它 9 个小游戏还能开 ---------- */
    console.log('\n⑧ 回归');
    const other = await page.evaluate(async () => {
        const ids = ['tetris', 'whack', 'g2048', 'breakout', 'match3', 'sokoban', 'duck', 'memory', 'snake'];
        const bad = [];
        for (const id of ids) {
            window.MiniGames.openGame(id);
            if (!window.MiniGames.active) bad.push(id);
        }
        return bad;
    });
    ok(other.length === 0, '其余 9 个小游戏仍能正常打开', other.join(',') || 'ok');

    ok(errs.length === 0, '全程无 JS 报错', errs.slice(0, 2).join(' | '));

    // 截图
    await page.evaluate(() => { window.MiniGames.openGame('bubble'); });
    await sleep(400);
    await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.onMove(60, 160);          // 指到最左上角，展示大张角
    });
    await sleep(200);
    const el = await page.$('#mini-canvas');
    await el.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4151_bubble_left.png' });
    await page.evaluate(() => window.MiniGames.active.onMove(870, 500));
    await sleep(150);
    await el.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4151_bubble_right.png' });

    console.log(`\n===== 结果 ${pass} 通过 / ${fail} 失败 =====`);
    await b.close();
    process.exit(fail ? 1 : 0);
})();
