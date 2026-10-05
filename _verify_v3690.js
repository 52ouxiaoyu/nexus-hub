// v3.69.0 验证：问号罐限定 6 种 + 罐池补小鬼/伴舞 + 图鉴砸罐子组重写 + 演示小剧场移除
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
    await page.click('#btn-vase');
    await page.click('#diff-hell');
    await page.waitForFunction('window._pvzGame.state === "PLAYING" && window._pvzGame.vases && window._pvzGame.vases.length > 0', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + (d ? '  ' + d : '')); c ? pass++ : fail++; };

    // T1 问号罐 500 抽 ⊆ 指定 6 种，且小鬼/撑杆/读报都出现得到
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        const allow = new Set(['normal', 'conehead', 'buckethead', 'newspaper', 'polevaulting', 'imp']);
        const seen = {};
        let bad = 0;
        for (let i = 0; i < 500; i++) {
            const t = g._rollVaseZombieType(5, true);
            seen[t] = (seen[t] || 0) + 1;
            if (!allow.has(t)) bad++;
        }
        return { bad, seen };
    });
    ok('T1 问号罐 500 抽全在 6 种名单内', t1.bad === 0 && t1.seen.imp > 0 && t1.seen.polevaulting > 0 && t1.seen.newspaper > 0,
        JSON.stringify(t1.seen));

    // T2 前两排问号罐：不出撑杆
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        let pv = 0;
        for (let i = 0; i < 300; i++) if (g._rollVaseZombieType(1, true) === 'polevaulting') pv++;
        return pv;
    });
    ok('T2 前两排问号罐无撑杆', t2 === 0, '出现 ' + t2);

    // T3 紫罐 500 抽 ⊆ 名单，且小鬼/伴舞/锤子都出现得到
    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        const allow = new Set(['normal', 'conehead', 'buckethead', 'flag', 'polevaulting', 'newspaper', 'imp', 'backup', 'hammerzombie', 'screendoor', 'football', 'dancing']);
        const seen = {};
        let bad = 0;
        for (let i = 0; i < 500; i++) {
            const t = g._rollVaseZombieType(5, false);
            seen[t] = (seen[t] || 0) + 1;
            if (!allow.has(t)) bad++;
        }
        return { bad, seen };
    });
    ok('T3 紫罐 500 抽全在名单内且小鬼/伴舞入池', t3.bad === 0 && t3.seen.imp > 0 && t3.seen.backup > 0 && t3.seen.hammerzombie > 0,
        JSON.stringify(t3.seen));

    // T4 金罐僵尸 300 抽 ⊆ 用户名单
    const t4 = await page.evaluate(() => {
        const g = window._pvzGame;
        const allow = new Set(['peahead', 'nuthead', 'sunhead', 'snowpeahead', 'jalapenohead', 'machinegunhead', 'tallnuthead', 'mysterybox', 'zomboni', 'football', 'gargantuar', 'hammerzombie', 'normal', 'conehead', 'buckethead', 'flag', 'polevaulting', 'newspaper', 'imp', 'backup', 'screendoor', 'dancing']);
        const seen = {};
        let bad = 0;
        for (let i = 0; i < 300; i++) {
            const c = g._rollGoldenVaseContent();
            if (c.kind !== 'zombie') continue;
            seen[c.type] = (seen[c.type] || 0) + 1;
            if (!allow.has(c.type)) bad++;
        }
        return { bad, n: Object.values(seen).reduce((a, b) => a + b, 0), seen };
    });
    ok('T4 金罐僵尸 300 抽全在名单内', t4.bad === 0 && t4.n > 0, JSON.stringify(t4.seen));

    // T5 照明预览：小鬼罐 → Imp 立绘
    const t5 = await page.evaluate(() => {
        const g = window._pvzGame;
        const v = g.vases.find(x => !x.smashed && !x.pumpkinHp);
        if (!v) return { ok: false };
        v.content = { kind: 'zombie', type: 'imp' };
        g.lightUpNeighbors(v.row, v.col - 1);
        return { ok: true, src: v.contentEl ? (v.contentEl.src || v.contentEl.innerHTML || '') : '' };
    });
    ok('T5 小鬼照明预览出 Imp 立绘', t5.ok && String(t5.src).includes('Imp/Zombie.gif'));

    // ===== 操作与说明检查 =====
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));
    await page.click('#btn-help-guide');
    await page.waitForFunction(() => {
        const m = document.getElementById('help-modal');
        return m && getComputedStyle(m).display !== 'none';
    }, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 400));

    // T6 切到僵尸图鉴：砸罐子组 14 只、无小丑盒/铁梯、有伴舞/小鬼
    const t6 = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('#help-modal .help-tab, #help-modal [data-tab]')];
        const t = tabs.find(x => (x.dataset && x.dataset.tab === 'zombies') || /僵尸图鉴/.test(x.innerText || ''));
        if (t) t.click();
        return true;
    });
    await new Promise(r => setTimeout(r, 400));
    const t6r = await page.evaluate(() => {
        const txt = document.getElementById('help-modal').innerText;
        // 砸罐子组条目数：数 grid 里该组卡片（按组标题后数名字）——直接查关键词
        const has = s => txt.includes(s);
        return {
            hasBackup: has('伴舞僵尸'), hasImp: has('小鬼僵尸'), hasHammer: has('锤子僵尸'),
            noJack: !has('小丑盒'), noLadder: !has('铁梯'),
            noDemoWord: !has('攻击方式演示') && !has('爆炸过程演示') && !has('行为演示')
        };
    });
    ok('T6 僵尸图鉴名单正确（含伴舞/小鬼，无小丑盒/铁梯）', t6 && t6r.hasBackup && t6r.hasImp && t6r.hasHammer && t6r.noJack && t6r.noLadder, JSON.stringify(t6r));

    // T7 植物详情卡无演示（点一张植物卡）
    const t7 = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('#help-modal .help-tab, #help-modal [data-tab]')];
        const t = tabs.find(x => (x.dataset && x.dataset.tab === 'plants') || /植物图鉴/.test(x.innerText || ''));
        if (t) t.click();
        return true;
    });
    await new Promise(r => setTimeout(r, 400));
    const t7r = await page.evaluate(() => {
        const card = document.querySelector('#help-modal .hg-card, #help-modal .hg-item, #help-modal [class*=plant]');
        if (card) card.click();
        return new Promise(res => setTimeout(() => {
            const txt = document.getElementById('help-modal').innerText;
            const demoEl = document.querySelector('#help-modal .hg-demo');
            res({ noDemo: !demoEl, noWord: !txt.includes('演示'), hasDetail: txt.includes('阳光') || txt.includes('耐久') });
        }, 300));
    });
    ok('T7 植物详情卡无演示小剧场', t7 && t7r.noDemo && t7r.noWord && t7r.hasDetail, JSON.stringify(t7r));

    // 截图：僵尸图鉴砸罐子组
    await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('#help-modal .help-tab, #help-modal [data-tab]')];
        const t = tabs.find(x => (x.dataset && x.dataset.tab === 'zombies') || /僵尸图鉴/.test(x.innerText || ''));
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const rect = await page.evaluate(() => {
        const m = document.getElementById('help-modal');
        const r = m.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: Math.min(r.height, 860) };
    });
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v369_zgroups.png',
        clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.min(1280, rect.w), height: rect.h } });
    ok('T8 图鉴截图完成', true);

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
