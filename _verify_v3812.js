// v3.81.2 双人对战：25 种僵尸全池 + 战力值脑子定价 + 返回主菜单按钮
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('PASS ' + n); } else { fail++; console.log('FAIL ' + n + ' ' + JSON.stringify(x)); } }
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
    await new Promise(r => setTimeout(r, 700));

    // T1 僵尸选卡：25 张全池
    await page.click('#btn-vs'); await page.click('#vs-normal');
    await new Promise(r => setTimeout(r, 250));
    await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
        ['sunflower','peashooter','wallnut','snowpea','repeater','potatomine','cherrybomb','chomper'].forEach(ty => {
            const c = cards.find(x => x.dataset.type === ty); if (c) c.click();
        });
        document.getElementById('btn-lets-rock').click();
    });
    await new Promise(r => setTimeout(r, 300));
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#vz-grid .vz-card')];
        const imgsOk = cards.every(c => { const i = c.querySelector('img'); return i.complete && i.naturalWidth > 0; });
        return { n: cards.length, imgsOk, brainCost: cards.every(c => c.querySelector('.vz-cost').textContent.startsWith('🧠')),
                 hasPower: cards.every(c => /战力 \d+/.test(c.querySelector('.vz-power').textContent)),
                 subtitle: document.querySelector('#vz-chooser div[style*="13px"]').textContent };
    });
    check('T1 僵尸池=25 种且卡面图全加载', t1.n === 25 && t1.imgsOk, t1);
    check('T1 卡面标脑子价🧠+战力值', t1.brainCost && t1.hasPower, t1);
    check('T1 副标题含 25 种/脑子说明', t1.subtitle.includes('25 种') && t1.subtitle.includes('脑子'), t1);

    // T2 战力=脑价 且单调（战力越高脑价越高，等于自身战力）
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        const roster = g.constructor.VS_ZOMBIE_ROSTER.map(([t, p]) => ({ t, p }));
        const costs = g.vsZombieCost();
        const equal = roster.every(r => costs[r.t] === r.p);
        const powers = roster.map(r => r.p);
        const sorted = [...powers].sort((a, b) => a - b);
        return { equal, n: roster.length, sortedSame: JSON.stringify(powers) === JSON.stringify(sorted),
                 types: roster.map(r => r.t) };
    });
    check('T2 脑价=战力值（25 种）', t2.equal && t2.n === 25, t2);
    check('T2 花名册含用户点名的 25 种', ['gargantuar','zomboni','football','buckethead','screendoor','dancing','backup','polevaulting','newspaper','conehead','flag','normal','imp','ironcone','madpaper','torchzombie','garliczombie','nuthead','tallnuthead','machinegunhead','snowpeahead','jalapenohead','peahead','sunhead','mysterybox'].every(t => t2.types.includes(t)), t2.types);

    // T3 返回主菜单按钮（僵尸选卡页）与砸罐子同款样式
    const t3 = await page.evaluate(() => {
        const b = document.getElementById('vz-menu');
        const ref = document.getElementById('diff-back');
        const bs = getComputedStyle(b), rs = getComputedStyle(ref);
        return { visible: b.style.display !== 'none', text: b.textContent,
                 sameFont: bs.fontFamily === rs.fontFamily && bs.background === rs.background };
    });
    check('T3 僵尸选卡页有同款「返回主菜单」', t3.visible && t3.text === '返回主菜单' && t3.sameFont, t3);
    await page.screenshot({ path: '_c1_vz25.png' });

    // T4 点它回主菜单
    await page.click('#vz-menu');
    await new Promise(r => setTimeout(r, 250));
    const t4 = await page.evaluate(() => ({
        menu: document.getElementById('start-menu').style.display,
        vz: document.getElementById('vz-chooser').style.display }));
    check('T4 返回主菜单生效', t4.menu === 'block' && t4.vz === 'none', t4);

    // T5 植物选卡页也有返回主菜单（且普通模式选卡页没有）
    await page.click('#btn-vs'); await page.click('#vs-fusion');
    await new Promise(r => setTimeout(r, 250));
    const t5 = await page.evaluate(() => {
        const b = document.getElementById('vs-plant-menu');
        const vis = b.style.display !== 'none';
        b.click();
        return { vis,
            menu: document.getElementById('start-menu').style.display,
            chooser: document.getElementById('seed-chooser').style.display };
    });
    check('T5 植物选卡页返回主菜单（融合局）', t5.vis && t5.menu === 'block' && t5.chooser === 'none', t5);

    // T6 普通经典模式选卡页：返回主菜单按钮隐藏
    const t6 = await page.evaluate(() => {
        const g = window._pvzGame;
        document.getElementById('btn-adventure').click();
        return document.getElementById('vs-plant-menu').style.display;
    });
    check('T6 经典模式选卡页无 VS 返回按钮', t6 === 'none', t6);
    await page.evaluate(() => { document.getElementById('btn-back').click(); });

    // T7 对局内：脑子货币 + 按战力扣费部署
    await page.click('#btn-vs'); await page.click('#vs-normal');
    await new Promise(r => setTimeout(r, 250));
    await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#chooser-grid .chooser-card')];
        ['sunflower','peashooter','wallnut','snowpea','repeater','potatomine','cherrybomb','chomper'].forEach(ty => {
            const c = cards.find(x => x.dataset.type === ty); if (c) c.click();
        });
        document.getElementById('btn-lets-rock').click();
    });
    await new Promise(r => setTimeout(r, 250));
    await page.evaluate(() => {
        const g = window._pvzGame;
        const cards = [...document.querySelectorAll('#vz-grid .vz-card')];
        ['sunhead','normal','conehead','imp','backup','flag','garliczombie','madpaper'].forEach(ty => {
            const c = cards.find(x => x.dataset.type === ty); if (c) c.click();
        });
        document.getElementById('vz-rock').click();
    });
    await new Promise(r => setTimeout(r, 1200));
    const t7 = await page.evaluate(() => {
        const g = window._pvzGame;
        const chip = document.getElementById('vs-zombie-sun');
        const brainIcon = chip.textContent.includes('🧠');
        const before = g.zombieSun;                 // 400
        g.deployZombie('gargantuar', 1);            // 战力 500 > 400 → 应拒绝
        const refused = g.zombieSun === before && !g.entities.some(e => e.type === 'gargantuar');
        g.zombieSun = 500;
        g.deployZombie('gargantuar', 2);            // 买巨人成功 → 扣 500
        const z = g.entities.find(e => e.type === 'gargantuar');
        return { brainIcon, refused, bought: !!z, after: g.zombieSun, paid: z && z._vsPaid };
    });
    check('T7 底栏货币=脑子🧠', t7.brainIcon, t7);
    check('T7 脑子不够买巨人被拒（400<500）', t7.refused, t7);
    check('T7 充值后买巨人成功·扣 500·_vsPaid=500', t7.bought && t7.after === 0 && t7.paid === 500, t7);

    // T8 植物打死巨人 → 植物方得 500 阳光
    const t8 = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = g.entities.find(e => e.type === 'gargantuar');
        const before = g.sunCount;
        z.takeDamage(99999, { oneshot: true });
        return { before };
    });
    await new Promise(r => setTimeout(r, 400));
    const t8b = await page.evaluate(() => window._pvzGame.sunCount);
    check('T8 击杀巨人植物方 +500', t8b === t8.before + 500, { before: t8.before, after: t8b });

    // T9 我是僵尸模式价目不受影响（deployZombie 走 zombiePrice）
    const t9 = await page.evaluate(() => {
        const g = window._pvzGame;
        return { izNormal: g.zombiePrice().normal, vsNormal: g.vsZombieCost().normal,
                 izGiant: g.zombiePrice().gargantuar, vsGiant: g.vsZombieCost().gargantuar,
                 hasFlag: typeof g.zombiePrice().flag };
    });
    check('T9 我是僵尸价目不变（normal50/giant300）且 VS 独立（normal50/giant500）', t9.izNormal === 50 && t9.izGiant === 300 && t9.vsNormal === 50 && t9.vsGiant === 500, t9);

    await browser.close();
    console.log(`==== RESULT: ${pass} pass, ${fail} fail ====`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
