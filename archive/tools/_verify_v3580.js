// v3.58.0 验证：融合模式难度×2（间隔衰减加倍+下限2.5s）+ 后期(≥420s)尸潮 18~24 只 + 横幅；经典模式不受影响
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
    await page.goto('file://' + path.join('/Users/clawbox/nexus-hub/pvz-web', 'index.html'), { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    let pass = 0, fail = 0;
    const ok = (name, cond, detail) => {
        console.log((cond ? '  ✅' : '  ❌') + ' ' + name + '  ' + (detail || ''));
        cond ? pass++ : fail++;
    };

    const t = await page.evaluate(() => {
        const g = window._pvzGame;
        g.vaseMode = false; g.zombieMode = false;
        const wm = g.waveManager;
        const countZ = () => g.entities.filter(e => e instanceof Zombie && !e.isDead).length;
        const cleanup = () => {
            g.entities.filter(e => e instanceof Zombie).forEach(z => { try { z.element && z.element.remove(); } catch (e) {} });
            g.entities = g.entities.filter(e => !(e instanceof Zombie));
        };
        const out = {};

        // T1 融合·前期：一次只上 1 只，间隔衰减 -1.0
        g.fusionMode = true;
        wm.reset();
        wm.timeElapsed = 100; wm.nextSpawnTime = 100;
        const b1 = countZ(); wm.update(0.1);
        out.earlyBatch = countZ() - b1;
        out.earlyIntervalAfter1 = +wm.spawnInterval.toFixed(1); // 20-1=19
        cleanup();

        // T2 融合·间隔下限 2.5：狂刷直到 interval 稳定
        wm.spawnInterval = 2.6;
        for (let i = 0; i < 5; i++) { wm.nextSpawnTime = wm.timeElapsed; wm.update(0.1); }
        out.fusionFloor = +wm.spawnInterval.toFixed(1);
        cleanup();

        // T3 融合·后期(430s)：一波 18~24 只 + 横幅
        wm.reset();
        wm.timeElapsed = 430; wm.nextSpawnTime = 430;
        const b2 = countZ(); wm.update(0.1);
        out.lateBatch = countZ() - b2;
        out.lateNextGap = +(wm.nextSpawnTime - 430).toFixed(1); // ≥10
        out.banner = !!Array.from(g.container.children).find(el => (el.textContent || '').indexOf('一大波僵尸正在接近') >= 0);
        cleanup();

        // T4 融合·后期波间隔下限 10s：连续触发两波
        wm.spawnInterval = 2.5;
        wm.nextSpawnTime = wm.timeElapsed; wm.update(0.1);
        out.waveGap = +(wm.nextSpawnTime - wm.timeElapsed).toFixed(1); // 应=10
        cleanup();

        // T5 经典模式不受影响：单只 + 下限 5
        g.fusionMode = false;
        wm.reset();
        wm.timeElapsed = 500; wm.nextSpawnTime = 500;
        const b3 = countZ(); wm.update(0.1);
        out.classicBatch = countZ() - b3;
        out.classicIntervalAfter1 = +wm.spawnInterval.toFixed(1); // 20-0.5=19.5
        wm.spawnInterval = 5.1;
        for (let i = 0; i < 5; i++) { wm.nextSpawnTime = wm.timeElapsed; wm.update(0.1); }
        out.classicFloor = +wm.spawnInterval.toFixed(1);
        cleanup();

        // T6 经典模式后期也不出尸潮（500s 一次仍 1 只）
        wm.reset();
        wm.timeElapsed = 600; wm.nextSpawnTime = 600;
        const b4 = countZ(); wm.update(0.1);
        out.classicLateBatch = countZ() - b4;
        cleanup();
        return out;
    });

    ok('T1 融合前期一次 1 只', t.earlyBatch === 1, JSON.stringify(t));
    ok('T1 融合间隔衰减 -1.0（19.0）', t.earlyIntervalAfter1 === 19);
    ok('T2 融合间隔下限 2.5', t.fusionFloor === 2.5);
    ok('T3 融合后期一波 18~24 只', t.lateBatch >= 18 && t.lateBatch <= 24, 'batch=' + t.lateBatch);
    ok('T3 尸潮横幅出现', t.banner);
    ok('T3 波后 nextSpawnTime 间隔 ≥10', t.lateNextGap >= 10);
    ok('T4 波间隔下限 10s', t.waveGap === 10);
    ok('T5 经典一次 1 只、衰减 -0.5（19.5）', t.classicBatch === 1 && t.classicIntervalAfter1 === 19.5);
    ok('T5 经典下限仍 5', t.classicFloor === 5);
    ok('T6 经典后期无尸潮', t.classicLateBatch === 1);

    console.log('\n页面内结果: ' + pass + ' 过 / ' + fail + ' 挂');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
