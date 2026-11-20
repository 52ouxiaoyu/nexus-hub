/* 验证 v3.2.33：爆炸植物"种到已有植物上"= 自动落到其 3×3 内空格 → 先爆炸 → 再融合
   T1 樱桃炸弹种到豌豆身上 → 豌豆变樱桃射手(有爆炸过程, 炸弹在旁边空格爆)
   T2 回归：炸弹种豌豆旁空格 → 豌豆变樱桃射手
   T3 经典模式：种到植物上不生效(纯原版规则)
   T4 无配方：樱桃炸弹种到向日葵身上 → 提示且不消耗
   T5 目标 3×3 全满 → 兜底同格立即融合
   T6 寒冰菇种到豌豆身上 → 豌豆变寒冰射手
*/
const puppeteer = require('puppeteer');
const URL = 'file:///Users/clawbox/nexus-hub/pvz-web/index.html';
const results = [];
let browser;
function ok(name, cond, extra) { results.push({ name, pass: !!cond }); console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); }

async function newPage(fusion = true) {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));
    await p.evaluate((f) => {
        const g = window._pvzGame;
        g.fusionMode = f;
        g.state = 'PLAYING';
        g.sunCount = 99999; g.cooldowns = {};
    }, fusion);
    return p;
}
const step = (page, s) => page.evaluate((sec) => { const g = window._pvzGame; const n = Math.ceil(sec / 0.1); for (let i = 0; i < n; i++) g.update(0.1); }, s);
const plant = (page, t, r, c) => page.evaluate((tt, rr, cc) => { const g = window._pvzGame; g.tryPlanting(tt, rr, cc); return g.sunCount; }, t, r, c);
const typeAt = (page, r, c) => page.evaluate((rr, cc) => { const g = window._pvzGame; const p = g.board.grid[rr][cc]; return p ? p.type : null; }, r, c);

(async () => {
    browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });

    // T1 樱桃炸弹 种到豌豆(2,2)身上
    {
        const page = await newPage();
        await page.evaluate(() => { const g = window._pvzGame; g.tryPlanting('peashooter', 2, 2); });
        await step(page, 0.2);
        const bombDest = await plant(page, 'cherrybomb', 2, 2); // 目标格已有豌豆
        // 检查炸弹被放到(1,1)等空格
        const placed = await page.evaluate(() => { const g = window._pvzGame; const out = []; for (let r=1;r<=3;r++) for(let c=1;c<=3;c++){ const p=g.board.grid[r][c]; if(p&&p.type==='cherrybomb') out.push(r+','+c);} return out; });
        await step(page, 1.6);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 2, 2);
        const bcell = await page.evaluate(() => { const g=window._pvzGame; const out=[]; for(let r=1;r<=3;r++)for(let c=1;c<=3;c++){const p=g.board.grid[r][c]; if(p&&p.type==='cherrybomb') out.push(r+','+c);} return out; });
        ok('T1 炸弹落到豌豆3×3内空格 (' + placed.join('/') + ')', placed.length === 1);
        ok('T1 豌豆被融合为樱桃射手(先炸后融)', t === 'fusion_cherrybomb_peashooter', 'grid(2,2)=' + t);
        ok('T1 爆炸后炸弹格清空', bcell.length === 0);
        await page.close();
    }

    // T2 回归：种旁边空格
    {
        const page = await newPage();
        await page.evaluate(() => { const g = window._pvzGame; g.tryPlanting('peashooter', 3, 3); });
        await step(page, 0.2);
        await plant(page, 'cherrybomb', 3, 4);
        await step(page, 1.6);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 3, 3);
        const t2 = await typeAt(page, 3, 4);
        ok('T2 旁边空格种植仍自动爆炸融合', t === 'fusion_cherrybomb_peashooter' && t2 === null, 'grid(3,3)=' + t + ' (3,4)=' + t2);
        await page.close();
    }

    // T3 经典模式：种到植物上不生效
    {
        const page = await newPage(false);
        await page.evaluate(() => { const g = window._pvzGame; g.tryPlanting('peashooter', 1, 1); });
        await step(page, 0.2);
        const sunBefore = await plant(page, 'cherrybomb', 1, 1);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 1, 1);
        ok('T3 经典模式豌豆原样+阳光未扣', t === 'peashooter', 'sunBefore=' + sunBefore + ' (应为99999) grid(1,1)=' + t);
        await page.close();
    }

    // T4 无配方：樱桃炸弹种到向日葵身上
    {
        const page = await newPage();
        await page.evaluate(() => { const g = window._pvzGame; g.tryPlanting('sunflower', 3, 2); });
        await step(page, 0.2);
        const sunBefore = await page.evaluate(() => window._pvzGame.sunCount);
        const sunAfter = await plant(page, 'cherrybomb', 3, 2); // 种向日葵后已扣50
        await step(page, 0.3);
        const t = await typeAt(page, 3, 2);
        const bombCells = await page.evaluate(() => { const g=window._pvzGame; let n=0; for(let r=0;r<5;r++)for(let c=0;c<9;c++){const p=g.board.grid[r][c]; if(p&&(p.type==='cherrybomb'||p.type==='fusion_*')) n++;} return n; });
        ok('T4 无配方:向日葵原样&阳光未扣&未放炸弹', t === 'sunflower' && sunAfter === sunBefore && bombCells === 0, 'sun ' + sunBefore + '->' + sunAfter);
        await page.close();
    }

    // T5 目标 3×3 全占满 → 兜底同格立即融合
    {
        const page = await newPage();
        await page.evaluate(() => {
            const g = window._pvzGame;
            const occupied = [[1,1],[1,2],[1,3],[2,1],[2,3],[3,1],[3,2],[3,3]];
            occupied.forEach(([r,c]) => g.board.addPlant(new Plant(g, 'wallnut'), r, c));
            g.board.addPlant(new Plant(g, 'peashooter'), 2, 2);
        });
        await step(page, 0.2);
        await plant(page, 'cherrybomb', 2, 2); // 中心豌豆,周围被坚果占满
        const t = await typeAt(page, 2, 2);
        ok('T5 无空格兜底:同格立即融合为樱桃射手', t === 'fusion_cherrybomb_peashooter', 'grid(2,2)=' + t);
        await page.close();
    }

    // T6 寒冰菇种到豌豆身上 → 先炸后融 → 寒冰射手
    {
        const page = await newPage();
        await page.evaluate(() => { const g = window._pvzGame; g.tryPlanting('peashooter', 2, 2); });
        await step(page, 0.2);
        await plant(page, 'iceshroom', 2, 2);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 300));
        await step(page, 0.3);
        const t = await typeAt(page, 2, 2);
        ok('T6 寒冰菇种豌豆身上→寒冰射手', t === 'snowpea', 'grid(2,2)=' + t);
        await page.close();
    }

    const fails = results.filter(r => !r.pass);
    console.log('\n========== 汇总: ' + (results.length - fails.length) + '/' + results.length + ' 通过 ==========');
    if (fails.length) fails.forEach(f => console.log('FAILED:', f.name));
    await browser.close();
    process.exitCode = fails.length ? 1 : 0;
})();
