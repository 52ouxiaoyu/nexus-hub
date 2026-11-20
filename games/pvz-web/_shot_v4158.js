// v4.0.158 截图：关卡选择（难度配色）、难度弹窗、局内配比、倍速中文文案
const path = require('path');
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/Users/clawbox/nexus-hub/pvz-web';

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu',
            '--disable-background-timer-throttling', '--hide-scrollbars'],
        userDataDir: '/tmp/pptr-shot-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('file://' + path.join(BASE, 'index.html'), { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => localStorage.clear());
    await sleep(900);

    // ① 关卡选择弹窗（10 关 · 难度配色）
    await page.evaluate(() => window._pvzGame._openVaseLevels());
    await sleep(500);
    await page.screenshot({ path: BASE + '/_v4158_levels.png' });
    console.log('shot levels');

    // ② 难度弹窗（三档描述已改）
    await page.evaluate(() => {
        document.getElementById('vase-levels-modal').style.display = 'none';
        window._pvzGame._openVaseDifficulty();
    });
    await sleep(400);
    await page.screenshot({ path: BASE + '/_v4158_diff.png' });
    console.log('shot diff');

    // ③ 局内：第 8 关开局盘面（问号罐为主 + 前排无暗雷）
    await page.evaluate(() => window._pvzGame._startVaseLevel(8));
    await sleep(1600);
    const board = await page.evaluate(() => {
        const g = window._pvzGame;
        const vs = g.vases;
        return {
            total: vs.length,
            p: vs.filter(v => v.type === 'plant').length,
            q: vs.filter(v => v.type === 'question').length,
            z: vs.filter(v => v.type === 'zombie').length,
            frontHidden: vs.filter(v => v.content.kind === 'zombie' && v.col < 4 && v.type !== 'zombie' && !v.golden).length
        };
    });
    console.log('L8 board', JSON.stringify(board));
    await page.screenshot({ path: BASE + '/_v4158_board.png' });

    // ④ 倍速按钮：点两下 → 倍速: 5x（全程中文）
    const speeds = [];
    for (let i = 0; i < 3; i++) {
        await page.evaluate(() => document.getElementById('btn-speed').click());
        await sleep(120);
        speeds.push(await page.evaluate(() => document.getElementById('btn-speed').innerText.trim()));
    }
    // 停在 2x 处拍 HUD 局部
    await page.evaluate(() => document.getElementById('btn-speed').click());
    await sleep(150);
    const btnTxt = await page.evaluate(() => document.getElementById('btn-speed').innerText.trim());
    const hud = await page.$('#game-hud') || await page.$('#btn-speed');
    if (hud) await hud.screenshot({ path: BASE + '/_v4158_speed.png' });
    else await page.screenshot({ path: BASE + '/_v4158_speed.png' });
    console.log('speed cycle', speeds.join(' → '), '| now', btnTxt);

    await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
