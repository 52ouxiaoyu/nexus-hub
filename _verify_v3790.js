// v3.79.0 验证：吃脑淡出退场 / 大蒜植物头式 / 双盔叠桶 / 疯狂读报狂暴相 / 火把在手 / 图鉴改动
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const results = [];
function check(name, cond, extra) {
    results.push({ name, ok: !!cond, extra: extra === undefined ? '' : String(extra) });
    console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra !== undefined ? ' | ' + extra : ''));
}
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // ===== T6 图鉴：掉落物组已删 + 融合僵尸组新外观（主菜单状态下先做）=====
    await page.click('#btn-help-guide');
    await page.waitForFunction('document.getElementById("help-modal").style.display === "flex"', { timeout: 15000 });
    await page.click('.hg-tab[data-tab=zombies]');
    await new Promise(r => setTimeout(r, 600));
    const t6 = await page.evaluate(() => {
        const names = [...document.querySelectorAll('.hg-tile .hg-tname')].map(x => x.textContent);
        const dropNames = ['路障', '铁桶', '旗帜', '铁门', '报纸'].filter(n => names.includes(n));
        const fusion4 = ['双盔僵尸', '疯狂读报僵尸', '火把僵尸', '大蒜僵尸'].every(n => names.includes(n));
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const tileByName = (n) => tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === n);
        const dk = tileByName('双盔僵尸');
        const dkBody = dk ? (dk.querySelector('.hg-art img') || {}).src || '' : '';
        const dkAcc = dk ? !!dk.querySelector('.hg-art div[style*="overflow"]') : false;
        const mp = tileByName('疯狂读报僵尸');
        const mpImg = mp ? ((mp.querySelector('.hg-art img') || {}).src || '') : '';
        const gr = tileByName('大蒜僵尸');
        const grHead = gr ? !!gr.querySelector('.hg-zhead') : false;
        const grHeadImg = gr && gr.querySelector('.hg-zhead img') ? gr.querySelector('.hg-zhead img').src : '';
        return { dropNames, fusion4, dkBody, dkAcc, mpImg, grHead, grHeadImg };
    });
    check('T6a 图鉴已无掉落物五件（组已删），融合僵尸四只在', t6.dropNames.length === 0 && t6.fusion4, JSON.stringify(t6.dropNames));
    // 图鉴缩略图是 canvas 转 base64（src 无文件名），外观配置改为源码断言 + DOM 结构断言
    const fs = require('fs');
    const hgSrc = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/HelpGuide.js', 'utf8');
    const srcOK = hgSrc.includes("img: ZB + 'BucketheadZombie/BucketheadZombie.gif'") &&
                  hgSrc.includes("img: ZB + 'NewspaperZombie/LostNewspaper.gif'") &&
                  /大蒜僵尸.*?head: \{ src: PL \+ 'Garlic\/Garlic\.gif'/s.test(hgSrc);
    check('T6b 双盔=铁桶底图+叠桶挂件；疯狂读报=狂暴相；大蒜=头顶大蒜头（源码+DOM 结构）',
        srcOK && t6.dkAcc && t6.grHead, JSON.stringify({ srcOK, dkAcc: t6.dkAcc, grHead: t6.grHead }));
    // 截图：滚到融合僵尸组拍图鉴
    await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.hg-tile')];
        const dk = tiles.find(x => x.querySelector('.hg-tname') && x.querySelector('.hg-tname').textContent === '双盔僵尸');
        if (dk) dk.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_shot_v3790_codex.png' });
    await page.evaluate(() => { document.getElementById('help-modal').style.display = 'none'; });

    // ===== T1 吃脑淡出退场（真实我是僵尸对局）=====
    await page.evaluate(() => { window._pvzGame._beginZombieGame(); });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.entities = g.entities.filter(e => {
            const isZ = typeof Zombie !== 'undefined' && e instanceof Zombie;
            if (isZ) { g._removeEntityDom(e); return false; }
            return true;
        });
        const z = new Zombie(g, 1, 'nuthead');
        z.x = 100; g.entities.push(z);
        window._t1z = z;
        g.zombieEatBrain(1, z);
    });
    const t1mid = await page.evaluate(() => {
        const g = window._pvzGame, z = window._t1z;
        return { stillListed: g.entities.includes(z), state: z.state, headOpacity: z.headEl ? z.headEl.style.opacity : 'gone', headInDom: !!(z.headEl && z.headEl.isConnected) };
    });
    check('T1a 吃脑后进入淡出（未瞬间消失，head 开始淡出）', t1mid.state === 'DYING' && (t1mid.headOpacity === '0' || t1mid.headInDom === false), JSON.stringify(t1mid));
    await new Promise(r => setTimeout(r, 700));
    const t1end = await page.evaluate(() => {
        const g = window._pvzGame, z = window._t1z;
        return { removed: !g.entities.includes(z), headInDom: !!(z.headEl && z.headEl.isConnected), bodyInDom: !!(z.element && z.element.isConnected) };
    });
    check('T1b 淡出后实体+头+本体全部回收（无残留）', t1end.removed && !t1end.headInDom && !t1end.bodyInDom, JSON.stringify(t1end));

    // ===== T2~T5 单元（非僵尸模式，数值不放大）=====
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.state = 'PLAYING'; g.zombieMode = false;
        g.entities.length = 0;
        const mk = (t) => { const z = new Zombie(g, 1, t); z.x = 400; g.entities.push(z); return z; };
        window._t2g = mk('garliczombie');
        window._t3i = mk('ironcone');
        window._t4m = mk('madpaper');
        window._t5t = mk('torchzombie');
    });
    const t2 = await page.evaluate(() => {
        const z = window._t2g;
        const headImg = z.headEl && z.headEl.querySelector('img');
        return { hideBody: z.hideBody, bodyDisplay: z.element.style.display, hasHead: !!z.headEl,
                 headSrc: headImg ? headImg.src : '', hasAcc: !!z._accEl };
    });
    check('T2a 大蒜僵尸=植物头式（身体隐藏+大蒜头+无胸前挂件）', t2.hideBody && t2.bodyDisplay === 'none' && t2.hasHead && t2.headSrc.includes('Garlic') && !t2.hasAcc, JSON.stringify(t2));
    const t2b = await page.evaluate(() => {
        const g = window._pvzGame, z = window._t2g;
        const row0 = z.row;
        for (let i = 0; i < 4; i++) z.takeDamage(10);
        return { row0, rowAfter: z.row, changed: z.row !== row0 };
    });
    check('T2b 大蒜僵尸 4 打换行机制保留', t2b.changed, JSON.stringify(t2b));

    const t3a = await page.evaluate(() => {
        const z = window._t3i;
        return { base: z.element.src, accW: z._accEl ? z._accEl.style.width : '', hasAcc: !!z._accEl, stage: z._ironStage };
    });
    check('T3a 双盔=铁桶底图+重叠铁桶帽（w=52px 同原桶等大）', t3a.base.includes('BucketheadZombie') && t3a.hasAcc && t3a.accW === '52px', JSON.stringify(t3a));
    const t3b = await page.evaluate(() => {
        const z = window._t3i;
        z.takeDamage(400); z.update(0.016); // armorHp 1500→1100 ≤1140 → 外层桶掉
        return { stage: z._ironStage, accGone: !z._accEl, base: z.element.src };
    });
    check('T3b 外层桶打掉：挂件摘除，底图仍是铁桶（还剩一顶桶）', t3b.stage === 1 && t3b.accGone && t3b.base.includes('BucketheadZombie'), JSON.stringify(t3b));
    const t3c = await page.evaluate(() => {
        const z = window._t3i;
        z.takeDamage(950); z.update(0.016); // armorHp 1100→150 ≤200 → 变普通
        return { type: z.type, base: z.element.src };
    });
    check('T3c 里层桶打掉：变普通僵尸', t3c.type === 'normal' && t3c.base.includes('Zombies/Zombie/Zombie.gif'), JSON.stringify(t3c));

    const t4a = await page.evaluate(() => {
        const z = window._t4m;
        return { walk: z.element.src, atk: z.attackSrc };
    });
    check('T4a 疯狂读报出场=无报纸狂暴相', t4a.walk.includes('LostNewspaper') && t4a.atk.includes('LostHeadAttack0'), JSON.stringify(t4a));
    const t4b = await page.evaluate(() => {
        const z = window._t4m;
        z.takeDamage(200); // armorHp 340→140 ≤150 狂暴
        return { speed: z.speed, walk: z.element.src };
    });
    check('T4b 狂暴加速且不换回报纸外观', t4b.speed === 45 && t4b.walk.includes('LostNewspaper'), JSON.stringify(t4b));

    const t5 = await page.evaluate(() => {
        const z = window._t5t;
        z.update(0.016); // 主循环每帧 _syncAcc —— 步进一帧让挂件跟上 x
        if (!z._accEl) return { has: false };
        const left = parseFloat(z._accEl.style.left), top = parseFloat(z._accEl.style.top);
        const expL = z.x - 6 - z._accEl.offsetWidth / 2;
        const expT = z.y + z.yOffset + 10 - z._accEl.offsetHeight / 2;
        return { has: true, left, top, expL, expT, dL: Math.abs(left - expL), dT: Math.abs(top - expT) };
    });
    check('T5 火把挂在手上（同锤子锚点 x-6, y+10）', t5.has && t5.dL < 1 && t5.dT < 1, JSON.stringify(t5));

    // ===== 截图：场上四只融合僵尸 + 大蒜/坚果头 =====
    await page.evaluate(() => {
        const g = window._pvzGame;
        g.entities = g.entities.filter(e => {
            if (typeof Plant !== 'undefined' && e instanceof Plant) { if (e.element && e.element.parentNode) e.element.remove(); return false; }
            if (typeof Zombie !== 'undefined' && e instanceof Zombie) { g._removeEntityDom(e); return false; }
            return true;
        });
        const types = ['ironcone', 'madpaper', 'torchzombie', 'garliczombie', 'nuthead'];
        types.forEach((tp, i) => {
            const z = new Zombie(g, i, tp);
            z.x = 280 + i * 140;
            g.entities.push(z);
            z.update(0.016);
        });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_shot_v3790_field.png' });

    await browser.close();
    const fails = results.filter(r => !r.ok).length;
    console.log(`\n==== ${results.length - fails}/${results.length} passed ====`);
    process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
