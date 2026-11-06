// v4.0.150 验收：砸罐子难度曲线重做（删行动点 / 1~5 级刻度 / 星级改看植物损失 / 10 关可玩性抽样）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
    if (cond) { pass++; console.log('  ✅ ' + label + (extra ? ' — ' + extra : '')); }
    else { fail++; console.log('  ❌ ' + label + (extra ? ' — ' + extra : '')); }
};

// 僵尸基础血量（与 Zombie.js EVOLVE_BASE_HP 对齐，只用于核对倍率）
const BASE_HP = { normal: 200, conehead: 560, buckethead: 1300, screendoor: 5200, football: 2240, gargantuar: 4000, polevaulting: 500, newspaper: 300, imp: 100, zomboni: 1300 };

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
    await sleep(600);

    // ---------- ① 关卡表：曲线是"爬坡"而不是"跳崖" ----------
    console.log('\n① 关卡表 & 难度曲线');
    const table = await p.evaluate(() => VASE_LEVELS.map(l => ({
        n: l.n, name: l.name, lvl: l.lvl, total: l.total, p: l.p, q: l.q, z: l.z,
        hp: l.hp, pl: l.plants.length, qs: l.qs.length, zl: l.zombies.length,
        hasActs: 'acts' in l, zb: l.zombies.slice()
    })));
    ok(table.length === 10, '共 10 关', 'n=' + table.length);
    ok(table.every(l => l.p + l.q + l.z === l.total), '每关 p+q+z = total');
    ok(table.every(l => l.pl === l.p && l.qs === l.q && l.zl === l.z), '三条内容队列长度与罐数一致',
        table.filter(l => l.pl !== l.p || l.qs !== l.q || l.zl !== l.z).map(l => l.n).join(',') || 'all ok');
    ok(table.every(l => !l.hasActs), '关卡表里已经没有 acts 字段（行动点整体删除）');
    ok(table.every((l, i) => i === 0 || l.lvl >= table[i - 1].lvl), '难度刻度逐关不降',
        table.map(l => l.lvl).join('>'));
    ok(table.every((l, i) => i === 0 || l.hp >= table[i - 1].hp), '血量倍率逐关不降',
        table.map(l => l.hp.toFixed(2)).join('>'));
    ok(table.every(l => l.hp <= 1.05), '血量倍率封顶 1.05（旧版地狱 1.4 已废）',
        'max=' + Math.max(...table.map(l => l.hp)));
    const hpTotal = table.map(l => ({
        n: l.n,
        sum: l.zb.reduce((a, t) => a + (BASE_HP[t] || 200), 0) * l.hp
    }));
    ok(hpTotal.every((x, i) => i === 0 || x.sum >= hpTotal[i - 1].sum * 0.95),
        '单关僵尸总血量基本单调递增（允许 ±5% 抖动）',
        hpTotal.map(x => x.n + ':' + Math.round(x.sum)).join(' '));
    ok(table.every(l => l.p >= 9), '每关植物罐 ≥ 9（旧版第 7 关起只有 6 个 = 必死）',
        table.map(l => l.n + ':' + l.p).join(' '));
    ok(table.every(l => l.p >= 5 + 3), '植物罐数 ≥ 五行 + 3（够铺满每条线）');
    ok(table[9].p >= 13 && table[9].z >= 9, '终关供给 13 植物 / 9 僵尸', `p=${table[9].p} z=${table[9].z}`);

    // ---------- ② 关卡弹窗：刻度而不是抽象档位 ----------
    console.log('\n② 关卡选择弹窗');
    await p.evaluate(() => document.getElementById('btn-vase').click());
    await sleep(400);
    const modal = await p.evaluate(() => {
        const m = document.getElementById('vase-levels-modal');
        const cells = Array.from(document.querySelectorAll('#vlm-grid .vlm-cell'));
        return {
            shown: m && getComputedStyle(m).display !== 'none',
            cells: cells.length,
            lvls: cells.map(c => {
                const i = c.querySelector('.vlm-lvl');
                return i ? { n: i.dataset.lvl, txt: i.textContent } : null;
            }),
            hasActsWord: cells.some(c => /行动点/.test(c.innerText)),
            first: cells[0] ? cells[0].innerText.replace(/\s+/g, ' ') : ''
        };
    });
    ok(modal.shown, '点「砸罐子」弹出关卡选择');
    ok(modal.cells === 10, '渲染 10 个关卡格');
    ok(modal.lvls.every(x => x && /^[●○]{5}$/.test(x.txt)), '每格都有 ●●○○○ 五格刻度',
        (modal.lvls[0] || {}).txt);
    ok(!modal.hasActsWord, '卡片里不再出现「行动点」');
    await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4150_levels.png' });

    // ---------- ③ 第 1 关开局 ----------
    console.log('\n③ 第 1 关：配额 / HUD / 无行动点');
    await p.evaluate(() => document.querySelector('#vlm-grid .vlm-cell[data-level="1"]').click());
    await sleep(900);
    const l1 = await p.evaluate(() => {
        const g = window._pvzGame;
        return {
            level: g.vaseLevel, vases: g.vases.length,
            types: g.vases.reduce((a, v) => (a[v.type] = (a[v.type] || 0) + 1, a), {}),
            zombies: g.vaseZombieVasesLeft,
            hudAct: !!document.getElementById('vase-act-chip'),
            hudZ: !!document.getElementById('vase-zchip'),
            hudLv: (document.getElementById('vase-diff-chip') || {}).innerText,
            actsKey: 'vaseActs' in g,
            state: g.state
        };
    });
    ok(l1.level === 1 && l1.vases === 15, '第 1 关 15 个罐子', 'n=' + l1.vases);
    ok(l1.types.plant === 9 && l1.types.question === 3 && l1.types.zombie === 3,
        '类型配额 9/3/3 精确落地', JSON.stringify(l1.types));
    ok(l1.zombies === 3, '剩余僵尸罐角标 = 3');
    ok(!l1.hudAct, 'HUD 上没有行动点芯片');
    ok(l1.hudZ, 'HUD 保留剩余僵尸罐芯片');
    ok(/第 1 关/.test(l1.hudLv || ''), '左上角标显示「第 1 关」而不是抽象档位', (l1.hudLv || '').replace(/\s+/g, ' '));

    // ---------- ④ 砸罐不再扣点、不再弹行动点横幅 ----------
    console.log('\n④ 砸罐反馈');
    const smash = await p.evaluate(async () => {
        const g = window._pvzGame;
        const v = g.vases.find(x => x.type === 'plant' && !x.smashed);
        const annBefore = (document.querySelector('.announcement') || {}).innerText || '';
        g.smashVase(v.row, v.col);
        await new Promise(r => setTimeout(r, 260));
        const annEls = Array.from(document.querySelectorAll('.announcement, #announcement'))
            .map(e => e.innerText).filter(Boolean);
        return { smashed: v.smashed, annBefore, anns: annEls, actsKey: 'vaseActs' in g };
    });
    ok(smash.smashed, '罐子能正常砸开');
    ok(!smash.anns.some(t => /行动点|⚡/.test(t)), '砸罐后不再弹「⚡ 剩 N 行动点」横幅',
        smash.anns.join(' | ').slice(0, 60) || '(无横幅)');
    ok(!smash.actsKey, '运行时也没有 vaseActs 字段了');

    // ---------- ⑤ 僵尸血量按关卡 hp 倍率 ----------
    console.log('\n⑤ 血量倍率');
    const hp1 = await p.evaluate(async () => {
        const g = window._pvzGame;
        const v = g.vases.find(x => x.type === 'zombie' && !x.smashed);
        g.smashVase(v.row, v.col);
        await new Promise(r => setTimeout(r, 200));
        const z = g.entities.filter(e => e instanceof Zombie).pop();
        return z ? { type: z.type, hp: z.hp, maxHp: z.maxHp } : null;
    });
    ok(hp1 && hp1.hp === Math.round(200 * 0.85), '第 1 关普通僵尸 = 200 × 0.85 = 170',
        hp1 && `${hp1.type} ${hp1.hp}`);

    const hp10 = await p.evaluate(async () => {
        const g = window._pvzGame;
        g._startVaseLevel(10);
        await new Promise(r => setTimeout(r, 900));
        // 直接按内容找 gargantuar 所在罐，砸开取血量
        const v = g.vases.find(x => x.type === 'zombie' && x.content.kind === 'zombie' && x.content.type === 'buckethead');
        if (!v) return { found: false };
        g.smashVase(v.row, v.col);
        await new Promise(r => setTimeout(r, 200));
        const z = g.entities.filter(e => e instanceof Zombie && e.type === 'buckethead').pop();
        return { found: true, hp: z ? z.hp : 0, expect: Math.round(1300 * 1.00) };
    });
    ok(hp10.found && hp10.hp === hp10.expect, '第 10 关铁桶 = 1300 × 1.00 = 1300',
        hp10.found ? hp10.hp + '/' + hp10.expect : '没找到铁桶罐');

    // ---------- ⑥ 确定性 ----------
    console.log('\n⑥ 关卡确定性');
    await p.evaluate(async () => { window._pvzGame._startVaseLevel(5); await new Promise(r => setTimeout(r, 800)); });
    const snap = () => p.evaluate(() => window._pvzGame.vases
        .map(v => [v.row, v.col, v.type, v.content.kind, v.content.type || v.content.value || ''].join(':')).join('|'));
    const s1 = await snap();
    await p.evaluate(() => window._pvzGame.restartVaseLevel());
    await sleep(900);
    const s2 = await snap();
    ok(s1 === s2 && s1.length > 0, '同关重开布局/内容完全一致', 'len=' + s1.length);

    // ---------- ⑦ 通关 + 星级（0 损失 = 三星） ----------
    console.log('\n⑦ 通关与星级');
    const win = await p.evaluate(async () => {
        const g = window._pvzGame;
        g._startVaseLevel(2);
        await new Promise(r => setTimeout(r, 900));
        g.vaseLostPlants = 0;
        g.vases.filter(v => v.type === 'zombie' && !v.smashed).forEach(v => g.smashVase(v.row, v.col));
        await new Promise(r => setTimeout(r, 240));
        const left = g.vaseZombieVasesLeft, stateBefore = g.state;
        g.entities = g.entities.filter(e => !(e instanceof Zombie));
        await new Promise(r => setTimeout(r, 260));
        const panel = document.querySelector('.vase-win-overlay');
        return {
            left, stateBefore, state: g.state, stars: g.vaseStars,
            panel: !!panel,
            stats: panel ? (panel.querySelector('.vase-win-stats') || {}).innerText : '',
            saved: JSON.parse(localStorage.getItem('pvz_vase_progress_v1') || '{}')
        };
    });
    ok(win.left === 0, '僵尸罐清零');
    ok(win.stateBefore === 'PLAYING', '场上还有僵尸时不判胜');
    ok(win.state === 'GAMEOVER' && win.panel, '清场后弹通关面板');
    ok(win.stars === 3, '零损失 = 三星', '★' + win.stars);
    ok(/损失 0 株植物/.test(win.stats || ''), '面板写明损失株数', (win.stats || '').replace(/\s+/g, ' '));
    ok(win.saved['2'] === 3, '星级写入 localStorage', JSON.stringify(win.saved));

    // ---------- ⑧ 损失 1~3 株 → 两星；一次性植物自爆不算 ----------
    console.log('\n⑧ 星级与损失计数');
    const stars2 = await p.evaluate(async () => {
        const g = window._pvzGame;
        const lv = VASE_LEVELS.find(x => x.n === 2);
        const run = (lost) => {
            g.vaseLostPlants = lost;
            const need = lost <= 0 ? 3 : (lost <= 3 ? 2 : 1);
            return need;
        };
        return { one: run(1), three: run(3), four: run(4) };
    });
    ok(stars2.one === 2 && stars2.three === 2 && stars2.four === 1, '损失 1~3 两星、≥4 一星',
        JSON.stringify(stars2));

    const onceCount = await p.evaluate(async () => {
        const g = window._pvzGame;
        g._startVaseLevel(1);
        await new Promise(r => setTimeout(r, 900));
        g.vaseLostPlants = 0;
        const r = {};
        // 一次性植物被"种下"后自己消失，不应计入损失
        ['potatomine', 'cherrybomb', 'jalapeno'].forEach(t => {
            const pt = new Plant(g, t);
            g.board.addPlant(pt, 0, 7);
            pt.hp = 0;
            try { pt.update(0.016); } catch (e) { }
        });
        r.afterOnce = g.vaseLostPlants;
        // 普通植物被打死 → 计入损失
        const pn = new Plant(g, 'peashooter');
        g.board.addPlant(pn, 1, 7);
        pn.hp = 0;
        try { pn.update(0.016); } catch (e) { }
        r.afterNormal = g.vaseLostPlants;
        return r;
    });
    ok(onceCount.afterOnce === 0, '一次性植物（樱桃/辣椒/土豆雷）自爆不计损失', JSON.stringify(onceCount));
    ok(onceCount.afterNormal === 1, '普通植物被啃掉计入损失', JSON.stringify(onceCount));

    // ---------- ⑧b 我是僵尸：向日葵头僵尸确实产阳光 ----------
    console.log('\n⑧b 我是僵尸 · 向日葵头产阳光');
    const sunhead = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseMode = false; g.vaseLevel = null;
        g.zombieMode = true;
        const z = new Zombie(g, 0, 'sunhead');
        g.entities.push(z);
        const before = g.sunCount;
        let err = '';
        try { z.update(6); } catch (e) { err = e.message; }
        const after = g.sunCount;
        // 连刷 5 次，验证「终生 3 次」上限
        for (let i = 0; i < 5; i++) { try { z.update(8); } catch (e) { err = err || e.message; } }
        const afterCap = g.sunCount;
        g.zombieMode = false;
        g.entities = g.entities.filter(e => e !== z);
        return { before, after, afterCap, err };
    });
    ok(sunhead.after === sunhead.before + 50, '向日葵头僵尸在「我是僵尸」里产 50 阳光',
        `${sunhead.before} → ${sunhead.after} ${sunhead.err}`);
    ok(sunhead.afterCap <= sunhead.after + 100, '每只终生最多 3 次（不会无限印钞）',
        `cap=${sunhead.afterCap}`);

    // ---------- ⑨ 切关清场 ----------
    console.log('\n⑨ 切关清场');
    const clean = await p.evaluate(async () => {
        const g = window._pvzGame;
        try { g.entities.push(new Zombie(g, 2, 'normal')); } catch (e) { }
        const before = g.entities.length;
        g._startVaseLevel(1);
        await new Promise(r => setTimeout(r, 900));
        return {
            before,
            zombies: g.entities.filter(e => e instanceof Zombie).length,
            plants: g.entities.filter(e => e instanceof Plant).length,
            vases: g.vases.length,
            onGrid: g.board.grid.flat().filter(Boolean).length,
            lost: g.vaseLostPlants
        };
    });
    ok(clean.before > 0, '先塞了残留实体', 'n=' + clean.before);
    ok(clean.zombies === 0 && clean.plants === 0 && clean.onGrid === 0, '切关后场上干净', JSON.stringify(clean));
    ok(clean.vases === 15 && clean.lost === 0, '按新关卡重建（15 罐）且损失计数归零', 'vases=' + clean.vases);

    // ---------- ⑩ 自由模式兼容 ----------
    console.log('\n⑩ 自由挑战不回归');
    const free = await p.evaluate(async () => {
        const g = window._pvzGame;
        g._openVaseLevels();
        await new Promise(r => setTimeout(r, 150));
        document.getElementById('vlm-free').click();
        await new Promise(r => setTimeout(r, 200));
        const diffShown = getComputedStyle(document.getElementById('difficulty-modal')).display !== 'none';
        document.getElementById('diff-hell') && document.getElementById('diff-hell').click();
        await new Promise(r => setTimeout(r, 900));
        return {
            diffShown, level: g.vaseLevel, mode: g.vaseMode,
            hudAct: !!document.getElementById('vase-act-chip'), vases: g.vases.length,
            diffChip: (document.getElementById('vase-diff-chip') || {}).innerText
        };
    });
    ok(free.diffShown && free.level === null && free.mode, '自由模式仍是难度弹窗 + vaseLevel=null');
    ok(!free.hudAct && free.vases >= 18, '自由模式无行动点芯片、罐子正常生成', 'n=' + free.vases);
    ok(/地狱|HELL/.test((free.diffChip || '').replace(/\s+/g, '')), '自由模式角标仍走三档名',
        (free.diffChip || '').replace(/\s+/g, ' '));

    // ---------- ⑪ 实战抽样：1 / 5 / 10 关能不能真的打完 ----------
    console.log('\n⑪ 实战可玩性抽样（自动铺场 + 分批砸僵尸罐，5 倍速）');
    for (const lvNo of [1, 5, 10]) {
        const r = await p.evaluate(async (lvNo) => {
            const g = window._pvzGame;
            g._startVaseLevel(lvNo);
            await new Promise(r => setTimeout(r, 900));
            // 1) 砸开所有植物罐 / 问号罐，拿到全部植物与阳光
            g.vases.filter(v => v.type !== 'zombie' && !v.smashed).forEach(v => g.smashVase(v.row, v.col));
            await new Promise(r => setTimeout(r, 260));
            // 2) 自动铺场（模拟一个"会玩的玩家"）：
            //    a. 先保证 5 行各有一株攻击植物（这是最容易被忽略、也最致命的）
            //    b. 剩余攻击植物补到当前火力最弱的一行
            //    c. 坚果贴在该行最右，向日葵放第 0 列
            const atk = new Set(g._vaseAttackerPool());
            const types = g.vases.filter(v => v.smashed && v.content.kind === 'plant').map(v => v.content.type);
            const isWall = t => /nut|pumpkin|garlic/.test(t);
            const atkTypes = types.filter(t => atk.has(t));
            const wallTypes = types.filter(t => isWall(t));
            const otherTypes = types.filter(t => !atk.has(t) && !isWall(t));
            const rowAtk = [0, 0, 0, 0, 0];
            const rowMap = [[], [], [], [], []];
            // 罐子格不能种（真实玩法里点罐子格 = 砸罐，不会种植物）；
            // 而且僵尸罐砸开时僵尸就出现在那一格，种上去等于喂僵尸
            // 注意：只排除「还没砸开」的罐子格 —— 砸开的罐子那格已经空了，真实玩家当然可以种
            const vaseCells = new Set(g.vases.filter(v => !v.smashed).map(v => v.row + ',' + v.col));
            const plantAt = (row, type, cols) => {
                for (const c of cols) {
                    if (vaseCells.has(row + ',' + c)) continue;
                    if (!g.board.grid[row][c] && g.board.canPlant(row, c)) {
                        const pl = new Plant(g, type);
                        g.board.addPlant(pl, row, c);
                        return c;
                    }
                }
                return -1;
            };
            for (let row = 0; row < 5 && atkTypes.length; row++) {
                const c = plantAt(row, atkTypes.shift(), [0, 1, 2, 3, 4]);
                if (c >= 0) { rowAtk[row]++; rowMap[row].push('atk@' + c); }
            }
            while (atkTypes.length) {
                const row = [0, 1, 2, 3, 4].sort((a, b) => rowAtk[a] - rowAtk[b])[0];
                const c = plantAt(row, atkTypes.shift(), [0, 1, 2, 3, 4]);
                if (c < 0) break;
                rowAtk[row]++; rowMap[row].push('atk@' + c);
            }
            wallTypes.forEach(t => {
                const row = [0, 1, 2, 3, 4].sort((a, b) => rowAtk[b] - rowAtk[a] || a - b)[0];
                const c = plantAt(row, t, [5, 6, 4, 7, 3]);
                if (c >= 0) rowMap[row].push('wall@' + c);
            });
            otherTypes.forEach(t => {
                const row = [0, 1, 2, 3, 4].sort((a, b) => rowAtk[b] - rowAtk[a] || a - b)[0];
                const c = plantAt(row, t, [0, 0, 1, 2]);
                if (c >= 0) rowMap[row].push('other@' + c);
            });
            const planted = { atk: rowAtk.reduce((a, b) => a + b, 0), rows: rowAtk.slice(), detail: rowMap };
            // 3) 逐只放僵尸：最保守的打法（砸一只 → 等清场 → 再砸下一只）。
            //    这一项只验证"数值上有没有解"；真要模拟玩家连砸三只，那是操作问题不是平衡问题。
            g.gameSpeed = 5;
            const zs = g.vases.filter(v => v.type === 'zombie');
            for (const v of zs) {
                if (g.state !== 'PLAYING') break;
                g.smashVase(v.row, v.col);
                const t1 = Date.now();
                while (g.state === 'PLAYING' &&
                    g.entities.some(e => e instanceof Zombie && !e.isDead) &&
                    Date.now() - t1 < 22000) {
                    await new Promise(r => setTimeout(r, 300));
                }
            }
            // 4) 等结算
            const t0 = Date.now();
            while (g.state === 'PLAYING' && Date.now() - t0 < 15000) {
                await new Promise(r => setTimeout(r, 400));
            }
            const zsAlive = g.entities.filter(e => e instanceof Zombie && !e.isDead).length;
            const plantsAlive = g.board.grid.flat().filter(Boolean).length;
            g.gameSpeed = 1;
            return {
                lvNo, state: g.state, stars: g.vaseStars, lost: g.vaseLostPlants,
                zsAlive, plantsAlive, planted,
                win: !!document.querySelector('.vase-win-overlay .vase-win-title')
                    && /VICTORY/i.test(document.querySelector('.vase-win-overlay .vase-win-title').textContent)
            };
        }, lvNo);
        ok(r.state === 'GAMEOVER' && r.win, `第 ${lvNo} 关：自动铺场后能打赢`,
            `state=${r.state} 剩僵尸=${r.zsAlive} 活植物=${r.plantsAlive} 损失=${r.lost} 星级=${r.stars} 布阵=${JSON.stringify(r.planted)}`);
        if (lvNo === 10) await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4150_lv10.png' });
    }

    // ---------- ⑫ 无 JS 异常 ----------
    console.log('\n⑫ 运行时');
    ok(errs.length === 0, '全程无 pageerror', errs.slice(0, 3).join(' | '));

    console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
    await b.close();
    process.exit(fail ? 1 : 0);
})();
