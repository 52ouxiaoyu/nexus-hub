// v3.78.0 验证：植物头僵尸只露植物头，本体身体隐藏（埋进土里）
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
        g.zombieMode = true;
        if (!g._brainEaten) g._brainEaten = new Array(5).fill(false);
        g.entities.length = 0;
        const out = {};
        const fam = ['peahead', 'nuthead', 'sunhead', 'snowpeahead', 'jalapenohead', 'machinegunhead', 'tallnuthead'];
        // T1 全家族：本体隐藏 + 植物头可见且坐在地面（头底边 ≈ 脚底线 y+yOffset+72）
        out.family = fam.map(type => {
            const z = new Zombie(g, 2, type);
            g.entities.push(z);
            z.x = 500;
            const bodyHidden = z.element.style.display === 'none';
            const headVisible = !!(z.headEl && z.headEl.parentNode === g.entityLayer && z.headEl.style.display !== 'none');
            const headH = z.headEl ? parseFloat(z.headEl.style.height) : -1; // CSS 高度（rect 会被全局缩放污染）
            const expectedTop = z.y + z.yOffset + 72 - headH;
            const onGround = Math.abs(parseFloat(z.headEl.style.top) - expectedTop) < 3;
            z.headEl && z.headEl.parentNode && z.headEl.parentNode.removeChild(z.headEl);
            if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
            g.entities.pop();
            return { type, bodyHidden, headVisible, onGround };
        });
        // T2 行走：植物头跟随僵尸移动且保持可见
        const z = new Zombie(g, 1, 'nuthead');
        g.entities.push(z);
        z.x = 600;
        const x1 = parseFloat(z.headEl.style.left);
        z.update(0.5);
        const x2 = parseFloat(z.headEl.style.left);
        const stillHidden = z.element.style.display === 'none';
        const headFollows = x2 < x1 - 1; // 僵尸向左走
        const headVisible2 = !!(z.headEl && z.headEl.parentNode === g.entityLayer);
        // T3 死亡：植物头掉落，身体全程不可见
        z.takeDamage(99999);
        z.update(0.05);
        const headDropped = z.headEl === null;
        const bodyNeverShows = z.element.style.display === 'none';
        if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        g.entities.pop();
        // T4 盲盒僵尸不受影响：本体仍可见
        const zb = new Zombie(g, 2, 'mysterybox');
        g.entities.push(zb);
        const boxBodyVisible = zb.element.style.display !== 'none' && !!zb.headEl;
        if (zb.headEl && zb.headEl.parentNode) zb.headEl.parentNode.removeChild(zb.headEl);
        if (zb.element && zb.element.parentNode) zb.element.parentNode.removeChild(zb.element);
        g.entities.pop();
        // T5 灼烧火焰锚点跟植物头走
        const zf = new Zombie(g, 3, 'nuthead');
        g.entities.push(zf);
        zf.x = 500;
        zf.setBurn(3, 25);
        zf._syncFlame();
        const flameOnHead = Math.abs((parseFloat(zf._flameEl.style.top)) - (parseFloat(zf.headEl.style.top) - 8)) < 2;
        if (zf._flameEl && zf._flameEl.parentNode) zf._flameEl.parentNode.remove();
        if (zf.headEl && zf.headEl.parentNode) zf.headEl.parentNode.removeChild(zf.headEl);
        if (zf.element && zf.element.parentNode) zf.element.parentNode.removeChild(zf.element);
        g.entities.pop();
        out.walk = { stillHidden, headFollows, headVisible2, headDropped, bodyNeverShows, boxBodyVisible, flameOnHead };
        g.zombieMode = false;
        return out;
    });
    for (const f of t.family) ok(`${f.type}: 本体隐藏+头可见+坐地面`, f.bodyHidden && f.headVisible && f.onGround, f);
    ok('行走：头跟随僵尸移动', t.walk.headFollows, t.walk);
    ok('行走中身体保持隐藏+头可见', t.walk.stillHidden && t.walk.headVisible2, t.walk);
    ok('死亡：头掉落+身体不可见', t.walk.headDropped && t.walk.bodyNeverShows, t.walk);
    ok('盲盒僵尸本体仍可见（不受影响）', t.walk.boxBodyVisible, t.walk);
    ok('灼烧火焰锚定植物头', t.walk.flameOnHead, t.walk);

    // 截图：真实进入我是僵尸对局，等布防完成后清场，草坪上摆几只植物头僵尸看视觉
    await page.evaluate(() => { window._pvzGame._beginZombieGame(); });
    await new Promise(r => setTimeout(r, 2000)); // 等开局异步布防结束（早了会被清场）
    await page.evaluate(() => {
        const g = window._pvzGame;
        // 清掉布防植物（数组 + DOM）
        g.entities = g.entities.filter(e => {
            if (typeof Plant !== 'undefined' && e instanceof Plant) {
                if (e.element && e.element.parentNode) e.element.remove();
                return false;
            }
            return true;
        });
        const types = ['nuthead', 'peahead', 'snowpeahead', 'jalapenohead', 'tallnuthead'];
        types.forEach((tp, i) => {
            const z = new Zombie(g, i, tp);
            z.x = 300 + i * 130;
            g.entities.push(z);
            z.syncPlantHead(); // 立刻把植物头同步到新 x（主循环可能被前置测试搞停）
        });
    });
    await new Promise(r => setTimeout(r, 400));
    const dbg = await page.evaluate(() => {
        const g = window._pvzGame;
        return g.entities.filter(z => z.headEl).map(z => {
            const r = z.headEl.getBoundingClientRect();
            return { t: z.type, x: Math.round(z.x), inDoc: z.headEl.isConnected, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
        });
    });
    console.log('screenshot-time heads:', JSON.stringify(dbg));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_shot_v3780_heads.png' });
    await page.evaluate(() => { const g = window._pvzGame; g.entities.forEach(z => { if (z.headEl && z.headEl.parentNode) z.headEl.remove(); if (z.element && z.element.parentNode) z.element.remove(); }); g.entities.length = 0; g.state = 'MENU'; });

    await browser.close();
    console.log(fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAIL');
    process.exit(fail === 0 ? 0 : 1);
})();
