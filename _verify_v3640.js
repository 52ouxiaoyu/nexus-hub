// v3.64.0 验证：种子栏（#seed-bank）整体外圈黑色围边
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + '  ' + (d || '')); c ? pass++ : fail++; };

    // 真实进场（砸罐子流程最快）
    await page.click('#btn-vase');
    await page.click('#diff-easy');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));

    // T1 计算样式：#seed-bank 有 0 0 0 2px 黑色外圈（box-shadow spread 环）
    const t1 = await page.evaluate(() => {
        const bs = getComputedStyle(document.getElementById('seed-bank')).boxShadow;
        return { bs, hasRing: /rgb\(0, 0, 0\) 0px 0px 0px 2px/.test(bs) };
    });
    ok('T1 种子栏外圈黑色环 2px', t1.hasRing, t1.bs);

    // T2 卡片自身的黑圈内环仍在（v3.62 交付项未被误删）
    const t2 = await page.evaluate(() => {
        const c = document.querySelector('#seed-bank .seed-card');
        return c ? getComputedStyle(c).boxShadow : '(no card)';
    });
    ok('T2 卡片黑圈保留', /inset.*rgb\(0, 0, 0\)/.test(t2) || /rgb\(0, 0, 0\).*inset/.test(t2), t2);

    // 顶栏截图（种子栏外圈可见）
    const rect = await page.evaluate(() => {
        const r = document.getElementById('top-bar').getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v364_bank.png',
        clip: { x: Math.max(0, rect.x - 4), y: Math.max(0, rect.y - 4), width: Math.min(1280, rect.w + 8), height: rect.h + 8 } });
    ok('T3 顶栏截图完成', true, JSON.stringify(rect));

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
