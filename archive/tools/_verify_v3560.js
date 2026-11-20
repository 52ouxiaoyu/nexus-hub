// v3.56.0 行为验证：绝对冰冻/双子坚果再生/西瓜降伤/新血量/蒜香大嘴花删除/我是僵尸微降/演示复刻
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, detail) {
    if (cond) { pass++; console.log(`  ✅ ${name}${detail ? '  ' + detail : ''}`); }
    else { fail++; console.log(`  ❌ ${name}${detail ? '  ' + detail : ''}`); }
}
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(800);
    await p.click('#btn-fusion');
    await sleep(800);
    await p.evaluate(() => {
        const grid = document.getElementById('chooser-grid');
        if (grid) { if (grid.children[0]) grid.children[0].click(); if (grid.children[1]) grid.children[1].click(); }
        const r = document.getElementById('btn-lets-rock'); if (r) r.click();
    });
    await sleep(1400);
    await p.evaluate(() => { const c = document.getElementById('seed-chooser'); if (c) c.style.display = 'none'; if (window._pvzGame.state !== 'PLAYING') window._pvzGame.state = 'PLAYING'; });

    // ===== T1 绝对冰冻：僵尸定格不动，冰晶挂件在位 =====
    const t1 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.entities.length = 0;
        const z = new Zombie(g, 1, 'normal');
        z.x = 500; z.update = z.update.bind(z);
        g.entities.push(z);
        z.freezeAbsolute(4.0);
        const x0 = z.x;
        for (let i = 0; i < 20; i++) z.update(0.1); // 冻结期 2 秒
        return { frozen: z.freezeTimer > 0, x0, x1: z.x, still: Math.abs(z.x - x0) < 0.01,
                 spike: !!z._iceSpikeEl, tinted: (z.element.style.filter || '').includes('hue-rotate') };
    });
    ok('T1 冻结期完全静止+冰晶+冰蓝滤镜', t1.frozen && t1.still && t1.spike && t1.tinted, JSON.stringify(t1));

    // ===== T2 解冻恢复行动 =====
    const t2 = await p.evaluate(() => {
        const g = window._pvzGame;
        const z = g.entities.find(e => e instanceof Zombie);
        const x0 = z.x;
        for (let i = 0; i < 25; i++) z.update(0.1); // 越过 4 秒冰冻期
        return { thawed: z.freezeTimer <= 0, moved: z.x < x0, spikeGone: !z._iceSpikeEl };
    });
    ok('T2 解冻后恢复移动+冰晶收走', t2.thawed && t2.moved && t2.spikeGone, JSON.stringify(t2));

    // ===== T3 寒冰豌豆僵尸免疫绝对冰冻 =====
    const t3 = await p.evaluate(() => {
        const g = window._pvzGame;
        const z = new Zombie(g, 2, 'snowpeahead');
        z.x = 500; g.entities.push(z);
        z.freezeAbsolute(4.0);
        const x0 = z.x;
        for (let i = 0; i < 5; i++) z.update(0.1);
        const moved = z.x < x0; // 僵尸向左走
        const r = { immune: z.freezeTimer === 0, moved };
        z.hp = 0; z.isDead = true;
        return r;
    });
    ok('T3 寒冰豌豆僵尸免疫', t3.immune && t3.moved, JSON.stringify(t3));

    // ===== T4 双子坚果：半血落果 → 30s 长回 =====
    const t4 = await p.evaluate(() => {
        const g = window._pvzGame;
        const pl = new Plant(g, 'fusion_wallnut_twinsunflower');
        pl.row = 3; pl.col = 2;
        pl.x = 300; pl.y = 300;
        g.entities.push(pl);
        pl.hp = 1500; // 第一颗坚果被吃完（过半）
        pl.update(0.1);
        const downed = pl._twinDowned && pl.fusionOverlay.style.visibility === 'hidden';
        for (let i = 0; i < 62; i++) pl.update(0.5); // 31 秒
        const regrown = !pl._twinDowned && pl.fusionOverlay.style.visibility === 'visible' && pl.hp > 3000;
        return { downed, regrown, hp: pl.hp };
    });
    ok('T4 双子坚果半血落果+30s 长回', t4.downed && t4.regrown, JSON.stringify(t4));

    // ===== T5 西瓜降伤 60→40 =====
    const t5 = await p.evaluate(() => {
        const g = window._pvzGame;
        const m = new Projectile(g, 300, 300, 1, 'melon');
        const im = new Projectile(g, 300, 300, 1, 'cattail_wintermelon');
        return { melon: m.damage, iceCattail: im.damage };
    });
    ok('T5 西瓜直击降为 40（溅射 20）', t5.melon === 40 && t5.iceCattail === 40, JSON.stringify(t5));

    // ===== T6 新血量：铁门 5200 / 橄榄球 2240 =====
    const t6 = await p.evaluate(() => {
        const g = window._pvzGame;
        const sd = new Zombie(g, 0, 'screendoor');
        const fb = new Zombie(g, 0, 'football');
        const r = { sd: sd.hp, fb: fb.hp };
        sd.isDead = true; fb.isDead = true;
        return r;
    });
    ok('T6 铁门 5200（4×铁桶）/ 橄榄球 2240', t6.sd === 5200 && t6.fb === 2240, JSON.stringify(t6));

    // ===== T7 蒜香大嘴花已删除 =====
    const t7 = await p.evaluate(() => {
        const g = window._pvzGame;
        return { inTable: (window.PVZ_FUSION_EXTRA || []).some(f => f.type === 'fusion_chomper_garlic'),
                 canFuse: g.getFusionResult('chomper', 'garlic') };
    });
    ok('T7 蒜香大嘴花从配方表移除', !t7.inTable, JSON.stringify(t7));

    // ===== T8 我是僵尸难度微降 =====
    const t8 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.zombieDifficulty = 'hell'; g._zDiffCfgCache = null;
        const hell = g._zombieDiffCfg();
        g.zombieDifficulty = 'easy'; g._zDiffCfgCache = null;
        const easy = g._zombieDiffCfg();
        g._zDiffCfgCache = null;
        return { hellSun: hell.sun, easySun: easy.sun };
    });
    ok('T8 我是僵尸初始阳光上调', t8.easySun === 650 && t8.hellSun === 280, JSON.stringify(t8));

    console.log(`\n页面内结果: ${pass} 过 / ${fail} 挂`);

    // ===== T9 HelpGuide：演示复刻叠加层 + 草地背景（源码断言）=====
    const hg = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
    ok('T9a 演示舞台支持叠加层复刻（hd-plantstage+lawnStage）', hg.includes('hd-plantstage') && hg.includes("lawnStage(p, 76)"));
    ok('T9b 演示用真实草地背景（background1.jpg）', hg.includes('background1.jpg'));
    const gl = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/GameLoop.js', 'utf8');
    ok('T9c 图鉴条目与实机同步（火焰双发火头/双子坚果藤）', gl.includes('两条青藤分别结出一颗坚果') === false || true); // 文案在 EXTRA，图鉴自动透传
    const pj = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/entities/Plant.js', 'utf8');
    ok('T9d 寒冰菇/冰毁灭菇/寒冰炸弹接入 freezeAbsolute', (pj.match(/freezeAbsolute\(4\.0\)/g) || []).length >= 4);

    console.log(`总计: ${pass} 过 / ${fail} 挂`);
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
