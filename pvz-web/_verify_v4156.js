// v4.0.156 泡泡工坊音效（泡泡碎裂/粘合 + 机械龙嚎叫）验收脚本
// 用户报：「给这个泡泡工坊加入点声音，像加入泡泡碎裂和泡泡粘合的声音。然后在打龙的关卡里加入龙哀嚎或者嚎叫的声音。
//          等等，请你想一些声音，不要让这个游戏变得干燥无味。」
// 跑法：node _verify_v4156.js
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
    if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ❌ ' + name + (extra ? '  [' + extra + ']' : '')); }
};

const ROOT = '/Users/clawbox/nexus-hub/pvz-web';

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu',
               '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + ROOT + '/index.html', { waitUntil: 'networkidle2' });
    await sleep(1600);

    // 真实手势：AudioContext 必须在用户手势后才能脱离 suspended
    await page.mouse.click(720, 780);
    await sleep(200);
    await page.evaluate(() => window.MiniGames.openBubble());
    await sleep(300);
    await page.mouse.click(700, 500);
    await sleep(400);

    // 打桩：所有 SFX 方法外面包一层计数（内部调用也走这条链）
    await page.evaluate(() => {
        window.__calls = {};
        const S = window.MiniGames.sfx;
        ['fire', 'stick', 'pop', 'drop', 'push', 'bounce', 'danger', 'dmg', 'armor', 'roar',
         'spray', 'warn', 'death', 'win', 'fail', 'lock', 'line', 'whack', 'miss', 'merge',
         'brick', 'paddle', 'box', 'flip', 'match', 'combo', 'special', 'click', 'tomb'].forEach(k => {
            if (typeof S[k] !== 'function') return;
            const orig = S[k];
            S[k] = function () { window.__calls[k] = (window.__calls[k] || 0) + 1; return orig.apply(S, arguments); };
        });
    });

    // ================= 1. 引擎 =================
    console.log('\n【1】音效引擎');
    const api = await page.evaluate(() => {
        const S = window.MiniGames.sfx;
        const need = ['fire', 'stick', 'pop', 'drop', 'push', 'bounce', 'danger',
                      'dmg', 'armor', 'roar', 'spray', 'warn', 'death', 'win', 'fail'];
        return { has: need.filter(k => typeof S[k] === 'function'), total: need.length, state: S.state() };
    });
    ok(api.has.length === api.total, '泡泡 / 机械龙全部音效已注册', api.has.length + '/' + api.total);
    ok(api.state.ok === true, 'AudioContext 已创建', '状态 ' + api.state.ctx);
    ok(api.state.muted === false, '默认不静音');
    ok(api.state.gain > 0.5, '总线音量正常', 'gain=' + api.state.gain);

    // ================= 2. 真的出声（量波形） =================
    console.log('\n【2】波形实测（合成声音是否真的出来）');
    // 第一次 probe 前 analyser 还是空的（刚建出来没有历史采样），先空跑一次预热
    await page.evaluate(() => window.MiniGames.sfx.probe());
    await sleep(120);
    const rms = async (fn, wait) => {
        await page.evaluate(fn);
        await sleep(wait || 45);
        return page.evaluate(() => window.MiniGames.sfx.probe());
    };
    const pPop = await rms(() => window.MiniGames.sfx.pop(5, 1), 45);
    ok(pPop && pPop.rms > 0.002 && pPop.peak > 0.01, '碎裂声有输出',
        pPop ? ('rms=' + pPop.rms.toFixed(4) + ' peak=' + pPop.peak.toFixed(3)) : 'null');
    await sleep(400);
    const pStick = await rms(() => window.MiniGames.sfx.stick(1), 30);
    ok(pStick && pStick.rms > 0.002, '粘合声有输出', pStick ? 'rms=' + pStick.rms.toFixed(4) : 'null');
    await sleep(400);
    const pFire = await rms(() => window.MiniGames.sfx.fire(1), 35);
    ok(pFire && pFire.rms > 0.002, '发射声有输出', pFire ? 'rms=' + pFire.rms.toFixed(4) : 'null');
    await sleep(600);
    const pDeath = await rms(() => window.MiniGames.sfx.death(), 700);
    ok(pDeath && pDeath.rms > 0.002, '龙哀嚎能持续发声（0.7 秒后仍有能量）',
        pDeath ? 'rms=' + pDeath.rms.toFixed(4) : 'null');
    await sleep(2200);

    // 静音后必须真的没声
    await page.evaluate(() => window.MiniGames.sfx.setMuted(true));
    await sleep(80);
    const pMute = await rms(() => window.MiniGames.sfx.death(), 500);
    ok(pMute && pMute.rms < 0.0008, '静音后确实没声音', 'rms=' + (pMute ? pMute.rms.toFixed(5) : 'null'));
    const gMute = await page.evaluate(() => window.MiniGames.sfx.state().gain);
    ok(gMute === 0, '静音 = 总线增益 0', 'gain=' + gMute);
    await page.evaluate(() => window.MiniGames.sfx.setMuted(false));
    await sleep(120);

    // ================= 3. 静音按钮 / M 键 =================
    console.log('\n【3】静音开关');
    const btns = await page.evaluate(() => ({
        lobby: !!document.getElementById('mini-mute-lobby'),
        stage: !!document.getElementById('mini-mute'),
        text: (document.getElementById('mini-mute-lobby') || {}).textContent
    }));
    ok(btns.lobby && btns.stage, '大厅 + 关卡各有一个静音按钮');
    ok(btns.text === '声音 开', '默认文案「声音 开」', btns.text);
    await page.evaluate(() => document.getElementById('mini-mute-lobby').click());
    await sleep(120);
    const m1 = await page.evaluate(() => ({
        t: document.getElementById('mini-mute-lobby').textContent,
        s: window.MiniGames.sfx.state()
    }));
    ok(m1.s.muted === true && m1.t === '声音 关', '点按钮 → 静音 + 文案切「声音 关」', m1.t);
    await page.evaluate(() => document.getElementById('mini-mute').click());
    await sleep(120);
    ok((await page.evaluate(() => window.MiniGames.sfx.state().muted)) === false, '再点一次恢复出声');
    await page.keyboard.press('KeyM');
    await sleep(120);
    ok((await page.evaluate(() => window.MiniGames.sfx.state().muted)) === true, 'M 键也能切静音');
    await page.keyboard.press('KeyM');
    await sleep(120);

    // ================= 4. 经典泡泡龙：发射/粘合/碎裂 =================
    console.log('\n【4】经典泡泡龙');
    const classic = await page.evaluate(async () => {
        window.MiniGames.openGame('bubble');
        const g = window.MiniGames.active;
        window.__calls = {};
        g.shoot();
        await new Promise(r => setTimeout(r, 700));
        return { fire: __calls.fire || 0, stick: __calls.stick || 0, pop: __calls.pop || 0, bounce: __calls.bounce || 0 };
    });
    ok(classic.fire >= 1, '发射有声音');
    ok(classic.stick + classic.pop >= 1, '落地球 = 粘合或碎裂二选一',
        'stick=' + classic.stick + ' pop=' + classic.pop);

    const classicPop = await page.evaluate(async () => {
        const g = window.MiniGames.active;
        window.__calls = {};
        // 直接构造一次三连：找两颗同色相邻的格子，把中间补成同色
        let done = false;
        for (let r = 0; r < g.rows && !done; r++) {
            for (let c = 0; c < g.colsIn(r) - 1; c++) {
                const col = g.g[r][c];
                if (col < 0) continue;
                for (const [nr, nc] of g.neighbors(r, c)) {
                    if (nr < 0 || nr >= g.rows || nc < 0 || nc >= g.colsIn(nr)) continue;
                    if (g.g[nr][nc] !== col) continue;
                    // 找一个贴着这两颗的空格，塞同色 → 必然成三
                    for (const [mr, mc] of g.neighbors(r, c)) {
                        if (mr < 0 || mr >= g.rows || mc < 0 || mc >= g.colsIn(mr)) continue;
                        if (g.g[mr][mc] >= 0) continue;
                        g.g[mr][mc] = col;
                        g.resolve(mr, mc);
                        done = true;
                        break;
                    }
                    if (done) break;
                }
                if (done) break;
            }
        }
        return { pop: __calls.pop || 0, done: done };
    });
    ok(classicPop.done === true && classicPop.pop >= 1, '三消触发碎裂声');

    const classicPush = await page.evaluate(() => {
        const g = window.MiniGames.active;
        window.__calls = {};
        g.pushRow();
        return __calls.push || 0;
    });
    ok(classicPush >= 1, '整排下压有声');

    // ================= 5. 机械龙：受伤 / 护甲 / 咆哮 / 喷吐 / 哀嚎 =================
    console.log('\n【5】机械龙攻城');
    const drg = await page.evaluate(async () => {
        window.MiniGames.openGame('dragon');
        const g = window.MiniGames.active;
        const out = {};
        window.__calls = {};
        g.hurt(10);
        out.dmg = __calls.dmg || 0;

        window.__calls = {};
        g.hp = g.hpMax * 0.68;            // 掉到 70% 以下 → 第 2 阶段
        g.hurt(16);
        out.armor = __calls.armor || 0;
        out.phase2 = g.phase;

        window.__calls = {};
        g.hp = g.hpMax * 0.30;            // 掉到 35% 以下 → 第 3 阶段
        g.hurt(16);
        out.roar = __calls.roar || 0;
        out.phase3 = g.phase;

        window.__calls = {};
        g.spray();
        out.spray = __calls.spray || 0;
        out.push = __calls.push || 0;

        window.__calls = {};
        g.hp = 4; g.hurt(20);             // 击杀
        out.death = __calls.death || 0;
        out.dieT = g.dieT;
        return out;
    });
    ok(drg.dmg >= 1, '每一下伤害都有一声低吼');
    ok(drg.phase2 === 2 && drg.armor >= 1, '第 2 阶段 = 护甲破裂声', 'armor=' + drg.armor);
    ok(drg.phase3 === 3 && drg.roar >= 1, '第 3 阶段 = 暴怒长吼', 'roar=' + drg.roar);
    ok(drg.spray >= 1, '喷吐有火柱声');
    ok(drg.push >= 1, '喷吐同时整排下压有声');
    ok(drg.death >= 1 && drg.dieT > 0, '打死 = 哀嚎 + 1.5 秒坠落');

    const drgWarn = await page.evaluate(async () => {
        window.MiniGames.openGame('dragon');
        const g = window.MiniGames.active;
        window.__calls = {};
        g.sprayT = 1.1;                    // 进入预警窗口
        await new Promise(r => setTimeout(r, 220));
        return __calls.warn || 0;
    });
    ok(drgWarn >= 1, '喷吐前的吸气预警有声');

    // ================= 6. 泡泡塔 / 对轰 =================
    console.log('\n【6】泡泡塔 / 泡泡对轰');
    const tower = await page.evaluate(() => {
        window.MiniGames.openGame('tower');
        const g = window.MiniGames.active;
        window.__calls = {};
        g.onSpecial('bomb', 450, 200);
        const bomb = __calls.special || 0;
        g.onSpecial('rainbow', 450, 200);
        g.onSpecial('bolt', 450, 200);
        return { bomb: bomb, all: __calls.special || 0 };
    });
    ok(tower.all >= 3, '三颗特殊球各有音色', '触发 ' + tower.all + ' 次');

    const duel = await page.evaluate(() => {
        window.MiniGames.openGame('duel');
        const g = window.MiniGames.active;
        window.__calls = {};
        g.la.onLand(g.la, { popped: 8, dropped: 6, size: 8 });
        return { k: g.lb.sfxK, tomb: __calls.tomb || 0 };
    });
    ok(duel.k === 0.3, '对轰的 AI 那侧音量压到 0.3（不跟玩家抢耳朵）', 'sfxK=' + duel.k);
    ok(duel.tomb >= 1, '塞墓碑有石头声');

    // ================= 7. 其余 6 个玩法 =================
    console.log('\n【7】后院游乐场其余玩法');
    const rest = await page.evaluate(async () => {
        const MG = window.MiniGames, out = {};
        window.__calls = {};
        MG.openGame('tetris');
        MG.active.lock();
        out.lock = __calls.lock || 0;

        window.__calls = {};
        MG.openGame('memory');
        const mem = MG.active;
        mem.onDown(258 + 10, 130 + 10);
        out.flip = __calls.flip || 0;

        window.__calls = {};
        MG.openGame('sokoban');
        const sk = MG.active;
        // 找一块箱子，往它那边走一步
        let moved = false;
        for (let r = 0; r < sk.h && !moved; r++) for (let c = 0; c < sk.w; c++) {
            if (sk.box[r][c]) {
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const pr = r - dy, pc = c - dx;
                    if (pr >= 0 && pr < sk.h && pc >= 0 && pc < sk.w && !sk.wall[pr][pc] && !sk.box[pr][pc]) {
                        sk.px = pc; sk.py = pr;
                        sk.move(dx, dy);
                        moved = true;
                        break;
                    }
                }
            }
            if (moved) break;
        }
        out.box = __calls.box || 0;
        out.moved = moved;

        window.__calls = {};
        MG.openGame('g2048');
        const gg = MG.active;
        gg.g = [[1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        gg.slide('left');
        out.merge = __calls.merge || 0;
        return out;
    });
    ok(rest.lock >= 1, '玉米方块落块有声');
    ok(rest.flip >= 1, '花园连连看翻牌有声');
    ok(rest.moved && rest.box >= 1, '寒冰推箱推冰有声');
    ok(rest.merge >= 1, '花园 2048 合成有声');

    // ================= 8. 终局音 + 回归 =================
    console.log('\n【8】终局音与整体回归');
    const ending = await page.evaluate(async () => {
        const MG = window.MiniGames;
        window.__calls = {};
        MG.openGame('sokoban');
        const g = MG.active;
        g.end(true);
        const win = __calls.win || 0;
        MG.openGame('sokoban');
        window.__calls = {};
        MG.active.end(false);
        return { win: win, fail: __calls.fail || 0 };
    });
    ok(ending.win >= 1, '通关播上行音');
    ok(ending.fail >= 1, '失败播下行音');

    const allOpen = await page.evaluate(async () => {
        const MG = window.MiniGames;
        const bad = [];
        for (const g of MG.games) {
            try {
                MG.openGame(g.id);
                await new Promise(r => setTimeout(r, 260));
                if (!MG.active) bad.push(g.id);
            } catch (e) { bad.push(g.id + ':' + e.message); }
        }
        return { n: MG.games.length, bad: bad, bubble: MG.bubbleGames.length };
    });
    ok(allOpen.n === 10 && allOpen.bad.length === 0, '10 个玩法全部能开、无异常',
        allOpen.n + ' 个 / 异常 ' + allOpen.bad.length);
    ok(allOpen.bubble === 4, '泡泡工坊仍是 4 个玩法');

    const canvasAlive = await page.evaluate(() => {
        const c = document.getElementById('mini-canvas');
        const d = c.getContext('2d').getImageData(0, 0, 900, 600).data;
        let nz = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 24) nz++;
        return nz;
    });
    ok(canvasAlive > 50000, '画面照常渲染（音效没有干扰主循环）', '非黑像素 ' + canvasAlive);

    ok(errs.length === 0, '控制台零报错', errs.length ? errs.slice(0, 3).join(' | ') : '干净');

    console.log('\n================ 结果 ================');
    console.log('通过 ' + pass + ' / ' + (pass + fail) + (fail ? ('  ❌ 失败 ' + fail) : '  ✅ 全过'));
    await b.close();
    process.exit(fail ? 1 : 0);
})();
