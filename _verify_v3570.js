// v3.57.0 验证：删三融合 + 阳光小喷菇产阳光上调 + 忧郁蒜雾改色
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 760 });
    const url = 'file://' + path.join('/Users/clawbox/nexus-hub/pvz-web', 'index.html');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));

    let pass = 0, fail = 0;
    const ok = (name, cond, detail) => {
        console.log((cond ? '  ✅' : '  ❌') + ' ' + name + '  ' + (detail || ''));
        cond ? pass++ : fail++;
    };

    // T1 配方表：三个被删类型不存在
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        const types = (window.PVZ_FUSION_EXTRA || []).map(f => f.type);
        return {
            fumIce: types.includes('fusion_fumeshroom_iceshroom'),
            doomIce: types.includes('fusion_doomshroom_iceshroom'),
            pumpTall: types.includes('fusion_pumpkinhead_tallnut'),
            total: types.length
        };
    });
    ok('T1a 冰雾大喷菇从配方表移除', !t1.fumIce, JSON.stringify(t1));
    ok('T1b 冰毁灭菇从配方表移除', !t1.doomIce);
    ok('T1c 南瓜高坚果从配方表移除', !t1.pumpTall);

    // T2 组合不再融合出被删株（手套路径）
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        const probe = (arr) => {
            try { return g.getFusionResult(arr) || null; } catch (e) { return 'ERR:' + e.message; }
        };
        return {
            fumIce: probe(['fumeshroom', 'iceshroom']),
            doomIce: probe(['doomshroom', 'iceshroom']),
            pumpTall: probe(['pumpkinhead', 'tallnut'])
        };
    });
    const noneOf = v => v === null || (typeof v === 'string' && v.indexOf('fumeshroom_iceshroom') < 0 && v.indexOf('doomshroom_iceshroom') < 0 && v.indexOf('pumpkinhead_tallnut') < 0);
    ok('T2 大喷菇+寒冰菇不再出冰雾', noneOf(t2.fumIce), JSON.stringify(t2));
    ok('T2 毁灭菇+寒冰菇不再出冰毁灭', noneOf(t2.doomIce));
    ok('T2 南瓜壳+高坚果不再出南瓜高坚果', noneOf(t2.pumpTall));

    // T3 魅惑向日葵/忧郁蒜雾仍在（防误删复核）
    const t3 = await page.evaluate(() => {
        const types = (window.PVZ_FUSION_EXTRA || []).map(f => f.type);
        return { hypnoSun: types.includes('fusion_hypnoshroom_sunflower'), gloomGarlic: types.includes('fusion_gloomshroom_garlic') };
    });
    ok('T3 魅惑向日葵仍在配方表', t3.hypnoSun, JSON.stringify(t3));
    ok('T3 忧郁蒜雾仍在配方表', t3.gloomGarlic);

    // T4 忧郁蒜雾改金黄色（与紫红忧郁菇区分）
    const t4 = await page.evaluate(() => {
        const look = (window.PVZ_FUSION_LOOK || {})['fusion_gloomshroom_garlic'] || {};
        return { bf: look.bf || '' };
    });
    ok('T4 忧郁蒜雾滤镜=金黄蒜色（sepia .85）', /sepia\(\.85\)/.test(t4.bf), JSON.stringify(t4));

    // T5 阳光小喷菇产阳光 25/40（小粒/成熟）
    const t5 = await page.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = true;
        const plant = new Plant(g, 'fusion_sunshroom_puffshroom');
        g.entities.push(plant);
        const readLatestSun = () => {
            const suns = g.entities.filter(e => e.value !== undefined && typeof e.value === 'number');
            return suns.length ? suns[suns.length - 1].value : null;
        };
        plant.sunTimer = 999;
        plant.update(0.1);
        const immature = readLatestSun();
        plant.growthStage = 3; plant.growthTimer = 70;
        plant.sunTimer = 999;
        plant.update(0.1);
        const mature = readLatestSun();
        plant.isDead = true; plant.element && plant.element.remove();
        return { immature, mature };
    });
    ok('T5 阳光小喷菇小粒=25', t5.immature === 25, JSON.stringify(t5));
    ok('T5 阳光小喷菇成熟=40', t5.mature === 40);

    // T6 原版阳光菇不受影响（15/25）
    const t6 = await page.evaluate(() => {
        const g = window._pvzGame;
        const plant = new Plant(g, 'sunshroom');
        g.entities.push(plant);
        const readLatestSun = () => {
            const suns = g.entities.filter(e => e.value !== undefined && typeof e.value === 'number');
            return suns.length ? suns[suns.length - 1].value : null;
        };
        plant.sunTimer = 999; plant.update(0.1);
        const v1 = readLatestSun();
        plant.growthStage = 3; plant.growthTimer = 70; plant.sunTimer = 999; plant.update(0.1);
        const v2 = readLatestSun();
        plant.isDead = true; plant.element && plant.element.remove();
        return { immature: v1, mature: v2 };
    });
    ok('T6 原版阳光菇 15/25 不变', t6.immature === 15 && t6.mature === 25, JSON.stringify(t6));

    console.log('\n页面内结果: ' + pass + ' 过 / ' + fail + ' 挂');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
