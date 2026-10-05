// v3.55.0 砸罐子锤子光标验证：只在罐子上出现 + 2x 放大 + 种植后不再消失
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, detail) {
    if (cond) { pass++; console.log(`  ✅ ${name}${detail ? '  ' + detail : ''}`); }
    else { fail++; console.log(`  ❌ ${name}${detail ? '  ' + detail : ''}`); }
}
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--window-size=1280,760']
    });
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 760 });
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(800);
    // 真实菜单进砸罐子（简单）
    await p.click('#btn-vase');
    await sleep(900);
    await p.evaluate(() => {
        const easy = [...document.querySelectorAll('*')].find(b => b.children.length === 0 && /^简单/.test((b.textContent || '').trim()));
        ((easy && easy.closest('div[class*=card],div,button')) || easy).click();
    });
    await sleep(1400);
    await p.evaluate(() => { const r = document.getElementById('btn-lets-rock'); if (r) r.click(); });
    await sleep(1600);

    // T1 初始光标不是锤子
    const t1 = await p.evaluate(() => window._pvzGame.container.style.cursor || '(empty)');
    ok('T1 初始光标非锤子', !t1.includes('data:image'), t1);

    // T2 锤子数据已生成且为 2x（60×68）
    const t2 = await p.evaluate(() => new Promise(res => {
        const g = window._pvzGame;
        const wait = () => g._vaseHammerData
            ? (() => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight, hx: g._vaseHammerData.hx }); im.src = g._vaseHammerData.url; })()
            : setTimeout(wait, 100);
        wait();
    }));
    ok('T2 锤子光标 2x 放大', t2.w === 60 && t2.h === 68 && t2.hx === 6, JSON.stringify(t2));

    // 取一株未砸罐子与一块无罐草地的页面坐标
    const spots = await p.evaluate(() => {
        const g = window._pvzGame;
        const v = g.vases.find(v => !v.smashed);
        const vr = v.element.getBoundingClientRect();
        // 找一块没有罐子也没有植物的格子（col 0 列前两行肯定没罐子？稳妥起见遍历）
        for (let row = 0; row < 5; row++) for (let col = 0; col < 9; col++) {
            const hasVase = g.vases.some(x => !x.smashed && x.row === row && x.col === col);
            const hasPlant = g.board.grid[row][col];
            if (!hasVase && !hasPlant) {
                const x = g.board.offsetX + col * g.board.cellWidth + g.board.cellWidth / 2;
                const y = g.board.offsetY + row * g.board.cellHeight + g.board.cellHeight / 2 + 20;
                const rect = g.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                return { vase: { x: vr.left + vr.width / 2, y: vr.top + vr.height / 2 },
                         empty: { x: rect.left + x * scale, y: rect.top + y * scale } };
            }
        }
        return null;
    });
    if (!spots) { console.log('  ❌ 找不到测试摆位'); process.exit(2); }

    // T3 悬停罐子 → 锤子光标
    await p.mouse.move(spots.vase.x, spots.vase.y);
    await sleep(150);
    const t3 = await p.evaluate(() => window._pvzGame.container.style.cursor);
    ok('T3 悬停罐子=锤子光标', t3.startsWith('url("data:image'), t3.slice(0, 40) + '...');

    // T4 移开到空草地 → 恢复 default
    await p.mouse.move(spots.empty.x, spots.empty.y);
    await sleep(150);
    const t4 = await p.evaluate(() => window._pvzGame.container.style.cursor);
    ok('T4 移开罐子=default', t4 === 'default', t4);

    // T5 用户场景复现：买路灯花→点免费卡→种植→再悬停罐子，锤子必须回归
    await p.evaluate(() => { window._pvzGame.sunCount = 200; document.getElementById('sun-counter') && (document.getElementById('sun-counter').innerText = '200'); });
    const shop = await p.$('.plantern-shop-card');
    if (shop) { const b = await shop.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(400); }
    const free = await p.$('.vase-free-card');
    ok('T5a 商店购买出免费卡', !!free);
    if (free) {
        const b = await free.boundingBox();
        // 种植正规交互是拖拽：按住卡拖到草地松手（点选会被 container mouseup 立即清选）
        await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await p.mouse.down();
        await p.mouse.move(spots.empty.x, spots.empty.y, { steps: 8 });
        await p.mouse.up();
        await sleep(400);
        const planted = await p.evaluate(() => {
            const g = window._pvzGame;
            return g.board.grid.flat().some(pl => pl && pl.type === 'plantern');
        });
        ok('T5b 路灯花已种植', planted);
        // 种植后再悬停罐子：锤子必须出现（修复点）
        await p.mouse.move(spots.vase.x, spots.vase.y);
        await sleep(150);
        const cur = await p.evaluate(() => window._pvzGame.container.style.cursor);
        ok('T5c 种植后悬停罐子锤子回归', cur.startsWith('url("data:image'), cur.slice(0, 40) + '...');
    }

    console.log(`\n结果: ${pass} 过 / ${fail} 挂`);
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
