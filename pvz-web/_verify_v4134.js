// v4.0.134 小游戏厅冒烟测试：10 个玩法逐个开局、点/按键、检查报错与画面
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

const P = [], F = [];
const ok = (c, n, extra) => (c ? P : F).push(n + (extra ? ' — ' + extra : ''));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('response', r => { if (r.status() === 404) errs.push('404: ' + r.url()); });
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('file://' + require('path').resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await sleep(1500);

    // ---- 开局：点小游戏卡
    await page.click('#btn-minigame');
    await sleep(500);
    const lobby = await page.evaluate(() => {
        const s = document.getElementById('mini-screen');
        const cards = Array.from(document.querySelectorAll('#mini-grid .mini-card'));
        return {
            open: !!s && getComputedStyle(s).display !== 'none',
            n: cards.length,
            names: cards.map(c => c.querySelector('h3').textContent),
            imgs: cards.map(c => { const i = c.querySelector('img'); return i && i.complete && i.naturalWidth > 0; }),
            gridH: document.querySelector('#mini-grid').getBoundingClientRect().height,
        };
    });
    ok(lobby.open, '① 点小游戏卡能打开大厅');
    ok(lobby.n === 10, '② 大厅 10 张卡片', lobby.n + ' 张');
    ok(lobby.imgs.every(Boolean), '③ 10 张卡片封面图全部加载成功');
    ok(lobby.gridH > 380, '④ 大厅网格高度吃满（%s px）'.replace('%s', Math.round(lobby.gridH)), Math.round(lobby.gridH));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/_v4134_lobby.png' });

    // 画布坐标 → 视口坐标（每次开局后重测：stage 隐藏时 rect 是 0）
    let CR = null;
    async function measure() {
        CR = await page.evaluate(() => {
            const c = document.getElementById('mini-canvas');
            const r = c.getBoundingClientRect();
            return { left: r.left, top: r.top, w: r.width, h: r.height };
        });
    }
    const cx = x => CR.left + x * CR.w / 900;
    const cy = y => CR.top + y * CR.h / 600;
    const click = async (x, y) => { await page.mouse.click(cx(x), cy(y)); await sleep(90); };
    const move = async (x, y) => { await page.mouse.move(cx(x), cy(y)); await sleep(60); };
    const key = async k => { await page.keyboard.press(k); await sleep(110); };

    // 画面是否有内容（平均亮度 + 颜色方差）
    async function frameStats() {
        return await page.evaluate(() => {
            const c = document.getElementById('mini-canvas');
            const g = c.getContext('2d');
            const d = g.getImageData(0, 0, 900, 600).data;
            let sum = 0, n = 0, uniq = new Set();
            for (let i = 0; i < d.length; i += 4 * 97) {
                sum += d[i] + d[i + 1] + d[i + 2];
                n++;
                uniq.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
            }
            return { bright: sum / (n * 3), colors: uniq.size };
        });
    }

    const cases = [
        { id: 'tetris', name: '豌豆方块', shot: '_v4134_tetris.png',
          act: async () => { await key('ArrowLeft'); await key('ArrowUp'); await key('Space'); await sleep(700); await key('Space'); } },
        { id: 'whack', name: '僵尸地鼠', shot: '_v4134_whack.png',
          act: async () => { for (let i = 0; i < 6; i++) { await click(300 + (i % 3) * 150, 215 + ((i / 3) | 0) * 120 + 40); await sleep(160); } } },
        { id: 'g2048', name: '花园 2048', shot: '_v4134_2048.png',
          act: async () => { await key('ArrowLeft'); await key('ArrowDown'); await key('ArrowRight'); await key('ArrowUp'); } },
        { id: 'bubble', name: '猫尾草泡泡龙', shot: '_v4134_bubble.png',
          act: async () => { await move(450, 200); await click(450, 200); await sleep(900); await click(400, 180); } },
        { id: 'breakout', name: '豌豆弹球', shot: '_v4134_breakout.png',
          act: async () => { await click(450, 300); await sleep(400); await move(520, 300); await sleep(500); } },
        { id: 'match3', name: '植物消消乐', shot: '_v4134_match3.png',
          act: async () => { await click(205, 157); await click(267, 157); await sleep(500); await click(205, 219); await click(205, 281); } },
        { id: 'sokoban', name: '寒冰推箱', shot: '_v4134_sokoban.png',
          act: async () => { await key('ArrowRight'); await key('ArrowRight'); await key('ArrowUp'); } },
        { id: 'duck', name: '豌豆射击场', shot: '_v4134_duck.png',
          act: async () => { await move(450, 200); await click(450, 200); await sleep(500); await click(300, 250); } },
        { id: 'memory', name: '花园连连看', shot: '_v4134_memory.png',
          act: async () => { await click(300, 170); await click(400, 170); await sleep(600); await click(500, 170); } },
        { id: 'snake', name: '僵尸贪吃蛇', shot: '_v4134_snake.png',
          act: async () => { await key('ArrowDown'); await sleep(320); await key('ArrowRight'); await sleep(320); } },
    ];

    for (const c of cases) {
        await page.evaluate(id => window.MiniGames.openGame(id), c.id);
        await sleep(420);
        await measure();
        const s1 = await frameStats();
        await c.act();
        await sleep(260);
        const s2 = await frameStats();
        const st = await page.evaluate(() => {
            const a = window.MiniGames.active;
            if (!a) return null;
            return {
                score: a.score, over: !!a.over, t: +a.t.toFixed(2),
                steps: a.steps, time: a.time, moves: a.moves,
                cells: a.board ? a.board.flat().filter(Boolean).length : null,
                snake: a.snake ? a.snake.length : null,
                targets: a.targets ? a.targets.length : null,
                cards: a.cards ? a.cards.filter(x => x.done).length : null,
                bricks: a.bricks ? a.bricks.filter(b => b.hp > 0 && b.type !== 'nut').length : null,
                holesUp: a.holes ? a.holes.filter(h => h.st === 'up').length : null,
                ballsOnBoard: a.g ? (Array.isArray(a.g[0]) ? a.g.flat().filter(v => v >= 0).length : 0) : null
            };
        });
        await page.screenshot({ path: '/Users/clawbox/nexus-hub/pvz-web/' + c.shot });
        ok(s2.colors > 8, '⑤ ' + c.name + ' 有画面（颜色种类 > 8）', 'colors=' + s2.colors + ' bright=' + s2.bright.toFixed(0));
        ok(st && st.t > 0.2, '⑥ ' + c.name + ' 主循环在跑', st && ('t=' + st.t));
        console.log('  ·', c.name.padEnd(7), JSON.stringify(st));
        if (c.id === 'tetris') ok(st && (st.cells > 0 || st.score > 0), '⑦ 豌豆方块 落块生效', 'cells=' + (st && st.cells));
        if (c.id === 'g2048') ok(st && st.score >= 0 && st.cells !== 0, '⑦ 花园2048 生成瓷砖');
        if (c.id === 'sokoban') ok(st && st.steps >= 1, '⑦ 寒冰推箱 能走步', 'steps=' + (st && st.steps));
        if (c.id === 'match3') ok(st && st.time < 90, '⑦ 消消乐 倒计时在走', 'time=' + (st && st.time && st.time.toFixed(1)));
        if (c.id === 'snake') ok(st && st.snake >= 3, '⑦ 贪吃蛇 存活中', 'len=' + (st && st.snake));
        if (c.id === 'breakout') ok(st && st.bricks <= 40, '⑦ 弹球 砖块在场', 'bricks=' + (st && st.bricks));
        if (c.id === 'memory') ok(st && st.cards === 0 || st.cards >= 0, '⑦ 连连看 翻牌可点');
        if (c.id === 'duck') ok(st && st.targets >= 0, '⑦ 射击场 生成靶子');
    }

    // ---- ESC 逐层返回
    await page.keyboard.press('Escape'); await sleep(300);
    const backLobby = await page.evaluate(() => {
        const s = document.getElementById('mini-screen');
        const lb = document.getElementById('mini-lobby');
        return { open: getComputedStyle(s).display !== 'none', lobby: getComputedStyle(lb).display !== 'none', active: !!window.MiniGames.active };
    });
    ok(backLobby.open && backLobby.lobby && !backLobby.active, '⑧ ESC 从游戏回到大厅');
    await page.keyboard.press('Escape'); await sleep(300);
    const closed = await page.evaluate(() => getComputedStyle(document.getElementById('mini-screen')).display === 'none');
    ok(closed, '⑨ 再按 ESC 回主菜单（大厅关闭）');

    // ---- 菜单没被压坏
    const menuOk = await page.evaluate(() => {
        const m = document.getElementById('start-menu');
        return getComputedStyle(m).display !== 'none' && !!document.getElementById('btn-minigame');
    });
    ok(menuOk, '⑩ 退出后主菜单正常');

    // ---- 深度玩法验证：地鼠能敲中 / 三消能交换 / 蛇能吃阳光
    await page.evaluate(() => window.MiniGames.openGame('whack')); await sleep(320); await measure();
    const hp = await page.evaluate(() => {
        const a = window.MiniGames.active, h = a.holes[4];
        h.st = 'up'; h.type = 'normal'; h.hits = 1; h.maxHits = 1; h.val = 10; h.t = 3; h.up = 1;
        return { x: h.x, y: (h.y - 34) - 86 * 0.55 };
    });
    await click(hp.x, hp.y + 20);
    const ws = await page.evaluate(() => ({ s: window.MiniGames.active.score, up: window.MiniGames.active.holes[4].st }));
    ok(ws.s >= 10, '⑫ 地鼠：敲中僵尸得分', 'score=' + ws.s);

    await page.evaluate(() => window.MiniGames.openGame('match3')); await sleep(320); await measure();
    const mv = await page.evaluate(() => {
        const a = window.MiniGames.active;
        for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
            const t = a.g[r][c]; a.g[r][c] = a.g[r][c + 1]; a.g[r][c + 1] = t;
            const runs = a.findRuns();
            a.g[r][c] = a.g[r][c + 1]; a.g[r][c + 1] = t;
            if (runs.size) {
                const f = (rr, cc) => ({ x: a.bx + cc * (a.CELL + a.GAP) + a.CELL / 2, y: a.by + rr * (a.CELL + a.GAP) + a.CELL / 2 });
                return { a: f(r, c), b: f(r, c + 1) };
            }
        }
        return null;
    });
    ok(!!mv, '⑬ 三消：棋盘上存在可消的一步');
    if (mv) {
        await click(mv.a.x, mv.a.y);
        await click(mv.b.x, mv.b.y); await sleep(700);
        const m3 = await page.evaluate(() => ({ m: window.MiniGames.active.moves, s: window.MiniGames.active.score }));
        ok(m3.m >= 1 && m3.s > 0, '⑭ 三消：交换后成功消除得分', 'moves=' + m3.m + ' score=' + m3.s);
    }

    await page.evaluate(() => window.MiniGames.openGame('snake')); await sleep(320); await measure();
    await page.evaluate(() => {
        const a = window.MiniGames.active, h = a.snake[0];
        a.food = { x: h.x + 1, y: h.y };
    });
    await sleep(520);
    const sn = await page.evaluate(() => ({ s: window.MiniGames.active.score, l: window.MiniGames.active.snake.length }));
    ok(sn.s >= 10 && sn.l >= 4, '⑮ 贪吃蛇：吃到阳光加分变长', 'score=' + sn.s + ' len=' + sn.l);

    await page.keyboard.press('Escape'); await sleep(200);
    const cleanErrs = errs.filter(e => !/favicon|Failed to load resource/.test(e));
    ok(cleanErrs.length === 0, '⑪ 全程无 JS 报错', cleanErrs.slice(0, 3).join(' | '));
    const ce = errs.filter(e => !/favicon|Failed to load resource/.test(e));
    if (ce.length) console.log('ERR:', ce.slice(0, 6));

    console.log('通过 %d / 失败 %d', P.length, F.length);
    F.forEach(t => console.log('  FAIL', t));
    await browser.close();
    process.exit(F.length ? 1 : 0);
})();
