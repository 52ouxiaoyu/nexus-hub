// v3.70.0 验证：HelpGuide 瓦片样式回归修复（.hg-lawn/.hg-tname/.hg-tsub 被 v3.69 误删）
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

    // 打开操作与说明
    await page.click('#btn-help-guide');
    await page.waitForFunction('!!document.querySelector(".hg-tab[data-tab=plants]")', { timeout: 15000 });
    await page.click('.hg-tab[data-tab=plants]');
    await new Promise(r => setTimeout(r, 400));
    // 等瓦片图全部加载
    await page.waitForFunction('[...document.querySelectorAll(".hg-tile img")].every(im => im.complete)', { timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 400));

    // T1 CSS 规则恢复：.hg-lawn 定高 64px、.hg-tname 有字重与字号
    const t1 = await page.evaluate(() => {
        const lawn = document.querySelector('.hg-tile .hg-lawn');
        const nm = document.querySelector('.hg-tile .hg-tname');
        if (!lawn || !nm) return { hasLawn: !!lawn, hasName: !!nm };
        const ls = getComputedStyle(lawn), ns = getComputedStyle(nm);
        return { h: ls.height, pos: ls.position, fw: ns.fontWeight, fs: ns.fontSize, mt: ns.marginTop };
    });
    ok('T1 样式恢复（lawn 64px + tname 700/12.5px）',
        t1.h === '64px' && t1.pos === 'relative' && t1.fw === '700' && t1.fs === '12.5px', t1);

    // T2 几何断言：所有融合瓦片（含 .hg-lawn 的）名字顶边 >= 图片区底边（不相交，留 2px 容差）
    const t2 = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')].filter(t => t.querySelector('.hg-lawn'));
        let worst = null, cnt = 0;
        for (const t of tiles) {
            const art = t.querySelector('.hg-art').getBoundingClientRect();
            const nm = t.querySelector('.hg-tname').getBoundingClientRect();
            const gap = nm.top - art.bottom;
            cnt++;
            if (gap < -2 && (!worst || gap < worst.gap)) worst = { name: t.querySelector('.hg-tname').textContent, gap: Math.round(gap) };
        }
        return { cnt, worst };
    });
    ok('T2 融合瓦片名字不与图片相交（' + t2.cnt + ' 块）', t2.cnt > 30 && !t2.worst, t2.worst);

    // T3 名字实际可见：名字底边 <= 瓦片底边（没被挤出或重叠到相邻瓦片）
    const t3 = await page.evaluate(() => {
        let bad = 0;
        for (const t of document.querySelectorAll('.hg-tile')) {
            const tr = t.getBoundingClientRect(), nr = t.querySelector('.hg-tname').getBoundingClientRect();
            if (nr.bottom > tr.bottom + 1) bad++;
        }
        return { bad };
    });
    ok('T3 名字都在各自瓦片框内', t3.bad === 0, t3);

    // 截图：融合区（滚动到第一块 .hg-lawn 瓦片附近，全屏拍）
    await page.evaluate(() => {
        const el = document.querySelector('.hg-tile .hg-lawn').closest('.hg-tile');
        el.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v370_tiles.png' });
    console.log('shot ok');

    await browser.close();
    console.log(`RESULT: ${pass} pass / ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
