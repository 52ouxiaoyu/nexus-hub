/* 验证 v3.2.34：融合植物特色升级
   T1 樱桃射手：普通弹=cherrypea(20)，第 10 发=minicherry
   T2 minicherry 命中爆炸：3×3 范围 900 伤害（原版樱桃 1800 的一半）
   T3 毁灭向日葵毁灭新星：每 12s 自身 5×5 内 400 暗影伤害，范围外不受影响
   T4 樱桃射手死亡爆炸（修复后）：3×3 1800，不再抛 game.zombies 错误
   T5 毁灭向日葵死亡大爆（修复后）：5×5 1800
   T6 普通向日葵不受新星影响（回归）
*/
const puppeteer = require('puppeteer');
const URL = 'file:///Users/clawbox/nexus-hub/pvz-web/index.html';
const results = [];
let browser, pageErrors = 0;
function ok(name, cond, extra) { results.push({ name, pass: !!cond }); console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); }

async function newPage() {
    const p = await browser.newPage();
    p.on('pageerror', e => { pageErrors++; console.log('PAGEERROR:', e.message); });
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 400));
    await p.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = true;
        g.state = 'PLAYING';
        g.sunCount = 99999; g.cooldowns = {};
    });
    return p;
}
const step = (page, s) => page.evaluate((sec) => { const g = window._pvzGame; const n = Math.ceil(sec / 0.1); for (let i = 0; i < n; i++) g.update(0.1); }, s);
// 直接放一株融合植物到 (row,col)
const putPlant = (page, type, r, c) => page.evaluate((t, rr, cc) => {
    const g = window._pvzGame;
    const p = new Plant(g, t);
    g.board.addPlant(p, rr, cc);
    return p;
}, type, r, c);
// 放一只僵尸 (row, x)，返回其句柄引用（后续通过 evaluate 查询）
const putZombie = (page, r, x, hp) => page.evaluate((rr, xx, hh) => {
    const g = window._pvzGame;
    const z = new Zombie(g, rr, 'normal');
    z.x = xx;
    z.hp = hh; z.maxHp = hh;
    g.entities.push(z);
    return { id: g.entities.indexOf(z), row: rr, x: xx, hp: hh };
}, r, x, hp);
const zombieHp = (page, idx) => page.evaluate((i) => {
    const z = window._pvzGame.entities[i];
    return z && !z.isDead ? z.hp : (z ? -1 : 'gone');
}, idx);

(async () => {
    browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });

    // T1 樱桃射手射击序列：patch 记录弹种
    {
        const page = await newPage();
        await page.evaluate(() => {
            window.__shotLog = [];
            const Orig = Projectile;
            function Patched(...a) {
                const p = new Orig(...a);
                if (p.type === 'cherrypea' || p.type === 'minicherry') window.__shotLog.push(p.type);
                return p;
            }
            Patched.prototype = Orig.prototype;
            Projectile = Patched;
        });
        // 射手放 (3,3)，加速射速；三只高血僵尸同排远处保证始终有目标
        await page.evaluate(() => {
            const g = window._pvzGame;
            const p = new Plant(g, 'fusion_cherrybomb_peashooter');
            g.board.addPlant(p, 3, 3);
            p.fireRate = 0.2; // 测试加速
            for (const x of [680, 750, 900]) {
                const z = new Zombie(g, 3, 'normal');
                z.x = x; z.hp = 5000; z.maxHp = 5000;
                g.entities.push(z);
            }
        });
        await step(page, 2.6); // ~13 发
        const log = await page.evaluate(() => window.__shotLog);
        ok('T1 至少射出 12 发', log.length >= 12, 'n=' + log.length);
        ok('T1 第 10 发是小樱桃炸弹', log.length >= 10 && log[9] === 'minicherry', 'log[9]=' + log[9]);
        ok('T1 前 9 发全是樱桃红豌豆', log.slice(0, 9).every(x => x === 'cherrypea'));
        ok('T1 期间无页面错误', pageErrors === 0, 'pageErrors=' + pageErrors);
        await page.close();
    }

    // T2 minicherry 命中爆炸 3×3 900
    {
        pageErrors = 0;
        const page = await newPage();
        const a = await putZombie(page, 3, 700, 5000); // 撞击目标
        const b = await putZombie(page, 3, 780, 5000); // 同行 x差80 溅射
        const c = await putZombie(page, 2, 730, 5000); // 邻行 溅射
        const d = await putZombie(page, 1, 1000, 5000); // 远处 不受影响
        await page.evaluate(() => {
            const g = window._pvzGame;
            const y3 = g.board.offsetY + 3 * g.board.cellHeight + g.board.cellHeight / 2 - 20;
            g.entities.push(new Projectile(g, 630, y3, 3, 'minicherry'));
        });
        await step(page, 0.9);
        const hps = await page.evaluate(() => {
            const zs = window._pvzGame.entities.filter(e => e instanceof Zombie && !e.isDead);
            return zs.map(z => Math.round(z.hp));
        });
        const nDead = await page.evaluate(() => window._pvzGame.entities.filter(e => e instanceof Zombie && e.isDead).length);
        // 5000-900=4100 的被炸中；d 应 5000
        const hpA = await zombieHp(page, 0), hpB = await zombieHp(page, 1), hpC = await zombieHp(page, 2), hpD = await zombieHp(page, 3);
        ok('T2 目标僵尸掉 900 (5000->4100)', hpA === 4100, 'hpA=' + hpA);
        ok('T2 同行溅射掉 900', hpB === 4100, 'hpB=' + hpB);
        ok('T2 邻行溅射掉 900', hpC === 4100, 'hpC=' + hpC);
        ok('T2 远处(>1.5格)不掉血', hpD === 5000, 'hpD=' + hpD);
        ok('T2 无页面错误', pageErrors === 0, 'err=' + pageErrors);
        await page.close();
    }

    // T3 毁灭向日葵：12s 毁灭新星 5×5 400
    {
        pageErrors = 0;
        const page = await newPage();
        const z1 = await putZombie(page, 3, 470, 5000); // 命中(同列附近)
        const z2 = await putZombie(page, 1, 520, 5000); // 命中(row差2 x差190)
        const z3 = await putZombie(page, 3, 900, 5000); // 远处 miss
        await putPlant(page, 'fusion_doomshroom_sunflower', 3, 3); // x=330,y=435
        await page.evaluate(() => { const g = window._pvzGame; g.board.grid[3][3].doomNovaTimer = 11.9; });
        await step(page, 0.3); // 越过 12s 触发一次新星
        const h1 = await zombieHp(page, 0), h2 = await zombieHp(page, 1), h3 = await zombieHp(page, 2);
        ok('T3 5×5 内 z1 掉 400', h1 === 4600, 'h1=' + h1);
        ok('T3 5×5 内 z2(row±2) 掉 400', h2 === 4600, 'h2=' + h2);
        ok('T3 范围外 z3 不掉血', h3 === 5000, 'h3=' + h3);
        ok('T3 无页面错误', pageErrors === 0, 'err=' + pageErrors);
        await page.close();
    }

    // T4 樱桃射手死亡爆炸（修复：不再遍历不存在的 game.zombies）
    {
        pageErrors = 0;
        const page = await newPage();
        const z1 = await putZombie(page, 3, 470, 5000);
        const z2 = await putZombie(page, 2, 400, 5000);  // row差1 x差70 → 3×3 内
        const z3 = await putZombie(page, 3, 900, 5000); // 远处不受影响
        await putPlant(page, 'fusion_cherrybomb_peashooter', 3, 3);
        await page.evaluate(() => { const g = window._pvzGame; const p = g.board.grid[3][3]; p.hp = 0; });
        await step(page, 0.2);
        const h1 = await zombieHp(page, 0), h2 = await zombieHp(page, 1), h3 = await zombieHp(page, 2);
        const gridClear = await page.evaluate(() => window._pvzGame.board.grid[3][3] === null);
        ok('T4 死亡爆炸 3×3 1800', h1 === 3200 && h2 === 3200, 'h1=' + h1 + ' h2=' + h2);
        ok('T4 范围外不掉血', h3 === 5000, 'h3=' + h3);
        ok('T4 植物格已清空', gridClear === true);
        ok('T4 无页面错误(修复 game.zombies)', pageErrors === 0, 'err=' + pageErrors);
        await page.close();
    }

    // T5 毁灭向日葵死亡大爆 5×5 1800
    {
        pageErrors = 0;
        const page = await newPage();
        const z1 = await putZombie(page, 3, 460, 5000);
        const z2 = await putZombie(page, 1, 500, 5000);  // row差2 & x差170 → 命中 5×5
        const z3 = await putZombie(page, 3, 900, 5000);  // miss
        await putPlant(page, 'fusion_doomshroom_sunflower', 3, 3);
        await page.evaluate(() => { const g = window._pvzGame; const p = g.board.grid[3][3]; p.hp = 0; });
        await step(page, 0.2);
        const h1 = await zombieHp(page, 0), h2 = await zombieHp(page, 1), h3 = await zombieHp(page, 2);
        ok('T5 死亡大爆 5×5 1800', h1 === 3200 && h2 === 3200, 'h1=' + h1 + ' h2=' + h2);
        ok('T5 范围外不掉血', h3 === 5000, 'h3=' + h3);
        ok('T5 无页面错误', pageErrors === 0, 'err=' + pageErrors);
        await page.close();
    }

    // T6 回归：普通向日葵 13s 无异常、无新星、照常产阳光
    {
        pageErrors = 0;
        const page = await newPage();
        await page.evaluate(() => { const g = window._pvzGame; g.tryPlanting('sunflower', 2, 2); });
        const sunsBefore = await page.evaluate(() => window._pvzGame.entities.filter(e => e instanceof Sun).length);
        await step(page, 0.5);
        await page.evaluate(() => { window._pvzGame.entities.forEach(e => { if (e instanceof Sun) e.hp = 0; }); });
        await step(page, 13.0);
        const sunsAfter = await page.evaluate(() => window._pvzGame.entities.filter(e => e instanceof Sun && !e.isDead).length);
        ok('T6 向日葵 13s 内正常产阳光(约1次)', sunsAfter >= 1, 'suns=' + sunsAfter);
        ok('T6 无页面错误', pageErrors === 0, 'err=' + pageErrors);
        await page.close();
    }

    await browser.close();
    const failed = results.filter(r => !r.pass).length;
    console.log('==== 结果: ' + (results.length - failed) + '/' + results.length + ' 通过 ====');
    process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
