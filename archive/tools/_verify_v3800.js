// v3.80.0 验证：Boss巨血量1000+极后期低频刷出 / 砸罐子开场提示精简
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
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // ===== T1 砸罐子真实菜单（困难）：开场提示 =「困难砸罐子，场上只有 N 个罐子」=====
    await page.evaluate(() => {
        const g = window._pvzGame;
        window._anns = [];
        g.showAnnouncement = (t, c) => { window._anns.push(t); };
    });
    // 从主菜单点砸罐子 → 难度弹窗选困难（真实菜单链路）
    await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, .menu-btn, [id*=vase]')];
        const b = btns.find(e => (e.textContent || '').includes('砸罐子'));
        if (b) b.click(); else window._pvzGame._openVaseDifficulty();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.click('#diff-hard');
    await new Promise(r => setTimeout(r, 1500));
    const t1 = await page.evaluate(() => ({
        anns: window._anns,
        vaseMode: window._pvzGame.vaseMode,
        total: window._pvzGame.vases ? window._pvzGame.vases.length : 0
    }));
    const expectHard = `困难砸罐子，场上只有 ${t1.total} 个罐子`;
    check('T1 砸罐子开场提示精简为一句', t1.anns.length === 1 && t1.anns[0] === expectHard, { anns: t1.anns, expect: expectHard });
    check('T1b 困难局正常开局（vaseMode + 有罐子）', t1.vaseMode === true && t1.total > 0, t1.total);

    // ===== T2 lgboss 血量 1000 =====
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = new Zombie(g, 1, 'lgboss');
        const hp = z.hp, maxHp = z.maxHp;
        z.hp = 0; // 用完即弃，不进主循环
        if (z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
        return { hp, maxHp };
    });
    check('T2 lgboss 血量 1000', t2.hp === 1000 && t2.maxHp === 1000, t2);

    // ===== T3 刷出时机：700s 不出 Boss；1000s 低频出 =====
    const t3 = await page.evaluate(() => {
        const g = window._pvzGame;
        const wm = g.waveManager;
        const sample = (te, n) => {
            wm.timeElapsed = te;
            let boss = 0;
            const keep = g.entities.length;
            for (let i = 0; i < n; i++) {
                const before = g.entities.length;
                wm.spawnZombie();
                const last = g.entities[g.entities.length - 1];
                if (g.entities.length > before && last.type === 'lgboss') boss++;
                g.entities.length = before; // 回滚，避免堆积
            }
            g.entities.length = keep;
            return boss / n;
        };
        return { r700: sample(700, 4000), r1000: sample(1000, 4000), r1200: sample(1200, 4000) };
    });
    check('T3a 700s（旧版已解禁）Boss 概率=0', t3.r700 === 0, t3.r700);
    check('T3b 1000s Boss 低频出现（~2%）', t3.r1000 > 0.005 && t3.r1000 < 0.04, t3.r1000);
    check('T3c 1200s Boss 封顶 2% 不再升', t3.r1200 > 0.005 && t3.r1200 < 0.04, t3.r1200);

    // ===== T4 源码断言：图鉴 Boss 条目同步 =====
    const fs = require('fs');
    const hgSrc = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
    const bossOk = /巨尸 Boss'[\s\S]{0,80}hp: 1000/.test(hgSrc) && !hgSrc.includes('hp: 5000');
    check('T4 图鉴巨尸 Boss 条目 hp=1000 且无 5000 残留', bossOk);

    // 开场提示截图
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c1_vase_hint.png' });

    await browser.close();
    console.log(`\n==== RESULT: ${pass} pass, ${fail} fail ====`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
