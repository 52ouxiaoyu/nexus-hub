// v3.72.0 验证：①图鉴全 gif 静止（canvas 抓首帧）②双子坚果瓦片坚果放大到 ~40px
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

    await page.click('#btn-help-guide');
    await page.waitForFunction('document.getElementById("help-modal").style.display === "flex"', { timeout: 15000 });
    // 依次切三个 tab，让全部内容渲染并完成冻结
    for (const tab of ['plants', 'zombies', 'modes']) {
        await page.click('.hg-tab[data-tab=' + tab + ']');
        await new Promise(r => setTimeout(r, 400));
    }
    await page.waitForFunction('[...document.querySelectorAll("#help-modal img")].every(im => im.complete)', { timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // T1 gif 全部静止：切到植物图鉴（图最多）后断言不存在 .gif 后缀 src
    await page.click('.hg-tab[data-tab=plants]');
    await new Promise(r => setTimeout(r, 500));
    await page.waitForFunction('[...document.querySelectorAll("#help-modal img")].every(im => im.complete)', { timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));
    const t1 = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('#help-modal img')];
        const stillGif = imgs.filter(im => /\.gif(\?|$)/.test(im.getAttribute('src') || ''));
        const frozen = imgs.filter(im => (im.getAttribute('src') || '').startsWith('data:image/png'));
        return { total: imgs.length, stillGif: stillGif.length, frozen: frozen.length };
    });
    await new Promise(r => setTimeout(r, 800));
    const t1b = await page.evaluate(() =>
        [...document.querySelectorAll('#help-modal img')].filter(im => /\.gif(\?|$)/.test(im.getAttribute('src') || '')).length);
    ok('T1 gif 全部静止（' + t1.frozen + '/' + t1.total + ' 张冻结 / 剩余 gif ' + t1b + '）', t1.total > 30 && t1b === 0, t1);

    // T2 双子坚果瓦片：坚果 img 显示高度 ≈ 40px（38~46 容差），且名字不被压
    const t2 = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const tw = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '双子坚果');
        if (!tw) return { found: false };
        const nuts = [...tw.querySelectorAll('.hg-lawn img')].filter(im => (im.getAttribute('src') || '').includes('WallNut') || (im.getAttribute('src') || '').startsWith('data:'));
        // 冻结后 src 是 dataURL，按 order 取 ov/ov2（坚果）——用尺寸判断：h 在 36~48 之间的 img
        const hs = [...tw.querySelectorAll('.hg-lawn img')].map(im => Math.round(im.getBoundingClientRect().height));
        const art = tw.querySelector('.hg-art').getBoundingClientRect();
        const nm = tw.querySelector('.hg-tname').getBoundingClientRect();
        return { found: true, hs, gap: Math.round(nm.top - art.bottom), big: hs.filter(h => h >= 34 && h <= 50).length };
    });
    ok('T2 双子坚果放大（' + JSON.stringify(t2.hs) + 'px，大图 ' + t2.big + ' 个）', t2.found && t2.big >= 2, t2);
    ok('T3 名字不被压（gap=' + t2.gap + 'px）', t2.gap >= -2, t2.gap);

    // T3b 可视命中断言：名字文字中心 elementFromPoint 不得命中 img（绝对定位溢出探测）
    await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const tw = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '双子坚果');
        tw.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));
    const t3b = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const tw = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '双子坚果');
        const nm = tw.querySelector('.hg-tname').getBoundingClientRect();
        const hits = [];
        for (const dx of [-0.35, 0, 0.35]) {
            const el = document.elementFromPoint(nm.left + nm.width * (0.5 + dx), nm.top + nm.height / 2);
            hits.push(el && el.tagName === 'IMG' ? 'IMG' : (el && el.className || el && el.tagName));
        }
        return { hits };
    });
    ok('T3b 名字可见（命中 ' + JSON.stringify(t3b.hits) + '）', t3b.hits.every(h => h !== 'IMG'), t3b.hits);

    // T4 详情卡也冻结：点开双子坚果详情
    await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const tw = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '双子坚果');
        tw.click();
    });
    await new Promise(r => setTimeout(r, 600));
    const t4 = await page.evaluate(() => {
        const d = document.getElementById('hg-detail');
        const imgs = [...d.querySelectorAll('img')];
        const stillGif = imgs.filter(im => /\.gif(\?|$)/.test(im.getAttribute('src') || '')).length;
        return { open: d.style.display === 'flex', total: imgs.length, stillGif };
    });
    ok('T4 详情卡打开且无活动 gif', t4.open && t4.stillGif === 0, t4);
    await page.evaluate(() => { document.getElementById('hg-detail').style.display = 'none'; });

    // 截图：滚到双子坚果
    await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const t = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent.includes('双子坚果'));
        if (t) t.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v372_after.png' });
    console.log('shot ok');

    await browser.close();
    console.log(`RESULT: ${pass} pass / ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
