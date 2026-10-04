// ===== v3.87.0 猛鬼宿舍成长体系验证（六局闭环模拟）=====
const puppeteer = require("/Users/clawbox/nexus-hub/node_modules/puppeteer");
const path = require("path");

let pass = 0, fail = 0;
function ok(cond, name) {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = "/Users/clawbox/nexus-hub/pvz-web";

// 页面内通用工具：找玩家附近空格（按圈扫描）
const PAGE_HELPERS = `
    window.__findFreeTile = (prefer) => {
        const g = window.game;
        const base = { c: Math.floor(g.player.x / 80), r: Math.floor(g.player.y / 80) };
        const order = [];
        for (let rad = 1; rad <= 5; rad++)
            for (let dr = -rad; dr <= rad; dr++)
                for (let dc = -rad; dc <= rad; dc++) {
                    if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
                    order.push([base.c + dc, base.r + dr]);
                }
        if (prefer === 'low') order.reverse();
        for (const [col, row] of order) {
            if (!g.plants.some(p => p.c === col && p.r === row) && !g.walls.has(col + ',' + row)) return { c: col, r: row };
        }
        return null;
    };
`;

(async () => {
    const browser = await puppeteer.launch({
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        headless: "new",
        args: ["--allow-file-access-from-files", "--no-sandbox"],
        userDataDir: "/tmp/pptr-prof-" + Date.now(),
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    page.on("pageerror", e => console.log("PAGEERROR:", e.message));

    // ============ 第一局：主页 ============
    console.log("—— 第一局：主页统一 ——");
    await page.goto("file://" + path.join(ROOT, "index.html"), { waitUntil: "networkidle0" });
    await sleep(800);

    const a1 = await page.evaluate(() => document.getElementById('btn-dorm').querySelector('.pkt-art img')?.getAttribute('src') || '');
    ok(a1.includes('SunShroom'), `A1 卡面改用阳光菇主题图（${a1}）`);

    const a2 = await page.evaluate(() => {
        const name = document.getElementById('btn-dorm').querySelector('.pkt-name');
        const ref = document.getElementById('btn-vs').querySelector('.pkt-name');
        return { dorm: getComputedStyle(name).color, vs: getComputedStyle(ref).color };
    });
    ok(a2.dorm === a2.vs, `A2 卡名颜色与双人对战一致（${a2.dorm} vs ${a2.vs}）`);

    const box = await (await page.$('#btn-dorm')).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(300);
    const a3 = await page.evaluate(() => {
        const m = document.getElementById('dorm-role-modal');
        if (m.style.display !== 'flex') return { open: false };
        const names = [...m.querySelectorAll('.diff-name')].map(el => getComputedStyle(el).color);
        return { open: true, same: names[0] === names[1], colors: names };
    });
    ok(a3.open, 'A3 物理点击 dorm 卡 → 阵营弹窗打开');
    ok(a3.same, `A4 弹窗两阵营名颜色统一（${(a3.colors || []).join(' vs ')}）`);
    await page.evaluate(() => document.getElementById('dorm-back').click());

    await page.evaluate(() => document.getElementById('btn-help-guide').click());
    await sleep(300);
    const a5 = await page.evaluate(() => document.getElementById('help-body').innerText.includes('猛鬼宿舍'));
    ok(a5, 'A5 主菜单「操作与道具说明」含猛鬼宿舍章节');

    // ============ 第二局：浇水经济 + 阳光菇升级链 ============
    console.log("—— 第二局：浇水经济 + 阳光菇升级链 ——");
    await page.goto("file://" + path.join(ROOT, "haunted-dorm.html?role=plant"), { waitUntil: "networkidle0" });
    await sleep(800);
    await page.evaluate(h => eval(h), PAGE_HELPERS);

    const s0 = await page.evaluate(() => window.game.player.sun);
    await page.keyboard.down(' ');
    await sleep(1600);
    await page.keyboard.up(' ');
    const s1 = await page.evaluate(() => window.game.player.sun);
    ok(s1 - s0 >= 8 && s1 - s0 <= 12, `B1 浇水每次 +1 阳光（1.6s 内 +${s1 - s0}，期望 8~12）`);

    // 传送到阳光菇旁，物理点击升级（锁定被点击的那一格）
    await page.evaluate(() => {
        const g = window.game;
        g.nextWaveAt = 1e12; // 冻结波次
        const sh = g.plants.find(p => p.type === 'sunshroom');
        g.player.x = sh.c * 80 + 40;
        g.player.y = sh.r * 80 + 110;
    });
    await sleep(150);
    const sun0 = await page.evaluate(() => {
        const g = window.game;
        const sh = g.plants.find(p => Math.hypot(p.c * 80 + 40 - g.player.x, p.r * 80 + 40 - g.player.y) < 90);
        window.__tile = sh ? { c: sh.c, r: sh.r } : null;
        return g.player.sun;
    });
    const clickPlant = async () => {
        const pt = await page.evaluate(() => {
            const g = window.game, t = window.__tile;
            const r = g.vp1.getBoundingClientRect();
            return { sx: r.left + t.c * 80 + 40 - g.player.camX, sy: r.top + t.r * 80 + 40 - g.player.camY };
        });
        await page.mouse.click(pt.sx, pt.sy);
    };
    await clickPlant(); await sleep(200);
    const b2 = await page.evaluate(() => {
        const g = window.game, t = window.__tile;
        const at = g.plants.find(p => p.c === t.c && p.r === t.r);
        return { type: at ? at.type : null, sun: g.player.sun };
    });
    ok(b2.type === 'sunshroom2' && b2.sun === sun0 - 10, `B2 点击阳光菇 → 大阳光菇（☀${sun0}→${b2.sun}，扣 10）`);

    const sun1 = await page.evaluate(() => window.game.player.sun);
    await clickPlant(); await sleep(200);
    const b3 = await page.evaluate(() => {
        const g = window.game, t = window.__tile;
        const at = g.plants.find(p => p.c === t.c && p.r === t.r);
        return { type: at ? at.type : null, sun: g.player.sun };
    });
    ok(b3.type === 'sunflower' && b3.sun === sun1 - 25, `B3 再点升级 → 向日葵（☀${sun1}→${b3.sun}，费用递增）`);

    const sun2 = await page.evaluate(() => {
        const g = window.game, t = window.__tile;
        const sf = g.plants.find(p => p.c === t.c && p.r === t.r);
        sf.prodT = 6.95;
        return g.player.sun;
    });
    await sleep(400);
    const b4 = await page.evaluate(() => window.game.player.sun);
    ok(b4 - sun2 === 5, `B4 向日葵产阳光 +5（${sun2}→${b4}）`);

    // ============ 第三局：小喷菇喂大 + 包子 + 孢子 ============
    console.log("—— 第三局：蘑菇喂大 + 包子道具 ——");
    const c1 = await page.evaluate(() => {
        const g = window.game;
        g.player.hp = 1e9; g.player.maxHp = 1e9; // 后续测试锁血（真实死亡路径在第五局 reload 验证）
        g.player.sun = 500; g.addSun(0);
        const tile = window.__findFreeTile();
        if (!tile) return { ok: false };
        g.menuCol = tile.c; g.menuRow = tile.r;
        g.doPlant('puffshroom');
        const at = g.plants.find(p => p.c === tile.c && p.r === tile.r);
        window.__ctile = tile;
        return { ok: true, sun: g.player.sun, planted: at && at.type === 'puffshroom' };
    });
    ok(c1.ok && c1.planted && c1.sun === 300, `C1 空格种下小喷菇并扣款 ☀500→${c1.sun}`);

    // 同时浇水：一次 _water() 催熟身边所有蘑菇
    const c2 = await page.evaluate(() => {
        const g = window.game, t = window.__ctile;
        g.player.x = t.c * 80 + 40; g.player.y = t.r * 80 + 110;
        const puff = g.plants.find(p => p.c === t.c && p.r === t.r);
        const before = puff.fed;
        g._water();
        return { fed: puff.fed - before, sun: g.player.sun };
    });
    ok(c2.fed === 1, `C2 浇水喂到小喷菇（进度 +${c2.fed}）且阳光 +1（☀${c2.sun}）`);

    // 快进喂到 400 → 胆小菇
    const c3 = await page.evaluate(() => {
        const g = window.game, t = window.__ctile;
        const puff = g.plants.find(p => p.c === t.c && p.r === t.r);
        puff.fed = 399;
        g._water();
        const at = g.plants.find(p => p.c === t.c && p.r === t.r);
        return at.type;
    });
    ok(c3 === 'scaredyshroom', `C3 浇水满 400 → 进化为胆小菇（${c3}）`);

    // 孢子产出（胆小菇 2/12s）
    const c4 = await page.evaluate(() => {
        const g = window.game, t = window.__ctile;
        const sc = g.plants.find(p => p.c === t.c && p.r === t.r);
        sc.sporeT = 11.95;
        return g.player.spore;
    });
    await sleep(400);
    const c4b = await page.evaluate(() => window.game.player.spore);
    ok(c4b - c4 === 2, `C4 胆小菇产孢子 +2（${c4}→${c4b}）`);

    // 包子拾取
    const c5 = await page.evaluate(() => {
        const g = window.game;
        const el = document.createElement('div');
        g.baos.push({ x: g.player.x, y: g.player.y, el });
        g.world1.appendChild(el);
        return true;
    });
    await sleep(300);
    const c5b = await page.evaluate(() => window.game.player.bao);
    ok(c5 && c5b >= 1, `C5 走近拾取包子（🥟${c5b}）`);

    // E 投掷
    await page.evaluate(() => {
        const g = window.game;
        g.spawnZombie(g.player.x + 100, g.player.y);
        g.zombies[g.zombies.length - 1].speed = 0;
    });
    const c6 = await page.evaluate(() => {
        const g = window.game;
        const zb = g.zombies[g.zombies.length - 1];
        return { hp: zb.hp, bao: g.player.bao };
    });
    await page.keyboard.press('e');
    await sleep(200);
    const c6b = await page.evaluate(() => {
        const g = window.game;
        const zb = g.zombies[g.zombies.length - 1];
        return { hp: zb.hp, stun: zb.stunT, bao: g.player.bao };
    });
    ok(c6b.hp < c6.hp && c6b.stun > 0 && c6b.bao === c6.bao - 1, `C6 按 E 扔包子：伤害+眩晕（hp ${c6.hp}→${c6b.hp}，stun ${c6b.stun.toFixed(1)}s，🥟${c6b.bao}）`);

    // ============ 第四局：孢子高级植物 + 战斗闭环（木桩僵尸受控）============
    console.log("—— 第四局：孢子高级植物 + 战斗闭环 ——");
    const d1 = await page.evaluate(() => {
        const g = window.game;
        g.player.spore = 500; g.addSpore(0);
        const tile = window.__findFreeTile();
        if (!tile) return { ok: false };
        g.spawnPlant(tile.c, tile.r, 'spikeweed');
        g.spawnZombie(tile.c * 80 + 40, tile.r * 80 + 40);
        const zb = g.zombies[g.zombies.length - 1];
        zb.speed = 0; // 木桩钉在刺上
        return { ok: true, hp: zb.hp };
    });
    await sleep(1200);
    const d1b = await page.evaluate(() => {
        const g = window.game;
        const zb = g.zombies.filter(z => !z.dead).pop();
        return zb ? zb.hp : 0;
    });
    ok(d1.ok && d1b < d1.hp, `D1 地刺：站立掉血（${Math.round(d1.hp)}→${Math.round(d1b)}）`);

    const d2 = await page.evaluate(() => {
        const g = window.game;
        const tile = window.__findFreeTile();
        if (!tile) return { ok: false };
        g.spawnPlant(tile.c, tile.r, 'iceshroom');
        const ic = g.plants.find(p => p.type === 'iceshroom');
        ic.freezeT = 5.995;
        g.spawnZombie(tile.c * 80 + 40 + 100, tile.r * 80 + 40);
        const zb = g.zombies[g.zombies.length - 1];
        zb.speed = 0;
        return { ok: true, dist: 100 };
    });
    await sleep(500);
    const d2b = await page.evaluate(() => {
        const gg = window.game;
        const z = gg.zombies[gg.zombies.length - 1];
        return z ? z.stunT : -1;
    });
    ok(d2.ok && d2b > 0, `D2 眩晕菇：周期冰冻（100px 内，stun=${d2b.toFixed(1)}s）`);

    const d3 = await page.evaluate(() => {
        const g = window.game;
        const tile = window.__findFreeTile();
        if (!tile) return { ok: false };
        g.player.sun = 2000;
        g.spawnPlant(tile.c, tile.r, 'peashooter');
        const pe = g.plants.find(p => p.c === tile.c && p.r === tile.r);
        g.plantClick(pe); // → 双发射手
        g.spawnZombie(tile.c * 80 + 40 + 120, tile.r * 80 + 40);
        const zb = g.zombies[g.zombies.length - 1];
        zb.speed = 0;
        zb.hp = 40; zb.maxHp = 40; // 一轮齐射解决
        for (const z of g.zombies) if (!z.dead) { z.hp = 40; z.maxHp = 40; } // 之前留下的木桩也压低，避免挡弹
        return { ok: true, isRepeater: !!g.plants.find(p => p.type === 'repeater') };
    });
    const kills0 = await page.evaluate(() => window.game.kills);
    await sleep(4500);
    const d3b = await page.evaluate(() => window.game.kills);
    ok(d3.ok && d3.isRepeater && d3b > kills0, `D3 豌豆→双发射手（plantClick 升级）并击杀（kills ${kills0}→${d3b}）`);

    const d4 = await page.evaluate(() => {
        const g = window.game;
        g.player.spore = 300; g.addSpore(0);
        const tile = window.__findFreeTile('low');
        if (!tile) return { ok: false };
        g.spawnPlant(tile.c, tile.r, 'doomshroom');
        const dm = g.plants.find(p => p.type === 'doomshroom');
        dm._armT = 0.01;
        g.spawnZombie(tile.c * 80 + 40 + 50, tile.r * 80 + 40);
        const zb = g.zombies[g.zombies.length - 1];
        zb.speed = 0;
        return { ok: true, kills: g.kills };
    });
    await sleep(800);
    const d4b = await page.evaluate(() => ({ kills: window.game.kills, gone: !window.game.plants.some(p => p.type === 'doomshroom') }));
    ok(d4.ok && d4b.kills > d3b && d4b.gone, `D4 毁灭菇核爆清场（kills ${d3b}→${d4b.kills}，一次性消失）`);

    // 胜利：wave=8 且清场
    const e1 = await page.evaluate(() => {
        const g = window.game;
        g.wave = 8;
        for (const z of g.zombies) z.el1.remove();
        g.zombies = [];
        return true;
    });
    await sleep(600);
    const e1b = await page.evaluate(() => ({
        over: document.getElementById('dorm-over').style.display === 'flex',
        title: document.getElementById('ov-title').innerText }));
    ok(e1 && e1b.over && e1b.title.includes('活下来'), `E1 挺过 8 波清场 → 胜利结算（${e1b.title}）`);

    // ============ 第五局：失败路径 ============
    console.log("—— 第五局：失败路径 ——");
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);
    await page.evaluate(() => {
        const g = window.game;
        g.player.hp = 3;
        g.spawnZombie(g.player.x + 30, g.player.y);
    });
    let loseOk = false, loseTitle = '';
    for (let i = 0; i < 16; i++) {
        await sleep(250);
        const st = await page.evaluate(() => ({
            over: document.getElementById('dorm-over').style.display === 'flex',
            title: document.getElementById('ov-title').innerText }));
        if (st.over) { loseOk = st.title.includes('抓住'); loseTitle = st.title; break; }
    }
    ok(loseOk, `E2 HP 归零 → 失败结算（${loseTitle}）`);

    // ============ 第六局：真实快进整局（种防线 → 连打 3 波 → 胜利）============
    console.log("—— 第六局：快进整局模拟（可玩性验证）——");
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);
    const f0 = await page.evaluate(h => {
        eval(h);
        const g = window.game;
        g.waveTotal = 3;       // 快进局打 3 波
        g.nextWaveAt = 1e12;   // 冻结主循环自动波次（手动 startWave 驱动）
        g.player.hp = 1e9; g.player.maxHp = 1e9;
        g.player.sun = 99999; g.addSun(0);
        // 玩家周围一圈种 8 株豌豆并全部升到双发（真实 doPlant/plantClick 路径）
        const base = { c: Math.floor(g.player.x / 80), r: Math.floor(g.player.y / 80) };
        let planted = 0;
        for (let dr = -3; dr <= 3 && planted < 14; dr++) for (let dc = -3; dc <= 3 && planted < 14; dc++) {
            if (!dc && !dr) continue;
            const col = base.c + dc, row = base.r + dr;
            if (g.plants.some(p => p.c === col && p.r === row) || g.walls.has(`${col},${row}`)) continue;
            g.menuCol = col; g.menuRow = row;
            g.doPlant('peashooter');
            const pe = g.plants.find(p => p.c === col && p.r === row && p.type === 'peashooter');
            if (pe) { g.plantClick(pe); planted++; }
        }
        return planted;
    }, PAGE_HELPERS);
    ok(f0 >= 10, `F1 双发射手防线（种了 ${f0} 株）`);

    let winReached = false, killsF = 0, wavesF = 0;
    for (let i = 0; i < 90; i++) {
        await sleep(1000);
        const st = await page.evaluate(() => {
            const g = window.game;
            if (g.over) return { over: true, win: document.getElementById('ov-title').innerText.includes('活下来'), kills: g.kills, wave: g.wave };
            if (g.zombies.length === 0 && g.wave < g.waveTotal) { // 含尸体：让主循环自己的胜利判定先跑
                g.startWave();
                // 快进局：把远处僵尸传送到防线右前方（不然全程都在赶路）
                for (const z of g.zombies) {
                    if (z.dead) continue;
                    if (Math.hypot(z.x - g.player.x, z.y - g.player.y) <= 600) continue;
                    // 校验落点：不能撞墙、不能落在植物上（否则会卡在房间里啃门板）
                    let placed = false;
                    for (let t = 0; t < 30 && !placed; t++) {
                        const nx = g.player.x + 400 + (t % 6) * 20;
                        const ny = g.player.y + (((t * 97) % 360) - 180);
                        if (!g.checkCollision(nx, ny) && !g.getPlantAt(nx, ny)) {
                            z.x = nx; z.y = ny; placed = true;
                        }
                    }
                    if (!placed) { z.x = g.player.x + 380; z.y = g.player.y; }
                }
            }
            g._water(); g._water(); g._water();
            return { over: false, kills: g.kills, wave: g.wave, zombies: g.zombies.filter(z => !z.dead).length };
        });
        killsF = st.kills; wavesF = st.wave;
        if (st.over) { winReached = st.win; break; }
    }
    ok(winReached, `F2 快进整局：打完 ${wavesF} 波、击杀 ${killsF} → 胜利结算`);
    ok(killsF >= 6, `F3 战斗闭环成立（累计击杀 ${killsF} ≥ 6）`);

    await page.screenshot({ path: ROOT + "/_v3870_game.png" });
    await browser.close();
    console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
    process.exit(fail ? 1 : 0);
})();
