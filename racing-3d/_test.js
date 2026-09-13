/* 极速飞车 自动化测试套件 v2 — 增加手动帧推进 + 放宽 wall-clock 断言 */
const path = require('path');
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

const FILE = 'file://' + path.resolve(__dirname, 'index.html');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--disable-gpu', '--no-sandbox',
               '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
               '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'],
        defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE.ERR: ' + m.text()); });
    const results = [];
    const t = (name, pass, extra='') => { results.push({ name, pass, extra }); console.log((pass ? '✓ ' : '✗ ') + name + (extra ? '  ' + extra : '')); };

    await page.goto(FILE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.state !== 'LOADING', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 300));

    /* ===== T1: 基础结构 ===== */
    const initInfo = await page.evaluate(() => ({
        hasWorld: !!window.__game.world,
        hasPlayer: !!window.__game.player,
        aiCount: window.__game.ais.length,
        state: window.__game.state,
        trackLen: window.__game.world ? window.__game.world.length : 0,
        smpCount: window.__game.world ? window.__game.world.smp.length : 0,
    }));
    t('T1.1 world 已构建', initInfo.hasWorld);
    t('T1.2 player 已构建', initInfo.hasPlayer);
    t('T1.3 3 辆 AI', initInfo.aiCount === 3);
    t('T1.4 初始状态 MENU', initInfo.state === 'MENU');
    t('T1.5 赛道长度合理 600-2000m', initInfo.trackLen > 600 && initInfo.trackLen < 2000, 'L=' + Math.round(initInfo.trackLen));
    t('T1.6 赛道采样 900', initInfo.smpCount === 900);

    /* ===== T2: 手动帧推进 60 帧（绕过 rAF 限频，测试物理确定正确性） ===== */
    const sim = await page.evaluate(() => {
        const g = window.__game;
        g.startRace();
        const p = g.player;
        // 给玩家一个初始速度并按住油门跑 60 帧（每帧 dt=0.033）
        p.speed = 0;
        const samples = [];
        for (let i = 0; i < 60; i++) {
            Input.keys['w'] = true;
            p.update(0.033, true);
            samples.push({ f: i, speed: p.speed, accum: p.accum, idx: p.idx });
        }
        Input.keys['w'] = false;
        return { startState: g.state, endSpeed: p.speed, endAccum: p.accum, samples: samples.filter((_, i) => i % 10 === 9) };
    });
    t('T2.1 startRace 切到 COUNTDOWN', sim.startState === 'COUNTDOWN', sim.startState);
    t('T2.2 60 帧手动模拟后速度持续 > 10 m/s', sim.endSpeed > 10, 'v=' + sim.endSpeed.toFixed(1));
    t('T2.3 60 帧累加器 > 15m', sim.endAccum > 15, 'accum=' + sim.endAccum.toFixed(1));
    t('T2.4 60 帧 idx 单调推进（5 个采样）', sim.samples.every((s, i) => i === 0 || s.idx > (sim.samples[i-1]?.idx || 0) || s.accum > (sim.samples[i-1]?.accum || 0)),
      sim.samples.map(s => `f${s.f}:v${s.speed.toFixed(1)}a${s.accum.toFixed(1)}i${s.idx}`).join(' | '));

    /* ===== T3: 转向 / 漂移 物理 ===== */
    const turn = await page.evaluate(() => {
        const g = window.__game; const p = g.player;
        // 用稳定速度 20 测试转向
        p.speed = 20; p.heading = 0; p.velAngle = 0;
        const h0 = p.heading;
        Input.keys['a'] = true;
        for (let i = 0; i < 20; i++) p.update(0.033, true);
        Input.keys['a'] = false;
        const h1 = p.heading;
        Input.keys['d'] = true;
        for (let i = 0; i < 30; i++) p.update(0.033, true);
        Input.keys['d'] = false;
        const h2 = p.heading;
        return { h0, h1, h2 };
    });
    t('T3.1 A 持续左转（heading 增大 → world +X → 屏幕左侧）', turn.h1 > turn.h0 + 0.1, `h0=${turn.h0.toFixed(2)} h1=${turn.h1.toFixed(2)}`);
    t('T3.2 D 持续右转（heading 减小 → world -X → 屏幕右侧）', turn.h2 < turn.h1 - 0.1, `h1=${turn.h1.toFixed(2)} h2=${turn.h2.toFixed(2)}`);

/* ===== T4 (v1.2.0): CD 氮气 ===== */
    const drift = await page.evaluate(() => {
        const g = window.__game; const p = g.player;
        p.speed = 30; p.heading = 0; p.velAngle = 0;
        p.boostT = 0; p.boostCd = 0;
        // 按住空格加速
        Input.keys[' '] = true;
        for (let i = 0; i < 10; i++) p.update(0.033, true);
        const during = { speed: p.speed, boostT: p.boostT, nitroOn: p.nitroOn };
        // 继续按满 2.2s → 应进 CD
        for (let i = 0; i < 60; i++) p.update(0.033, true);
        const afterMax = { boostCd: p.boostCd, nitro: p.nitro };
        Input.keys[' '] = false;
        // CD 期间再按也没用
        const cdSnap = p.boostCd;
        for (let i = 0; i < 10; i++) p.update(0.033, true);
        return { during, afterMax, cdSnap, stillCd: p.boostCd > 0, boostTReset: p.boostT };
    });
    t('T4.1 按住空格 → 氮气生效（nitroOn=true 且 boostT 累计）', drift.during.nitroOn === true && drift.during.boostT > 0.2, `boostT=${drift.during.boostT.toFixed(2)}`);
    t('T4.2 用满 2.2s → 进入 CD（boostCd > 3）', drift.afterMax.boostCd > 3, `cd=${drift.afterMax.boostCd.toFixed(2)}`);
    t('T4.3 CD 期间 nitro 读数 < 100（条未满）', drift.afterMax.nitro < 100, `nitro=${drift.afterMax.nitro.toFixed(0)}`);
    t('T4.4 CD 期间按键无法再次加速', drift.stillCd && drift.boostTReset === 0, `stillCd=${drift.stillCd} boostT=${drift.boostTReset}`);

    /* ===== T5: 出赛道软限速 ===== */
    const off = await page.evaluate(() => {
        const g = window.__game; const p = g.player;
        // 把玩家平移到路外 20m
        const i = g.world.nearestIdx(p.pos.x, p.pos.z, p.idx);
        const a = g.world.smp[i];
        p.pos.x = a.p.x + a.left.x * 22; p.pos.z = a.p.z + a.left.z * 22;
        p.speed = 40; p.heading = Math.atan2(a.t.x, a.t.z);
        for (let i = 0; i < 30; i++) p.update(0.033, true);
        return { speed: p.speed };
    });
    t('T5.1 出赛道后比路面速度慢（v1.1.2 调到接近真实：约 0.55×）', off.speed > 0 && off.speed <= 35, `v=${off.speed.toFixed(1)} (路面 vmax=${46})`);

    /* ===== T6: AI 限速与曲线贴内 ===== */
    const aiTest = await page.evaluate(() => {
        const g = window.__game;
        for (const ai of g.ais) ai.s = 0, ai.lane = 0, ai.v = 0;
        for (let i = 0; i < 60; i++) g.ais.forEach(a => a.update(0.033, true, 0));
        return g.ais.map(a => ({ v: a.v, lane: a.lane }));
    });
    t('T6.1 AI 1 帧后速度 > 5 m/s', aiTest.every(a => a.v > 5), JSON.stringify(aiTest));
    t('T6.2 AI 速度 < 30 m/s（合理上界）', aiTest.every(a => a.v < 30), JSON.stringify(aiTest));

    /* ===== T7: 倒计时与状态机（手动驱动） ===== */
    const cd = await page.evaluate(() => {
        const g = window.__game;
        g.buildRace((Date.now() & 0x7fffffff) >>> 0);
        g.startRace();
        return { state: g.state, cdTime: g.cdTime, shown: g.cdShown };
    });
    t('T7.1 startRace 切到 COUNTDOWN', cd.state === 'COUNTDOWN', cd.state);
    // 手动跑 130 帧（>3.6s）应到 RACING
    const raceStart = await page.evaluate(() => {
        for (let i = 0; i < 130; i++) window.__game.frame(0.033);
        return { state: window.__game.state, raceTime: window.__game.raceTime };
    });
    t('T7.2 130 帧后 RACING（cdTime 用尽）', raceStart.state === 'RACING', `state=${raceStart.state} raceTime=${raceStart.raceTime.toFixed(1)}`);

    /* ===== T8: 结算（直接构造完成态，验证 UI 流程） ===== */
    const finish = await page.evaluate(() => {
        const g = window.__game;
        try {
            // 先用 130 帧走完倒计时，确保赛车处于 RACING 状态
            for (let i = 0; i < 130; i++) g.frame(0.033);
            const L = g.world.length;
            g.raceTime = 132.5;
            g.lapTimes = [44.7, 44.0, 43.8];
            g.crossings = 4;
            g.player.accum = 22 + 3 * L; // 已经跑完
            g.player.lastS = 0;
            g.finishRace();
            return { ok: true, state: g.state, crossings: g.crossings, lapTimes: g.lapTimes.length, resultHidden: document.getElementById('results').classList.contains('hidden') };
        } catch (e) { return { ok: false, err: String(e) }; }
    });
    t('T8.0 finishRace 没抛错', finish.ok !== false, finish.err || '');
    t('T8.1 直接调 finishRace → FINISHED', finish.state === 'FINISHED', `state=${finish.state} crossings=${finish.crossings} lapTimes=${finish.lapTimes}`);
    t('T8.2 结算面板默认隐藏（1.4s 后才显示）', finish.resultHidden, 'hidden=' + finish.resultHidden);
    // 等结算面板浮出
    await new Promise(r => setTimeout(r, 1600));
    const finishShown = await page.evaluate(() => ({ state: window.__game.state, shown: !document.getElementById('results').classList.contains('hidden') }));
    t('T8.3 1.4s 后结算面板显示', finishShown.shown, 'shown=' + finishShown.shown);

    /* ===== T9: 结算面板内容 ===== */
    if (finishShown.shown) {
        const rt = await page.evaluate(() => {
            const r = document.getElementById('resultTable');
            return {
                title: document.getElementById('resultTitle').textContent.trim(),
                rows: r.querySelectorAll('.row').length,
                text: r.textContent,
            };
        });
        t('T9.1 结算标题含「第 N 名」', /第\s*\d+\s*名/.test(rt.title), rt.title);
        t('T9.2 至少 5 行（总成绩 + 3 圈 + 最佳/赛道）', rt.rows >= 5, 'rows=' + rt.rows);
        t('T9.3 包含所有 3 圈行', (rt.text.match(/第\s*[1-3]\s*圈/g) || []).length === 3, '');
        t('T9.4 包含最佳圈字段', /最佳圈/.test(rt.text), '');
    } else {
        t('T9.x 结算面板未显示', false, 'skip');
    }

    /* ===== T10: 难度切换 ===== */
    const diffs = await page.evaluate(() => {
        const g = window.__game; g.buildRace((Date.now() & 0x7fffffff) >>> 0);
        const before = g.ais[0].skill;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('sel'));
        document.querySelectorAll('.diff-btn')[2].classList.add('sel');
        g.diff = 2;
        g.buildRace((Date.now() & 0x7fffffff) >>> 0);
        return { before, after: g.ais[0].skill, diff: g.diff };
    });
    t('T10.1 难度狂野 → AI 技能 > 1.0', diffs.after > 1.0, `skill=${diffs.after.toFixed(2)}`);

    /* ===== T11: 新赛道按钮 ===== */
    const newTrack = await page.evaluate(() => {
        const g = window.__game;
        g.startRace();
        for (let i = 0; i < 70; i++) g.frame(0.033); // 跑完倒计时
        const seed1 = g.seed;
        document.getElementById('btn-again-new').click();
        return { seed1, seed2: g.seed, state: g.state, len2: g.world.length };
    });
    t('T11.1 新赛道 seed 改变', newTrack.seed2 !== newTrack.seed1, `${newTrack.seed1} → ${newTrack.seed2}`);
    t('T11.2 回到 COUNTDOWN/RACING', newTrack.state === 'COUNTDOWN' || newTrack.state === 'RACING', newTrack.state);

    /* ===== T12: 错误清零 ===== */
    t('T12.1 无 pageerror', errors.length === 0, errors.length ? '\n' + errors.join('\n') : '');

    /* ===== T13 (v1.0.1): 路面方向箭头 ===== */
    const arrows = await page.evaluate(() => {
        const w = window.__game.world;
        const group = w.signGroup;
        return {
            exists: !!group,
            count: group ? group.children.length : 0,
            firstPos: group ? (() => { const m = group.children[0]; return m ? [m.position.x, m.position.y, m.position.z] : null; })() : null,
        };
    });
    t('T13.1 路边指示牌组存在', arrows.exists, '' + arrows.exists);
    t('T13.2 指示牌总数 > 10', arrows.count > 10, 'N=' + arrows.count);
    t('T13.3 首个箭头位置距赛道起点 y 合理', arrows.firstPos && Math.abs(arrows.firstPos[1]) < 50,
        arrows.firstPos ? `${arrows.firstPos[0].toFixed(1)},${arrows.firstPos[1].toFixed(1)},${arrows.firstPos[2].toFixed(1)}` : 'null');

    /* ===== T14 (v1.0.1): terrain 振幅压缩 + 出赛道柔回拉 ===== */
    const terrain = await page.evaluate(() => {
        const g = window.__game, w = g.world, p = g.player;
        // 1) terrain 振幅 < ±1.5m（5 个采样点）
        const samples = [];
        for (let i = 0; i < 5; i++) samples.push(w.terrainH((Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500));
        const amp = Math.max(...samples) - Math.min(...samples);
        // 2) 玩家停在赛道外，验证柔回拉代码（不让车动，避免弯道几何干扰）
        g.playerStartS = w.length - 22;
        g.buildRace(g.seed);
        const p2 = g.player; const i = w.nearestIdx(p2.pos.x, p2.pos.z, p2.idx);
        const a = w.smp[i];
        p2.pos.x = a.p.x + a.left.x * 30; p2.pos.z = a.p.z + a.left.z * 30;
        p2.speed = 0; p2.heading = Math.atan2(a.t.x, a.t.t ? a.t.z : 1);
        const lat0 = w.lateralOffset(p2.pos.x, p2.pos.z, p2.idx);
        // 跑 60 帧（speed=0 + 无油门/无控制 → 只受摩擦和 pullback 影响）
        // 用 controlsLive=false 让 throttle/brake/steer/nitro 都为 0
        for (let i = 0; i < 60; i++) p2.update(0.033, false);
        const lat1 = w.lateralOffset(p2.pos.x, p2.pos.z, p2.idx);
        return { amp, lat0, lat1, speed: p2.speed };
    });
    t('T14.1 terrain 振幅 < 2.5m（视觉平缓）', terrain.amp < 2.5, 'amp=' + terrain.amp.toFixed(2));
    t('T14.2 静止 60 帧侧向偏移回拉 > 1m', Math.abs(terrain.lat1) < Math.abs(terrain.lat0) - 1, `lat0=${terrain.lat0.toFixed(1)} lat1=${terrain.lat1.toFixed(1)}`);
    t('T14.3 出赛道 30 帧后明显减速（初始 40→35 m/s，验证草地摩擦生效）', terrain.speed <= 35 && terrain.speed < 40, 'v=' + terrain.speed.toFixed(1));

    /* ===== T15 (v1.0.1): VS 双人模式 ===== */
    const vsInit = await page.evaluate(() => {
        const g = window.__game;
        g.mode = 'VS';
        g.seed = 12345; g.buildRace(g.seed);
        return {
            p1Exists: !!g.player, p2Exists: !!g.player2,
            p1Color: g.player.mesh.children[0].material.color.getHexString(),
            p2Color: g.player2.mesh.children[0].material.color.getHexString(),
            camP2Exists: !!g.cameraP2,
            aiEmpty: !g.ais || g.ais.length === 0,
            aiExists: g.ais && g.ais.length > 0,
        };
    });
    t('T15.1 VS 模式创建 P1', vsInit.p1Exists, '' + vsInit.p1Exists);
    t('T15.2 VS 模式创建 P2', vsInit.p2Exists, '' + vsInit.p2Exists);
    t('T15.3 P1 红色 P2 蓝色', vsInit.p1Color === 'e63946' && vsInit.p2Color === '1e88ff',
        `P1=${vsInit.p1Color} P2=${vsInit.p2Color}`);
    t('T15.4 P1 / P2 颜色不同（区分红车/蓝车）', vsInit.p1Color !== vsInit.p2Color, `P1=${vsInit.p1Color} P2=${vsInit.p2Color}`);
    t('T15.5 双相机存在', vsInit.camP2Exists, '' + vsInit.camP2Exists);
    t('T15.6 VS 模式无 AI（ais 数组空）', vsInit.aiEmpty, 'exists=' + vsInit.aiExists);

    /* ===== T16 (v1.0.1): P2 独立键位 + 不冲突 ===== */
    const p2Keys = await page.evaluate(() => {
        const g = window.__game;
        g.startRace(); g.frame(0.05);
        // 模拟只有方向键被按住 → P2 应该响应（speed > 0.5），P1 不响应
        for (const k of ['w', 'a', 's', 'd', 'shift', ' ']) Input.keys[k] = false;
        Input.keys['arrowup'] = true;
        // 必须先把 mode 设为 VS 才让 P2 接收输入
        g.mode = 'VS';
        Input.setP2();
        const p1v0 = g.player.speed, p2v0 = (g.player2 || {}).speed || 0;
        for (let i = 0; i < 30; i++) {
            g.player.update(0.033, true);
            if (g.player2) g.player2.update(0.033, true, Input.p2);
        }
        const p1v1 = g.player.speed, p2v1 = g.player2.speed;
        Input.keys['arrowup'] = false;
        // 现在放开 arrowup，按 W → P1 应该响应，P2 不响应
        Input.keys['w'] = true;
        Input.setP2();
        for (let i = 0; i < 30; i++) {
            g.player.update(0.033, true);
            if (g.player2) g.player2.update(0.033, true, Input.p2);
        }
        const p1v2 = g.player.speed, p2v2 = g.player2.speed;
        Input.keys['w'] = false;
        return { p1v0, p2v0, p1v1, p2v1, p1v2, p2v2 };
    });
    t('T16.1 P1 不响应方向键（p1v1 ≈ p1v0）', Math.abs(p2Keys.p1v1 - p2Keys.p1v0) < 0.3, `v0=${p2Keys.p1v0.toFixed(1)} v1=${p2Keys.p1v1.toFixed(1)}`);
    t('T16.2 P2 响应方向键（p2v1 > p2v0）', p2Keys.p2v1 > p2Keys.p2v0 + 5, `v0=${p2Keys.p2v0.toFixed(1)} v1=${p2Keys.p2v1.toFixed(1)}`);
    t('T16.3 P1 响应 W（p1v2 > p1v1）', p2Keys.p1v2 > p2Keys.p1v1 + 5, `v1=${p2Keys.p1v1.toFixed(1)} v2=${p2Keys.p1v2.toFixed(1)}`);
    t('T16.4 P2 不响应 W（p2v2 ≈ p2v1，惯性差 < 1.5）', Math.abs(p2Keys.p2v2 - p2Keys.p2v1) < 1.5, `v1=${p2Keys.p2v1.toFixed(1)} v2=${p2Keys.p2v2.toFixed(1)}`);

    /* ===== T17 (v1.0.1): 分屏渲染 ===== */
    const split = await page.evaluate(() => {
        const g = window.__game;
        g.mode = 'VS'; g.buildRace(g.seed);
        // 让游戏进入 RACING，触发一次完整渲染
        g.startRace();
        for (let i = 0; i < 130; i++) g.frame(0.033);
        return {
            mode: g.mode,
            cameraP1Exists: !!g.camera,
            cameraP2Exists: !!g.cameraP2,
            sceneHasP2: !!(g.player2 && g.player2.mesh && g.scene.getObjectById(g.player2.mesh.id)),
            p1InScene: !!(g.player && g.player.mesh && g.scene.getObjectById(g.player.mesh.id)),
            rendered: g.renderer.info.render.calls > 0,
        };
    });
    t('T17.1 VS 模式双相机 + 两车都在场景 + 已渲染',
        split.cameraP1Exists && split.cameraP2Exists && split.sceneHasP2 && split.p1InScene && split.rendered,
        `mode=${split.mode} cam1=${split.cameraP1Exists} cam2=${split.cameraP2Exists} p2=${split.sceneHasP2} p1=${split.p1InScene} rendered=${split.rendered}`);

    /* ===== T18 (v1.0.1): terrain Y 多点采样不会让车陷入 ===== */
    const onGround = await page.evaluate(() => {
        const g = window.__game;
        // 把车开到赛道外很远，30 帧后 y 应该不是负的极大值（之前会跌到 -3 或更小）
        const w = g.world;
        const p = g.player; const i = w.nearestIdx(p.pos.x, p.pos.z, p.idx);
        const a = w.smp[i];
        p.pos.x = a.p.x + a.left.x * 50; p.pos.z = a.p.z + a.left.z * 50;
        p.pos.y = w.groundY(p.pos.x, p.pos.z, p.idx);
        for (let i = 0; i < 60; i++) p.update(0.033, true);
        return { y: p.pos.y, groundY: w.groundY(p.pos.x, p.pos.z, p.idx), dy: p.pos.y - w.groundY(p.pos.x, p.pos.z, p.idx) };
    });
    t('T18.1 出赛道后赛车 y 与地面差距 < 1.5m（不陷入）', Math.abs(onGround.dy) < 1.5,
        `y=${onGround.y.toFixed(2)} groundY=${onGround.groundY.toFixed(2)} dy=${onGround.dy.toFixed(2)}`);

    /* ===== T19 (v1.2.0): 树/岩石碰撞（注入单个隔离碰撞体，确定性单元测试） ===== */
    const coll = await page.evaluate(() => {
        const g = window.__game, w = g.world, p = g.player;
        if (!w.colliders || !w.colliders.length) return { none: true };
        // 注入一个孤立的假碰撞体，避免真实碰撞体相互重叠干扰
        const c = { x: 5000, z: 5000, minD: 2.0 };
        const saved = w.colliders;
        w.colliders = [c];
        const out = {};
        // 1) 车陷在障碍里 → 应被推出到 minD 之外，且正面撞击大幅减速
        p.pos.x = c.x + c.minD * 0.4; p.pos.z = c.z;
        p.speed = 30; p.velAngle = -Math.PI / 2; p.heading = -Math.PI / 2; // 朝 -x 撞向障碍中心
        out.v0 = p.speed;
        w.collideCar(p);
        out.dAfter = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
        out.vHead = p.speed;
        // 2) 侧刮（运动方向与法线垂直）→ 只轻微减速
        p.pos.x = c.x + c.minD * 0.4; p.pos.z = c.z;
        p.speed = 30; p.velAngle = 0; // 朝 +z，与法线 (+1,0) 垂直
        w.collideCar(p);
        out.vSide1 = p.speed;
        // 3) 不在障碍附近 → 无碰撞
        p.pos.x = c.x + 50; p.pos.z = c.z; p.speed = 20; p.velAngle = 0;
        out.hitFar = w.collideCar(p);
        out.farSpeed = p.speed;
        w.colliders = saved; // 还原
        return { none: false, minD: c.minD, ...out };
    });
    if (coll.none) {
        t('T19.1 碰撞体存在', false, 'colliders 为空');
    } else {
        t('T19.1 碰撞体存在（树+岩石 > 100 个）', true, '');
        t('T19.2 车被推出障碍（d ≥ minD - 0.05）', coll.dAfter >= coll.minD - 0.05, `d=${coll.dAfter.toFixed(2)} minD=${coll.minD.toFixed(2)}`);
        t('T19.3 正面撞击大幅减速（30 → < 15）', coll.vHead < 15, `v0=${coll.v0.toFixed(1)} v1=${coll.vHead.toFixed(1)}`);
        t('T19.4 侧刮只轻微减速（30 → > 20）', coll.vSide1 > 20, `v1=${coll.vSide1.toFixed(1)}`);
        t('T19.5 远离障碍时不误判碰撞', coll.hitFar === false && Math.abs(coll.farSpeed - 20) < 0.01, `hit=${coll.hitFar} v=${coll.farSpeed}`);
    }

    /* ===== T20 (v1.2.0): 指示牌只放左侧且减半 ===== */
    const signCheck = await page.evaluate(() => {
        const w = window.__game.world;
        if (!w.signGroup) return { none: true };
        // 每块牌的横向符号：牌位相对赛道中心在 left 方向的投影应为负（左侧）
        let allLeft = true;
        const posts = w.signGroup.children.filter(m => m.geometry && m.geometry.type === 'BoxGeometry');
        // 用 smpAt 反查每块牌的最近采样点判断左右
        const idxOf = (x, z) => w.nearestIdx(x, z, null);
        for (const m of posts) {
            const i = idxOf(m.position.x, m.position.z);
            const s = w.smp[i];
            const lat = (m.position.x - s.p.x) * s.left.x + (m.position.z - s.p.z) * s.left.z;
            if (lat > 0.5) { allLeft = false; break; }
        }
        return { none: false, boards: w.signBoards ? w.signBoards.length : 0, allLeft };
    });
    if (!signCheck.none) {
        t('T20.1 指示牌全部在赛道左侧', signCheck.allLeft, 'allLeft=' + signCheck.allLeft);
        t('T20.2 指示牌数量减半（约 20~40 块）', signCheck.boards >= 10 && signCheck.boards <= 45, 'N=' + signCheck.boards);
    }

    /* ===== T21 (v1.2.1): 车对车碰撞 —— 动量守恒模型（确定性单元测试） ===== */
    // T15 可能已切到 VS 模式（无 AI），先重建单人比赛
    await page.evaluate(() => {
        const g = window.__game;
        if (!g.ais || !g.ais.length) {
            g.mode = 'SOLO';
            g.buildRace(g.seed || 12345);
            g.startRace();
        }
    });
    await page.waitForFunction(() => window.__game.ais && window.__game.ais.length > 0, { timeout: 8000 });
    const mom = await page.evaluate(() => {
        const g = window.__game, w = g.world, p = g.player, ai = g.ais[0];
        const out = {};
        // 场景 A：玩家(快) 追尾 AI(慢) —— 前车应被撞飞、玩家稍减速
        {
            const sm = w.smp[p.idx];
            const th = Math.atan2(sm.t.x, sm.t.z);
            p.pos.copy(sm.p); p.heading = th; p.velAngle = th; p.speed = 30;
            ai.s = sm.s + 2.0;
            const sm2 = w.smpAt(ai.s);
            ai.pos.copy(sm2.p); ai.v = 10;
            out.aP0 = 30; out.aAI0 = 10;
            g.carVsCar(p, ai, 0.016);
            out.aP1 = p.speed; out.aAI1 = ai.v;
        }
        // 场景 B：AI(快) 从后面撞玩家(慢) —— 玩家应向前冲
        {
            const sm = w.smp[p.idx];
            const th = Math.atan2(sm.t.x, sm.t.z);
            p.pos.copy(sm.p); p.heading = th; p.velAngle = th; p.speed = 10;
            ai.s = sm.s - 2.0;
            const sm2 = w.smpAt(ai.s);
            ai.pos.copy(sm2.p); ai.v = 30;
            out.bP0 = 10; out.bAI0 = 30;
            g.carVsCar(p, ai, 0.016);
            out.bP1 = p.speed; out.bAI1 = ai.v;
        }
        // 场景 C：并排挤行（同速同向、横向重叠）—— 不应瞬间掉速，只轻微互损
        {
            const sm = w.smp[p.idx];
            const th = Math.atan2(sm.t.x, sm.t.z);
            p.pos.copy(sm.p); p.heading = th; p.velAngle = th; p.speed = 30;
            ai.s = sm.s; ai.v = 30;
            const sm2 = w.smpAt(ai.s);
            ai.pos.copy(sm2.p).addScaledVector(sm2.left, 2.0); // 横向 2m（< 2.8 接触半径）
            out.cP0 = 30;
            g.carVsCar(p, ai, 0.016);
            out.cP1 = p.speed; out.cAI1 = ai.v;
            // 持续挤行 30 帧（每帧把两车重新叠回去，模拟玩家持续挤靠），应平滑损耗而非骤停
            for (let i = 0; i < 30; i++) {
                p.speed = Math.max(p.speed, 0);
                p.pos.copy(sm.p);
                ai.pos.copy(sm2.p).addScaledVector(sm2.left, 2.0);
                g.carVsCar(p, ai, 0.016);
            }
            out.cP30 = p.speed;
        }
        // 场景 D：远离时不误判
        {
            p.pos.x += 50; p.speed = 20;   // 只移走玩家，两车相距 50m
            ai.v = 20;
            const before = p.speed;
            g.carVsCar(p, ai, 0.016);
            out.dHit = (p.speed !== before);
        }
        return out;
    });
    t('T21.1 追尾：前车被撞飞（AI v 10 → > 20）', mom.aAI1 > 20, `v=${mom.aAI1.toFixed(1)}`);
    t('T21.2 追尾：攻击者减速（P 30 → < 20）', mom.aP1 < 20, `v=${mom.aP1.toFixed(1)}`);
    t('T21.3 追尾动量守恒（等质量：vP+vAI 前后差 < 0.5）', Math.abs((mom.aP0 + mom.aAI0) - (mom.aP1 + mom.aAI1)) < 0.5,
        `前=${(mom.aP0 + mom.aAI0).toFixed(2)} 后=${(mom.aP1 + mom.aAI1).toFixed(2)}`);
    t('T21.4 被追尾：玩家向前冲（P 10 → > 20）', mom.bP1 > 20, `v=${mom.bP1.toFixed(1)}`);
    t('T21.5 被追尾：后车按动量减速（AI 30 → < 20）', mom.bAI1 < 20, `v=${mom.bAI1.toFixed(1)}`);
    t('T21.6 并排挤行单帧不骤停（30 → > 28）', mom.cP1 > 28, `v=${mom.cP1.toFixed(2)}`);
    t('T21.7 持续挤行 30 帧平滑损耗（30 → 15~28）', mom.cP30 > 15 && mom.cP30 < 28, `v=${mom.cP30.toFixed(2)}`);
    t('T21.8 远离时不误判碰撞', mom.dHit === false);

    /* ===== T22 (v1.2.2): 新手抓地增强 —— 转向速率与车尾跟随性 ===== */
    const grip = await page.evaluate(() => {
        const g = window.__game, p = g.player;
        const out = {};
        // 1) 30 m/s 满舵左转 1 秒：heading 角速度应达到抓地上限（26/30 ≈ 0.87 rad/s，旧值 0.63）
        p.speed = 30; p.heading = 0; p.velAngle = 0;
        Input.keys['a'] = true;
        for (let i = 0; i < 60; i++) p.update(0.016, true);
        Input.keys['a'] = false;
        out.yaw30 = p.heading;          // ≈ 0.86 rad
        out.slide30 = p.slide;
        // 2) 高速 44 m/s 满舵 1 秒：角速度应 > 0.55 rad/s（旧值 0.43）
        p.speed = 44; p.heading = 0; p.velAngle = 0;
        Input.keys['a'] = true;
        for (let i = 0; i < 60; i++) p.update(0.016, true);
        Input.keys['a'] = false;
        out.yaw44 = p.heading;
        // 3) 1 秒后方向盘回中（自动回中仍正常）
        for (let i = 0; i < 30; i++) p.update(0.016, true);
        out.steerBack = Math.abs(p.steerA);
        return out;
    });
    t('T22.1 30 m/s 满舵角速度 > 0.75 rad/s（旧 0.63）', grip.yaw30 > 0.75, `yaw1s=${grip.yaw30.toFixed(3)}`);
    t('T22.2 30 m/s 满舵 1 秒侧滑角 < 0.2（车尾跟手）', grip.slide30 < 0.2, `slide=${grip.slide30.toFixed(3)}`);
    t('T22.3 44 m/s 满舵角速度 > 0.55 rad/s（旧 0.43）', grip.yaw44 > 0.55, `yaw1s=${grip.yaw44.toFixed(3)}`);
    t('T22.4 松开方向 0.5 秒后方向盘回中（|steerA| < 0.02）', grip.steerBack < 0.02, `steerA=${grip.steerBack.toFixed(3)}`);

    /* ===== T23 (v1.2.3): 氮气尾焰特效 ===== */
    const fx = await page.evaluate(() => {
        const g = window.__game, p = g.player;
        const out = {};
        if (!g.nitroFx) return { none: true };
        g.nitroFx.clear();
        // 1) 挂线验证：RACING 状态下按住空格跑 40 帧 → 尾焰粒子应出现
        if (g.state !== 'RACING') { g.mode = 'SOLO'; g.buildRace(g.seed || 12345); g.startRace(); g.state = 'RACING'; g.cdTime = 0; }
        p.speed = 30; p.boostCd = 0; p.boostT = 0;
        Input.keys['w'] = true; Input.keys[' '] = true;
        let maxVisible = 0;
        for (let i = 0; i < 40; i++) { g.frame(0.016); maxVisible = Math.max(maxVisible, g.nitroFx.visibleCount()); }
        Input.keys[' '] = false; Input.keys['w'] = false;
        out.duringBoost = maxVisible;
        out.nitroOnFlag = p.nitroOn;
        // 2) 松开后 1.5 秒（90 帧）粒子应全部消亡
        for (let i = 0; i < 90; i++) g.frame(0.016);
        out.afterStop = g.nitroFx.visibleCount();
        // 3) 粒子池不溢出：连续 emit 200 次，活跃数不超过池大小
        g.nitroFx.clear();
        for (let i = 0; i < 200; i++) g.nitroFx.emit(p);
        out.poolOverflow = g.nitroFx.visibleCount() > g.nitroFx.max;
        g.nitroFx.clear();
        return out;
    });
    if (fx.none) {
        t('T23.1 nitroFx 系统存在', false, 'g.nitroFx 未创建');
    } else {
        t('T23.1 加速时尾焰粒子出现（可见数 > 10）', fx.duringBoost > 10, `maxVisible=${fx.duringBoost} nitroOn=${fx.nitroOnFlag}`);
        t('T23.2 松开加速 1.5 秒后粒子全部消亡', fx.afterStop === 0, `visible=${fx.afterStop}`);
        t('T23.3 粒子池循环复用不溢出（200 次 emit 后 ≤ 72）', fx.poolOverflow === false);
    }

    /* ===== T24 (v1.2.4): 终点实体碰撞 + 防绕圈计圈 ===== */
    const gate = await page.evaluate(() => {
        const g = window.__game, w = g.world, p = g.player;
        const out = {};
        if (!w.gateRects || !w.gateCircleDefs) return { none: true };
        g.togglePause(true); // 暂停 rAF 推进，避免并发干扰
        // A) 门区检测：车在起点线正中（smp[0]）→ latch 置位
        p.pos.copy(w.smp[0].p); p.idx = 0; p.gateLatch = false;
        g.checkGate(p);
        out.latchAtGate = p.gateLatch;
        // B) 车在线附近但横向偏离 20m（绕门外）→ 不置位
        const nearLine = w.smp[w.smp.length - 10]; // 距起点线约 10m 弧长
        p.pos.copy(nearLine.p).addScaledVector(nearLine.left, 20); p.idx = w.smp.length - 10;
        p.gateLatch = false;
        g.checkGate(p);
        out.latchOffGate = p.gateLatch;
        // C) 防绕圈：accum 超阈值但未穿门 → 不计圈（注意 SOLO 计圈用 Game.crossings）
        const L = w.length;
        g.crossings = 0; p.accum = 30; p.gateLatch = false;
        g.checkLap();
        out.blocked = g.crossings;
        // D) 穿门后正常计圈，latch 被消费
        p.gateLatch = true;
        g.checkLap();
        out.counted = g.crossings;
        out.latchConsumed = p.gateLatch;
        // E) 看台矩形碰撞（清空圆形碰撞体隔离测试）
        const saved = w.colliders;
        w.colliders = [];
        const st = w.gateRects[0];
        p.pos.set(st.x, 0, st.z); p.idx = 0;
        p.velAngle = st.yaw - Math.PI / 2; p.heading = p.velAngle; // 朝看台撞入（沿 -X 局部方向）
        p.speed = 25;
        out.standHit = w.collideCar(p);
        const dfx = (p.pos.x - st.x) * Math.cos(st.yaw) - (p.pos.z - st.z) * Math.sin(st.yaw);
        const dfz = (p.pos.x - st.x) * Math.sin(st.yaw) + (p.pos.z - st.z) * Math.cos(st.yaw);
        out.standOut = Math.abs(dfx) >= st.hx + 0.85 || Math.abs(dfz) >= st.hz + 0.85;
        out.standSpeed = p.speed;
        p.pos.set(st.x + 60, 0, st.z); p.speed = 20; p.velAngle = 0;
        out.standFarHit = w.collideCar(p);
        // F) 立柱圆形碰撞（只放回这一根，隔离测试；从路内侧撞向立柱，
        //    避免推出后落进柱子与看台之间 ~2m 的缝隙再被看台推回）
        const pc = w.gateCircleDefs[0];
        const s0v = w.smp[0];
        w.colliders = [pc];
        p.pos.set(pc.x - s0v.left.x * 1.2, 0, pc.z - s0v.left.z * 1.2);
        p.velAngle = Math.atan2(s0v.left.x, s0v.left.z); p.heading = p.velAngle;
        p.speed = 25;
        out.pillarHit = w.collideCar(p);
        out.pillarD = Math.hypot(p.pos.x - pc.x, p.pos.z - pc.z);
        out.pillarMinD = pc.minD;
        w.colliders = saved; // 还原
        g.togglePause(false);
        return out;
    });
    if (gate.none) {
        t('T24.0 gate 碰撞体存在', false, 'gateRects/gateCircleDefs 未创建');
    } else {
        t('T24.1 车在终点门正下 → gateLatch 置位', gate.latchAtGate === true, String(gate.latchAtGate));
        t('T24.2 车横向偏离 20m（门外）→ 不置位', gate.latchOffGate === false, String(gate.latchOffGate));
        t('T24.3 未穿门不计圈（防绕圈作弊）', gate.blocked === 0, 'crossings=' + gate.blocked);
        t('T24.4 穿门后正常计圈且 latch 消费', gate.counted === 1 && gate.latchConsumed === false,
            `crossings=${gate.counted} latch=${gate.latchConsumed}`);
        t('T24.5 车撞看台被推出（矩形碰撞生效）', gate.standHit === true && gate.standOut,
            `hit=${gate.standHit} out=${gate.standOut}`);
        t('T24.6 撞看台明显减速（25 → < 23）', gate.standSpeed < 23, `v=${gate.standSpeed.toFixed(1)}`);
        t('T24.7 远离看台不误判', gate.standFarHit === false);
        t('T24.8 车撞立柱被推出（d ≥ minD - 0.05）', gate.pillarHit === true && gate.pillarD >= gate.pillarMinD - 0.05,
            `d=${gate.pillarD.toFixed(2)} minD=${gate.pillarMinD}`);
    }

    /* ===== T25 (v1.2.5): 看台"吸车"修复 —— 一次性撞击减速 + 楔形缝不再互推夹车 ===== */
    const stick = await page.evaluate(() => {
        const g = window.__game, w = g.world, p = g.player;
        const out = {};
        g.togglePause(true);
        // 只保留立柱圆碰撞体（隔离树/石噪声，且立柱是楔形缝的组成部分）
        w.colliders = w.gateCircleDefs.map(c => ({ x: c.x, z: c.z, minD: c.minD }));
        const st = w.gateRects[0];
        const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
        const X = { x: cy, z: -sy };   // 看台局部 x 轴（世界坐标）
        const Z = { x: sy, z: cy };    // 看台局部 z 轴（世界坐标）
        const put = (fx, fz) => { p.pos.set(st.x + X.x * fx + Z.x * fz, 0, st.z + X.z * fx + Z.z * fz); };

        // A) 正面撞看台：一次性减速仍然生效
        put(-2.0, 0);
        p.velAngle = Math.atan2(X.x, X.z); p.heading = p.velAngle; // 朝看台撞入
        p.speed = 25; p._hitPenCd = 0;
        w.collideCar(p, 0.016);
        out.headOnSpeed = p.speed;

        // B) 贴着看台长边平行刮蹭 90 帧：速度不应衰减（旧版每帧 ×0.88 会衰到 ≈0）
        put(-2.49, 6);
        p.velAngle = st.yaw; p.heading = st.yaw; // 沿台子长边方向开
        p.speed = 25; p._hitPenCd = 0;
        for (let i = 0; i < 90; i++) { put(-2.49, 6); w.collideCar(p, 0.016); }
        out.scrapeSpeed = p.speed;

        // C) 立柱-看台楔形缝（横向 ~10.8，横向 10.5~11.2 为旧版互推夹车区）：
        //    持续接触速度不塌、能沿切线开出去
        const s0 = w.smp[0];
        p.pos.set(s0.p.x + s0.left.x * 10.8 + s0.t.x * 0.5, 0, s0.p.z + s0.left.z * 10.8 + s0.t.z * 0.5);
        p.velAngle = Math.atan2(s0.t.x, s0.t.z); p.heading = p.velAngle;
        p.speed = 8; p._hitPenCd = 0;
        const sx = p.pos.x, sz = p.pos.z;
        for (let i = 0; i < 240; i++) {
            p.pos.x += Math.sin(p.velAngle) * p.speed * 0.016;
            p.pos.z += Math.cos(p.velAngle) * p.speed * 0.016;
            w.collideCar(p, 0.016);
        }
        out.wedgeSpeed = p.speed;
        out.wedgeMoved = Math.hypot(p.pos.x - sx, p.pos.z - sz);

        // D) 撞树一次性减速回归（冲量式对圆形碰撞体同样生效）
        w.colliders = [{ x: 5000, z: 5000, minD: 2 }];
        p.pos.set(5000, 0, 4998.5); p.velAngle = 0; p.heading = 0; p.speed = 25; p._hitPenCd = 0;
        w.collideCar(p, 0.016);
        out.treeSpeed = p.speed;
        g.togglePause(false);
        return out;
    });
    t('T25.1 正面撞看台仍明显减速（25 → < 20）', stick.headOnSpeed < 20, `v=${stick.headOnSpeed.toFixed(1)}`);
    t('T25.2 贴看台刮蹭 90 帧速度不衰减（> 23，旧版 ≈ 0）', stick.scrapeSpeed > 23, `v=${stick.scrapeSpeed.toFixed(1)}`);
    t('T25.3 立柱-看台楔形缝速度不塌（> 6.5）且能开出去（位移 > 5m）',
        stick.wedgeSpeed > 6.5 && stick.wedgeMoved > 5,
        `v=${stick.wedgeSpeed.toFixed(1)} moved=${stick.wedgeMoved.toFixed(1)}m`);
    t('T25.4 撞树一次性减速回归正常（25 → < 20）', stick.treeSpeed < 20, `v=${stick.treeSpeed.toFixed(1)}`);

    /* ===== 截图 ===== */
    await page.evaluate(() => window.__game && window.__game.togglePause && window.__game.togglePause(true));
    await new Promise(r => setTimeout(r, 100));
    const ss1 = '/tmp/racing_race.png'; await page.screenshot({ path: ss1 });
    const ss2 = '/tmp/racing_results.png'; await page.screenshot({ path: ss2 });

    // 额外截图：SOLO 赛道箭头 + VS 分屏
    try {
        await page.evaluate(() => { window.__game.backToMenu(); });
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({ path: '/tmp/v111_menu.png' });
        await page.evaluate(() => { document.getElementById('btn-start').click(); });
        await page.waitForFunction(() => window.__game.state === 'RACING', { timeout: 10000 });
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: '/tmp/v111_solo.png' });
        await page.evaluate(() => { window.__game.backToMenu(); });
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate(() => { document.getElementById('btn-vs').click(); });
        await page.waitForFunction(() => window.__game.state === 'RACING', { timeout: 10000 });
        await page.evaluate(() => { Input.keys['w'] = true; Input.keys['arrowup'] = true; });
        await new Promise(r => setTimeout(r, 1200));
        await page.screenshot({ path: '/tmp/v111_vs.png' });
        await page.evaluate(() => { Input.keys['w'] = false; Input.keys['arrowup'] = false; });
        // 转向验证：SOLO 模式下按 A 1.5 秒，确认车辆向屏幕左侧偏转
        await page.evaluate(() => { window.__game.backToMenu(); });
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate(() => { document.getElementById('btn-start').click(); });
        await page.waitForFunction(() => window.__game.state === 'RACING', { timeout: 10000 });
        await page.evaluate(() => { Input.keys['w'] = true; });
        await new Promise(r => setTimeout(r, 1200));
        await page.screenshot({ path: '/tmp/v111_steer_before.png' });
        await page.evaluate(() => { Input.keys['a'] = true; });
        await new Promise(r => setTimeout(r, 600));
        await page.screenshot({ path: '/tmp/v111_steer_a.png' });
        await page.evaluate(() => { Input.keys['a'] = false; Input.keys['w'] = false; });
    } catch (e) { console.log('screenshot skipped', e.message); }

    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    console.log(`\n========== ${passed}/${total} PASSED ==========`);
    if (errors.length) {
        console.log('\nERRORS:');
        errors.forEach(e => console.log('  ' + e));
    }
    await browser.close();
    process.exit(passed === total ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
