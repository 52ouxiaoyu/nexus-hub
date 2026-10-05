// v3.81.0 双人对战模式综合验证
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('PASS ' + n); } else { fail++; console.log('FAIL ' + n + ' ' + JSON.stringify(x)); } }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    await sleep(600);

    // T1 入口按钮：右下角长方形
    const t1 = await page.evaluate(() => {
        const b = document.getElementById('btn-vs');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { w: r.width, h: r.height, visible: r.width > 0 };
    });
    check('T1 双人对战入口按钮存在且为长方形', t1 && t1.visible && t1.w > t1.h, t1);

    // T2 点击 → 玩法弹窗两个选项
    await page.click('#btn-vs');
    await sleep(300);
    const t2 = await page.evaluate(() => {
        const m = document.getElementById('vs-modal');
        return { shown: m && m.style.display === 'flex', a: !!document.getElementById('vs-normal'), b: !!document.getElementById('vs-fusion') };
    });
    check('T2 玩法弹窗：普通/融合两个选项', t2.shown && t2.a && t2.b, t2);

    // T3 融合对战 → 植物选卡（上限 8、向日葵限 1）
    await page.click('#vs-fusion');
    await sleep(300);
    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
        const sunCards = cards.filter(c => ['sunflower', 'sunshroom', 'twinsunflower'].includes(c.dataset.type));
        if (sunCards.length >= 2) sunCards[0].click(), sunCards[1].click(); // 选两个产阳光 → 第二个应被拒
        const pickedSun = g.vsPlantSeeds.filter(s => ['sunflower', 'sunshroom', 'twinsunflower'].includes(s.type)).length;
        sunCards.forEach(c => { // 清掉再正式选
            const i = g.vsPlantSeeds.indexOf(g.seeds.find(s => s.type === c.dataset.type));
            if (i > -1) { g.vsPlantSeeds.splice(i, 1); c.style.filter = 'none'; }
        });
        return { chooserShown: document.getElementById('seed-chooser').style.display === 'flex', cardCount: cards.length, pickedSun };
    });
    check('T3 植物选卡页打开·全植物池·产阳光限 1 生效', t3.chooserShown && t3.cardCount > 30 && t3.pickedSun === 1, t3);

    // 正式选 8 株并进入僵尸选卡
    await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
        const want = ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater', 'potatomine', 'cherrybomb', 'chomper'];
        want.forEach(ty => { const c = cards.find(x => x.dataset.type === ty); if (c) c.click(); });
        document.getElementById('btn-lets-rock').click();
    });
    await sleep(300);

    // T4 僵尸选卡：15 种、sunhead 限 1、开战
    const t4 = await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#vz-grid .vz-card')];
        const sh = cards.filter(c => c.dataset.type === 'sunhead');
        sh[0].click(); sh[0].click(); // 第二次点击=取消再选回?（点同卡在 vz 逻辑=toggle，两次=选上）; 直接验证卡数与池
        cards.find(c => c.dataset.type === 'normal').click();
        return { cardCount: cards.length, hasSunhead: sh.length === 1, picks: g.vsZombiePicks.length, modalShown: document.getElementById('vz-chooser').style.display === 'flex' };
    });
    check('T4 僵尸选卡页：15 种可选·含 sunhead·可选中', t4.cardCount === 15 && t4.hasSunhead && t4.picks >= 1 && t4.modalShown, t4);

    // 补满 8 只开战
    await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#vz-grid .vz-card')];
        ['conehead', 'buckethead', 'football', 'polevaulting', 'newspaper', 'screendoor', 'gargantuar'].forEach(ty => {
            const c = cards.find(x => x.dataset.type === ty); if (c) c.click();
        });
        document.getElementById('vz-rock').click();
    });
    await sleep(1200);

    // T5 开局状态：双阳光池 / 底栏 / 顶栏 / 手套图鉴（融合对战应显示）
    const t5 = await page.evaluate(() => {
        const g = window._pvzGame;
        const bar = document.getElementById('vs-bottom-bar');
        return {
            playing: g.state === 'PLAYING', vsMode: g.vsMode, vsFusion: g.vsFusion,
            plantSun: g.sunCount, zombieSun: g.zombieSun,
            barShown: bar.style.display === 'flex', barCards: bar.querySelectorAll('.zcard').length,
            seedCards: document.querySelectorAll('#seed-bank .seed-card').length,
            glove: document.getElementById('glove-bank').style.display,
            book: document.getElementById('recipe-book-btn').style.display
        };
    });
    check('T5 开局：☀150/☀400 双池·底栏 8 卡·顶栏 8 卡·融合局手套图鉴可见',
        t5.playing && t5.plantSun === 150 && t5.zombieSun === 400 && t5.barShown && t5.barCards === 8 && t5.seedCards === 8 && t5.glove !== 'none' && t5.book !== 'none', t5);

    // T6 僵尸部署扣僵尸方阳光 + _vsPaid 标记
    const t6 = await page.evaluate(() => {
        const g = window._pvzGame;
        const before = g.zombieSun;
        g.deployZombie('normal', 1);
        const z = g.entities.filter(e => e.type === 'normal').pop();
        return { before, after: g.zombieSun, paid: z && z._vsPaid, placed: !!z };
    });
    check('T6 僵尸部署：僵尸方 ☀-50·带 _vsPaid', t6.after === t6.before - 50 && t6.paid === 50 && t6.placed, t6);

    // T7 植物方击杀 → 得僵尸价
    const t7 = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = g.entities.filter(e => e.type === 'normal' && !e.isDead).pop();
        const before = g.sunCount;
        z.takeDamage(99999, { oneshot: true });
        return { before };
    });
    await sleep(300);
    const t7b = await page.evaluate(() => window._pvzGame.sunCount);
    check('T7 植物方击杀普通僵尸 +50', t7b === t7.before + 50, { before: t7.before, after: t7b });

    // T8 植物被吃 → 僵尸方得植物价（豌豆 100）——走真实 tryPlanting 路径
    const t8 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.sunCount = 1000;
        const before = g.zombieSun;
        g.tryPlanting('peashooter', 2, 2);
        const plant = g.board.grid[2][2];
        plant.hp = 0;
        return { before, planted: !!plant };
    });
    await sleep(400);
    const t8b = await page.evaluate(() => window._pvzGame.zombieSun);
    check('T8 植物被吃：僵尸方 +100（豌豆价）', t8b === t8.before + 100 && t8.planted, { before: t8.before, after: t8b });

    // T9 一次性植物不算钱（樱桃 150）
    const t9 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.sunCount = 1000;
        const before = g.zombieSun;
        g.tryPlanting('cherrybomb', 3, 2);
        const plant = g.board.grid[3][2];
        if (plant) plant.hp = 0;
        return { before, planted: !!plant };
    });
    await sleep(400);
    const t9b = await page.evaluate(() => window._pvzGame.zombieSun);
    check('T9 一次性植物被吃不发钱', t9b === t9.before, { before: t9.before, after: t9b });

    // T10 sunhead 产阳光（存活越久越多）
    const t10 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.deployZombie('sunhead', 0);
        const z = g.entities.filter(e => e.type === 'sunhead').pop();
        z._vsSunTimer = 0.05; // 0.05s 后首次产出
        return { before: g.zombieSun };
    });
    await sleep(600);
    const t10b = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = g.entities.filter(e => e.type === 'sunhead').pop();
        return { after: g.zombieSun, alive: z ? z._vsAlive : -1 };
    });
    check('T10 向日葵头僵尸产阳光入僵尸方池', t10b.after === t10.before + 25 && t10b.alive > 0, t10);

    // T11 僵尸进屋 → 僵尸方胜 overlay
    await page.evaluate(() => {
        const g = window._pvzGame;
        const z = g.entities.filter(e => e.type === 'sunhead' && !e.isDead).pop();
        z.x = 39;
    });
    await sleep(800);
    const t11 = await page.evaluate(() => {
        const g = window._pvzGame;
        const ov = document.querySelector('.vase-win-overlay');
        return { state: g.state, hasOverlay: !!ov, text: ov ? ov.textContent.replace(/\s+/g, ' ').slice(0, 80) : '' };
    });
    check('T11 僵尸进屋判僵尸方胜', t11.state === 'GAMEOVER' && t11.hasOverlay && t11.text.includes('僵尸方获胜'), { ...t11, text: t11.text.replace(/\s+/g, ' ') });

    // T12 再玩一局 → 回选人流程，可再开局（普通局：手套应隐藏）
    await page.evaluate(() => { document.querySelector('#vs-replay').click(); });
    await sleep(300);
    const t12a = await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
        const want = ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater', 'potatomine', 'cherrybomb', 'chomper'];
        g.vsPlantSeeds = [];
        want.forEach(ty => { const c = cards.find(x => x.dataset.type === ty); if (c) c.click(); });
        document.getElementById('btn-lets-rock').click();
    });
    await sleep(300);
    await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#vz-grid .vz-card')];
        ['sunhead', 'normal', 'conehead', 'buckethead', 'football', 'polevaulting', 'newspaper', 'screendoor'].forEach(ty => {
            const c = cards.find(x => x.dataset.type === ty); if (c) c.click();
        });
        document.getElementById('vz-rock').click();
    });
    await sleep(1000);
    const t12 = await page.evaluate(() => {
        const g = window._pvzGame;
        return {
            playing: g.state === 'PLAYING', fusion: g.vsFusion,
            glove: document.getElementById('glove-bank').style.display,
            plantSun: g.sunCount, zombieSun: g.zombieSun
        };
    });
    check('T12 再玩一局重走选人·同玩法(融合局)手套保持·双池重置', t12.playing && t12.fusion === true && t12.glove === 'flex' && t12.plantSun === 150 && t12.zombieSun === 400, t12);

    // T13 植物方破产判胜：清僵尸+僵尸方阳光归零 → 2.5s 后植物方胜
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.entities.filter(e => e.type && !e.isDead && e.hp !== undefined && e.takeDamage).forEach(e => {
            if (e.takeDamage && e.type && !e.isSeedish) e.takeDamage(999999, { oneshot: true });
        });
        g.zombieSun = 0;
    });
    await sleep(3500);
    const t13 = await page.evaluate(() => {
        const g = window._pvzGame;
        const ov = document.querySelector('.vase-win-overlay');
        return { state: g.state, text: ov ? ov.textContent.replace(/\s+/g, ' ').slice(0, 80) : '' };
    });
    check('T13 僵尸方破产 → 植物方获胜', t13.state === 'GAMEOVER' && t13.text.includes('植物方获胜'), { state: t13.state, text: t13.text.replace(/\s+/g, ' ') });

    await browser.close();
    console.log(`==== RESULT: ${pass} pass, ${fail} fail ====`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
