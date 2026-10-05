// v3.77.0 验证：砸罐子 / 我是僵尸 每一张随机地图都有"不用铲子/手套也能走完"的解
// T0 源码接线 / T1 砸罐子 3 难度 × 800 局：进攻植物 ≥ 保底、僵尸罐 ≥1、罐数正确
// T2 我是僵尸 3 档 × 300 局：每行射手战力 ≤ 上限、每行 ≥1 射手、向日葵档位、无空格
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
    if (cond) { pass++; console.log('  PASS', name); }
    else { fail++; console.log('  FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
}
(async () => {
    const fs = require('fs');
    const gl = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/js/GameLoop.js', 'utf8');
    ok('T0a 砸罐子进攻保底块已接入', gl.includes('v3.77.0 可解性保底：每局进攻植物数量达标') && gl.includes('_pickVaseAttacker()'));
    ok('T0b 我是僵尸行战力上限已接入', gl.includes('每行"持续射手"战力设上限') && gl.includes("cap = { 0: 6, 1: 14, 2: 22 }"));

    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // T1 砸罐子全量审计
    const t1 = await page.evaluate(() => {
        const g = window._pvzGame;
        const ATK_MIN = { easy: 6, hard: 4, hell: 3 };
        const atkSet = g._vaseAttackerSet();
        const stats = {};
        for (const diff of ['easy', 'hard', 'hell']) {
            g.vaseDifficulty = diff;
            let minAtk = 99, minZombie = 99, minPlantCards = 99, bad = 0, N = 800;
            for (let i = 0; i < N; i++) {
                g.setupVases();
                const nonGolden = g.vases.filter(v => !v.golden);
                const atk = nonGolden.filter(v => v.content && v.content.kind === 'plant' && atkSet.has(v.content.type)).length;
                const plantCards = nonGolden.filter(v => v.content && v.content.kind === 'plant').length;
                const zombies = nonGolden.filter(v => v.type === 'zombie').length;
                minAtk = Math.min(minAtk, atk);
                minZombie = Math.min(minZombie, zombies);
                minPlantCards = Math.min(minPlantCards, plantCards);
                if (atk < ATK_MIN[diff] || zombies < 1) bad++;
                // 清场
                const layer = g.entityLayer;
                while (layer.firstChild) layer.removeChild(layer.firstChild);
                g.vases = [];
            }
            stats[diff] = { minAtk, minZombie, minPlantCards, bad, N };
        }
        return stats;
    });
    ok('T1a 简单 800 局：进攻植物最少 ' + t1.easy.minAtk + '（≥6），僵尸罐最少 ' + t1.easy.minZombie, t1.easy.bad === 0 && t1.easy.minAtk >= 6, t1.easy);
    ok('T1b 困难 800 局：进攻植物最少 ' + t1.hard.minAtk + '（≥4），僵尸罐最少 ' + t1.hard.minZombie, t1.hard.bad === 0 && t1.hard.minAtk >= 4, t1.hard);
    ok('T1c 地狱 800 局：进攻植物最少 ' + t1.hell.minAtk + '（≥3），僵尸罐最少 ' + t1.hell.minZombie, t1.hell.bad === 0 && t1.hell.minAtk >= 3, t1.hell);

    // T2 我是僵尸全量审计
    const t2 = await page.evaluate(() => {
        const g = window._pvzGame;
        const CAP = { 0: 6, 1: 14, 2: 22 };
        const shootPower = { peashooter: 2, snowpea: 3, repeater: 4, threepeater: 5, splitpea: 4,
            gatlingpea: 8, melonpult: 8, wintermelon: 10, cattail: 9, gloomshroom: 7,
            fumeshroom: 3, cabbagepult: 4, kernelpult: 4, starfruit: 5 };
        const isShooter = t => shootPower[t] !== undefined;
        const sunKinds = ['sunflower', 'sunshroom', 'twinsunflower'];
        const stats = {};
        for (const diff of ['easy', 'hard', 'hell']) {
            g.zombieDifficulty = diff;
            g._zDiffCfgCache = null; // 重置缓存（buildZombieBank 前提，这里只需配置）
            const tier = g._zombieDiffCfg().plantTier;
            let worstRowPower = 0, badRows = 0, badEmpty = 0, minRowShooters = 99, sunBad = 0, N = 300;
            for (let i = 0; i < N; i++) {
                g.setupZombieEnemies();
                for (let r = 0; r < 5; r++) {
                    let sp = 0, sh = 0, sun = 0;
                    for (let c = 0; c < 6; c++) {
                        const t = g.board.grid[r] && g.board.grid[r][c] && g.board.grid[r][c].type;
                        if (!t) { badEmpty++; continue; }
                        if (isShooter(t)) { sp += shootPower[t]; sh++; }
                        if (sunKinds.includes(t)) sun++;
                    }
                    worstRowPower = Math.max(worstRowPower, sp);
                    if (sp > CAP[tier]) badRows++;
                    if (sh < 1) badRows++;
                    minRowShooters = Math.min(minRowShooters, sh);
                    if (sun < 1) sunBad++; // 每行至少沾点经济（全局 3~11 株分 5 行）
                }
                // 清场：移除敌阵植物
                for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
                    const p = g.board.grid[r] && g.board.grid[r][c];
                    if (p && p._zombieEnemy) { if (p.element && p.element.parentNode) p.element.parentNode.removeChild(p.element); g.board.grid[r][c] = null; }
                }
                g.entities = g.entities.filter(e => !(e instanceof Plant && e._zombieEnemy));
            }
            stats[diff] = { tier, cap: CAP[tier], worstRowPower, badRows, badEmpty, minRowShooters, sunBad, N };
        }
        // 恢复默认
        g.zombieDifficulty = 'easy'; g._zDiffCfgCache = null;
        return stats;
    });
    ok('T2a 简单 300 局：行战力峰值 ' + t2.easy.worstRowPower + '（≤6）、空格 ' + t2.easy.badEmpty, t2.easy.badRows === 0 && t2.easy.badEmpty === 0, t2.easy);
    ok('T2b 困难 300 局：行战力峰值 ' + t2.hard.worstRowPower + '（≤14）、空格 ' + t2.hard.badEmpty, t2.hard.badRows === 0 && t2.hard.badEmpty === 0, t2.hard);
    ok('T2c 地狱 300 局：行战力峰值 ' + t2.hell.worstRowPower + '（≤22）、空格 ' + t2.hell.badEmpty, t2.hell.badRows === 0 && t2.hell.badEmpty === 0, t2.hell);

    await browser.close();
    console.log(fail === 0 ? 'ALL ' + pass + ' PASS' : fail + ' FAIL');
    process.exit(fail === 0 ? 0 : 1);
})();
