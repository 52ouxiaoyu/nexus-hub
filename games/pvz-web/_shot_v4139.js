// v4.0.139 验收截图：弹球（含多球状态）、推箱子第 4 关、版本徽标
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await sleep(1700);

    console.log('版本徽标 =', await page.evaluate(() => {
        const e = document.querySelector('.ver');
        return e ? e.innerText : '(none)';
    }));

    // 弹球：开局 + 自动接球跑 2 秒，让砖被打掉几块
    await page.evaluate(() => { window.MiniGames.openLobby(); window.MiniGames.openGame('breakout'); });
    await sleep(500);
    await page.evaluate(() => {
        const a = window.MiniGames.active;
        a.ball.stuck = false;
        // 让它自己打一会儿（在页面里跑 2 秒模拟，避免等真时间）
        for (let i = 0; i < 120; i++) {
            const bb = a.ball; if (!bb) break;
            a.px = Math.max(60 + a.pw / 2, Math.min(840 - a.pw / 2, bb.x));
            a.update(1 / 60);
        }
        a.grab('tri');                       // 顺手展示多球
        a.update(1 / 60);
    });
    await sleep(260);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4139_breakout.png' });

    // 推箱子第 4 关
    await page.evaluate(() => { window.MiniGames.openGame('sokoban'); window.MiniGames.active.load(3); });
    await sleep(450);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4139_sokoban4.png' });

    // 第 1 关对照（主角也是寒冰射手）
    await page.evaluate(() => window.MiniGames.active.load(0));
    await sleep(320);
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4139_sokoban1.png' });

    await b.close();
})();
