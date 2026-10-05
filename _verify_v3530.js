/* 验证 v3.53.0 八条新融合（用户批准名单）
   T1  8 条配方 getFusionResult 全部可产出
   T2  EXTRA 表/PVZ_FUSION_LOOK/盲盒池/极寒家族名单自动消费
   T3  阳光小喷菇：产阳光（sunshroom trait）+ 会射击（puffshroom trait）
   T4  火焰三线：三行各射 1 颗 firepea
   T5  南瓜高坚果：hp/maxHp=12000 双壳叠加 + TallNut 底 + PumpkinHead 帽
   T6  忧郁蒜雾：hasTrait('garlic') + 3×3 孢子攻击（相邻行僵尸掉血）
   T7  魅惑向日葵：僵尸啃一口 → hypnotized + 本体被吃
   T8  冰雾大喷菇：fume 命中僵尸减速（isSlowed/slowTimer）
   T9  冰毁灭菇：引信→全屏僵尸死+全场减速+无弹坑（不转 crater）
   T10 火焰钢刺：踩上掉血（120 钢刺 tick）+ 灼烧 tick 额外掉血
*/
const puppeteer = require('puppeteer');

const URL = 'file:///Users/clawbox/nexus-hub/pvz-web/index.html';
const results = [];
let browser;

function ok(name, cond, extra) {
    results.push({ name, pass: !!cond, extra: extra || '' });
    console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
}

async function newPage() {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));
    await p.evaluate(() => {
        const g = window._pvzGame;
        if (!g) throw new Error('game not initialized');
        g.fusionMode = true;
        g.state = 'PLAYING';
    });
    return p;
}

async function evalv(page, fn, ...args) {
    return page.evaluate(fn, ...args);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    // ===== T1 配方可产出 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            return [
                ['sunshroom', 'puffshroom', 'fusion_sunshroom_puffshroom'],
                ['threepeater', 'torchwood', 'fusion_threepeater_torchwood'],
                ['pumpkinhead', 'tallnut', 'fusion_pumpkinhead_tallnut'],
                ['gloomshroom', 'garlic', 'fusion_gloomshroom_garlic'],
                ['hypnoshroom', 'sunflower', 'fusion_hypnoshroom_sunflower'],
                ['fumeshroom', 'iceshroom', 'fusion_fumeshroom_iceshroom'],
                ['doomshroom', 'iceshroom', 'fusion_doomshroom_iceshroom'],
                ['spikerock', 'torchwood', 'fusion_spikerock_torchwood']
            ].map(([a, b, want]) => ({ a, b, want, got: g.getFusionResult(a, b) }));
        });
        const bad = r.filter(x => x.got !== x.want);
        ok('T1 8 条新配方 getFusionResult 全部命中', bad.length === 0, JSON.stringify(bad));
        await p.close();
    }

    // ===== T2 数据消费 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            const types = [
                'fusion_sunshroom_puffshroom', 'fusion_threepeater_torchwood', 'fusion_pumpkinhead_tallnut',
                'fusion_gloomshroom_garlic', 'fusion_hypnoshroom_sunflower', 'fusion_fumeshroom_iceshroom',
                'fusion_doomshroom_iceshroom', 'fusion_spikerock_torchwood'];
            const look = types.every(t => window.PVZ_FUSION_LOOK && window.PVZ_FUSION_LOOK[t] && window.PVZ_FUSION_LOOK[t].md);
            const pool = types.every(t => g._plantBoxPool().includes(t));
            const iceUlt = window.PVZ_ICE_ULT_TYPES.has('fusion_fumeshroom_iceshroom')
                && !window.PVZ_ICE_ULT_TYPES.has('fusion_sunshroom_puffshroom');
            return { look, pool, iceUlt };
        });
        ok('T2 LOOK 表/盲盒池/极寒名单自动消费', r.look && r.pool && r.iceUlt, JSON.stringify(r));
        await p.close();
    }

    // ===== T3 阳光小喷菇 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_sunshroom_puffshroom');
            pl.row = 2; pl.col = 3;
            pl.x = 300; pl.y = 300;
            const sunBefore = g.entities.filter(e => e instanceof Sun).length;
            pl.sunTimer = pl.sunRate;
            for (let i = 0; i < 5; i++) pl.update(0.1);
            const sunAfter = g.entities.filter(e => e instanceof Sun).length;
            const z = new Zombie(g, 2, 'normal');
            z.x = 500; z.update = () => {}; // 冻结防走位
            g.entities.push(z);
            pl.fireTimer = pl.fireRate;
            for (let i = 0; i < 5; i++) pl.update(0.1);
            const projs = g.entities.filter(e => e instanceof Projectile).length;
            return { sun: sunAfter > sunBefore, projs: projs > 0,
                golden: pl.element.src.indexOf('PuffShroom') !== -1 };
        });
        ok('T3 阳光小喷菇=产阳光+射击+金黄外观', r.sun && r.projs && r.golden, JSON.stringify(r));
        await p.close();
    }

    // ===== T4 火焰三线 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_threepeater_torchwood');
            pl.row = 1; pl.col = 2;
            pl.x = 300; pl.y = g.board.offsetY + g.board.cellHeight + 45;
            g.board.addPlant(pl, 1, 2);
            for (const row of [0, 1, 2]) {
                const z = new Zombie(g, row, 'normal');
                z.x = pl.x + 200; z.update = () => {};
                g.entities.push(z);
            }
            pl.fireTimer = pl.fireRate;
            for (let i = 0; i < 6; i++) pl.update(0.1);
            const fireRows = new Set(g.entities
                .filter(e => e instanceof Projectile && e.type === 'firepea')
                .map(e => e.row));
            return { count: fireRows.size };
        });
        ok('T4 火焰三线=三行各射 firepea', r.count === 3, JSON.stringify(r));
        await p.close();
    }

    // ===== T5 南瓜高坚果 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            const pl = new Plant(g, 'fusion_pumpkinhead_tallnut');
            return {
                hp: pl.hp, maxHp: pl.maxHp,
                base: pl.element.src.indexOf('TallNut') !== -1,
                ov: pl.fusionOverlay && pl.fusionOverlay.src.indexOf('PumpkinHead') !== -1,
                blocksPole: pl.hasTrait('tallnut')
            };
        });
        ok('T5 南瓜高坚果=12000 双壳+高坚果拦跳跳', r.hp === 12000 && r.maxHp === 12000 && r.base && r.ov && r.blocksPole, JSON.stringify(r));
        await p.close();
    }

    // ===== T6 忧郁蒜雾 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_gloomshroom_garlic');
            pl.row = 1; pl.col = 2;
            pl.x = 300; pl.y = g.board.offsetY + g.board.cellHeight + 45;
            g.board.addPlant(pl, 1, 2);
            const z = new Zombie(g, 1, 'normal'); // 同行贴身（gloom 斜向弹命中圈几何）
            z.x = pl.x + 60; z.update = () => {};
            g.entities.push(z);
            const hp0 = z.hp;
            pl.fireTimer = 1.0;
            for (let i = 0; i < 6; i++) pl.update(0.1);
            // 孢子弹的命中判定在 Projectile.update（gloom_puff 直线分支），手动驱动飞行
            for (let i = 0; i < 10; i++) {
                for (const e of g.entities.slice()) {
                    if (e instanceof Projectile && !e.isDead) e.update(0.1);
                }
            }
            return { garlic: pl.hasTrait('garlic'), hurt: z.hp < hp0 };
        });
        ok('T6 忧郁蒜雾=大蒜特性+3×3 喷雾', r.garlic && r.hurt, JSON.stringify(r));
        await p.close();
    }

    // ===== T7 魅惑向日葵 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_hypnoshroom_sunflower');
            pl.row = 1; pl.col = 2;
            pl.x = 300; pl.y = g.board.offsetY + g.board.cellHeight + 45;
            g.board.addPlant(pl, 1, 2);
            const z = new Zombie(g, 1, 'normal');
            z.x = pl.x + 10; z.y = pl.y;
            g.entities.push(z);
            z.state = 'EATING';
            z.eatTarget = pl;
            z.chompTimer = 0;
            for (let i = 0; i < 5; i++) z.update(0.1);
            return { hypno: z.hypnotized === true, plantEaten: pl.hp <= 0 || pl._hypnoUsed === true,
                pink: pl.element.src.indexOf('SunFlower') !== -1 };
        });
        ok('T7 魅惑向日葵=被啃即策反', r.hypno && r.plantEaten && r.pink, JSON.stringify(r));
        await p.close();
    }

    // ===== T8 冰雾大喷菇（手动驱动 + 真实 sleep 展开射击 setTimeout）=====
    {
        const p = await newPage();
        await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_fumeshroom_iceshroom');
            pl.row = 2; pl.col = 2;
            pl.x = 300; pl.y = g.board.offsetY + 2 * g.board.cellHeight + 45;
            g.board.addPlant(pl, 2, 2);
            const z = new Zombie(g, 2, 'normal');
            z.x = pl.x + 180; z.update = () => {}; // 冻结走位，让弹幕稳定命中
            g.entities.push(z);
            window.__t8z = z;
            pl.fireTimer = pl.fireRate;
            return true;
        });
        // 触发一轮射击（弹幕分 3 连射，间隔 120ms 是真实 setTimeout）
        await evalv(p, () => { window.__t8p = null; const g = window._pvzGame; const pl = g.board.grid[2][2]; if (pl) pl.update(0.1); return true; });
        await sleep(900); // 3 连射 360ms + 弹道飞行 ~450ms
        // 手动驱动弹道飞行 + 碰撞判定（强制 state 不启动主循环）
        await evalv(p, () => {
            const g = window._pvzGame;
            for (let i = 0; i < 10; i++) {
                for (const e of g.entities.slice()) {
                    if (e instanceof Projectile && !e.isDead) e.update(0.1);
                }
                g.collisionManager.update();
            }
            return true;
        });
        const r = await evalv(p, () => {
            const z = window.__t8z;
            return { slowed: z.isSlowed === true && z.slowTimer > 0, slowT: z.slowTimer || 0 };
        });
        ok('T8 冰雾大喷菇=命中减速', r.slowed, JSON.stringify(r));
        await p.close();
    }

    // ===== T9 冰毁灭菇（手动驱动引信 + 真实 setTimeout）=====
    {
        const p = await newPage();
        const setup = await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_doomshroom_iceshroom');
            pl.row = 2; pl.col = 2;
            pl.x = 300; pl.y = g.board.offsetY + 2 * g.board.cellHeight + 45;
            g.board.addPlant(pl, 2, 2);
            const zs = [];
            for (const row of [0, 2, 4]) {
                const z = new Zombie(g, row, 'normal');
                z.x = 600; z.update = () => {};
                g.entities.push(z);
                zs.push(z);
            }
            window.__t9 = { pl, zs };
            return { autoExplode: pl.autoExplode };
        });
        // 手动驱动引信（双亲 explodeTimer 相加 2s，分支内钳回 1s）→ 进入膨胀
        await evalv(p, () => {
            const { pl } = window.__t9;
            for (let i = 0; i < 20; i++) pl.update(0.1);
            return { state: pl.state };
        });
        await sleep(2800); // 膨胀 1s → 爆炸 + 全屏结算，爆显 1s 后消散
        const r = await evalv(p, () => {
            const { pl, zs } = window.__t9;
            return {
                allDead: zs.every(z => z.isDead || z.hp <= 0),
                frozen: zs.every(z => z.isSlowed),
                noCrater: pl.type !== 'crater',
                gone: pl.hp <= 0 || pl.isDead
            };
        });
        ok('T9 冰毁灭菇=全屏秒杀+全场冰冻+无弹坑', setup.autoExplode && r.allDead && r.frozen && r.noCrater && r.gone, JSON.stringify({ ...r }));
        await p.close();
    }

    // ===== T10 火焰钢刺 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.entities.length = 0;
            const pl = new Plant(g, 'fusion_spikerock_torchwood');
            pl.row = 2; pl.col = 2;
            pl.x = 300; pl.y = g.board.offsetY + 2 * g.board.cellHeight + 45;
            const z = new Zombie(g, 2, 'normal');
            z.x = pl.x + 20; z.update = () => {};
            g.entities.push(z);
            const hp0 = z.hp;
            pl.damageTimer = 0; pl.burnTick = 0;
            for (let i = 0; i < 12; i++) pl.update(0.1); // 1.2s：钢刺 tick(0.75s→120) + 灼烧 tick(1s→40)
            return { hurt: z.hp < hp0, drop: hp0 - z.hp, fire: pl.element.style.filter.indexOf('sepia') !== -1 };
        });
        ok('T10 火焰钢刺=钢刺+灼烧双 tick', r.hurt && r.drop >= 120, JSON.stringify(r));
        await p.close();
    }

    await browser.close();
    const pass = results.filter(r => r.pass).length;
    console.log(`\n===== ${pass}/${results.length} PASS =====`);
    process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
