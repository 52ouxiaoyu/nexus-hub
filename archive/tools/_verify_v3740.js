// v3.74.0 验证：
// T1 植物罐概率平均（kernelpult vs gloomshroom 同档）
// T2 金罐可开出 cobcannon/plantbox/融合株
// T3 魅惑向日葵重做（吃光才策反 + 5×25 阳光）
// T4 融合僵尸四只（双盔两段/疯狂读报跳+狂暴/火把灼烧啃/大蒜被打跳行）
// T5 掉落物掉落 + 物品格种豌豆 → 路障豌豆
// T6 配方大全只留名字（无"（"）
// T7 灼烧 setBurn（火焰挂件 + 持续掉血）
// T8 图鉴新增组渲染（融合僵尸/掉落物）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  PASS', name); }
    else { fail++; console.log('  FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
}
(async () => {
    // T0 源码接线断言（node 侧）
    const fs = require('fs');
    const gl = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/GameLoop.js', 'utf8');
    const zm = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/entities/Zombie.js', 'utf8');
    const cm = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/managers/CollisionManager.js', 'utf8');
    const pl = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/entities/Plant.js', 'utf8');
    ok('T0a 火焰西瓜弹体带 ignite 标记', pl.includes('pr.ignite = true') && pl.includes('p.ignite = true'));
    ok('T0b CollisionManager 西瓜命中点燃', cm.includes('p.ignite && z.setBurn') && cm.includes('p.ignite && oz.setBurn'));
    ok('T0c 僵尸死亡掉落钩子', zm.includes('this.game._dropZombieLoot(this)'));
    ok('T0d 配方大全 push 已去解释', gl.includes("result: f.name,") && !gl.includes("result: f.name +"));

    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // T1 植物罐概率平均
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        const counts = {};
        for (let i = 0; i < 30000; i++) {
            const t = g._rollVasePlantContent('plant');
            counts[t] = (counts[t] || 0) + 1;
        }
        return { k: counts.kernelpult || 0, glo: counts.gloomshroom || 0, doom: counts.doomshroom || 0,
            pea: counts.peashooter || 0, types: Object.keys(counts).length };
    });
    ok('T1 植物罐平均（玉米投手 ' + t1.k + ' ≈ 忧郁菇 ' + t1.glo + '，种类 ' + t1.types + '）',
        Math.abs(t1.k - t1.glo) < 180 && t1.k > 600 && t1.k < 1300 && t1.doom > 200 && t1.doom < 600, t1);

    // T2 金罐内容
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        const c = { cob: 0, box: 0, fusion: 0, zombie: 0 };
        for (let i = 0; i < 3000; i++) {
            const r = g._rollGoldenVaseContent();
            if (r.kind === 'zombie') c.zombie++;
            else if (r.type === 'cobcannon') c.cob++;
            else if (r.type === 'plantbox') c.box++;
            else if (r.type.startsWith('fusion_')) c.fusion++;
        }
        return c;
    });
    ok('T2 金罐开出玉米炮/盲盒/融合/僵尸（' + JSON.stringify(t2) + '）',
        t2.cob > 60 && t2.box > 60 && t2.fusion > 800 && t2.zombie > 1200, t2);

    // T3 魅惑向日葵重做
    const t3 = await page.evaluate(async () => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        const plant = new Plant(g, 'fusion_hypnoshroom_sunflower');
        g.board.addPlant(plant, 2, 2);
        const z = new Zombie(g, 2, 'normal');
        z.x = plant.x + 30; z.y = plant.y;
        z.state = 'EATING'; z.eatTarget = plant;
        // 前几步：一口不该策反
        for (let i = 0; i < 10; i++) z.update(0.05);
        const firstBiteCharmed = z.hypnotized;
        const hpAfterBites = plant.hp;
        // 吃到光
        for (let i = 0; i < 400 && !z.hypnotized; i++) z.update(0.05);
        const charmedAtDeath = z.hypnotized && plant.hp <= 0 && !!plant._hypnoDeath;
        const sunBefore = g.entities.filter(e => e.constructor.name === 'Sun' && Math.abs(e.x - plant.x) < 80).length;
        await new Promise(r => setTimeout(r, 1400));
        const sunAfter = g.entities.filter(e => e.constructor.name === 'Sun' && Math.abs(e.x - plant.x) < 80).length;
        // 清场
        z.isDead = true; if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        if (plant.element && plant.element.parentNode) plant.element.parentNode.removeChild(plant.element);
        g.state = 'MENU';
        return { firstBiteCharmed, hpAfterBites: Math.round(hpAfterBites), charmedAtDeath, sunBefore, sunAfter };
    });
    ok('T3a 魅惑向日葵第一口不策反（hp=' + t3.hpAfterBites + '）', !t3.firstBiteCharmed && t3.hpAfterBites > 250, t3);
    ok('T3b 吃光后策反 + 一大批阳光（' + t3.sunAfter + ' 颗）', t3.charmedAtDeath && t3.sunAfter - t3.sunBefore >= 5, t3);

    // T4 融合僵尸四只
    const t4 = await page.evaluate(() => {
        const g = window._pvzGame;
        const out = {};
        // 双盔
        const z1 = new Zombie(g, 2, 'ironcone');
        out.ironHp = z1.hp; out.ironAcc = !!z1._accEl;
        z1.takeDamage(400);
        z1.update(0.016);
        out.ironStage1 = z1._ironStage;
        out.ironSrc1 = (z1.element.getAttribute('src') || '').includes('Buckethead');
        z1.takeDamage(950);
        z1.update(0.016);
        out.ironNormal = z1.type === 'normal';
        if (z1.element && z1.element.parentNode) z1.element.parentNode.removeChild(z1.element);
        // 疯狂读报
        const p2 = new Plant(g, 'peashooter');
        g.board.addPlant(p2, 3, 5);
        const z2 = new Zombie(g, 3, 'madpaper');
        z2.x = p2.x + 30; z2.y = p2.y;
        z2.update(0.016);
        out.madJump = z2.state === 'JUMPING';
        z2.state = 'WALKING'; z2.hasVaulted = true; z2.x = 900;
        z2.takeDamage(200);
        z2.update(0.016);
        out.madRage = z2.hasLostNewspaper === true && z2.speed === 45;
        if (z2.element && z2.element.parentNode) z2.element.parentNode.removeChild(z2.element);
        // 火把
        const p3 = new Plant(g, 'peashooter');
        g.board.addPlant(p3, 4, 5);
        const z3 = new Zombie(g, 4, 'torchzombie');
        out.torchAcc = !!z3._accEl;
        z3.x = p3.x + 30; z3.y = p3.y; z3.state = 'EATING'; z3.eatTarget = p3;
        const hp0 = p3.hp;
        z3.update(0.5);
        out.torchBurn = (hp0 - p3.hp) > 35; // 50*0.5 + 40*0.5 = 45
        if (z3.element && z3.element.parentNode) z3.element.parentNode.removeChild(z3.element);
        // 大蒜
        const z4 = new Zombie(g, 0, 'garliczombie');
        out.garlicAcc = !!z4._accEl;
        for (let i = 0; i < 4; i++) z4.takeDamage(10);
        out.garlicRow = z4.row;
        if (z4.element && z4.element.parentNode) z4.element.parentNode.removeChild(z4.element);
        // 清理测试植物
        [p2, p3].forEach(p => { p.isDead = true; if (p.element && p.element.parentNode) p.element.parentNode.removeChild(p.element); });
        return out;
    });
    ok('T4a 双盔僵尸两段脱落', t4.ironHp === 1500 && t4.ironAcc && t4.ironStage1 === 1 && t4.ironSrc1 && t4.ironNormal, t4);
    ok('T4b 疯狂读报：撑杆跳 + 狂暴', t4.madJump && t4.madRage, t4);
    ok('T4c 火把僵尸：啃食灼烧（额外 40/s）', t4.torchAcc && t4.torchBurn, t4);
    ok('T4d 大蒜僵尸：4 打跳行', t4.garlicAcc && t4.garlicRow === 1, t4);

    // T5 掉落物 + 掉落物融合种植
    const t5 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        const realRandom = Math.random;
        Math.random = () => 0.01; // 必掉
        const z = new Zombie(g, 1, 'conehead');
        z.x = g.board.offsetX + 5 * g.board.cellWidth + g.board.cellWidth / 2; // 站上草坪格（真实战死位置）
        g._dropZombieLoot(z);
        Math.random = realRandom;
        const gi = g.groundItems[g.groundItems.length - 1];
        const dropped = g.groundItems.length >= 1 && gi && gi.item === 'cone' && !!gi.el && !!gi.el.parentNode;
        const col = gi.col;
        g.sunCount = 9990; g.cooldowns.peashooter = 0;
        g.tryPlanting('peashooter', 1, col);
        const cell = g.board.grid[1][col];
        const fused = cell && cell.type === 'fusion_cone_peashooter';
        const used = gi.used === true && !gi.el.parentNode;
        // 清场
        if (cell) { cell.isDead = true; if (cell.element && cell.element.parentNode) cell.element.parentNode.removeChild(cell.element); g.board.grid[1][col] = null; }
        if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        g.groundItems.forEach(x => { if (x.el && x.el.parentNode) x.el.parentNode.removeChild(x.el); });
        g.groundItems = [];
        g.state = 'MENU';
        return { dropped, fused, used, hp: cell ? cell.hp : 0 };
    });
    ok('T5a 路障僵尸掉落路障（10% 强制命中）', t5.dropped, t5);
    ok('T5b 物品格种豌豆 → 路障豌豆（660 血）', t5.fused && t5.used && t5.hp === 660, t5);

    // T6 配方大全只留名字
    await page.evaluate(() => { window._pvzGame.initFusionUI(); document.getElementById('recipe-book-btn').click(); });
    await new Promise(r => setTimeout(r, 500));
    const t6 = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('#recipe-list li span')];
        const texts = spans.map(s => s.textContent);
        const withParen = texts.filter(t => t.includes('（') || t.includes('('));
        const hasDrop = texts.includes('路障豌豆') && texts.includes('铁桶豌豆') && texts.includes('旗帜向日葵') && texts.includes('铁门坚果') && texts.includes('狂暴大喷菇');
        return { total: texts.length, withParen: withParen.length, sample: withParen[0], hasDrop };
    });
    ok('T6 配方大全全部只写名字（' + t6.total + ' 条，含括号 ' + t6.withParen + '）且掉落物融合入册', t6.total > 40 && t6.withParen === 0 && t6.hasDrop, t6);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v374_recipe.png' });
    await page.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });

    // T7 灼烧
    const t7 = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = new Zombie(g, 1, 'normal');
        const hp0 = z.hp;
        z.setBurn(3, 25);
        const flameOn = !!z._flameEl && z._flameEl.parentNode === g.entityLayer && z.burnTimer > 0;
        z.update(1.0);
        const dmg1 = hp0 - z.hp;
        z.update(3.0);
        const flameOff = !z._flameEl && z.burnTimer === 0;
        if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        if (z._flameEl && z._flameEl.parentNode) z._flameEl.parentNode.removeChild(z._flameEl);
        return { flameOn, dmg1: Math.round(dmg1), flameOff };
    });
    ok('T7 灼烧：火焰挂件 + ~25/s 掉血 + 到期熄灭', t7.flameOn && t7.dmg1 >= 15 && t7.dmg1 <= 35 && t7.flameOff, t7);

    // T8 图鉴新组渲染
    await page.click('#btn-help-guide');
    await page.waitForFunction('document.getElementById("help-modal").style.display === "flex"', { timeout: 15000 });
    await page.click('.hg-tab[data-tab=zombies]');
    await new Promise(r => setTimeout(r, 600));
    const t8 = await page.evaluate(() => {
        const names = [...document.querySelectorAll('.hg-tile .hg-tname')].map(x => x.textContent);
        const need = ['双盔僵尸', '疯狂读报僵尸', '火把僵尸', '大蒜僵尸', '路障', '铁桶', '旗帜', '铁门', '报纸'];
        const missing = need.filter(n => !names.includes(n));
        // 火把僵尸瓦片应有溢出裁剪挂件 div
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const torch = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '火把僵尸');
        const torchAcc = torch ? !!torch.querySelector('.hg-art div[style*="overflow"]') : false;
        const cone = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '路障');
        const coneCrop = cone ? !!cone.querySelector('.hg-art div[style*="overflow"]') : false;
        return { missing, torchAcc, coneCrop };
    });
    await page.click('.hg-tab[data-tab=plants]');
    await new Promise(r => setTimeout(r, 500));
    const t8b = await page.evaluate(() => {
        const names = [...document.querySelectorAll('.hg-tile .hg-tname')].map(x => x.textContent);
        return { dropFusion: ['路障豌豆', '铁桶豌豆', '旗帜向日葵', '铁门坚果', '狂暴大喷菇'].filter(n => !names.includes(n)) };
    });
    ok('T8a 僵尸图鉴新增融合僵尸 + 掉落物两组', t8.missing.length === 0 && t8.torchAcc && t8.coneCrop, t8);
    ok('T8b 植物图鉴含 5 株掉落物融合', t8b.dropFusion.length === 0, t8b);
    // 截图：滚到融合僵尸组
    await page.click('.hg-tab[data-tab=zombies]');
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const t = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent.includes('双盔僵尸'));
        if (t) t.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v374_codex.png' });
    // 掉落物组截图
    await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const t = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '铁门');
        if (t) t.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v374_drops.png' });

    await browser.close();
    console.log(`RESULT: ${pass} pass / ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
