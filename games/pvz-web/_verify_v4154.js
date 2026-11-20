// v4.0.154 守屋大作战 · 僵尸阵营全灭不结算 验收脚本
// 用户实报：僵尸阵营把 6 名幸存者全部击杀后仍未获胜
// 根因：幸存者死亡的统一出口 _checkPlayerDown 只判了「内鬼全灭=胜利」，漏了僵尸阵营；
//      己方僵尸 / 尸潮小怪的接触伤害打死人时只走这条出口 → plantSideAlive()=0 却永远不结算。
// 跑法：node _verify_v4154.js
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
    if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ❌ ' + name + (extra ? '  [' + extra + ']' : '')); }
};

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
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await sleep(1600);
    await page.evaluate(() => { document.getElementById('dorm-screen').style.display = 'block'; });

    // ---------- 1. 僵尸阵营：幸存者死亡统一出口（= 小怪/僵尸接触伤害的必经路径）杀光 ----------
    const t1 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
        const steps = [];
        for (const ai of g.ais) {
            ai.hp = -1;
            g._checkPlayerDown(ai);
            steps.push({ plantSide: g._plantSideAlive(), over: g.over, kills: g.kills });
        }
        return { steps, aisTotal: g.ais.length, over: g.over, kills: g.kills };
    });
    console.log('\n【1】僵尸阵营 · 小怪击杀路径杀光 ' + t1.aisTotal + ' 人');
    t1.steps.forEach((s, i) => console.log('     第 ' + (i + 1) + ' 人 → 存活 ' + s.plantSide + ' / 结算 ' + s.over + ' / 击杀 ' + s.kills));
    ok(t1.steps.slice(0, -1).every(s => !s.over), '杀到倒数第 2 人时还不结算（不误判）');
    ok(t1.over === true, '最后一人倒下立即结算');
    ok(t1.kills === t1.aisTotal, '击杀数 = 幸存者总数（小怪杀人也计数）', t1.kills + '/' + t1.aisTotal);

    // ---------- 2. 混合击杀：玩家亲手咬 + 小怪蹭，不重复计数 ----------
    const t2 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
        let t = g.gameTime;
        const step = n => { for (let i = 0; i < n; i++) { t += 16.67; g.gameTime = t; g._tick(1 / 60, t); } };
        step(400);
        const zp = g.player;
        // 基线：前面 6.7 秒里己方主僵尸可能已经咬死人机，不能假设 kills 从 0 开始
        const base = g.kills;
        // 前 2 个（活着的）：僵尸贴身真咬（走啃咬分支）
        const alive = g.ais.filter(a => !a.dead);
        let bitten = 0;
        for (let i = 0; i < 2 && i < alive.length; i++) {
            const ai = alive[i];
            let guard = 0;
            while (!ai.dead && guard < 2000 && !g.over) {
                zp.x = ai.x - 12; zp.y = ai.y;
                ai.hp = Math.min(ai.hp, 60);
                step(1); guard++;
            }
            if (ai.dead) bitten++;
        }
        const afterBite = { kills: g.kills, base, bitten, plantSide: g._plantSideAlive(), over: g.over };
        // 剩下的：走小怪出口
        for (const ai of g.ais) {
            if (ai.dead) continue;
            ai.hp = -1;
            g._checkPlayerDown(ai);
        }
        return { afterBite, kills: g.kills, over: g.over, total: g.ais.length, base };
    });
    console.log('\n【2】混合击杀（2 人真咬 + 3 人小怪）');
    ok(t2.afterBite.kills - t2.base === t2.afterBite.bitten,
        '真咬 ' + t2.afterBite.bitten + ' 人后击杀数正好 +' + t2.afterBite.bitten + '（没有重复 +1）',
        '增量 ' + (t2.afterBite.kills - t2.base) + ' / 咬死 ' + t2.afterBite.bitten);
    ok(t2.over === true && t2.kills === t2.total, '全部倒下后结算且击杀数正确', t2.kills + '/' + t2.total);

    // ---------- 3. 有幸存者活着时绝不结算 ----------
    const t3 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
        for (let i = 0; i < g.ais.length - 1; i++) { g.ais[i].hp = -1; g._checkPlayerDown(g.ais[i]); }
        let t = g.gameTime;
        for (let i = 0; i < 240; i++) { t += 16.67; g.gameTime = t; g._tick(1 / 60, t); }
        return { alive: g._plantSideAlive(), over: g.over };
    });
    console.log('\n【3】留 1 个活人');
    ok(t3.alive === 1 && !t3.over, '还剩 1 名幸存者时继续游戏（4 秒内不结算）', '存活 ' + t3.alive);

    // ---------- 4. 兜底：绕过 _checkPlayerDown 直接抹掉最后一人 ----------
    const t4 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
        let t = g.gameTime;
        const step = n => { for (let i = 0; i < n; i++) { t += 16.67; g.gameTime = t; g._tick(1 / 60, t); } };
        step(240);
        // 直接把所有人标记成 dead，完全不经过任何击杀函数（模拟未来新增的伤害来源漏判）
        for (const ai of g.ais) { ai.dead = true; ai.hp = 0; }
        step(60); // 1 秒
        return { plantSide: g._plantSideAlive(), over: g.over, pending: !!g._zombieWinPending };
    });
    console.log('\n【4】兜底巡检（绕过全部击杀函数）');
    ok(t4.plantSide === 0, '场上已无植物方活人', String(t4.plantSide));
    ok(t4.pending || t4.over, '0.5 秒巡检捕获并进入结算流程', 'pending=' + t4.pending + ' over=' + t4.over);

    // ---------- 5. 双人僵尸阵营 ----------
    const t5 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '2p', faction: 'zombie', role1: 'peashooter', role2: 'wallnut' });
        const before = { plantSide: g._plantSideAlive(), p2Zombie: !!(g.player2 && g.player2.isZombie) };
        for (const ai of g.ais) { ai.hp = -1; g._checkPlayerDown(ai); }
        return { before, over: g.over, plantSide: g._plantSideAlive(), kills: g.kills, total: g.ais.length };
    });
    console.log('\n【5】双人僵尸阵营');
    ok(t5.before.p2Zombie === true && t5.before.plantSide === t5.total,
        'P1/P2 都是僵尸，植物方只有 ' + t5.total + ' 个人机', 'P2僵尸=' + t5.before.p2Zombie);
    ok(t5.over === true && t5.plantSide === 0, '双人僵尸阵营杀光同样结算');

    // ---------- 6. 内鬼回归 ----------
    const t6 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
        g.player.traitor = true; g.player.isZombie = true; g.player.dead = false;
        for (const ai of g.ais) { ai.hp = -1; g._checkPlayerDown(ai); }
        return { over: g.over, plantSide: g._plantSideAlive() };
    });
    console.log('\n【6】内鬼回归');
    ok(t6.over === true && t6.plantSide === 0, '内鬼杀光幸存者仍然判胜（没被改坏）');

    // ---------- 7. 植物阵营失败判定回归 ----------
    const t7 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'plant', role1: 'peashooter' });
        g.player.angelic = true; g.player.isZombie = false;
        for (const ai of g.ais) { ai.hp = -1; g._checkPlayerDown(ai); }
        return { over: g.over, plantSide: g._plantSideAlive() };
    });
    console.log('\n【7】植物阵营（天使）回归');
    // 注意：天使自己的 isZombie=false，仍算植物方存活成员，所以 plantSide 应为 1（只死了 5 个人机）
    ok(t7.over === true && t7.plantSide === 1, '天使形态下人机全灭判负（原有失败逻辑没变）',
        'over=' + t7.over + ' 存活=' + t7.plantSide);

    // ---------- 8. 结算面板文案 ----------
    const t8 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
        for (const ai of g.ais) { ai.hp = -1; g._checkPlayerDown(ai); }
        return { over: g.over, title: document.getElementById('ov-title')?.innerText };
    });
    console.log('\n【8】结算面板');
    ok(t8.over && /猎杀完成/.test(t8.title || ''), '僵尸阵营胜利标题是「猎杀完成」', t8.title);

    // ---------- 9. 双人：P2 倒下等抉择时不能抢跑判胜 ----------
    const t9 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '2p', faction: 'plant', role1: 'peashooter', role2: 'wallnut' });
        g.player.traitor = true; g.player.isZombie = true; g.player.dead = false; // P1 内鬼
        for (const ai of g.ais) { ai.hp = -1; g._checkPlayerDown(ai); }
        const afterAis = { plantSide: g._plantSideAlive(), over: g.over };
        g.player2.hp = -1; g._checkPlayerDown(g.player2);   // P2 倒下 → 进入按键抉择
        const afterP2 = { plantSide: g._plantSideAlive(), over: g.over, pendingFate: !!g.player2.pendingFate };
        // P2 选择天使 → 复活继续
        g._becomeAngel(null, 'p2');
        const afterAngel = { plantSide: g._plantSideAlive(), over: g.over, p2Dead: !!g.player2.dead,
                             title: document.getElementById('ov-title')?.innerText };
        return { afterAis, afterP2, afterAngel };
    });
    console.log('\n【9】双人内鬼：P2 抉择中不抢跑');
    ok(t9.afterAis.plantSide === 1 && !t9.afterAis.over, '人机全灭但 P2 还在守屋 → 不判胜');
    ok(t9.afterP2.pendingFate === true && t9.afterP2.over === false,
        'P2 倒下进入抉择时先不开奖', 'pending=' + t9.afterP2.pendingFate + ' 存活=' + t9.afterP2.plantSide);
    // 内鬼 + 人机全灭 + P2 变天使 = 场上只剩天使与内鬼，天使无攻击手段 → 邪恶方直接胜利
    ok(t9.afterAngel.over === true && /猎杀|内鬼/.test(t9.afterAngel.title || ''),
        'P2 变天使后立即结案（只剩天使与内鬼，翻不了盘）', t9.afterAngel.title);

    // ---------- 10. 报错 ----------
    console.log('\n【10】运行期报错');
    ok(errs.length === 0, '全程 0 JS 报错', errs.slice(0, 3).join(' | ') || '0');

    console.log('\n结果: ' + pass + '/' + (pass + fail) + ' 通过' + (fail ? '（' + fail + ' 项失败）' : ''));
    await b.close();
    process.exit(fail ? 1 : 0);
})();
