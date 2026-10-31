// v4.0.139 验收：弹球卡顿根因 / 推箱主角 / 第 4 关嵌墙
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

const URL = 'file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(cond, label, info) {
    if (cond) { pass++; console.log('  ✓', label, info ? '— ' + info : ''); }
    else { fail++; console.log('  ✗ FAIL', label, info ? '— ' + info : ''); }
}

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

    await page.goto(URL, { waitUntil: 'networkidle2' });
    await sleep(1600);

    /* ================= 一、豌豆弹球 ================= */
    console.log('\n【豌豆弹球 · 卡顿根因】');
    await page.evaluate(() => { window.MiniGames.openLobby(); window.MiniGames.openGame('breakout'); });
    await sleep(400);

    // ① 固定步长：60Hz 下 1 秒走过的距离 = 速度 × 1s，且单帧位移没有跳变
    const uni = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        a.balls = [];
        a.spawnBall(300, 400, 200, 0, false);          // 空白区匀速水平，不碰任何砖
        let maxJump = 0, prev = 300;
        for (let i = 0; i < 60; i++) {
            a.update(1 / 60);
            const d = Math.abs(a.ball.x - prev); prev = a.ball.x;
            if (d > maxJump) maxJump = d;
        }
        return { x: a.ball.x, maxJump: maxJump, expected: 500 };
    });
    ok(Math.abs(uni.x - 500) < 3, '① 60Hz：1 秒位移 = 速度×1s（200px）', 'x=' + uni.x.toFixed(1) + ' 期望 500');
    ok(uni.maxJump < 5, '② 单帧位移无跳变（200/60≈3.3px）', 'maxJump=' + uni.maxJump.toFixed(2) + 'px');

    // ③ 帧率无关：144Hz 跑 1 秒，落点应与 60Hz 一致
    const uni144 = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset(); a.balls = [];
        a.spawnBall(300, 400, 200, 0, false);
        for (let i = 0; i < 144; i++) a.update(1 / 144);
        return a.ball.x;
    });
    ok(Math.abs(uni144 - uni.x) < 4, '③ 144Hz 与 60Hz 落点一致（不再受刷新率影响）',
        '144Hz x=' + uni144.toFixed(1) + ' vs 60Hz x=' + uni.x.toFixed(1));

    // ④ 撞坚果砖不再抖动：贴砖下方往上打，统计 vy 变号次数
    const bnc = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        const nut = a.bricks.filter(k => k.type === 'nut')[0];
        a.balls = [];
        const bb = a.spawnBall(nut.x + nut.w / 2, nut.y + nut.h + 40, 0, -300, false);
        let flips = 0, prevSign = Math.sign(bb.vy), steps = 0;
        for (let i = 0; i < 54; i++) {                 // 54 × 1/180 = 0.3s
            a.update(1 / 180);
            steps++;
            const sg = Math.sign(bb.vy);
            if (sg !== prevSign) { flips++; prevSign = sg; }
        }
        // 结束时圆心到该砖的距离（必须已分离）
        const cx = Math.min(Math.max(bb.x, nut.x), nut.x + nut.w);
        const cy = Math.min(Math.max(bb.y, nut.y), nut.y + nut.h);
        const dist = Math.hypot(bb.x - cx, bb.y - cy);
        return { flips, vy: bb.vy, dist: dist, r: bb.r, steps, y: bb.y };
    });
    ok(bnc.flips === 1, '④ 撞坚果砖只反弹 1 次（原来会在砖面反复翻=抖动）', 'flips=' + bnc.flips);
    ok(bnc.vy > 0, '⑤ 反弹后明确朝下离开', 'vy=' + bnc.vy.toFixed(0));
    ok(bnc.dist >= bnc.r - 0.6, '⑥ 反弹后与砖分离，没有陷在砖里', 'dist=' + bnc.dist.toFixed(1) + ' r=' + bnc.r);

    // ⑦ 坚果砖不再是整排墙
    const lay = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        const nuts = a.bricks.filter(k => k.type === 'nut');
        const bottomRow = a.bricks.filter(k => k.y > 240);
        return { nuts: nuts.length, bottom: bottomRow.length };
    });
    ok(lay.nuts >= 2 && lay.nuts <= 4, '⑦ 坚果砖从整排 8 块改成散落障碍', '坚果=' + lay.nuts + ' / 底行=' + lay.bottom);

    // ⑧ 长时间对局里球不与任何砖重叠（连续 6 秒，自动跟球挡板）
    const clean = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        a.balls = [];
        a.spawnBall(450, 470, 260, -330, false);
        let worst = 0, frames = 0;
        for (let f = 0; f < 360; f++) {
            const bb = a.ball;
            if (!bb) break;
            a.px = Math.max(60 + a.pw / 2, Math.min(840 - a.pw / 2, bb.x));  // 自动接球
            a.update(1 / 60);
            frames++;
            const c2 = a.ball;
            if (!c2) continue;
            for (const k of a.bricks) {
                if (k.hp <= 0 && k.type !== 'nut') continue;
                const cx = Math.min(Math.max(c2.x, k.x), k.x + k.w);
                const cy = Math.min(Math.max(c2.y, k.y), k.y + k.h);
                const pen = c2.r - Math.hypot(c2.x - cx, c2.y - cy);
                if (pen > worst) worst = pen;
            }
        }
        return { worst: worst, frames: frames, over: a.over };
    });
    ok(clean.worst < 1.5, '⑧ 6 秒内球从不陷进砖块（穿透 < 1.5px）', '最深=' + clean.worst.toFixed(2) + 'px 帧=' + clean.frames);

    // ⑨ 三线射手拾取真的加球
    const tri = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        a.balls = [];
        const bb = a.spawnBall(450, 470, 260, -330, false);
        const n0 = a.balls.length;
        a.grab('tri');
        const n1 = a.balls.length;
        const spd = a.balls.map(x => Math.round(Math.hypot(x.vx, x.vy)));
        a.grab('tri');
        return { n0: n0, n1: n1, n2: a.balls.length, spd: spd };
    });
    ok(tri.n1 === tri.n0 + 2, '⑨ 三线射手真的多出 2 颗球', tri.n0 + ' → ' + tri.n1);
    ok(tri.n2 <= 4, '⑩ 球数上限 4（不会无限分裂）', '上限后=' + tri.n2);

    // ⑪ 清空可打破砖仍能通关（坚果留下不影响判定）
    const win = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.reset();
        a.bricks.forEach(k => { if (k.type !== 'nut') k.hp = 0; });
        a.update(1 / 60);
        return { over: a.over, win: a.win, nutsLeft: a.bricks.filter(k => k.type === 'nut').length };
    });
    ok(win.over && win.win, '⑪ 可打破砖清空即通关（坚果残留不算）', 'nuts=' + win.nutsLeft);

    /* ================= 二、寒冰推箱 ================= */
    console.log('\n【寒冰推箱】');
    await page.evaluate(() => window.MiniGames.openGame('sokoban'));
    await sleep(400);

    // ⑫ 所有关卡都有合法出生点
    const spawns = await page.evaluate(() => {
        const a = window.MiniGames.active;
        const out = [];
        const n = window.MiniGames.levelCount;
        for (let i = 0; i < n; i++) {
            a.load(i);
            out.push({ i: i, px: a.px, py: a.py, inWall: !!a.wall[a.py][a.px], corner: a.px === 0 && a.py === 0 });
        }
        a.load(0);
        return out;
    });
    spawns.forEach(s => {
        ok(!s.inWall && !s.corner, '⑫ 第 ' + (s.i + 1) + ' 关出生点不在墙里',
            'pos=(' + s.px + ',' + s.py + ')');
    });

    // ⑬ 第 4 关：BFS 确认能走到两个推位，并且真的能推完
    const l4 = await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.load(3);
        const W = a.w, Hh = a.h;
        const seen = a.wall.map(r => r.map(() => false));
        const q = [[a.px, a.py]];
        seen[a.py][a.px] = true;
        let reach = 0;
        while (q.length) {
            const [x, y] = q.shift(); reach++;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) return;
                if (seen[ny][nx] || a.wall[ny][nx] || a.box[ny][nx]) return;
                seen[ny][nx] = true; q.push([nx, ny]);
            });
        }
        // 两个箱子的推位：(2,6) 左边推 → 站 (2,7)；(4,3) 右边推 → 站 (4,2)
        const push1 = seen[2][7] && !a.wall[2][7];
        const push2 = seen[4][2] && !a.wall[4][2];
        // 真推一遍：把 (4,3) 的箱子往右推 3 格
        a.px = 2; a.py = 4;
        for (let i = 0; i < 3; i++) a.move(1, 0);
        const boxMoved = a.box[4][6];
        return { reach: reach, push1: push1, push2: push2, boxMoved: boxMoved, px: a.px, py: a.py };
    });
    ok(l4.reach > 20, '⑬ 第 4 关可达空地足够（能走动）', '可达格=' + l4.reach);
    ok(l4.push1 && l4.push2, '⑭ 第 4 关两个箱子的推位都走得到', 'push1=' + l4.push1 + ' push2=' + l4.push2);
    ok(l4.boxMoved, '⑮ 第 4 关真的能把冰块推上目标', 'box(4,6)=' + l4.boxMoved);

    // ⑯ 主角贴图是寒冰射手，不是普通豌豆
    const hero = await page.evaluate(async () => {
        const a = window.MiniGames.active;
        a.load(3);
        const seen = [];
        const ctx = document.getElementById('mini-canvas').getContext('2d');
        const orig = ctx.drawImage;
        ctx.drawImage = function (im) {
            if (im && im.src) seen.push(im.src);
            return orig.apply(this, arguments);
        };
        a.draw();
        ctx.drawImage = orig;
        return { snow: seen.filter(s => /SnowPea/.test(s)).length, pea: seen.filter(s => /Peashooter/.test(s)).length, n: seen.length };
    });
    ok(hero.snow >= 1 && hero.pea === 0, '⑯ 主角贴图 = 寒冰射手（SnowPea），无普通豌豆',
        'snow=' + hero.snow + ' pea=' + hero.pea);

    // ⑰ 第 4 关截图
    await page.evaluate(() => { window.MiniGames.openGame('sokoban'); window.MiniGames.active.load(3); });
    await sleep(400);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4139_sokoban4.png' });

    /* ================= 三、弹球截图 ================= */
    await page.evaluate(() => { window.MiniGames.openGame('breakout'); window.MiniGames.active.ball.stuck = false; });
    await sleep(700);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4139_breakout.png' });

    /* ================= 四、零报错 ================= */
    const ce = errs.filter(e => !/favicon|Failed to load resource/.test(e));
    ok(ce.length === 0, '⑰ 全程无 JS 报错', ce.slice(0, 3).join(' | '));

    console.log('\n通过 ' + pass + ' / ' + (pass + fail) + (fail ? '  ❌ 有失败' : ''));
    await b.close();
    process.exit(fail ? 1 : 0);
})();
