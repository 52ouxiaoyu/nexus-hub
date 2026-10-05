// v3.80.3 验证：掉落物系统+五株掉落融合删除 / 砸罐子普通罐出融合植物 / 冰冻根因修复
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log('PASS ' + name); }
    else { fail++; console.log('FAIL ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR:', e.message); });
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // ===== T1 掉落物系统删除 =====
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        return {
            dropLoot: typeof window.PVZ_DROP_LOOT,
            dropFusion: typeof window.PVZ_DROP_FUSION,
            dropFn: typeof g._dropZombieLoot,
            groundItems: typeof g.groundItems,
            extraHasDrop: (window.PVZ_FUSION_EXTRA || []).some(f =>
                ['fusion_cone_peashooter','fusion_bucket_peashooter','fusion_flag_sunflower','fusion_door_wallnut','fusion_paper_fume'].includes(f.type))
        };
    });
    check('T1 掉落物表/方法/字段全部移除', t1.dropLoot === 'undefined' && t1.dropFusion === 'undefined'
        && t1.dropFn === 'undefined' && t1.groundItems === 'undefined' && !t1.extraHasDrop, t1);

    // ===== T2 砸罐子普通罐池含全部融合植物 =====
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        const pool = g._vasePermPool();
        return {
            size: pool.length,
            hasQuadsun: pool.includes('fusion_quadsun'),
            fusionCount: pool.filter(t => t.startsWith('fusion_')).length,
            dup: pool.length !== new Set(pool).size,
            noDrop: !pool.some(t => ['fusion_cone_peashooter','fusion_bucket_peashooter','fusion_flag_sunflower','fusion_door_wallnut','fusion_paper_fume'].includes(t))
        };
    });
    check('T2a 普通罐池含四头向日葵等融合植物', t2.hasQuadsun && t2.fusionCount >= 30, t2);
    check('T2b 池无重复且不含已删掉落株', !t2.dup && t2.noDrop, t2);

    // T2c 全池植物都能实例化（探针构造不报错）
    const t2c = await page.evaluate(() => {
        const g = window._pvzGame;
        const bad = [];
        for (const t of g._vasePermPool()) {
            try {
                const p = new Plant(g, t);
                if (p.element && p.element.parentNode) p.element.parentNode.removeChild(p.element);
                if (p.fusionOverlay && p.fusionOverlay.parentNode) p.fusionOverlay.parentNode.removeChild(p.fusionOverlay);
            } catch (e) { bad.push(t + ':' + e.message); }
        }
        return bad;
    });
    check('T2c 全池植物可实例化无异常', t2c.length === 0, t2c);

    // ===== T3 实战抽样：400 次植物罐掷取出现融合株，且能种下 =====
    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        let fusionHits = 0;
        const seen = new Set();
        for (let i = 0; i < 400; i++) {
            const t = g._rollVasePlantContent('plant');
            seen.add(t);
            if (t.startsWith('fusion_')) fusionHits++;
        }
        return { fusionHits, uniq: seen.size };
    });
    check('T3 400 次植物罐掷取融合株出现约一半', t3.fusionHits > 100, t3);

    // ===== T4 冰冻根因修复 =====
    const t4 = await page.evaluate(() => {
        const g = window._pvzGame;
        // 场景1：减速后火豌豆命中 → 减速保留
        const z1 = new Zombie(g, 0, 'normal'); z1.x = 300; g.entities.push(z1);
        z1.setSlow(10);
        z1.thawFreeze(); // 模拟火豆命中（新版行为）
        const s1 = { slowed: z1.isSlowed, timer: z1.slowTimer };
        // 场景2：绝对冰冻+减速后火豆命中 → 冰冻解除但减速保留
        const z2 = new Zombie(g, 1, 'normal'); z2.x = 400; g.entities.push(z2);
        z2.freezeAbsolute(4); z2.setSlow(10);
        z2.thawFreeze();
        const s2 = { freeze: z2.freezeTimer, slowed: z2.isSlowed, timer: z2.slowTimer, spikeGone: !z2._iceSpikeEl };
        // 场景3：旧 thaw() 仍应全清（辣椒等路径不受影响）
        const z3 = new Zombie(g, 2, 'normal'); z3.x = 500; g.entities.push(z3);
        z3.setSlow(10); z3.thaw();
        const s3 = { slowed: z3.isSlowed };
        [z1, z2, z3].forEach(z => { z.hp = 0; if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element); });
        g.entities.length = 0;
        return { s1, s2, s3 };
    });
    check('T4a 火豆命中后减速保留（根因修复）', t4.s1.slowed && t4.s1.timer > 9, t4.s1);
    check('T4b 绝对冰冻被火解除但减速保留', t4.s2.freeze === 0 && t4.s2.slowed && t4.s2.spikeGone, t4.s2);
    check('T4c 全解冻 thaw() 行为不变', t4.s3.slowed === false, t4.s3);

    // T4d 真实弹道：冰瓜命中 → 火豆命中 → 仍减速
    const t4d = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = new Zombie(g, 0, 'normal'); z.x = 400; g.entities.push(z);
        // 冰瓜直击
        z.takeDamage(20); z.setSlow(10);
        // 火豆直击（走 CollisionManager 同款分支逻辑：takeDamage + thawFreeze）
        z.takeDamage(40); z.thawFreeze();
        const r = { slowed: z.isSlowed, timer: +z.slowTimer.toFixed(1) };
        z.hp = 0; if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        g.entities.length = 0;
        return r;
    });
    check('T4d 冰瓜→火豆连击后仍减速', t4d.slowed, t4d);

    // ===== T5 砸罐子真实开局烟雾 + 开场提示 =====
    await page.evaluate(() => {
        window._anns = [];
        window._pvzGame.showAnnouncement = (t, c) => { window._anns.push(t); };
        const btns = [...document.querySelectorAll('button, .menu-btn, [id*=vase]')];
        const b = btns.find(e => (e.textContent || '').includes('砸罐子'));
        if (b) b.click(); else window._pvzGame._openVaseDifficulty();
    });
    await new Promise(r => setTimeout(r, 400));
    await page.click('#diff-hard');
    await new Promise(r => setTimeout(r, 2000));
    const t5 = await page.evaluate(() => ({ anns: window._anns, vases: window._pvzGame.vases.length, state: window._pvzGame.state }));
    check('T5 砸罐子开局正常（提示+罐数+状态）', t5.anns.length >= 1 && t5.vases > 0 && t5.state === 'PLAYING', t5);

    // ===== T6 源码断言：配方书/图鉴无掉落株残留 =====
    const fs = require('fs');
    const hgSrc = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
    check('T6 图鉴无掉落物文案残留', !hgSrc.includes('路障豌豆') && !hgSrc.includes('狂暴大喷菇') && !hgSrc.includes('防具掉落'));

    check('全程无页面 JS 错误', errors.length === 0, errors);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c1_v3803_vase.png' });

    await browser.close();
    console.log(`\n==== RESULT: ${pass} pass, ${fail} fail ====`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
