// v3.77.1 验证：我是僵尸植物头僵尸吃脑退场 → 头顶植物不残留
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  PASS', name); }
    else { fail++; console.log('  FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
}
(async () => {
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

    const t = await page.evaluate(() => {
        const g = window._pvzGame;
        g.state = 'PLAYING';
        g.zombieMode = true; // 我是僵尸模式（吃脑分支的前提）
        if (!g._brainEaten) g._brainEaten = new Array(5).fill(false);
        g.entities.length = 0;
        // 场景一：植物头僵尸（坚果头）走到房子口吃脑 → isDead 直退
        const z = new Zombie(g, 2, 'nuthead');
        g.entities.push(z);
        z.x = 35; // x<40 触发吃脑
        z.update(0.05);
        const ateBrain = z.isDead === true && g._brainEaten[2] === true;
        const headInLayerBefore = !!(z.headEl && z.headEl.parentNode === g.entityLayer); // bug 场景：头还挂在场上
        // 主循环的退场回收（等价于 update 里的 filter 分支）
        g.entities = g.entities.filter(e => { if (e.isDead) { g._removeEntityDom(e); return false; } return true; });
        const headRemoved = !(z.headEl && z.headEl.parentNode);
        // 场景二：融合僵尸挂件（火把）同路径也不残留
        const zt = new Zombie(g, 1, 'torchzombie');
        g.entities.push(zt);
        const accAttached = !!(zt._accEl && zt._accEl.parentNode === g.entityLayer);
        zt.isDead = true;
        g.entities = g.entities.filter(e => { if (e.isDead) { g._removeEntityDom(e); return false; } return true; });
        const accRemoved = !(zt._accEl && zt._accEl.parentNode);
        // 场景三：正常死亡路径 dropPlantHead 不受影响（死亡动画照样掉头）
        const z2 = new Zombie(g, 3, 'nuthead');
        g.entities.push(z2);
        z2.takeDamage(99999);
        z2.update(0.05); // 死亡分支：DYING + dropPlantHead
        const dropOnDeath = z2.headEl === null;
        if (z2.element && z2.element.parentNode) z2.element.parentNode.removeChild(z2.element);
        if (z2.headEl && z2.headEl.parentNode) z2.headEl.parentNode.removeChild(z2.headEl);
        g.entities.length = 0;
        g.zombieMode = false;
        g.state = 'MENU';
        return { ateBrain, headInLayerBefore, headRemoved, accAttached, accRemoved, dropOnDeath };
    });
    ok('植物头僵尸吃脑 → isDead 直退', t.ateBrain, t);
    ok('bug 场景复现：吃脑后头还挂在场上', t.headInLayerBefore, t);
    ok('退场回收后头顶植物已清走', t.headRemoved, t);
    ok('融合僵尸挂件（火把）同路径不残留', t.accAttached && t.accRemoved, t);
    ok('正常死亡路径 dropPlantHead 不受影响', t.dropOnDeath, t);

    await browser.close();
    console.log(fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAIL');
    process.exit(fail === 0 ? 0 : 1);
})();
