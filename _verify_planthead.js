/* 验证植物头僵尸（融合进化专属）
   T1 融合模式波次会刷出 4 种植物头僵尸
   T2 经典冒险模式永不刷植物头僵尸
   T3 peahead 创建：DOM 出现豌豆头 overlay & hp=560
   T4 破甲：hp<=200 植物头掉落(动画后 DOM 移除)
   T5 头部位置随僵尸移动同步
   T6 nuthead hp=1300 & sunhead 死亡掉阳光 & snowpeahead 免疫减速(破甲前免疫/破甲后失效)
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
const step = (page, s) => page.evaluate((sec) => { const g = window._pvzGame; const n = Math.ceil(sec / 0.1); for (let i = 0; i < n; i++) g.update(0.1); }, s);
const addZ = (page, type, row) => page.evaluate((t, r) => { const g = window._pvzGame; const z = new Zombie(g, r, t); z.x = 700 - r * 10; g.entities.push(z); return z; }, type, row);
const headEls = (page) => page.evaluate(() => {
    const imgs = [...document.querySelectorAll('#entity-layer img')];
    return imgs.filter(i => /Plants\/(Peashooter|WallNut|SunFlower|SnowPea)\//.test(i.src)).length;
});

(async () => {
    browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });

    // T1 融合模式波次会刷出植物头僵尸
    {
        const page = await newPage(true);
        const cnt = await page.evaluate(() => {
            const g = window._pvzGame;
            g.waveManager.timeElapsed = 300;
            const count = { peahead: 0, nuthead: 0, sunhead: 0, snowpeahead: 0 };
            for (let i = 0; i < 600; i++) {
                const t = (() => { g.waveManager.spawnZombie(); return null; })();
                const z = g.entities[g.entities.length - 1];
                if (z && z.type in count) count[z.type]++;
                g.entities.pop(); // 不保留实体只统计
                if (z && z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
            }
            return count;
        });
        const total = cnt.peahead + cnt.nuthead + cnt.sunhead + cnt.snowpeahead;
        ok('T1 融合模式波次刷出植物头僵尸', total > 0, JSON.stringify(cnt) + ' total=' + total);
        ok('T1 四种都有出现', cnt.peahead > 0 && cnt.nuthead > 0 && cnt.sunhead > 0 && cnt.snowpeahead > 0, JSON.stringify(cnt));
        await page.close();
    }

    // T2 经典冒险模式永不刷植物头僵尸
    {
        const page = await newPage(false);
        const cnt = await page.evaluate(() => {
            const g = window._pvzGame;
            g.waveManager.timeElapsed = 900; // 后期也不出现
            const bad = {};
            for (let i = 0; i < 600; i++) {
                g.waveManager.spawnZombie();
                const z = g.entities[g.entities.length - 1];
                if (z && (z.type === 'peahead' || z.type === 'nuthead' || z.type === 'sunhead' || z.type === 'snowpeahead')) bad[z.type] = (bad[z.type] || 0) + 1;
                g.entities.pop();
                if (z && z.element && z.element.parentNode) z.element.parentNode.removeChild(z.element);
            }
            return bad;
        });
        ok('T2 经典模式无植物头僵尸', Object.keys(cnt).length === 0, JSON.stringify(cnt));
        await page.close();
    }

    // T3 peahead 创建：DOM 出现豌豆头 overlay & hp=560 & 素材正确
    {
        const page = await newPage(true);
        const info = await page.evaluate(() => {
            const g = window._pvzGame;
            const z = new Zombie(g, 2, 'peahead');
            z.x = 700; g.entities.push(z);
            const heads = [...document.querySelectorAll('#entity-layer img')].filter(i => /Plants\/Peashooter\//.test(i.src));
            return { hp: z.hp, headCount: heads.length, headTop: heads.length ? heads[0].style.top : null, headLeft: heads.length ? heads[0].style.left : null, bodySrc: z.element.src.split('/').pop(), zIndex: heads.length ? heads[0].style.zIndex : null, bodyTop: z.y + z.yOffset };
        });
        ok('T3 peahead hp=560', info.hp === 560, 'hp=' + info.hp);
        ok('T3 DOM 出现豌豆头 overlay', info.headCount === 1, 'count=' + info.headCount);
        ok('T3 头悬在身体头顶之上', info.headTop !== null && parseFloat(info.headTop) < info.bodyTop, 'headTop=' + info.headTop + ' bodyTop=' + info.bodyTop);
        await page.close();
    }

    // T4 破甲：掉头后 DOM 移除 & 仍可继续行走(不报错)
    {
        const page = await newPage(true);
        await addZ(page, 'peahead', 2);
        await step(page, 0.3);
        let before = await headEls(page);
        await page.evaluate(() => {
            const g = window._pvzGame;
            const z = g.entities.find(e => e instanceof Zombie && e.type === 'peahead');
            z.takeDamage(400); // 560->160 <= 200 破甲
        });
        await step(page, 0.2);
        await new Promise(r => setTimeout(r, 800)); // 等 0.5s 掉落动画移除
        let after = await headEls(page);
        const hpAfter = await page.evaluate(() => { const g = window._pvzGame; const z = g.entities.find(e => e instanceof Zombie && e.type === 'peahead'); return z ? z.hp : -1; });
        await step(page, 1.0); // 破甲后继续跑无错
        ok('T4 破甲前头存在', before === 1, 'before=' + before);
        ok('T4 破甲后头掉落移除', after === 0, 'after=' + after + ' hp=' + hpAfter);
        await page.close();
    }

    // T5 头部位置随僵尸移动同步
    {
        const page = await newPage(true);
        const pos1 = await addZ(page, 'peahead', 3);
        await step(page, 0.2);
        const xy1 = await page.evaluate(() => {
            const g = window._pvzGame;
            const z = g.entities.find(e => e instanceof Zombie && e.type === 'peahead');
            return { x: z.x, headLeft: z.headEl.style.left };
        });
        await step(page, 1.5); // 行走 1.5s (~30px)
        const xy2 = await page.evaluate(() => {
            const g = window._pvzGame;
            const z = g.entities.find(e => e instanceof Zombie && e.type === 'peahead');
            return { x: z.x, headLeft: z.headEl.style.left };
        });
        const moved = xy2.x - xy1.x;
        const headMoved = parseFloat(xy2.headLeft) - parseFloat(xy1.headLeft);
        ok('T5 僵尸移动后头部同步左移', moved < -10 && Math.abs(headMoved - moved) < 2, 'x ' + xy1.x.toFixed(1) + '->' + xy2.x.toFixed(1) + ' head ' + xy1.headLeft + '->' + xy2.headLeft);
        await page.close();
    }

    // T6 nuthead 高血 / sunhead 死亡掉阳光 / snowpeahead 免疫
    {
        const page = await newPage(true);
        await addZ(page, 'nuthead', 1);
        await addZ(page, 'sunhead', 2);
        await addZ(page, 'snowpeahead', 4);
        await step(page, 0.3);
        const r1 = await page.evaluate(() => {
            const g = window._pvzGame;
            const nut = g.entities.find(e => e instanceof Zombie && e.type === 'nuthead');
            const snow = g.entities.find(e => e instanceof Zombie && e.type === 'snowpeahead');
            // 免疫测试：完整头时
            snow.setSlow(10);
            const immune = !snow.isSlowed;
            // 普通僵尸对照
            const nz = new Zombie(g, 0, 'normal'); g.entities.push(nz);
            nz.setSlow(10);
            const normalSlowed = nz.isSlowed;
            nz.hp = 0;
            return { nutHp: nut.hp, immune, normalSlowed };
        });
        ok('T6 nuthead hp=1300', r1.nutHp === 1300, 'hp=' + r1.nutHp);
        ok('T6 寒冰头免疫减速(普通对照生效)', r1.immune === true && r1.normalSlowed === true, JSON.stringify(r1));

        // 破甲(打掉寒冰头)后不再免疫
        const r2 = await page.evaluate(() => {
            const g = window._pvzGame;
            const snow = g.entities.find(e => e instanceof Zombie && e.type === 'snowpeahead');
            snow.takeDamage(300); // 420 -> 120 <=150
            return null;
        });
        await step(page, 0.2);
        await new Promise(r => setTimeout(r, 800));
        const r3 = await page.evaluate(() => {
            const g = window._pvzGame;
            const snow = g.entities.find(e => e instanceof Zombie && e.type === 'snowpeahead');
            const headGone = !snow.headEl;
            snow.setSlow(10);
            return { headGone, slowAfter: snow.isSlowed };
        });
        ok('T6 破甲后头移除且不再免疫', r3.headGone && r3.slowAfter === true, JSON.stringify(r3));

        // sunhead 死亡掉阳光
        const r4 = await page.evaluate(() => {
            const g = window._pvzGame;
            const sun = g.entities.find(e => e instanceof Zombie && e.type === 'sunhead');
            sun.hp = 0;
            const before = g.entities.filter(e => e instanceof Sun).length;
            return before;
        });
        await step(page, 0.2);
        const r5 = await page.evaluate(() => {
            const g = window._pvzGame;
            return g.entities.filter(e => e instanceof Sun).length;
        });
        ok('T6 sunhead 死亡掉阳光', r5 > r4, 'sun before=' + r4 + ' after=' + r5);
        // 杀掉所有剩余僵尸，等掉落动画结束，确认植物头 DOM 全部清除、无泄漏
        await page.evaluate(() => {
            const g = window._pvzGame;
            g.entities.filter(e => e instanceof Zombie).forEach(z => { z.hp = 0; });
        });
        await step(page, 0.2);
        await new Promise(r => setTimeout(r, 1100)); // 等 >550ms 掉落动画 + DYING
        const r6 = await headEls(page);
        const aliveZombies = await page.evaluate(() => window._pvzGame.entities.filter(e => e instanceof Zombie && !e.isDead).length);
        ok('T6 僵尸全死后无植物头 DOM 残留', r6 === 0, 'left=' + r6 + ' aliveZ=' + aliveZombies);
        await page.close();
    }

    console.log('\n==== ' + results.filter(r => r.pass).length + '/' + results.length + ' passed ====');
    await browser.close();
    process.exit(results.every(r => r.pass) ? 0 : 1);
})();
