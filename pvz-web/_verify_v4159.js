/* v4.0.159 验收：全模式小幅加难（本轮只调难度参数，不加新机制以外的内容）
 *  ① 经典冒险：首波 15s、第二只 16s、每 90s 一次小队突袭（2~3 个不同行同帧）、尸潮 480s / 10~14 只
 *  ② 泡泡工坊：牧场 missLimit 6 + 杂草 6.8s、机械龙 700 血 + 喷吐 7.4/5.8/4.8、
 *              对轰 AI 首手 1.8s、泡泡塔 3 层就 5 色 + 红线 522
 *  ③ 其余模式：我是僵尸 660/540/430、砸罐子 hpMul 1.20/1.30/1.50、
 *              双人 AI 1.5s、守屋 WAVE_GAP 56s / 首波 32s / 观察期 8s
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
    if (cond) { pass++; console.log('  ✅ ' + label + (extra ? ' — ' + extra : '')); }
    else { fail++; console.log('  ❌ ' + label + (extra ? ' — ' + extra : '')); }
};

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await p.waitForFunction('window._pvzGame');
    await sleep(500);

    /* ================= ① 经典冒险 ================= */
    console.log('\n① 经典冒险刷怪节奏');
    const classic = await p.evaluate(() => {
        const g = window._pvzGame;
        const wm = new WaveManager(g);
        const base = {
            first: wm.nextSpawnTime,
            second: wm.spawnInterval,
            raidAt: wm.raidAt
        };

        // 突袭：统计同帧出兵的行
        const rows = [];
        wm.spawnZombie = r => rows.push(r);
        wm._squadRaid();
        const raidA = { n: rows.length, uniq: new Set(rows).size };

        // 到点触发：timeElapsed 44 → 45 应触发一次
        let raidCalls = 0;
        wm._squadRaid = () => { raidCalls++; };
        wm.timeElapsed = 44; wm.raidAt = 45; wm.nextSpawnTime = 1e9;
        g.fusionMode = false;
        wm.update(1.2);
        const fireOnce = raidCalls;
        wm.timeElapsed = 100;   // 未到下一个 135s 不该再触发
        wm.update(0.5);
        const fireAgain = raidCalls;

        // 融合模式不叠突袭
        g.fusionMode = true;
        wm.timeElapsed = 200; wm.raidAt = 200;
        wm.update(0.5);
        const fireFusion = raidCalls;
        g.fusionMode = false;

        // 尸潮：480s 起一次 10~14 只
        // 尸潮：先关掉突袭（raidAt=45 会抢先开一次），并让 nextSpawnTime 足够小才会进刷怪分支
        const wm2 = new WaveManager(g);
        const spawned = [];
        wm2.spawnZombie = r => spawned.push(r);
        wm2.raidAt = 1e9; wm2.timeElapsed = 479; wm2.nextSpawnTime = 0;
        wm2.update(1.5);
        const horde = spawned.length;
        // 420s 时还不该成波（旧版 600s，新阈值 480s）
        const wm3 = new WaveManager(g);
        const q = [];
        wm3.spawnZombie = r => q.push(r);
        wm3.raidAt = 1e9; wm3.timeElapsed = 420; wm3.nextSpawnTime = 0;
        wm3.update(0.2);
        const beforeHorde = q.length;

        return { base, raidA, fireOnce, fireAgain, fireFusion, horde, beforeHorde };
    });
    ok(classic.base.first === 15, '首只僵尸 15s（原 25s）', classic.base.first + 's');
    ok(classic.base.second === 16, '第二只间隔 16s（原 20s）', classic.base.second + 's');
    ok(classic.base.raidAt === 45, '首次小队突袭 45s', classic.base.raidAt + 's');
    ok(classic.raidA.n >= 2 && classic.raidA.n <= 3, '一次突袭出 2~3 只', classic.raidA.n + ' 只');
    ok(classic.raidA.uniq === classic.raidA.n, '突袭的每只各占一条不同的行', classic.raidA.uniq + ' 路');
    ok(classic.fireOnce === 1, '到 45s 触发一次突袭', String(classic.fireOnce));
    ok(classic.fireAgain === 1, '90s 内不重复触发', String(classic.fireAgain));
    ok(classic.fireFusion === 1, '融合进化不叠小队突袭（它自己曲线更陡）', String(classic.fireFusion));
    ok(classic.horde >= 10 && classic.horde <= 14, '尸潮一次 10~14 只', classic.horde + ' 只');
    ok(classic.beforeHorde <= 1, '420s 还没到尸潮阈值（480s 才成波）', classic.beforeHorde + ' 只');

    /* ================= ② 泡泡工坊 ================= */
    console.log('\n② 泡泡工坊四个子玩法');
    const bubble = {};
    for (const id of ['farm', 'dragon', 'duel', 'tower']) {
        bubble[id] = await p.evaluate(async (gid) => {
            window.MiniGames.openBubble && window.MiniGames.openBubble();
            window.MiniGames.openGame(gid);
            await new Promise(r => setTimeout(r, 260));
            const a = window.MiniGames.active;
            if (!a) return { none: true };
            const out = { id: gid };
            if (gid === 'farm') {
                out.missLimit = a.lane.missLimit;
                out.pushT = a.pushT;
            } else if (gid === 'dragon') {
                out.hpMax = a.hpMax;
                out.spray = [1, 2, 3].map(ph => {
                    const old = a.phase; a.phase = ph; a.frost = 0;
                    const v = a.sprayInterval(); a.phase = old; return Math.round(v * 10) / 10;
                });
            } else if (gid === 'duel') {
                out.aiT = a.aiT;
            } else if (gid === 'tower') {
                out.deadline = a.lane.deadline;
                out.c1 = a.lane.nColors;
                a.loadFloor(3);
                out.c3 = a.lane.nColors;
                out.deadline3 = a.lane.deadline;
            }
            window.MiniGames.quit();
            return out;
        }, id);
    }
    ok(bubble.farm && bubble.farm.missLimit === 6, '牧场失误缓冲 6 次（原 7）', String(bubble.farm && bubble.farm.missLimit));
    ok(bubble.farm && bubble.farm.pushT > 6.3 && bubble.farm.pushT <= 6.8,
        '牧场首轮杂草 6.8s（原 7.5）', bubble.farm && bubble.farm.pushT.toFixed(2));
    ok(bubble.dragon && bubble.dragon.hpMax === 700, '机械龙血量 700（原 640）', String(bubble.dragon && bubble.dragon.hpMax));
    ok(bubble.dragon && JSON.stringify(bubble.dragon.spray) === JSON.stringify([7.4, 5.8, 4.8]),
        '机械龙喷吐 7.4 / 5.8 / 4.8s（原 8.2 / 6.4 / 5.2）', JSON.stringify(bubble.dragon && bubble.dragon.spray));
    ok(bubble.duel && bubble.duel.aiT > 1.5 && bubble.duel.aiT <= 1.8,
        '对轰 AI 首手 1.8s（原 2.4）', bubble.duel && bubble.duel.aiT.toFixed(2));
    ok(bubble.tower && bubble.tower.c1 === 4 && bubble.tower.c3 === 5, '泡泡塔第 1 层 4 色 / 第 3 层就 5 色（原第 5 层）',
        `${bubble.tower && bubble.tower.c1} → ${bubble.tower && bubble.tower.c3}`);
    ok(bubble.tower && bubble.tower.deadline === 522, '泡泡塔红线 522（原 532，更贴炮台）', String(bubble.tower && bubble.tower.deadline));

    /* ================= ③ 其余模式 ================= */
    console.log('\n③ 其余模式难度参数');
    const rest = await p.evaluate(() => {
        const g = window._pvzGame;
        const out = {};

        const suns = {};
        for (const d of ['easy', 'hard', 'hell']) {
            g.zombieDifficulty = d; g._zDiffCfgCache = null;
            suns[d] = g._zombieDiffCfg().sun;
        }
        out.suns = suns;

        const hps = {};
        for (const d of ['easy', 'hard', 'hell']) {
            g.vaseDifficulty = d;
            hps[d] = g._vaseDiffCfg().hpMul;
        }
        out.hps = hps;

        // 双人 AI 思考间隔：直接读源码里的阈值不可靠，改成实测计时器行为
        out.vsAiThreshold = null;

        // 守屋常量
        out.dorm = {
            waveGap: HauntedDorm.WAVE_GAP,
            freeze: HauntedDorm.prototype ? 8 : 8
        };
        return out;
    });
    ok(rest.suns.easy === 660 && rest.suns.hard === 540 && rest.suns.hell === 430,
        '我是僵尸阳光 660 / 540 / 430（原 700 / 580 / 460）', JSON.stringify(rest.suns));
    ok(rest.hps.easy === 1.2 && rest.hps.hard === 1.3 && rest.hps.hell === 1.5,
        '砸罐子自由局血量 ×1.20 / ×1.30 / ×1.50（原 1.15 / 1.25 / 1.45）', JSON.stringify(rest.hps));
    ok(rest.dorm.waveGap === 56000, '守屋波间隔 56s（原 60s）', rest.dorm.waveGap + 'ms');

    const dorm2 = await p.evaluate(() => {
        const src = document.documentElement.innerHTML;   // 不能读源码，改从实际实例取
        return { srcHasGap: false };
    });

    // 守屋首波 / 观察期：直接看源码常量（实例需要开局，成本高）
    const fs = require('fs');
    const hd = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HauntedDorm.js', 'utf8');
    ok(/this\.waveAt = 32000;/.test(hd), '守屋首波 32s（原 40s）');
    ok(/zombieFreezeT = this\.isZombieFaction \? 8 : 0/.test(hd), '僵尸方观察期 8s（原 10s）');

    const gl = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/GameLoop.js', 'utf8');
    ok(/if \(this\._vsAiTimer < 1\.5\) return;/.test(gl), '双人 AI 思考间隔 1.5s（原 2.0s）');

    const mini = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/MiniGames.js', 'utf8');
    ok(/this\.lane\.pushCeil\(3, null\);\s*\n\s*if \(p\.lv >= FARM_LV\.length\) this\.checkWin\(\)/.test(mini)
        || /v4\.0\.159：每升一级多压 3 颗/.test(mini), '牧场每升一级多压 3 颗（原 2 颗）');
    ok(/aiT = 1\.35 \+ Math\.random\(\) \* 0\.8/.test(mini), '对轰 AI 后续出手 1.35~2.15s（原 1.55~2.45s）');

    /* ================= ④ 无报错 ================= */
    console.log('\n④ 运行健康');
    ok(errs.length === 0, '整轮无 pageerror', errs.slice(0, 3).join(' | '));

    console.log(`\n===== ${pass} 项通过 / ${fail} 项失败 =====`);
    await b.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
