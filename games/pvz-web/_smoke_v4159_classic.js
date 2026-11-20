/* v4.0.159 冒烟：经典冒险真实对局里跑 200 秒模拟时间，确认小队突袭真的出兵且不报错 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle2' });
    await p.waitForFunction('window._pvzGame');
    await sleep(400);

    const r = await p.evaluate(async () => {
        const g = window._pvzGame;
        // 走真实开局链路：经典模式 = 全卡池选 10 张 → startGame
        g.fusionMode = false; g.vaseMode = false; g.zombieMode = false; g.vsMode = false;
        g.selectedSeeds = (g.allPlants || []).slice(0, 10).map(s => Object.assign({}, s));
        if (!g.selectedSeeds.length) {
            g.selectedSeeds = [{ type: 'sunflower' }, { type: 'peashooter' }, { type: 'wallnut' }];
        }
        g.startGame();
        g.state = 'PLAYING';
        g.sunCount = 9999;

        // 记录每只僵尸的出生行与出生时刻，用来识别「同帧多行」的突袭
        const log = [];
        const orig = g.waveManager.spawnZombie.bind(g.waveManager);
        g.waveManager.spawnZombie = function (rowOverride) {
            const before = g.entities.length;
            orig(rowOverride);
            const z = g.entities[g.entities.length - 1];
            if (g.entities.length > before && z) log.push({ t: Math.round(g.waveManager.timeElapsed), row: z.row });
        };

        // 直接计数突袭调用（比按秒聚簇可靠：普通出兵恰好同一秒会污染聚类）
        const raidLog = [];
        const origRaid = g.waveManager._squadRaid.bind(g.waveManager);
        g.waveManager._squadRaid = function () {
            raidLog.push(Math.round(g.waveManager.timeElapsed));
            return origRaid();
        };

        // 模拟 200 秒（每步 0.1s，不真的跑 rAF）
        for (let i = 0; i < 2000; i++) g.waveManager.update(0.1);

        // 按时间聚簇：同一秒出生的算「同帧」
        const byT = {};
        log.forEach(x => { (byT[x.t] = byT[x.t] || []).push(x.row); });
        const raids = Object.keys(byT)
            .filter(t => Number(t) < 479)
            .map(t => byT[t])
            .filter(rows => rows.length >= 2 && new Set(rows).size === rows.length);

        return {
            raidLog,
            total: log.length,
            zombieEntities: g.entities.filter(e => e.constructor && e.constructor.name === 'Zombie').length,
            raids: raids.length,
            raidSizes: raids.map(a => a.length),
            firstAt: log.length ? log[0].t : null,
            firstRow: log.length ? log[0].row : null,
            spawnInterval: Math.round(g.waveManager.spawnInterval * 100) / 100
        };
    });

    console.log('\n=== 经典冒险 200s 模拟 ===');
    console.log('  出兵总数        :', r.total);
    console.log('  场上僵尸实体    :', r.zombieEntities);
    console.log('  第一只出现时刻  :', r.firstAt, 's（行', r.firstRow, '）');
    console.log('  小队突袭触发    :', r.raidLog.length, '次，时刻', JSON.stringify(r.raidLog));
    console.log('  同帧多行出兵    :', r.raids, '次，规模', JSON.stringify(r.raidSizes));
    console.log('  结束时间隔      :', r.spawnInterval, 's');
    console.log('  pageerror       :', errs.length ? errs.slice(0, 3).join(' | ') : '无');

    const good = errs.length === 0 && r.total > 25 && r.raidLog.length === 2 && r.firstAt <= 16;
    console.log(good ? '\n✅ 冒烟通过' : '\n❌ 冒烟失败');
    await b.close();
    process.exit(good ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
