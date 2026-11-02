// v4.0.143 端到端：真人僵尸逐个「碰到」人机 —— 每次都应该立刻死，5 个清完应判邪恶胜利
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1280, height: 860 });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message)));
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"');
    await page.evaluate(() => {
        localStorage.clear();
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('dorm-screen').style.display = 'block';
        window.startHauntedDorm({ gameMode: '1p', faction: 'zombie', role1: 'peashooter' });
    });
    await sleep(1200);
    await page.evaluate(() => {
        window.game.gameTime = Math.max(window.game.gameTime, 6000);
        window.game.zombieFreezeT = 0;   // 跳过僵尸开局 10 秒观察期（观察期内移动被锁）
        if (window.game.freezeEl) window.game.freezeEl.style.display = 'none';
    });

    for (let k = 0; k < 5; k++) {
        const r = await page.evaluate(async () => {
            const g = window.game;
            const ai = g.ais.find(a => !a.dead);
            if (!ai) return { err: '没有人机了', done: true };
            // 把人机搬到开阔地（不隔门），僵尸玩家从 200px 外一次「碰到」
            const sc = g._spawnCenterPx();
            ai.pinned = false; ai.room = null; ai.targetRoom = null; ai.path = null;
            ai.x = sc.x; ai.y = sc.y;
            g.player.x = sc.x + 200; g.player.y = sc.y;
            g.player.hp = g.player.maxHp;
            const hp0 = Math.round(ai.hp);
            const t0 = performance.now();
            // 真人按住方向键冲过去（用真实按键，不直接改坐标）
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }));
            const dbg = { dead: !!g.player.dead, frozen: g._zombieFrozen ? g._zombieFrozen() : 'n/a',
                          blessing: !!g.blessing, keyA: !!g.keys['a'], menuBusy: !!(g.kmenus[1] && g.kmenus[1].active) };
            let killed = false, minD = 1e9, minT = 0;
            for (let i = 0; i < 120; i++) {   // 2 秒内必须撞上
                await new Promise(res => setTimeout(res, 16));
                const dd = Math.hypot(g.player.x - ai.x, g.player.y - ai.y);
                if (dd < minD) { minD = dd; minT = i; }
                if (ai.dead) { killed = true; break; }
            }
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' }));
            const ms = Math.round(performance.now() - t0);
            return { dbg, minD: Math.round(minD), minT, isZ: !!g.player.isZombie, hp0, hp1: Math.round(ai.hp), killed, ms, kills: g.kills,
                     dist: Math.round(Math.hypot(g.player.x - ai.x, g.player.y - ai.y)) };
        });
        console.log(JSON.stringify(r));
        await sleep(200);
    }

    const fin = await page.evaluate(() => {
        const g = window.game;
        return { deadAis: g.ais.filter(a => a.dead).length, over: !!g.over, win: !!g.win,
                 brokenRooms: g.rooms.filter(r => r.doorBroken).length, errs: 0 };
    });
    console.log('结局：', JSON.stringify(fin));
    console.log('pageerrors:', errs.length ? errs.slice(0, 3) : 'none');
    await b.close();
})();
