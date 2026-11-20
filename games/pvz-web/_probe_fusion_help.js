// 探测：植物图鉴「融合」区条目 vs 配方大全条目 vs 实际可合成 fusion 类型
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1600));

    const out = await p.evaluate(() => {
        // 打开说明面板
        const btn = document.getElementById('btn-help-guide');
        btn && btn.click();
        const tab = document.querySelector('.hg-tab[data-tab="plants"]');
        tab && tab.click();
        const body = document.getElementById('help-body');
        // 按 hg-grid 分块：第一个 grid=经典，第二个=融合
        const grids = body.querySelectorAll('.hg-grid');
        const names = i => [...(grids[i] ? grids[i].querySelectorAll('.hg-plant-name, .hg-pname, .hg-card-name, [data-name]') : [])].map(e => e.textContent.trim());
        // 兜底：直接取 grid 里所有文本首行
        const raw = i => grids[i] ? [...grids[i].children].map(c => (c.querySelector('span,div') ? c.querySelector('span,div').textContent.trim() : c.textContent.trim())) : [];
        return {
            gridCount: grids.length,
            classicN: grids[0] ? grids[0].children.length : 0,
            fusionN: grids[1] ? grids[1].children.length : 0,
            fusionNames: raw(1),
            tabText: [...document.querySelectorAll('.hg-tab')].map(t => t.textContent),
            // 实际融合定义
            fusionTypes: Object.keys(window.PVZ_FUSION_LOOK || {}),
            extraNames: (window.PVZ_FUSION_EXTRA || []).map(f => f.name + ' <- ' + f.a + '+' + f.b),
        };
    });
    console.log('=== 标签 ===\n' + out.tabText.join(' | '));
    console.log('=== grid 数 ' + out.gridCount + ' 经典 ' + out.classicN + ' 融合 ' + out.fusionN + ' ===');
    console.log('=== 融合区条目 ===\n' + out.fusionNames.join(' / '));
    console.log('=== FUSION_EXTRA ' + out.extraNames.length + ' 条 ===\n' + out.extraNames.join('\n'));
    console.log('=== 报错 ===', errs.length ? errs.slice(0, 3) : 'none');
    await b.close();
})();
