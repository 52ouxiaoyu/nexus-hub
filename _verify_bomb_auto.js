/* 验证：炸弹种下自动引爆 + 爆炸融合周围 3×3（v3.2.32）
   场景:
   S1  樱桃炸弹(1,2) + 豌豆(1,1) 相邻 → 豌豆变 樱桃射手, 炸弹消失
   S10 樱桃射手 5 秒后仍存活(不自动爆炸, 常驻)
   S2  樱桃炸弹(2,5) + 豌豆(1,4) 对角 → 融合
   S3  樱桃炸弹(1,5) + 豌豆(1,7) 距离2 → 不融合, 炸弹正常消失
   S4  寒冰菇(3,2) + 豌豆(3,1) → 豌豆变 寒冰射手(snowpea)
   S5  寒冰菇(3,5) + 西瓜投手(3,4) → 冰西瓜(wintermelon)
   S6  毁灭菇(2,2) + 向日葵(2,1) → 向日葵变 毁灭向日葵
   S7  火爆辣椒(2,5) + 坚果(2,4) → 坚果变 火炬树桩
   S8  空地樱桃炸弹(4,7) → 无配方, 仅爆炸消失, 不误伤
   S9  经典模式(fusionMode=false) 樱桃+豌豆 → 不融合, 豌豆原样
   S11 点击引爆 explodeNow() 仍然可用
*/
const puppeteer = require('puppeteer');

const URL = 'file:///Users/clawbox/nexus-hub/pvz-web/index.html';
const results = [];
let browser;

function ok(name, cond, extra) {
    results.push({ name, pass: !!cond, extra: extra || '' });
    console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}

async function newPage() {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));
    await p.evaluate(() => {
        const g = window._pvzGame;
        if (!g) throw new Error('game not initialized');
        g.fusionMode = true;
        g.state = 'PLAYING';
    });
    return p;
}

async function plant(page, type, r, c) {
    return page.evaluate((t, rr, cc) => {
        const g = window._pvzGame;
        g.board.addPlant(new Plant(g, t), rr, cc);
        return true;
    }, type, r, c);
}

async function step(page, secs) {
    await page.evaluate((s) => {
        const g = window._pvzGame;
        const n = Math.ceil(s / 0.1);
        for (let i = 0; i < n; i++) g.update(0.1);
    }, secs);
}

async function typeAt(page, r, c) {
    return page.evaluate((rr, cc) => {
        const g = window._pvzGame;
        const p = g.board.grid[rr][cc];
        return p ? p.type : null;
    }, r, c);
}

async function hpAt(page, r, c) {
    return page.evaluate((rr, cc) => {
        const g = window._pvzGame;
        const p = g.board.grid[rr][cc];
        return p ? p.hp : null;
    }, r, c);
}

(async () => {
    browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });

    // ---------- S1 + S10 樱桃炸弹相邻自动融合 + 产物常驻 ----------
    {
        const page = await newPage();
        await plant(page, 'peashooter', 1, 1);
        await plant(page, 'cherrybomb', 1, 2);
        await step(page, 2.0);          // 1s 自动引爆 + 融合
        await new Promise(r => setTimeout(r, 700)); // 等 Boom 后 hp=0 定时器
        await step(page, 0.5);          // 清理格子
        const t = await typeAt(page, 1, 1);
        const t2 = await typeAt(page, 1, 2);
        ok('S1 豌豆被樱桃炸弹融合为樱桃射手', t === 'fusion_cherrybomb_peashooter', 'grid(1,1)=' + t);
        ok('S1 炸弹格已清空', t2 === null, 'grid(1,2)=' + t2);
        // S10: 常驻性 —— 再跑 5 秒不应自动爆炸消失
        await step(page, 5.0);
        const t10 = await typeAt(page, 1, 1);
        const hp10 = await hpAt(page, 1, 1);
        ok('S10 樱桃射手 5s 后仍常驻(不自动爆炸)', t10 === 'fusion_cherrybomb_peashooter' && hp10 > 0, 'hp=' + hp10);
        await page.close();
    }

    // ---------- S2 对角 3×3 融合 ----------
    {
        const page = await newPage();
        await plant(page, 'peashooter', 1, 4);
        await plant(page, 'cherrybomb', 2, 5);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 1, 4);
        ok('S2 对角(Δr=1,Δc=1)豌豆被融合', t === 'fusion_cherrybomb_peashooter', 'grid(1,4)=' + t);
        await page.close();
    }

    // ---------- S3 距离 2 不融合 ----------
    {
        const page = await newPage();
        await plant(page, 'peashooter', 1, 7);
        await plant(page, 'cherrybomb', 1, 5);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 1, 7);
        ok('S3 距离2格的豌豆不受影响', t === 'peashooter', 'grid(1,7)=' + t);
        await page.close();
    }

    // ---------- S4 寒冰菇 + 豌豆 = 寒冰射手 ----------
    {
        const page = await newPage();
        await plant(page, 'peashooter', 3, 1);
        await plant(page, 'iceshroom', 3, 2);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 200));
        await step(page, 0.3);
        const t = await typeAt(page, 3, 1);
        ok('S4 寒冰菇爆炸融合豌豆→寒冰射手', t === 'snowpea', 'grid(3,1)=' + t);
        await page.close();
    }

    // ---------- S5 寒冰菇 + 西瓜投手 = 冰西瓜 ----------
    {
        const page = await newPage();
        await plant(page, 'melonpult', 3, 4);
        await plant(page, 'iceshroom', 3, 5);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 200));
        await step(page, 0.3);
        const t = await typeAt(page, 3, 4);
        ok('S5 寒冰菇爆炸融合西瓜→冰西瓜', t === 'wintermelon', 'grid(3,4)=' + t);
        await page.close();
    }

    // ---------- S6 毁灭菇 + 向日葵 = 毁灭向日葵 (异步状态机) ----------
    {
        const page = await newPage();
        await plant(page, 'sunflower', 2, 1);
        await plant(page, 'doomshroom', 2, 2);
        await step(page, 1.5);           // 触发 swelling
        await new Promise(r => setTimeout(r, 1400)); // 膨胀1s → exploding 时融合
        const t = await typeAt(page, 2, 1);
        ok('S6 毁灭菇爆炸融合向日葵→毁灭向日葵', t === 'fusion_doomshroom_sunflower', 'grid(2,1)=' + t);
        await page.close();
    }

    // ---------- S7 火爆辣椒 + 坚果 = 火炬树桩 ----------
    {
        const page = await newPage();
        await plant(page, 'wallnut', 2, 4);
        await plant(page, 'jalapeno', 2, 5);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 2, 4);
        ok('S7 辣椒爆炸融合坚果→火炬树桩', t === 'torchwood', 'grid(2,4)=' + t);
        await page.close();
    }

    // ---------- S8 空地炸弹仅爆炸, 无融合对象不误伤 ----------
    {
        const page = await newPage();
        await plant(page, 'cherrybomb', 4, 7);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 4, 7);
        ok('S8 空地樱桃炸弹正常爆炸消失', t === null, 'grid(4,7)=' + t);
        await page.close();
    }

    // ---------- S9 经典模式不触发爆炸融合 ----------
    {
        const page = await browser.newPage();
        page.on('pageerror', e => console.log('PAGEERROR:', e.message));
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 500));
        await page.evaluate(() => {
            const g = window._pvzGame;
            g.fusionMode = false;
            g.state = 'PLAYING';
        });
        await plant(page, 'peashooter', 1, 1);
        await plant(page, 'cherrybomb', 1, 2);
        await step(page, 2.0);
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 1, 1);
        ok('S9 经典模式豌豆不被融合', t === 'peashooter', 'grid(1,1)=' + t);
        await page.close();
    }

    // ---------- S11 点击引爆仍可用 ----------
    {
        const page = await newPage();
        await plant(page, 'peashooter', 0, 1);
        await plant(page, 'cherrybomb', 0, 2);
        await page.evaluate(() => {
            const g = window._pvzGame;
            const bomb = g.board.grid[0][2];
            bomb.explodeNow(); // 立即引爆
        });
        await new Promise(r => setTimeout(r, 700));
        await step(page, 0.5);
        const t = await typeAt(page, 0, 1);
        ok('S11 手动 explodeNow 立即引爆+融合', t === 'fusion_cherrybomb_peashooter', 'grid(0,1)=' + t);
        await page.close();
    }

    const fails = results.filter(r => !r.pass);
    console.log('\n========== 汇总: ' + (results.length - fails.length) + '/' + results.length + ' 通过 ==========');
    if (fails.length) {
        fails.forEach(f => console.log('FAILED:', f.name, f.extra));
        process.exitCode = 1;
    }
    await browser.close();
})();
