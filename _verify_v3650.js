// v3.65.0 验证：返回游戏中心按钮 / 砸罐子一次性植物秒杀特权 / 玉米加农炮入经典+4×4秒杀+焦块 / 金罐全融合+地狱保底 / 我是僵尸特殊僵尸随机
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const URL = 'file:///Users/clawbox/nexus-hub/pvz-web/index.html';
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + '  ' + (d || '')); c ? pass++ : fail++; };

    // ===== 组 A：主菜单 =====
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    const t1 = await page.evaluate(() => {
        const btn = document.getElementById('btn-back-gc');
        const player = document.getElementById('player-name');
        if (!btn || !player) return { exists: false };
        const b = btn.getBoundingClientRect(), p = player.getBoundingClientRect();
        return { exists: true, rightOf: b.left >= p.right - 2, fs: getComputedStyle(btn).fontSize,
                 onclick: btn.getAttribute('onclick') || '', sameRow: Math.abs(b.top - p.top) < 60 };
    });
    ok('T1a 返回按钮存在且在 player 右侧同行', t1.exists && t1.rightOf && t1.sameRow, JSON.stringify(t1));
    ok('T1b 字号 19px（与操作与道具说明一致）', t1.fs === '19px', 'fs=' + t1.fs);
    ok('T1c 点击跳转 ../games.html', /games\.html/.test(t1.onclick), t1.onclick);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v365_menu.png',
        clip: { x: 0, y: 780, width: 1280, height: 120 } });

    // T2 经典选卡含玉米加农炮
    await page.click('#btn-adventure');
    await page.waitForFunction('document.querySelectorAll("#chooser-grid .chooser-card").length > 0', { timeout: 10000 }).catch(() => {});
    const t2 = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#chooser-grid .chooser-card'));
        return { total: cards.length, cob: cards.some(c => c.dataset.type === 'cobcannon') };
    });
    ok('T2 经典选卡出现玉米加农炮', t2.cob, JSON.stringify(t2));

    // ===== 组 B：砸罐子（简单）—— 秒杀特权通道 =====
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await page.click('#btn-vase');
    await page.click('#diff-easy');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 400));

    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        const mk = (type, row, x) => { const z = new Zombie(g, row, type); z.x = x; g.entities.push(z); return z; };
        // ① 寒冰头：普通炸弹免疫仍在
        const snow = mk('snowpeahead', 2, 400); const hp0 = snow.hp;
        snow.takeDamage(1800, { bomb: true, oneshot: true });
        const immune = snow.hp === hp0;
        // ② 特权：寒冰头/巨人/冰车 一律直接击杀
        snow.takeDamage(1800, { bomb: true, oneshot: true, obliterate: true });
        const garg = mk('gargantuar', 2, 500);
        garg.takeDamage(1800, { oneshot: true, obliterate: true });
        const zomb = mk('zomboni', 3, 600);
        zomb.takeDamage(1800, { bomb: true, obliterate: true });
        return { immune, snowDead: snow.hp <= 0, gargDead: garg.hp <= 0, zombDead: zomb.hp <= 0 };
    });
    ok('T3a 寒冰头普通炸弹免疫保留', t3.immune, JSON.stringify(t3));
    ok('T3b 特权击杀 寒冰头/巨人/冰车', t3.snowDead && t3.gargDead && t3.zombDead, JSON.stringify(t3));

    // ④ 真实樱桃炸弹 explodeNow：范围内巨人直接死
    const t4 = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = new Zombie(g, 2, 'gargantuar'); z.x = 500; g.entities.push(z);
        const p = new Plant(g, 'cherrybomb');
        p.row = 2; p.x = 520; p.y = g.board.offsetY + 2 * g.board.cellHeight + g.board.cellHeight / 2;
        g.entities.push(p);
        p.explodeNow();
        return { gargDead: z.hp <= 0 };
    });
    ok('T4 砸罐子樱桃炸弹真实爆炸秒杀巨人', t4.gargDead, JSON.stringify(t4));

    // T5 玉米炮弹 _cobExplode：4×4 秒杀 + 16 块焦痕 + 圈外存活
    const t5 = await page.evaluate(() => {
        const g = window._pvzGame;
        const b = g.board;
        const R = 2, C = 4;
        const cx = b.offsetX + C * b.cellWidth + b.cellWidth / 2;
        const cy = b.offsetY + R * b.cellHeight + b.cellHeight / 2;
        const in1 = new Zombie(g, 1, 'gargantuar'); in1.x = cx; g.entities.push(in1);      // 圈内上一行
        const in2 = new Zombie(g, 3, 'gargantuar'); in2.x = cx - 60; g.entities.push(in2); // 圈内下一行
        const out = new Zombie(g, 0, 'gargantuar'); out.x = cx; g.entities.push(out);      // 圈外（隔 2 行）
        const proj = new Projectile(g, cx, cy, R, 'cob', null);
        proj.x = cx; proj.y = cy;
        proj._cobExplode();
        const scorches = document.querySelectorAll('.cob-scorch').length;
        return { in1Dead: in1.hp <= 0, in2Dead: in2.hp <= 0, outAlive: out.hp > 0, scorches };
    });
    ok('T5a 玉米炮弹 4×4 内全部秒杀', t5.in1Dead && t5.in2Dead, JSON.stringify(t5));
    ok('T5b 圈外僵尸存活', t5.outAlive);
    ok('T5c 地面出现 16 块黑色焦痕', t5.scorches === 16, 'scorch=' + t5.scorches);

    // ===== 组 C：砸罐子地狱 —— 金罐融合保底 =====
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await page.click('#btn-vase');
    await page.click('#diff-hell');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    const t6 = await page.evaluate(() => {
        const g = window._pvzGame;
        const goldens = g.vases.filter(v => v.golden);
        const fusionGoldens = goldens.filter(v => v.content && v.content.kind === 'plant' &&
            typeof v.content.type === 'string' && v.content.type.startsWith('fusion_'));
        return { goldenCount: goldens.length, fusionCount: fusionGoldens.length };
    });
    ok('T6 地狱金罐 1~2 个且至少 1 个开出融合植物', t6.goldenCount >= 1 && t6.goldenCount <= 2 && t6.fusionCount >= 1, JSON.stringify(t6));

    // ===== 组 D：我是僵尸（困难）—— 特殊僵尸随机上架 =====
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await page.click('#btn-zombie');
    await page.waitForFunction('document.getElementById("zdiff-modal").style.display !== "none" && document.getElementById("zdiff-modal").style.display !== ""', { timeout: 10000 }).catch(() => {});
    await page.click('#zdiff-hard');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.zombieMode', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 600));
    const t7 = await page.evaluate(() => {
        const g = window._pvzGame;
        const cfg = g._zombieDiffCfg();
        const SPECIALS = ['nuthead', 'snowpeahead', 'jalapenohead', 'mysterybox', 'gargantuar'];
        const bankTypes = Array.from(document.querySelectorAll('#zombie-bank .zcard')).map(c => c.dataset.type);
        return { special: cfg.specialZombie, inCfg: SPECIALS.includes(cfg.specialZombie),
                 onBank: cfg.specialZombie && bankTypes.includes(cfg.specialZombie), bankCount: bankTypes.length };
    });
    ok('T7a 困难局随机上架 1 只特殊僵尸（5 选 1）', t7.inCfg, JSON.stringify(t7));
    ok('T7b 特殊僵尸已出现在卡带', t7.onBank, '卡带张数=' + t7.bankCount);

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
