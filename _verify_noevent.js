/* 验证融合进化模式关闭全局随机事件 (v3.2.37-noevent)
   T1 经典冒险模式：定时器路径随机事件正常触发 (eventTimer 递减归零 -> triggerRandomEvent)
   T2 经典冒险模式：分数里程碑路径正常触发
   T3 融合进化模式：定时器路径永不触发 (eventTimer 不被消费)
   T4 融合进化模式：分数里程碑路径永不触发
   T5 融合进化模式：即使外部直接调用 triggerRandomEvent 也被内部守卫拦截
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

/* 安装计数包装：统计 eventManager.trigger 被真正执行的次数（守卫拦截后不会到达 trigger） */
const installCounter = (page) => page.evaluate(() => {
    const g = window._pvzGame;
    if (!g.eventManager) g.eventManager = new EventManager(g);
    g.__evCount = 0;
    const origTrig = g.eventManager.trigger.bind(g.eventManager);
    g.eventManager.trigger = () => { g.__evCount++; origTrig(); };
    return true;
});

const runTimerPath = (page, seconds) => page.evaluate((sec) => {
    const g = window._pvzGame;
    g.eventTimer = 0.01; // 立即到期
    const n = Math.ceil(sec / 0.1);
    for (let i = 0; i < n; i++) g.update(0.1);
    return g.__evCount;
}, seconds);

const runMilestonePath = (page) => page.evaluate(() => {
    const g = window._pvzGame;
    g.scoreMilestones = [100, 300, 500];
    g.score = 999; // 超过第一个里程碑
    const before = g.__evCount;
    g.updateScore();
    return g.__evCount - before;
});

const directCall = (page) => page.evaluate(() => {
    const g = window._pvzGame;
    const before = g.__evCount;
    g.triggerRandomEvent();
    return g.__evCount - before;
});

(async () => {
    browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });

    // T1+T2 经典冒险模式两路径都应触发
    {
        const page = await newPage(false);
        await installCounter(page);
        const timer = await runTimerPath(page, 1.5);   // 1.5s 内 eventTimer 至少到期一次
        const mile = await runMilestonePath(page);
        ok('T1 经典模式定时器路径触发随机事件', timer >= 1, 'timer calls=' + timer);
        ok('T2 经典模式里程碑路径触发随机事件', mile >= 1, 'milestone calls=' + mile);
        await page.close();
    }

    // T3+T4+T5 融合模式全部应被拦截
    {
        const page = await newPage(true);
        await installCounter(page);
        const timer = await runTimerPath(page, 5);     // 跑 5 秒也不该触发
        const mile = await runMilestonePath(page);
        const direct = await directCall(page);
        ok('T3 融合模式定时器路径不触发', timer === 0, 'timer calls=' + timer);
        ok('T4 融合模式里程碑路径不触发', mile === 0, 'milestone calls=' + mile);
        ok('T5 融合模式直接调用也被守卫拦截', direct === 0, 'direct calls=' + direct);
        // 确认 eventTimer 未被消耗(整段 if 被短路)
        const timerStuck = await page.evaluate(() => window._pvzGame.eventTimer);
        ok('T5b 融合模式 eventTimer 保持原值不被消费', timerStuck === 0.01, 'eventTimer=' + timerStuck);
        await page.close();
    }

    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('\n==== ' + (results.length - failed.length) + '/' + results.length + ' passed ====');
    process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
