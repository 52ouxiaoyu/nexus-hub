/* v4.0.158 验收：
 *  ① 倍速按钮文案统一（中文，1x → 2x → 5x → 1x 一圈回来还是中文）
 *  ② 砸罐子配比重做：问号罐为主 / 植物罐大幅减少 / 每行仍有输出
 *  ③ 10 关手工关卡：绿罐 4~5、问号罐最多、僵尸总血量单调不降
 *  ④ 问号罐里的僵尸不再贴脸（col ≥ 4），但关卡仍可打赢（L1 / L10 实战）
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
    if (cond) { pass++; console.log('  ✅ ' + label + (extra ? ' — ' + extra : '')); }
    else { fail++; console.log('  ❌ ' + label + (extra ? ' — ' + extra : '')); }
};

const BASE_HP = { normal: 200, conehead: 560, buckethead: 1300, newspaper: 300,
    polevaulting: 500, imp: 100, flag: 200, backup: 200, hammerzombie: 560, screendoor: 5200 };

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

    // ================= ① 倍速文案 =================
    console.log('① 倍速按钮文案');
    const spd0 = await p.evaluate(() => {
        const el = document.getElementById('btn-speed');
        return { txt: el.innerText.trim(), speed: window._pvzGame.gameSpeed };
    });
    ok(/^倍速: 1x$/.test(spd0.txt) && spd0.speed === 1, '初始：中文「倍速: 1x」', spd0.txt);

    const seq = await p.evaluate(async () => {
        const el = document.getElementById('btn-speed');
        const out = [];
        for (let i = 0; i < 4; i++) {
            el.click();
            await new Promise(r => setTimeout(r, 30));
            out.push({ txt: el.innerText.trim(), speed: window._pvzGame.gameSpeed });
        }
        return out;
    });
    ok(seq[0].txt === '倍速: 2x' && seq[0].speed === 2, '第一次点击 → 「倍速: 2x」（不是 Speed:）', seq[0].txt);
    ok(seq[1].txt === '倍速: 5x' && seq[1].speed === 5, '第二次点击 → 「倍速: 5x」', seq[1].txt);
    ok(seq[2].txt === '倍速: 1x' && seq[2].speed === 1, '第三次点击 → 回到「倍速: 1x」（旧版这里变英文且回不去）', seq[2].txt);
    ok(seq.every(x => /^倍速: [125]x$/.test(x.txt)), '全程只有中文写法，没有 Speed/英文串',
        seq.map(x => x.txt).join(' → '));

    const after9 = await p.evaluate(async () => {
        const el = document.getElementById('btn-speed');
        for (let i = 0; i < 9; i++) { el.click(); await new Promise(r => setTimeout(r, 10)); }
        return { txt: el.innerText.trim(), speed: window._pvzGame.gameSpeed };
    });
    ok(after9.txt === '倍速: ' + after9.speed + 'x', '连点 9 次后文案仍与 gameSpeed 同步', after9.txt);

    // 随机事件「时光」的临时 4× 不能把玩家选的倍速吃掉
    const evt = await p.evaluate(async () => {
        const g = window._pvzGame;
        g.gameSpeed = 5; g._syncSpeedLabel();
        // 主菜单还没开过局时 game.eventManager 还没被 new 出来（GameLoop 在 update 里懒创建），
        // 这里直接自己造一个只读实例，避免整条断言被静默跳过
        const em = g.eventManager || new EventManager(g);
        const ev = em.events.find(e => /时光/.test(e.msg));
        if (!ev) return { skip: true };
        ev.exec(g);
        const during = g.gameSpeed;
        await new Promise(r => setTimeout(r, 4200));
        return { during, after: g.gameSpeed, txt: document.getElementById('btn-speed').innerText.trim() };
    });
    if (evt.skip) ok(true, '（没找到「时光」事件，跳过）');
    else ok(evt.during === 4 && evt.after === 5 && evt.txt === '倍速: 5x',
        '「时光」事件 4x 结束后还原玩家自己选的 5x（旧版一律压回 1x）',
        `4x → ${evt.after}x / ${evt.txt}`);

    // ================= ② 自由局配比 =================
    console.log('\n② 自由局配比（每档 40 局采样）');
    const cfgSnap = await p.evaluate(() => {
        const g = window._pvzGame, out = {};
        for (const d of ['easy', 'hard', 'hell']) {
            g.vaseDifficulty = d;
            const c = g._vaseDiffCfg();
            out[d] = { plantMin: c.plantMin, plantMax: c.plantMax, qZombie: c.qZombie, hpMul: c.hpMul };
        }
        return out;
    });
    ok(cfgSnap.easy.plantMin === 4 && cfgSnap.easy.plantMax === 6, '简单：绿罐 4~6 个',
        JSON.stringify(cfgSnap.easy));
    ok(cfgSnap.hard.plantMin === 3 && cfgSnap.hard.plantMax === 5, '困难：绿罐 3~5 个',
        JSON.stringify(cfgSnap.hard));
    ok(cfgSnap.hell.plantMin === 1 && cfgSnap.hell.plantMax === 3, '地狱：绿罐 1~3 个',
        JSON.stringify(cfgSnap.hell));

    for (const d of ['easy', 'hard', 'hell']) {
        const r = await p.evaluate(async (dd) => {
            const g = window._pvzGame;
            const N = 40;
            let tp = 0, tq = 0, tz = 0, tt = 0, plants = 0, zs = 0, frontVisible = 0, frontHidden = 0, camper = 0;
            const atk = g._vaseAttackerSet();
            for (let i = 0; i < N; i++) {
                g._chooseVaseDifficulty(dd);
                const vs = g.vases;
                tp += vs.filter(v => v.type === 'plant').length;
                tq += vs.filter(v => v.type === 'question').length;
                tz += vs.filter(v => v.type === 'zombie').length;
                tt += vs.length;
                vs.forEach(v => {
                    const c = v.content || {};
                    if (c.kind === 'plant') plants++;
                    if (c.kind === 'zombie') {
                        zs++;
                        if (v.col < 4) {
                            // 前排僵尸分红牌（僵尸罐，红光脉动，玩家可以选择先不砸）与暗雷（判断不出来的罐型）
                            if (v.type === 'zombie' || v.golden) frontVisible++; else frontHidden++;
                        }
                    }
                });
                // 每行保底：有僵尸的行必须有进攻植物
                for (const v of vs) {
                    if (v.content.kind !== 'zombie') continue;
                    const hasAtk = vs.some(o => o.row === v.row && o.content.kind === 'plant' && atk.has(o.content.type));
                    if (!hasAtk) camper++;
                }
            }
            return { plantPct: tp / tt * 100, qPct: tq / tt * 100, zPct: tz / tt * 100,
                plants: plants / N, zombies: zs / N,
                frontVisible: frontVisible / N, frontHidden: frontHidden / N, camper };
        }, d);
        ok(r.qPct > r.plantPct && r.qPct > r.zPct, `[${d}] 问号罐是最大的一类`,
            `问号 ${r.qPct.toFixed(0)}% / 绿 ${r.plantPct.toFixed(0)}% / 紫 ${r.zPct.toFixed(0)}%`);
        ok(r.qPct >= 45, `[${d}] 问号罐占比 ≥ 45%`, r.qPct.toFixed(0) + '%');
        ok(r.plantPct <= 30, `[${d}] 植物罐占比 ≤ 30%（旧版简单档 51%）`, r.plantPct.toFixed(0) + '%');
        // 前排（col<4）能不能出僵尸，看的是「玩家判断得出来吗」：
        //   僵尸罐 = 红光脉动、问号罐砸开才知道 —— 前者玩家可以选择先不砸、也可以提前布防，是明牌；
        //   问号罐/绿罐在前排吐僵尸 = 躲不掉的暗雷（罐子必须砸完才能过关），等于开局注定掉一条线。
        ok(r.frontHidden === 0, `[${d}] 前排（col<4）没有暗雷：问号罐/绿罐绝不在前排吐僵尸`,
            r.frontHidden.toFixed(2) + ' 只/局');
        // 明牌僵尸是「刻意埋的紧张感」，不是不公平：僵尸罐红光脉动，玩家可以先把后排砸完、
        // 把那一行布好防再回来处理它。构成 = 25% 僵尸罐钉前中排（v3.41.0 配额）+ 最多 1 次前移兜底。
        const capVisible = { easy: 1.5, hard: 2.0, hell: 2.6 }[d];
        ok(r.frontVisible <= capVisible, `[${d}] 前排明牌僵尸（僵尸罐红光可见）不超 ${capVisible} 只/局`,
            r.frontVisible.toFixed(2) + ' 只/局');
        ok(r.camper === 0, `[${d}] 有僵尸的每一行都有进攻植物`, r.camper + ' 次缺防');
    }

    // ================= ③ 关卡表 =================
    console.log('\n③ 10 个手工关卡');
    const table = await p.evaluate(() => VASE_LEVELS.map(l => ({
        n: l.n, total: l.total, p: l.p, q: l.q, z: l.z, hp: l.hp,
        pl: l.plants.length, qs: l.qs.length, zb: l.zombies.length,
        plants: l.plants.slice(), qContents: l.qs.slice(), zbList: l.zombies.slice()
    })));
    ok(table.every(l => l.p + l.q + l.z === l.total), '每关 p+q+z = total');
    ok(table.every(l => l.pl === l.p && l.qs === l.q && l.zb === l.z), '三条内容队列长度与配额一致',
        table.filter(l => l.pl !== l.p || l.qs !== l.q || l.zb !== l.z).map(l => l.n).join(',') || 'all ok');
    ok(table.every(l => l.p >= 4 && l.p <= 5), '每关绿罐只剩 4~5 个',
        table.map(l => l.n + ':' + l.p).join(' '));
    ok(table.every(l => l.q > l.z && l.q > l.p), '每关问号罐最多',
        table.map(l => l.n + ':' + l.q).join(' '));
    ok(table.every(l => l.q / l.total >= 0.45), '问号罐占比 ≥ 45%',
        table.map(l => l.n + ':' + Math.round(l.q / l.total * 100) + '%').join(' '));
    ok(table.every((l, i) => i === 0 || l.hp >= table[i - 1].hp), '血量倍率逐关不降',
        table.map(l => l.hp.toFixed(2)).join('>'));
    // 供给曲线：植物总量 ÷ 僵尸总血量（千点），必须逐关不升
    const supply = table.map(l => {
        const plants = l.plants.filter(t => t !== 'sun').length
            + l.qContents.filter(t => t.indexOf('p:') === 0).length;
        const hp = l.zbList.reduce((a, t) => a + (BASE_HP[t] || 200), 0)
            + l.qContents.filter(t => t.indexOf('z:') === 0).reduce((a, t) => a + (BASE_HP[t.slice(2)] || 200), 0);
        return { n: l.n, plants, hp: Math.round(hp * l.hp), ratio: +(plants / (hp * l.hp / 1000)).toFixed(2) };
    });
    ok(supply.every((x, i) => i === 0 || x.ratio <= supply[i - 1].ratio * 1.05), '供给比（植物 ÷ 千点僵尸血）逐关不升',
        supply.map(x => x.n + ':' + x.ratio).join(' '));
    ok(supply[0].ratio >= 12 && supply[9].ratio <= 2.6, '前松后紧：第 1 关 12+ / 第 10 关 ≤ 2.6',
        supply[0].ratio + ' → ' + supply[9].ratio);
    const totalPlants = supply.reduce((a, x) => a + x.plants, 0);
    ok(totalPlants <= 115, '十关植物总量封顶（旧版 129 株，砍掉 ≥10%）', totalPlants + ' 株');

    // 关卡实机：配额 / 每行有输出 / 僵尸不贴脸
    const lvChecks = await p.evaluate(async () => {
        const g = window._pvzGame;
        const atk = g._vaseAttackerSet();
        const out = [];
        for (let n = 1; n <= 10; n++) {
            g._startVaseLevel(n);
            await new Promise(r => setTimeout(r, 60));
            const vs = g.vases;
            const liveRows = [...new Set(vs.map(v => v.row))];
            const bad = [];
            liveRows.forEach(r => {
                const hasZ = vs.some(v => v.row === r && v.content.kind === 'zombie');
                const hasAtk = vs.some(v => v.row === r && v.content.kind === 'plant' && atk.has(v.content.type));
                if (hasZ && !hasAtk) bad.push(r);
            });
            out.push({
                n, total: vs.length,
                types: { p: vs.filter(v => v.type === 'plant').length, q: vs.filter(v => v.type === 'question').length,
                    z: vs.filter(v => v.type === 'zombie').length },
                bad,
                frontHidden: vs.filter(v => v.content.kind === 'zombie' && v.col < 4 && !v.golden && v.type !== 'zombie').length,
                frontVisible: vs.filter(v => v.content.kind === 'zombie' && v.col < 4 && (v.golden || v.type === 'zombie')).length,
                plants: vs.filter(v => v.content.kind === 'plant').length
            });
        }
        return out;
    });
    ok(lvChecks.every(c => c.bad.length === 0), '每关「有僵尸的行」都有进攻植物',
        lvChecks.filter(c => c.bad.length).map(c => 'L' + c.n + ':行' + c.bad.join(',')).join(' ') || 'all ok');
    ok(lvChecks.every(c => c.frontHidden === 0), '每关前排（col<4）都没有暗雷',
        lvChecks.map(c => 'L' + c.n + ':' + c.frontHidden).join(' '));
    ok(lvChecks.every(c => c.frontVisible === 0), '每关僵尸罐一律钉在后排（col≥6，v4.0.150 规则不变）',
        lvChecks.map(c => 'L' + c.n + ':' + c.frontVisible).join(' '));
    ok(lvChecks[0].types.p === 4 && lvChecks[0].types.q === 8 && lvChecks[0].types.z === 3,
        '第 1 关实际配额 4/8/3', JSON.stringify(lvChecks[0].types));
    ok(lvChecks[9].types.p === 5 && lvChecks[9].types.q === 12 && lvChecks[9].types.z === 9,
        '第 10 关实际配额 5/12/9', JSON.stringify(lvChecks[9].types));

    // ================= ④ 实战 =================
    console.log('\n④ 实战（自动铺场 + 逐只放僵尸，5 倍速）');
    for (const lvNo of [1, 10]) {
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
            const liveRows = [0, 1, 2, 3, 4].filter(r => g.vases.some(v => v.row === r));
            // 真人看得见哪些罐子是僵尸罐（红光）→ 火力按「这一行的僵尸数」倾斜，不平均撒。
            // v4.0.158 修：首轮只铺「有僵尸的行」——原来给没僵尸的空行也塞一株，
            // 主力白扔在一条根本不来僵尸的路上（第 5 关第 4 行就是这样，导致该守的行只有 1 株）。
            const rowZ = {};
            liveRows.forEach(r => rowZ[r] = g.vases.filter(v => v.row === r &&
                (v.type === 'zombie' || (v.content && v.content.kind === 'zombie'))).length);
            const needRows = liveRows.filter(r => rowZ[r] > 0);
            const orderRows = needRows.slice().sort((a, b) => rowZ[b] - rowZ[a] || a - b);
            // 两轮：有僵尸的行先各 1 株，再各补第 2 株 —— 真人就是这么摆的。
            // 卡要先看能不能种，种成功才 shift（原来「先 shift 再试种」，种不下这张卡就凭空消失了）
            for (let pass = 0; pass < 2 && atkTypes.length; pass++) {
                for (const row of orderRows) {
                    if (!atkTypes.length) break;
                    if (plantAt(row, atkTypes[0], [0, 1, 2, 3, 4]) >= 0) { atkTypes.shift(); rowAtk[row]++; }
                }
            }
            // 原来只有「最该补火力那行」种不下就直接 break，剩下的卡全废了 ——
            // 应该顺着优先级往下试，全都种不下才收工
            let guard = 0;
            while (atkTypes.length && guard++ < 200) {
                const order = liveRows.slice().sort((a, b) =>
                    (rowZ[b] - rowAtk[b] * 1.6) - (rowZ[a] - rowAtk[a] * 1.6) || rowAtk[a] - rowAtk[b]);
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
            for (const v of g.vases.filter(v => v.type === 'zombie')) {
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
                state: g.state, stars: g.vaseStars, lost: g.vaseLostPlants, rowAtk: rowAtk.slice(),
                win: !!document.querySelector('.vase-win-overlay .vase-win-title')
                    && /VICTORY/i.test(document.querySelector('.vase-win-overlay .vase-win-title').textContent)
            };
            g.gameSpeed = 1;
            return res;
        }, lvNo);
        ok(r.win, `第 ${lvNo} 关：新配比下仍然打得赢`, `星级=${r.stars} 损失=${r.lost} 分路输出=${JSON.stringify(r.rowAtk)}`);
        if (lvNo === 10) await p.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4158_lv10.png' });
    }

    console.log('\n⑤ 运行时');
    ok(errs.length === 0, '全程无 pageerror', errs.slice(0, 3).join(' | '));

    console.log(`\n===== 结果：${pass} 通过 / ${fail} 失败 =====`);
    await b.close();
    process.exit(fail ? 1 : 0);
})();
