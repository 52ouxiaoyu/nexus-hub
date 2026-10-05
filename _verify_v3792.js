// v3.79.2 验证：撤回 v3.78.0 隐藏身体——植物头僵尸恢复完整僵尸（头+身体），植物头顶在头上
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log('PASS ' + name); }
    else { fail++; console.log('FAIL ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // ===== T1 砸罐子模式：8 种植物头僵尸全部身体可见 + 头顶锚点 -72 =====
    await page.evaluate(() => { window._pvzGame._beginVaseGame(); });
    await new Promise(r => setTimeout(r, 1500));
    const types = ['peahead', 'nuthead', 'sunhead', 'snowpeahead', 'jalapenohead', 'machinegunhead', 'tallnuthead', 'garliczombie', 'mysterybox'];
    const t1 = await page.evaluate((types) => {
        const g = window._pvzGame;
        g.vases = [];
        document.querySelectorAll('.vase, [class*=vase]').forEach(e => { if (e.style) e.style.display = 'none'; });
        window._zs = types.map((tp, i) => {
            const z = new Zombie(g, i % 5, tp);
            z.x = 180 + i * 100;
            z.y = g.board.offsetY + (i % 5) * g.board.cellHeight + g.board.cellHeight / 2 - 20;
            g.entities.push(z);
            return z;
        });
        window._zs.forEach(z => z.update(0.016));
        return window._zs.map(z => ({
            type: z.type,
            bodyVisible: z.element.style.display !== 'none',
            hasHead: !!z.headEl,
            headTopOff: z.headTopOff,
            headTopCss: z.headEl ? parseFloat(z.headEl.style.top) : null,
            expectTop: z.y + z.yOffset - 72
        }));
    }, types);
    check('T1a 9 只全部身体可见（display 不为 none）', t1.every(x => x.bodyVisible), t1.filter(x => !x.bodyVisible));
    check('T1b 9 只全部有植物头', t1.every(x => x.hasHead), t1.filter(x => !x.hasHead));
    check('T1c 头顶锚点全部回到 -72（不再坐地面）', t1.every(x => x.headTopOff === -72), t1.map(x => [x.type, x.headTopOff]));
    check('T1d 头顶位置=身体顶边（顶在头上不悬空不坐地）', t1.every(x => Math.abs(x.headTopCss - x.expectTop) < 2), t1.filter(x => Math.abs(x.headTopCss - x.expectTop) >= 2).map(x => [x.type, x.headTopCss, x.expectTop]));
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c1_field_plantheads.png' });

    // ===== T2 死亡掉头：翻滚飞落（transform 过渡）而非原地淡出 =====
    const t2 = await page.evaluate(() => {
        const z = window._zs.find(x => x.type === 'peahead');
        z.dropPlantHead();
        return { trans: z.headEl ? null : 'detached', oldElTrans: z._droppedTrans || null };
    });
    // dropPlantHead 后 headEl 置空，改从 DOM 断言过渡样式
    const t2b = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[style*="rotate(40deg)"]')];
        return els.length > 0;
    });
    check('T2 掉头=随身体翻滚飞落（rotate 过渡存在）', t2b, t2);

    // ===== T3 大蒜僵尸特写：身体+大蒜头（源码断言）=====
    const fs = require('fs');
    const zbSrc = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/entities/Zombie.js', 'utf8');
    const noHide = !zbSrc.includes('hideBody');
    const hgSrc = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
    const garlicTextOk = hgSrc.includes('完整僵尸头顶着一颗大蒜头') && !hgSrc.includes('埋进土里');
    check('T3a Zombie.js 无 hideBody 残留', noHide);
    check('T3b 图鉴大蒜描述改为完整僵尸+头顶大蒜', garlicTextOk);
    // 大蒜僵尸特写截图
    await page.evaluate(() => {
        const z = window._zs.find(x => x.type === 'garliczombie');
        z.x = 400;
        z.syncPlantHead();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c2_garlic_closeup.png' });

    // ===== T4 版本徽标（bump 后复核）=====
    const ver = await page.evaluate(() => fetch('version.json?b=' + Date.now()).then(r => r.json()).catch(() => null));
    // file:// 下 fetch 可能失败，退回读 DOM 徽标
    const badge = await page.evaluate(() => {
        const el = document.querySelector('#version-badge, .version-badge, [id*=version]');
        return el ? el.textContent : null;
    });
    console.log('INFO version.json=' + JSON.stringify(ver) + ' badge=' + badge);

    await browser.close();
    console.log(`\n==== RESULT: ${pass} pass, ${fail} fail ====`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
