// v3.71.0 验证：HelpGuide 底部"返回"按钮删除，点弹窗外空白关闭保留
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
    await page.waitForFunction('document.getElementById("help-modal").style.display === "flex"', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 300));

    // T1 按钮已删：#help-close / .hg-foot 均不存在
    const t1 = await page.evaluate(() => ({
        btn: !!document.getElementById('help-close'),
        foot: !!document.querySelector('.hg-foot')
    }));
    ok('T1 底部返回按钮已删除', !t1.btn && !t1.foot, t1);

    // T2 点弹窗外空白（modal 自身）→ 关闭
    const t2 = await page.evaluate(() => {
        const m = document.getElementById('help-modal');
        m.dispatchEvent(new MouseEvent('click', { bubbles: false })); // target=modal 自身
        return { closed: m.style.display === 'none' };
    });
    ok('T2 点弹窗外空白关闭', t2.closed, t2);

    // T3 重新打开正常（切到植物图鉴 tab 数瓦片）
    await page.click('#btn-help-guide');
    await page.waitForFunction('document.getElementById("help-modal").style.display === "flex"', { timeout: 15000 });
    await page.click('.hg-tab[data-tab=plants]');
    await new Promise(r => setTimeout(r, 300));
    const t3 = await page.evaluate(() => ({ tiles: document.querySelectorAll('.hg-tile').length }));
    ok('T3 重新打开正常（瓦片 ' + t3.tiles + ' 块）', t3.tiles > 50, t3);

    // T4 点弹窗内容区（panel 内）不误关
    const t4 = await page.evaluate(() => {
        const m = document.getElementById('help-modal');
        const b = document.getElementById('help-body').getBoundingClientRect();
        document.getElementById('help-body').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: b.left + 50, clientY: b.top + 50 }));
        return { stillOpen: m.style.display === 'flex' };
    });
    ok('T4 点弹窗内容区不误关', t4.stillOpen, t4);

    // 截图（滚到融合区）
    await page.evaluate(() => {
        const el = document.querySelector('.hg-tile .hg-lawn');
        if (el) el.closest('.hg-tile').scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v371_nobtn.png' });
    console.log('shot ok');

    await browser.close();
    console.log(`RESULT: ${pass} pass / ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
