// v3.54.0 砸罐子出怪新规验证（用户三条新规 + 铁门降频）
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(800);

    // ===== T1 地狱·僵尸罐：冰车绝迹 =====
    const t1 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hell';
        const cnt = {};
        for (let i = 0; i < 4000; i++) {
            const t = g._rollVaseZombieType(5);
            cnt[t] = (cnt[t] || 0) + 1;
        }
        return cnt;
    });
    ok('T1 地狱僵尸罐：冰车绝迹', !t1.zomboni, JSON.stringify(t1));

    // ===== T2 地狱·问号罐：舞王/橄榄球/冰车全禁 =====
    const t2 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hell'; g._vaseEliteCount = 0;
        const bad = [];
        for (let i = 0; i < 4000; i++) {
            const t = g._rollVaseZombieType(5, true);
            if (t === 'football' || t === 'dancing' || t === 'zomboni') bad.push(t);
        }
        return bad;
    });
    ok('T2 问号罐：舞王/橄榄球/冰车全禁', t2.length === 0, `违规 ${t2.length} 次`);

    // ===== T3 铁门降频 ≈10%，普通僵尸仍居首 =====
    const t3 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hell'; g._vaseEliteCount = 0;
        const cnt = {};
        for (let i = 0; i < 8000; i++) {
            const t = g._rollVaseZombieType(5);
            cnt[t] = (cnt[t] || 0) + 1;
        }
        return cnt;
    });
    const sdRate = (t3.screendoor || 0) / 8000;
    const normalRate = (t3.normal || 0) / 8000;
    ok('T3a 铁门频率降到 5%~15%', sdRate > 0.05 && sdRate < 0.15, `铁门 ${(sdRate * 100).toFixed(1)}%`);
    ok('T3b 普通僵尸仍是最高频单项', Object.entries(t3).sort((a, b) => b[1] - a[1])[0][0] === 'normal' && normalRate > sdRate, `普通 ${(normalRate * 100).toFixed(1)}%`);

    // ===== T4 精英封顶后：橄榄球/舞王不再出现 =====
    const t4 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hell'; g._vaseEliteCount = 3;
        const bad = [];
        for (let i = 0; i < 4000; i++) {
            const t = g._rollVaseZombieType(5);
            if (t === 'football' || t === 'dancing') bad.push(t);
        }
        return bad;
    });
    ok('T4 精英封顶后无橄榄球/舞王', t4.length === 0, `违规 ${t4.length} 次`);

    // ===== T5 前两列：全低级池（无铁门/精英/撑杆） =====
    const t5 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hell'; g._vaseEliteCount = 0;
        const bad = [];
        for (let i = 0; i < 3000; i++) {
            const t = g._rollVaseZombieType(1);
            if (['screendoor', 'football', 'dancing', 'zomboni', 'polevaulting'].includes(t)) bad.push(t);
        }
        return bad;
    });
    ok('T5 前两列全低级池', t5.length === 0, `违规 ${t5.length} 次`);

    // ===== T6 金罐：冰车/橄榄球/融合头仍在池（每次重置精英配额，单测池子构成） =====
    const t6 = await p.evaluate(() => {
        const g = window._pvzGame;
        const s = new Set();
        for (let i = 0; i < 3000; i++) {
            g._vaseEliteCount = 0; // 绕开 v3.30.0 每局 ≤3 封顶（封顶后精英转巨人，属既有设计）
            s.add(g._pickGoldenZombie());
        }
        return [...s];
    });
    ok('T6 金罐仍可出冰车/橄榄球/融合植物僵尸',
        t6.includes('zomboni') && t6.includes('football') && t6.includes('peahead'),
        t6.join(','));

    // ===== T7 困难：无冰车/舞王，橄榄球可出 =====
    const t7 = await p.evaluate(() => {
        const g = window._pvzGame;
        g.vaseDifficulty = 'hard'; g._vaseEliteCount = 0;
        const cnt = {};
        for (let i = 0; i < 4000; i++) {
            const t = g._rollVaseZombieType(5);
            cnt[t] = (cnt[t] || 0) + 1;
        }
        return cnt;
    });
    ok('T7 困难：无冰车/舞王，橄榄球保留', !t7.zomboni && !t7.dancing && t7.football > 0, JSON.stringify(t7));

    console.log(`\n结果: ${pass} 过 / ${fail} 挂`);
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
