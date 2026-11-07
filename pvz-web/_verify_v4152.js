/* v4.0.152 验收：机械龙攻城 / 泡泡对轰 / 泡泡塔（替换消消乐 / 射击场 / 贪吃蛇） */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(cond, name, extra) {
    if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ❌ ' + name + (extra ? '  [' + extra + ']' : '')); }
}

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1500, height: 1000 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await sleep(1600);

    /* ---------- ① 注册表 ---------- */
    console.log('\n① 大厅注册表');
    const reg = await page.evaluate(() => window.MiniGames.games.map(g => g.id + '|' + g.name));
    ok(reg.length === 10, '大厅仍是 10 个玩法', reg.length + ' 个');
    const ids = reg.map(s => s.split('|')[0]);
    ok(ids.indexOf('dragon') >= 0 && ids.indexOf('duel') >= 0 && ids.indexOf('tower') >= 0,
        '三个新玩法已就位', ids.slice(5).join(','));
    ok(ids.indexOf('match3') < 0 && ids.indexOf('duck') < 0 && ids.indexOf('snake') < 0,
        '消消乐 / 射击场 / 贪吃蛇 已下线');

    /* ---------- ② 三个场地几何 ---------- */
    console.log('\n② 瞄准锥覆盖（每格都能直接指到）');
    for (const id of ['dragon', 'duel', 'tower']) {
        const geo = await page.evaluate(gid => {
            window.MiniGames.openGame(gid);
            const g = window.MiniGames.active;
            const lanes = g.lane ? [g.lane] : [g.la, g.lb];
            const out = [];
            for (const l of lanes) {
                let bad = 0, worst = 0;
                const th = l.aimLimit(), mid = -Math.PI / 2;
                // 最后一行是「判负行」——那格有泡泡就已经输了，不计入可达性
                for (let r = 0; r < l.rows - 1; r++) for (let c = 0; c < l.colsIn(r); c++) {
                    const a = Math.atan2(l.yOf(r) - l.sy, l.cx(r, c) - l.sx);
                    let d = a - mid;
                    d = Math.atan2(Math.sin(d), Math.cos(d));
                    const over = Math.abs(d) - th;
                    if (over > 1e-6) { bad++; worst = Math.max(worst, over); }
                }
                out.push({ cells: (l.rows - 1) * l.COLS, bad: bad, worst: +worst.toFixed(4), th: +(th * 180 / Math.PI).toFixed(1) });
            }
            return out;
        }, id);
        geo.forEach((x, i) => ok(x.bad === 0, id + (geo.length > 1 ? ' #' + (i + 1) : '') + ' 可玩区 ' + x.cells + ' 格全在瞄准锥内',
            '张角 ' + x.th + '°' + (x.bad ? ' 超界 ' + x.bad + ' 格' : '')));
    }

    /* ---------- ③ 机械龙攻城 ---------- */
    console.log('\n③ 机械龙攻城');
    await page.evaluate(() => { window.MiniGames.openGame('dragon'); window.MiniGames.active.reset(); });
    await sleep(200);

    const dmgTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const before = g.hp;
        g.lane.onLand(g.lane, { popped: 4, dropped: 0 });
        const mid = g.hp;
        g.lane.onLand(g.lane, { popped: 0, dropped: 0 });
        return { before, mid, after: g.hp, phase: g.phase };
    });
    ok(dmgTest.mid === dmgTest.before - 16, '消 4 颗 = 16 点伤害', dmgTest.before + '→' + dmgTest.mid);

    const phaseTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        g.hp = Math.round(g.hpMax * 0.72);
        g.hurt(30);                       // 掉到 67% → 第 2 阶段
        const p2 = g.phase;
        g.hp = Math.round(g.hpMax * 0.40);
        g.hurt(40);                       // 掉到 33% → 第 3 阶段
        return { p2, p3: g.phase, banner: !!g.banner };
    });
    ok(phaseTest.p2 === 2 && phaseTest.p3 === 3, '70% / 35% 两道血线各推进一个阶段',
        '第 ' + phaseTest.p3 + ' 阶段');

    const sprayTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const before = g.lane.count(), low0 = g.lane.lowest();
        g.spray();
        return { before, after: g.lane.count(), low0, low1: g.lane.lowest(), added: g.lane.count() - before };
    });
    ok(sprayTest.after > sprayTest.before && sprayTest.low1 >= sprayTest.low0,
        '龙嘴喷泡：场地整体下压并补上新泡泡', sprayTest.before + '→' + sprayTest.after + ' 颗');

    const deadTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const l = g.lane;
        for (let c = 0; c < l.colsIn(l.rows - 1); c++) l.g[l.rows - 1][c] = 0;
        l.checkState();
        return { dead: l.dead, over: g.over, win: g.win };
    });
    ok(deadTest.dead && deadTest.over && !deadTest.win, '泡泡压到最后一行 → 判负');

    const idleTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        let t = 0;
        while (!g.over && t < 240) { g.update(1 / 60); t += 1 / 60; }
        return { over: g.over, win: g.win, sec: Math.round(t) };
    });
    ok(idleTest.over && !idleTest.win, '一炮不打会被泡泡埋掉（约 ' + idleTest.sec + ' 秒）');

    const runA = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const l = g.lane;
        let shots = 0;
        const clearPath = (x, y) => {
            const ox = l.sx, oy = l.sy - 34;
            const dx = x - ox, dy = y - oy, len = Math.hypot(dx, dy);
            const ux = dx / len, uy = dy / len;
            for (let d = 30; d < len - 18; d += 8) {
                const px = ox + ux * d, py = oy + uy * d;
                for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.colsIn(r); c++) {
                    if (l.g[r][c] < 0) continue;
                    const ddx = px - l.cx(r, c), ddy = py - l.yOf(r);
                    if (ddx * ddx + ddy * ddy < (l.R * 1.75) * (l.R * 1.75)) return false;
                }
            }
            return true;
        };
        const pick = () => {
            const cands = [];
            for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.colsIn(r); c++) {
                if (l.g[r][c] >= 0) continue;
                let ok2 = r === 0;
                if (!ok2) for (const q of l.neighbors(r, c)) {
                    if (q[0] < 0 || (l.g[q[0]] && l.g[q[0]][q[1]] >= 0)) { ok2 = true; break; }
                }
                if (!ok2 || !clearPath(l.cx(r, c), l.yOf(r))) continue;
                const seen = new Set([r + ',' + c]), st = [[r, c]];
                while (st.length) {
                    const cur = st.pop();
                    for (const q of l.neighbors(cur[0], cur[1])) {
                        if (!l.inB(q[0], q[1]) || l.g[q[0]][q[1]] !== l.cur) continue;
                        const kk = q[0] + ',' + q[1];
                        if (seen.has(kk)) continue;
                        seen.add(kk); st.push(q);
                    }
                }
                cands.push({ r: r, c: c, n: seen.size });
            }
            cands.sort((a, b2) => (b2.n - a.n) || (a.r - b2.r));
            return cands[0] || null;
        };
        let sec = 0;
        while (!g.over && shots < 300) {
            if (l.ball) { g.update(1 / 120); sec += 1 / 120; continue; }
            const t = pick();
            if (!t) { g.update(1 / 120); sec += 1 / 120; continue; }
            l.aimAt(l.cx(t.r, t.c), l.yOf(t.r));
            l.fire();
            shots++;
            let n = 0;
            while (l.ball && n < 900) { g.update(1 / 120); sec += 1 / 120; n++; if (g.over) break; }
            for (let w = 0; w < 120 && !g.over; w++) { g.update(1 / 120); sec += 1 / 120; }
        }
        return { win: g.win, over: g.over, hp: Math.round(g.hp), shots, sec: Math.round(sec), phase: g.phase };
    });
    ok(runA.win && runA.hp === 0, '正常打法能把机械龙打死',
        runA.shots + ' 发 / ' + runA.sec + ' 秒 / 第 ' + runA.phase + ' 阶段');

    /* ---------- ④ 泡泡对轰 ---------- */
    console.log('\n④ 泡泡对轰');
    await page.evaluate(() => { window.MiniGames.openGame('duel'); window.MiniGames.active.reset(); });
    await sleep(200);

    const sideTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        return {
            lx: g.la.LEFT, rx: g.lb.LEFT, overlap: g.la.wallR >= g.lb.wallL,
            aCells: g.la.count(), bCells: g.lb.count(), ai: g.aiOn
        };
    });
    ok(!sideTest.overlap && sideTest.lx < 450 && sideTest.rx > 450, '两块场地互不重叠',
        '左侧 ' + sideTest.lx + ' / 右侧 ' + sideTest.rx);
    ok(sideTest.aCells > 20 && sideTest.bCells > 20, '两边都铺了起始泡泡',
        sideTest.aCells + ' / ' + sideTest.bCells);

    const gcTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        g.onPop(g.la, { popped: 5, dropped: 0 });
        const queued = g.pending.length;
        for (let i = 0; i < 90; i++) g.update(1 / 60);
        let tombs = 0;
        for (let c = 0; c < g.lb.colsIn(0); c++) if (g.lb.g[0][c] === 99) tombs++;
        return { queued, tombs, n: g.pending.length };
    });
    ok(gcTest.queued === 1 && gcTest.tombs >= 1, '左边消 5 颗 → 右边顶行落墓碑',
        '墓碑 ' + gcTest.tombs + ' 块');

    const aiTest = await page.evaluate(async () => {
        const g = window.MiniGames.active;
        g.reset();
        const before = g.lb.count();
        for (let i = 0; i < 60 * 6; i++) g.update(1 / 60);
        return { before, after: g.lb.count(), ai: g.aiOn };
    });
    ok(aiTest.ai && aiTest.after !== aiTest.before, '电脑接管右侧后会自己打', aiTest.before + '→' + aiTest.after);

    const takeover = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        g.onKey(true, 'left');
        return { ai: g.aiOn, showAim: g.lb.showAim };
    });
    ok(!takeover.ai && takeover.showAim, '按一下方向键就由玩家接管右侧');

    const deadSide = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const l = g.lb;
        for (let c = 0; c < l.colsIn(l.rows - 1); c++) l.g[l.rows - 1][c] = 0;
        l.checkState();
        return { over: g.over, win: g.win };
    });
    ok(deadSide.over && deadSide.win, '对手被压线 → 判你赢');

    /* ---------- ⑤ 泡泡塔 ---------- */
    console.log('\n⑤ 泡泡塔');
    await page.evaluate(() => { window.MiniGames.openGame('tower'); window.MiniGames.active.reset(); });
    await sleep(200);

    const floorTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const f1 = g.floor, sp1 = g.lane.specials.length;
        for (let r = 0; r < g.lane.rows; r++) g.lane.g[r] = new Array(g.lane.COLS).fill(-1);
        g.lane.checkState();
        const trans = g.trans;
        for (let i = 0; i < 120; i++) g.update(1 / 60);
        return { f1, f2: g.floor, sp1, sp2: g.lane.specials.length, trans };
    });
    ok(floorTest.f1 === 1 && floorTest.trans > 0, '清空第 1 层 → 进入过关停顿');
    ok(floorTest.f2 === 2, '停顿结束后自动进第 2 层', '第 ' + floorTest.f2 + ' 层');
    ok(floorTest.sp1 === 0 && floorTest.sp2 === 1, '第 2 层解锁炸弹球');

    const bombTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset(); g.loadFloor(4);
        const l = g.lane;
        for (let r = 0; r < l.rows; r++) l.g[r] = new Array(l.COLS).fill(-1);
        for (let c = 0; c < 8; c++) l.g[2][c] = 0;
        const before = l.count();
        g.onSpecial('bomb', l.cx(2, 4), l.yOf(2));
        return { before, after: l.count(), sp: l.specials.slice() };
    });
    ok(bombTest.after <= bombTest.before - 3, '炸弹球清掉落点周围一片', bombTest.before + '→' + bombTest.after);

    const rbTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset(); g.loadFloor(4);
        const l = g.lane;
        for (let r = 0; r < l.rows; r++) l.g[r] = new Array(l.COLS).fill(-1);
        for (let c = 0; c < 18; c++) l.g[0][c] = c < 9 ? 1 : 2;
        const before = l.count();
        g.onSpecial('rainbow', l.cx(0, 3), l.yOf(0));
        let left1 = 0;
        for (let c = 0; c < l.colsIn(0); c++) if (l.g[0][c] === 1) left1++;
        return { before, after: l.count(), left1 };
    });
    ok(rbTest.left1 === 0 && rbTest.after <= rbTest.before - 9, '彩虹球清掉整种颜色',
        rbTest.before + '→' + rbTest.after);

    const boltTest = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset(); g.loadFloor(6);
        const l = g.lane;
        for (let r = 0; r < l.rows; r++) l.g[r] = new Array(l.COLS).fill(-1);
        for (let c = 0; c < l.colsIn(3); c++) l.g[3][c] = 0;
        const before = l.count();
        g.onSpecial('bolt', l.cx(3, 5), l.yOf(3));
        return { before, after: l.count(), sp: l.specials.length };
    });
    ok(boltTest.after === 0 && boltTest.before > 10, '闪电球清掉整行', boltTest.before + '→' + boltTest.after);

    const towerDead = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset();
        const l = g.lane;
        for (let c = 0; c < l.colsIn(l.rows - 1); c++) l.g[l.rows - 1][c] = 0;
        l.checkState();
        return { over: g.over, win: g.win };
    });
    ok(towerDead.over && !towerDead.win, '泡泡塔压线 → 判负');

    const winTower = await page.evaluate(() => {
        const g = window.MiniGames.active;
        g.reset(); g.loadFloor(8);
        for (let r = 0; r < g.lane.rows; r++) g.lane.g[r] = new Array(g.lane.COLS).fill(-1);
        g.lane.checkState();
        for (let i = 0; i < 140; i++) g.update(1 / 60);
        return { over: g.over, win: g.win, floor: g.floor };
    });
    ok(winTower.over && winTower.win, '打通第 8 层 → 通关');

    /* ---------- ⑥ 回归 ---------- */
    console.log('\n⑥ 回归');
    const oldBub = await page.evaluate(() => {
        window.MiniGames.openGame('bubble');
        const g = window.MiniGames.active;
        g.reset();
        return { cols: g.COLS, rows: g.rows, cells: g.leftCount(), kind: typeof g._aimLimit };
    });
    ok(oldBub.cols === 18 && oldBub.rows === 11 && oldBub.cells > 50, '原来的猫尾草泡泡龙没被动到',
        oldBub.cells + ' 颗');

    const others = ['tetris', 'whack', 'g2048', 'bubble', 'breakout', 'sokoban', 'memory', 'dragon', 'duel', 'tower'];
    let openFail = [];
    for (const id of others) {
        const r = await page.evaluate(i => {
            window.MiniGames.openGame(i);
            return !!window.MiniGames.active;
        }, id);
        if (!r) openFail.push(id);
    }
    ok(openFail.length === 0, '10 个玩法都能打开', openFail.length ? openFail.join(',') : '全部 OK');

    ok(errs.length === 0, '全程没有 JS 报错', errs.length ? errs[0] : '0 错误');

    console.log('\n结果 ' + pass + '/' + (pass + fail) + (fail ? '  ❌ ' + fail : '  全过'));
    await b.close();
    process.exit(fail ? 1 : 0);
})();
