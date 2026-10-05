// v3.66.0 验证：黑圈外扩在每张植物卡片外面（非 inset 内缘、非整栏外圈）
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

    // 真实进场 A：经典模式（选卡 → LET'S ROCK）
    await page.click('#btn-adventure');
    await page.waitForFunction('!!document.querySelector("#chooser-grid .chooser-card")', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
        // 若无默认选卡则点满前几张可用卡
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card:not(.disabled)')];
        const picked = document.querySelectorAll('#chooser-grid .chooser-card.picked, #chooser-grid .chooser-card.selected').length;
        if (!picked) cards.slice(0, 6).forEach(c => c.click());
    });
    await new Promise(r => setTimeout(r, 300));
    await page.click('#btn-lets-rock');
    await page.waitForFunction('window._pvzGame.state === "PLAYING"', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));

    // T1 普通卡片：黑圈为外扩环（0 0 0 2px，非 inset）
    const t1 = await page.evaluate(() => {
        const c = document.querySelector('#seed-bank .seed-card:not(.vase-free-card):not(.plantern-shop-card)');
        const bs = c ? getComputedStyle(c).boxShadow : '(no card)';
        return { bs, outer: /rgb\(0, 0, 0\) 0px 0px 0px 2px/.test(bs), noInset: !/inset/.test(bs) };
    });
    ok('T1 卡片外扩黑圈 2px（非 inset）', t1.outer && t1.noInset, t1.bs);

    // T1b 经典模式顶栏截图（有植物卡，黑圈外扩可见）
    const rectC = await page.evaluate(() => {
        const r = document.getElementById('top-bar').getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v366_cards.png',
        clip: { x: Math.max(0, rectC.x - 4), y: Math.max(0, rectC.y - 4), width: Math.min(1280, rectC.w + 8), height: rectC.h + 8 } });
    ok('T1b 经典模式顶栏截图完成', true, '');

    // T2 种子栏本身不再有黑色外圈（v3.64 误解项已撤）
    const t2 = await page.evaluate(() => getComputedStyle(document.getElementById('seed-bank')).boxShadow);
    ok('T2 种子栏外圈已撤', !/rgb\(0, 0, 0\) 0px 0px 0px 2px/.test(t2) && !/inset/.test(t2), t2 || '(none)');

    // T3 卡片间距 9px（外圈后不粘连）
    const t3 = await page.evaluate(() => getComputedStyle(document.getElementById('seed-bank')).gap);
    ok('T3 卡片间距 9px', t3 === '9px', t3);

    // 真实进场 B：砸罐子（路灯花商店卡 / 特殊卡场景）+ 顶栏截图
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));
    await page.click('#btn-vase');
    await page.click('#diff-easy');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));

    // T4 特殊卡（若存在）：黑圈同样外扩 + 金色 outline 在黑圈外
    const t4 = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('#seed-bank .seed-card.vase-free-card, #seed-bank .seed-card.plantern-shop-card').forEach(c => {
            const bs = getComputedStyle(c).boxShadow;
            out.push({ cls: c.className.replace('seed-card', '').trim(), outer: /rgb\(0, 0, 0\) 0px 0px 0px 2px/.test(bs), noInset: !/inset/.test(bs) });
        });
        return out;
    });
    ok('T4 特殊卡黑圈外扩（' + t4.length + ' 张）', t4.every(x => x.outer && x.noInset), JSON.stringify(t4));

    // 顶栏截图
    const rect = await page.evaluate(() => {
        const r = document.getElementById('top-bar').getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v366_cards.png',
        clip: { x: Math.max(0, rect.x - 4), y: Math.max(0, rect.y - 4), width: Math.min(1280, rect.w + 8), height: rect.h + 8 } });
    ok('T5 顶栏截图完成', true, JSON.stringify(rect));

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
