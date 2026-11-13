/* v4.0.153 泡泡工坊独立 + A 与经典泡泡龙的视觉分家 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, name, extra) {
    if (c) { pass++; console.log('  ✅ ' + name + (extra ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ❌ ' + name + (extra ? '  [' + extra + ']' : '')); }
}
(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1500, height: 1000 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await sleep(1500);

    /* ---------- ① 首页卡位 ---------- */
    console.log('\n① 首页八张卡（第二行拆成四张 196）');
    const home = await page.evaluate(() => {
        // offsetWidth/Height 是布局尺寸，不受页面整体 transform 缩放影响
        const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: e.offsetWidth, h: e.offsetHeight, right: Math.round(b.right) }; };
        const ids = ['btn-adventure', 'btn-fusion', 'btn-vase', 'btn-zombie', 'btn-vs', 'btn-dorm', 'btn-bubble', 'btn-minigame'];
        const out = {};
        ids.forEach(i => out[i] = r(i));
        return { out: out, missing: ids.filter(i => !out[i]) };
    });
    ok(home.missing.length === 0, '八张卡全部存在', home.missing.join(',') || '无缺失');
    const H = home.out;
    ok(H['btn-bubble'] && H['btn-bubble'].w === 196 && H['btn-minigame'] && H['btn-minigame'].w === 196,
        '泡泡工坊 / 小游戏 都是 196 宽', (H['btn-bubble'] || {}).w + ' / ' + (H['btn-minigame'] || {}).w);
    ok(H['btn-bubble'] && Math.abs(H['btn-bubble'].x - H['btn-vase'].x) <= 2, '泡泡工坊在「砸罐子」正下方',
        H['btn-bubble'].x + ' vs ' + H['btn-vase'].x);
    ok(H['btn-minigame'] && Math.abs(H['btn-minigame'].x - H['btn-zombie'].x) <= 2, '小游戏在「我是僵尸」正下方',
        H['btn-minigame'].x + ' vs ' + H['btn-zombie'].x);
    ok(H['btn-bubble'] && H['btn-minigame'] && Math.abs(H['btn-bubble'].y - H['btn-minigame'].y) <= 2 &&
        H['btn-bubble'].y >= H['btn-vase'].y + H['btn-vase'].h - 1, '第二行四张卡同一水平线且在第一行下方',
        'y=' + H['btn-bubble'].y + ' 上一行底=' + (H['btn-vase'].y + H['btn-vase'].h));
    const rowW = [H['btn-vs'], H['btn-dorm'], H['btn-bubble'], H['btn-minigame']];
    const gapOK = rowW.slice(1).every((c, i) => Math.abs((c.x - rowW[i].right) - (rowW[1].x - rowW[0].right)) <= 1);
    ok(rowW.every(c => c && c.w === 196 && c.h === 192) && gapOK,
        '第二行四张卡等宽等高、间距均匀', '宽 ' + rowW[0].w + ' / 间距 ' + (rowW[1].x - rowW[0].right));

    /* ---------- ② 两个大厅 ---------- */
    console.log('\n② 两个大厅各自独立');
    await page.click('#btn-minigame'); await sleep(500);
    const lobbyA = await page.evaluate(() => ({
        title: (document.getElementById('mini-title') || {}).textContent,
        n: document.querySelectorAll('#mini-grid .mini-card').length,
        names: Array.from(document.querySelectorAll('#mini-grid .mini-card h3')).map(e => e.textContent),
        cols: getComputedStyle(document.getElementById('mini-grid')).gridTemplateColumns.split(' ').length
    }));
    ok(lobbyA.n === 6, '小游戏大厅 6 个玩法', lobbyA.n + ' 个');
    ok(lobbyA.title === '后院游乐场', '标题是「后院游乐场」', lobbyA.title);
    ok(lobbyA.cols === 3, '6 个玩法排 3 列', lobbyA.cols + ' 列');
    ok(!lobbyA.names.some(n => /泡泡/.test(n)), '大厅里不再有泡泡系玩法', lobbyA.names.join(' / '));

    await page.evaluate(() => window.MiniGames.quit()); await sleep(200);
    await page.click('#btn-bubble'); await sleep(500);
    const lobbyB = await page.evaluate(() => ({
        title: (document.getElementById('mini-title') || {}).textContent,
        n: document.querySelectorAll('#mini-grid .mini-card').length,
        names: Array.from(document.querySelectorAll('#mini-grid .mini-card h3')).map(e => e.textContent),
        cols: getComputedStyle(document.getElementById('mini-grid')).gridTemplateColumns.split(' ').length
    }));
    ok(lobbyB.n === 4, '泡泡工坊 4 种玩法', lobbyB.n + ' 个：' + lobbyB.names.join(' / '));
    ok(lobbyB.title === '猫尾草泡泡工坊', '标题是「猫尾草泡泡工坊」', lobbyB.title);
    ok(lobbyB.cols === 2, '4 种玩法排 2 列', lobbyB.cols + ' 列');
    ok(/泡泡牧场/.test(lobbyB.names.join('')) && /机械龙攻城/.test(lobbyB.names.join('')) &&
        /泡泡对轰/.test(lobbyB.names.join('')) && /泡泡塔/.test(lobbyB.names.join('')),
        '四个泡泡玩法都在工坊里（4/6/8/10 已合并）', lobbyB.names.length + ' 张');

    /* ---------- ③ 来回切换不串场 ---------- */
    console.log('\n③ 进出与 ESC 回路');
    const round = await page.evaluate(async () => {
        const M = window.MiniGames;
        M.openGame('dragon');
        const inDragon = M.active && M.active.constructor.name;
        M.backToLobby();                                  // 从工坊进 → 回工坊
        const t1 = document.getElementById('mini-title').textContent;
        const n1 = document.querySelectorAll('#mini-grid .mini-card').length;
        M.quit();
        M.openLobby();
        const t2 = document.getElementById('mini-title').textContent;
        const n2 = document.querySelectorAll('#mini-grid .mini-card').length;
        M.openBubble();
        M.openGame('bubble');
        M.backToLobby();
        const t3 = document.getElementById('mini-title').textContent;
        return { inDragon, t1, n1, t2, n2, t3 };
    });
    ok(round.inDragon === 'DragonRaid', '工坊里能直接开机械龙攻城', round.inDragon);
    ok(round.t1 === '猫尾草泡泡工坊' && round.n1 === 4, '从工坊退出回工坊（不是回 6 个的大厅）', round.t1 + ' / ' + round.n1);
    ok(round.t2 === '后院游乐场' && round.n2 === 6, '从小游戏卡进来是 6 个的大厅', round.t2 + ' / ' + round.n2);
    ok(round.t3 === '猫尾草泡泡工坊', '玩完经典泡泡龙退出仍回工坊', round.t3);

    /* ---------- ④ A 与经典泡泡龙的视觉分家 ---------- */
    console.log('\n④ 机械龙 vs 泡泡牧场（同一个内核，两套场景）');
    const look = await page.evaluate(() => {
        const M = window.MiniGames;
        M.openGame('farm');
        const a = M.active.lane;
        const infoA = {
            cols: a.COLS, sx: a.sx, left: a.LEFT, lim: Math.round(a.aimLimit() * 180 / Math.PI)
        };
        M.openGame('dragon');
        const d = M.active, l = d.lane;
        const infoB = {
            cols: l.COLS, sx: l.sx, left: l.LEFT, lim: Math.round(l.aimLimit() * 180 / Math.PI),
            wl: l.wallL, wr: l.wallR, cells: l.count()
        };
        return { a: infoA, b: infoB };
    });
    ok(look.a.sx === 450 && look.b.sx === 450, '两边炮台都在正中（难度曲线一点没动）',
        '牧场 ' + look.a.sx + ' / 机械龙 ' + look.b.sx);
    // v4.0.157：牧场和机械龙现在共用同一套 19 列网格，不是靠尺寸区分，区分靠场景与规则
    ok(look.a.cols === 19 && look.b.cols === 19, '两边共用同一套 19 列网格',
        look.a.cols + ' 列 vs ' + look.b.cols + ' 列');
    ok(look.b.wl > 50 && look.b.wr < 860, '机械龙场地在护墙内（左右各留一段厂房墙）',
        look.b.wl + '..' + look.b.wr);

    // 采样两张画面左上角的背景色（一个绿一个铜）
    const shots = await page.evaluate(() => {
        const M = window.MiniGames;
        const c = document.getElementById('mini-canvas'), x = c.getContext('2d');
        // 整屏平均色：单点会撞上泡泡 / 血条，取平均才代表这张画面的色系
        const avg = () => {
            const d = x.getImageData(0, 0, 900, 600).data;
            let r = 0, g = 0, b = 0, n = 0;
            for (let i = 0; i < d.length; i += 4 * 37) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
            return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
        };
        M.openGame('farm'); x.clearRect(0, 0, 900, 600); M.active.draw();
        const a = avg();
        M.openGame('dragon'); x.clearRect(0, 0, 900, 600); M.active.draw();
        const b = avg();
        return { a: a, b: b };
    });
    const greener = (c) => c[1] > c[0] + 4 && c[1] > c[2] + 8;
    const browner = (c) => c[0] > c[1] + 6 && c[1] >= c[2];
    ok(greener(shots.a), '泡泡牧场整屏偏绿（黄昏草地）', 'rgb(' + shots.a.join(',') + ')');
    ok(browner(shots.b), '机械龙整屏偏铜褐（钢铁工坊）', 'rgb(' + shots.b.join(',') + ')');
    ok(shots.a[1] - shots.a[0] > 9 && shots.b[0] - shots.b[1] > 10,
        '两边色系一个绿压红、一个红压绿（不是同一套配色）',
        '绿差 +' + (shots.a[1] - shots.a[0]) + ' / 褐差 +' + (shots.b[0] - shots.b[1]));

    /* ---------- ⑤ 十个玩法都还能开 ---------- */
    console.log('\n⑤ 回归');
    const all = await page.evaluate(() => window.MiniGames.games.map(g => g.id));
    ok(all.length === 10, '总玩法仍是 10 个（6 + 4）', all.join(','));
    const opened = await page.evaluate(() => {
        const M = window.MiniGames, bad = [];
        for (const g of M.games) {
            try { M.openGame(g.id); M.active.update(1 / 60); M.active.draw(); }
            catch (e) { bad.push(g.id + ':' + e.message); }
        }
        return bad;
    });
    ok(opened.length === 0, '10 个玩法都能打开并跑一帧', opened.join(' | ') || '全部 OK');
    ok(errs.length === 0, '全程没有 JS 报错', errs.length + ' 错误');

    console.log('\n结果 ' + pass + '/' + (pass + fail) + (fail ? '  ❌' : '  全过'));
    if (errs.length) console.log(errs.slice(0, 5).join('\n'));
    await b.close();
})();
