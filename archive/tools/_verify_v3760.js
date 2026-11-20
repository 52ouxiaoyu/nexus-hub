// v3.76.0 验证：西瓜/大喷菇/忧郁菇 穿透铁门（打本体=普通僵尸 200 血，门血无视）
// T0 源码接线 / T1 pierce 单元（4 发穿门击杀+门甲不动）/ T2 非 pierce 表面伤害（磨门不动本体）
// T3 真实端到端：西瓜投手实弹打铁门僵尸，≤6 发内击杀（对照：豌豆打同僵尸 10 发杀不死）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  PASS', name); }
    else { fail++; console.log('  FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
}
(async () => {
    // T0 源码接线断言（node 侧）
    const fs = require('fs');
    const zm = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/entities/Zombie.js', 'utf8');
    const cm = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/managers/CollisionManager.js', 'utf8');
    const pj = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/entities/Projectile.js', 'utf8');
    ok('T0a 铁门拆本体血（_bodyHp=200）', zm.includes('this._bodyHp = 200; this._bodyMax = 200;'));
    ok('T0b pierce 命中直接打本体（打穿即死）', zm.includes('if (this._bodyHp <= 0) this.hp = 0;'));
    ok('T0c 西瓜系入 pierce 表', cm.includes("p.type === 'melon' || p.type === 'wintermelon'") && cm.includes("p.type === 'cattail_melon'"));
    ok('T0d 西瓜溅射穿门', cm.includes('oz.takeDamage(p.damage / 2, { pierce: true })'));
    ok('T0e 猫尾西瓜追踪弹穿门', pj.includes('melonPierce'));

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

    // T1 单元：pierce 直击本体
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        const z = new Zombie(g, 2, 'screendoor');
        const armor0 = z.armorHp;
        for (let i = 0; i < 4; i++) z.takeDamage(60, { pierce: true });
        const deadByPierce = z.hp <= 0;
        const armorUnchanged = z.armorHp === armor0; // 门甲感知不到 pierce（门不掉）
        if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        g.state = 'MENU';
        return { hp: z.hp, body: z._bodyHp, deadByPierce, armorUnchanged };
    });
    ok('T1a 铁门僵尸被 4 发 pierce（60×4≥本体200）打死', t1.deadByPierce, t1);
    ok('T1b 门甲不掉（armorHp 恒定）', t1.armorUnchanged, t1);

    // T2 非 pierce = 表面伤害（磨门，本体无感）
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        const z = new Zombie(g, 2, 'screendoor');
        for (let i = 0; i < 5; i++) z.takeDamage(60); // 豌豆类表面伤害
        const alive = z.hp > 0 && z.hp === z.maxHp - 300;
        const bodyFull = z._bodyHp === 200;
        if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        g.state = 'MENU';
        return { hp: z.hp, body: z._bodyHp, alive, bodyFull };
    });
    ok('T2 豌豆 5 发只磨门（hp4900 活着，本体 200 满的）', t2.alive && t2.bodyFull, t2);

    // T3 真实端到端：西瓜投手实弹 vs 铁门僵尸（对照豌豆）
    const t3 = await page.evaluate(async () => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        g.entities.length = 0; // 清场
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const mk = (type, row, x) => { const z = new Zombie(g, row, type); z.x = x; z.y = g.board.offsetY + row * g.board.cellHeight + 30; return z; };
        const drive = async (plant, z, ms) => {
            const t0 = performance.now();
            while (performance.now() - t0 < ms) {
                if (!plant.isDead) plant.update(0.05);
                g.entities.filter(e => e instanceof Projectile && !e.isDead).forEach(p => p.update(0.05));
                g.collisionManager.update();
                z.update(0.05);
                if (z.hp <= 0 || z.isDead) break;
                await sleep(2);
            }
        };
        // 西瓜投手 vs 铁门僵尸
        const melon = new Plant(g, 'melonpult');
        g.board.addPlant(melon, 2, 1);
        const zd = mk('screendoor', 2, melon.x + 150);
        g.entities.push(zd);
        await drive(melon, zd, 15000);
        const melonShotsDead = zd.hp <= 0 || zd.isDead;
        // 对照：豌豆射手 vs 铁门僵尸（表面伤害，10 秒杀不死）
        const pea = new Plant(g, 'peashooter');
        g.board.addPlant(pea, 3, 1);
        const zp = mk('screendoor', 3, pea.x + 150);
        g.entities.push(zp);
        await drive(pea, zp, 8000);
        const peaCannotKill = zp.hp > 0;
        // 清场
        g.entities.length = 0;
        [melon, pea].forEach(p => { if (p.element && p.element.parentNode) p.element.parentNode.removeChild(p.element); });
        g.board.grid[2][1] = null; g.board.grid[3][1] = null;
        g.state = 'MENU';
        return { melonShotsDead, melonHp: zd.hp, peaCannotKill, peaHp: zp.hp };
    });
    ok('T3a 西瓜实弹穿透铁门击杀（本体 200 血被打穿）', t3.melonShotsDead, t3);
    ok('T3b 对照组：豌豆打门表面 8 秒杀不死', t3.peaCannotKill, t3);

    await browser.close();
    console.log(fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAIL');
    process.exit(fail === 0 ? 0 : 1);
})();
