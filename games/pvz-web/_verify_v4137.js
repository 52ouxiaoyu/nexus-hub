// v4.0.137 验证：僵尸图鉴删「巨人僵尸王」+ 融合僵尸组 22 条 + 图片全加载
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
    if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ✗ FAIL ' + name + (extra ? '  [' + extra + ']' : '')); }
};

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('response', r => { if (r.status() === 404) errs.push('404 ' + r.url()); });
    await page.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1600));

    // 打开说明面板 → 僵尸图鉴
    await page.evaluate(() => document.getElementById('btn-help-guide').click());
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => document.querySelector('.hg-tab[data-tab="zombies"]').click());
    await new Promise(r => setTimeout(r, 1400));

    const info = await page.evaluate(() => {
        const body = document.getElementById('help-body');
        const txt = body.innerText;
        const groups = [...body.querySelectorAll('.hg-group')].map(g => g.innerText.trim());
        const grids = [...body.querySelectorAll('.hg-grid')];
        // 融合组 = 标题里含「融合僵尸」的那一格
        let fuseIdx = -1;
        [...body.children].forEach((c, i) => { if (c.classList.contains('hg-group') && /融合僵尸/.test(c.innerText)) fuseIdx = i; });
        const fuseGrid = fuseIdx >= 0 ? body.children[fuseIdx + 1] : null;
        const tiles = fuseGrid ? [...fuseGrid.children] : [];
        const imgs = tiles.map(t => {
            const im = t.querySelector('img');
            return im ? { src: im.getAttribute('src') || '', w: im.naturalWidth, h: im.naturalHeight } : null;
        });
        const bad = imgs.filter(x => !x || !x.w).length;
        const names = tiles.map(t => (t.innerText || '').split('\n')[0].trim());
        return {
            tabText: [...document.querySelectorAll('.hg-tab')].map(t => t.textContent),
            groups, fuseCount: tiles.length, fuseNames: names, badImgs: bad,
            hasWang: /巨人僵尸王/.test(txt),
            hasGargantuar: (txt.match(/巨人僵尸/g) || []).length,
            classGroupCount: (() => {
                const g = body.children[0];
                return g ? 'ok' : 'no';
            })(),
            tip: (body.querySelector('.hg-tip') || {}).innerText || '',
            fuseTips: [...body.querySelectorAll('.hg-tip')].slice(-2).map(e => e.innerText.slice(0, 40)),
        };
    });

    console.log('=== 标签 ===', info.tabText.join(' | '));
    console.log('=== 分组 ===', info.groups.join(' / '));
    ok(!info.hasWang, '① 僵尸图鉴已无「巨人僵尸王」');
    ok(info.hasGargantuar >= 1, '② 巨人僵尸（本体）仍在', '出现 ' + info.hasGargantuar + ' 次');
    ok(info.fuseCount === 22, '③ 「融合僵尸」组 22 条', '实际 ' + info.fuseCount);
    ok(info.badImgs === 0, '④ 融合组 22 张图全部加载成功', '缺失 ' + info.badImgs);
    ok(/泰坦冰车/.test(info.fuseNames.join()), '⑤ 含泰坦冰车');
    ok(/铁甲路障/.test(info.fuseNames.join()), '⑥ 含铁甲路障（原双盔僵尸）');
    ok(/双子僵尸/.test(info.fuseNames.join()) && /太阳僵尸/.test(info.fuseNames.join()), '⑦ 含双子僵尸 / 太阳僵尸');
    ok(/火把僵尸/.test(info.fuseNames.join()) && /大蒜僵尸/.test(info.fuseNames.join()), '⑧ 火把 / 大蒜僵尸仍在');
    ok(/融合炉/.test(info.tip) || info.fuseTips.some(t => /融合炉/.test(t)), '⑨ 融合组带了「融合炉」说明', info.fuseTips.join(' | ').slice(0, 60));

    // 详情弹层：点第一张（泰坦冰车）看能否正常打开
    const det = await page.evaluate(() => {
        const body = document.getElementById('help-body');
        let fuseIdx = -1;
        [...body.children].forEach((c, i) => { if (c.classList.contains('hg-group') && /融合僵尸/.test(c.innerText)) fuseIdx = i; });
        const grid = body.children[fuseIdx + 1];
        grid.children[0].click();
        return new Promise(r => setTimeout(() => {
            const d = document.getElementById('hg-detail');
            r({ vis: d && getComputedStyle(d).display !== 'none', txt: d ? d.innerText.slice(0, 120) : '' });
        }, 500));
    });
    ok(det.vis && /泰坦冰车/.test(det.txt), '⑩ 点击融合僵尸能打开详情', det.txt.replace(/\n/g, ' ').slice(0, 60));

    // 玩法说明里的《我是僵尸》融合炉条目
    await page.evaluate(() => document.querySelector('.hg-tab[data-tab="modes"]').click());
    await new Promise(r => setTimeout(r, 600));
    const modeTxt = await page.evaluate(() => document.getElementById('help-body').innerText);
    ok(/融合炉（20 种）/.test(modeTxt), '⑪ 玩法说明《我是僵尸》已补融合炉用法');
    ok(/铁甲路障/.test(modeTxt), '⑫ 融合炉举例含铁甲路障');

    const ce = errs.filter(e => !/favicon|Failed to load resource/.test(e));
    ok(ce.length === 0, '⑬ 全程无 JS 报错', ce.slice(0, 2).join(' | '));

    // 截图（先关掉详情层，否则挡住整组）
    await page.evaluate(() => { const d = document.getElementById('hg-detail'); if (d) d.style.display = 'none'; });
    await page.evaluate(() => document.querySelector('.hg-tab[data-tab="zombies"]').click());
    await new Promise(r => setTimeout(r, 1200));
    await page.evaluate(() => {
        const body = document.getElementById('help-body');
        let i = -1;
        [...body.children].forEach((c, k) => { if (c.classList.contains('hg-group') && /融合僵尸/.test(c.innerText)) i = k; });
        if (i >= 0) body.children[i].scrollIntoView({ block: 'start' });
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4137_fuse_zombies.png' });

    console.log('\n通过 ' + pass + ' / 失败 ' + fail);
    await b.close();
    process.exit(fail ? 1 : 0);
})();
