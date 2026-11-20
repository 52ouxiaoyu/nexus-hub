/* 验证 v3.2.38 新植物（杨桃/魅惑菇/南瓜壳/大嘴坚果）与图鉴修复
   S1  融合规则表：splitpea+sunflower → fusion_starfruit
   S2  规则表：puffshroom+garlic → fusion_hypnoshroom
   S3  规则表：wallnut+tallnut → fusion_pumpkinhead
   S4  规则表：chomper+wallnut → fusion_chomber_wallnut（修复图鉴有规则无）
   S5  手套融合产出杨桃（替换到目标格）
   S6  手套融合产出魅惑菇
   S7  手套融合 wallnut+tallnut → 目标保留并套南瓜壳(+4000)，源被消耗
   S8  手套融合产出大嘴坚果
   S9  杨桃对僵尸发射 star 星光弹并造成伤害
   S10 魅惑菇被僵尸吃下 → 僵尸被策反（hypnotized），蘑菇消失
   S11 被策反僵尸向右走、与同排敌方僵尸互斗（敌方掉血）
   S12 南瓜壳优先被啃（host 满血、shield 掉血），打穿后 host 才掉血
   S13 大嘴坚果咬死接近的僵尸
   S14 图鉴列表出现 杨桃/魅惑菇/南瓜壳/西瓜猫尾草/冰西瓜猫尾草/大嘴坚果
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

async function plant(page, type, r, c) {
    return page.evaluate((t, rr, cc) => {
        const g = window._pvzGame;
        g.board.addPlant(new Plant(g, t), rr, cc);
        return true;
    }, type, r, c);
}

async function gloveFuse(page, r1, c1, r2, c2) {
    return page.evaluate((a, b, c, d) => {
        const g = window._pvzGame;
        g.isGloveActive = true;
        const first = g.tryGloveInteraction(a, b);
        const second = g.tryGloveInteraction(c, d);
        return { first, second };
    }, r1, c1, r2, c2);
}

async function step(page, secs) {
    await page.evaluate((s) => {
        const g = window._pvzGame;
        const n = Math.ceil(s / 0.1);
        for (let i = 0; i < n; i++) g.update(0.1);
    }, secs);
}

async function typeAt(page, r, c) {
    return page.evaluate((rr, cc) => {
        const g = window._pvzGame;
        const p = g.board.grid[rr][cc];
        return p ? p.type : null;
    }, r, c);
}

async function addZombie(page, row, x, type) {
    return page.evaluate((rr, xx, t) => {
        const g = window._pvzGame;
        const z = new Zombie(g, rr, t || 'normal');
        z.x = xx;
        g.entities.push(z);
        return z;
    }, row, x, type);
}

async function evalv(page, fn, ...args) {
    return page.evaluate(fn, ...args);
}

(async () => {
    browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    // ===== S1-S4 规则表 =====
    {
        const p = await newPage();
        const r1 = await evalv(p, () => window._pvzGame.getFusionResult('splitpea', 'sunflower'));
        const r1b = await evalv(p, () => window._pvzGame.getFusionResult('sunflower', 'splitpea'));
        const r2 = await evalv(p, () => window._pvzGame.getFusionResult('puffshroom', 'garlic'));
        const r3 = await evalv(p, () => window._pvzGame.getFusionResult('wallnut', 'tallnut'));
        const r4 = await evalv(p, () => window._pvzGame.getFusionResult('chomper', 'wallnut'));
        ok('S1 杨桃规则(含反向)', r1 === 'fusion_starfruit' && r1b === 'fusion_starfruit', r1);
        ok('S2 魅惑菇规则', r2 === 'fusion_hypnoshroom', r2);
        ok('S3 南瓜壳规则', r3 === 'fusion_pumpkinhead', r3);
        ok('S4 大嘴坚果规则(修复)', r4 === 'fusion_chomper_wallnut', r4);
        await p.close();
    }

    // ===== S5 手套融合：杨桃 =====
    {
        const p = await newPage();
        await plant(p, 'splitpea', 0, 0);
        await plant(p, 'sunflower', 0, 1);
        await gloveFuse(p, 0, 0, 0, 1);
        const t = await typeAt(p, 0, 1);
        ok('S5 手套产出杨桃', t === 'fusion_starfruit', t);
        await p.close();
    }

    // ===== S6 手套融合：魅惑菇 =====
    {
        const p = await newPage();
        await plant(p, 'puffshroom', 1, 0);
        await plant(p, 'garlic', 1, 1);
        await gloveFuse(p, 1, 0, 1, 1);
        const t = await typeAt(p, 1, 1);
        ok('S6 手套产出魅惑菇', t === 'fusion_hypnoshroom', t);
        await p.close();
    }

    // ===== S7 手套融合：南瓜壳套在高坚果上 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 0, 0);
        await plant(p, 'tallnut', 0, 1);
        await gloveFuse(p, 0, 0, 0, 1);
        const res = await evalv(p, () => {
            const g = window._pvzGame;
            const host = g.board.grid[0][1];
            return {
                srcGone: g.board.grid[0][0] === null,
                hostType: host ? host.type : null,
                shieldHp: host && host.shield ? host.shield.hp : null,
                hasEl: !!(host && host.shieldEl)
            };
        });
        ok('S7 南瓜壳套在目标植物上(源消耗、目标保留+壳)', res.srcGone && res.hostType === 'tallnut' && res.shieldHp === 4000 && res.hasEl, JSON.stringify(res));

        // S12 僵尸先啃壳
        await addZombie(p, 0, 230); // tallnut 在 col1 x≈170
        await step(p, 4);
        const s12 = await evalv(p, () => {
            const g = window._pvzGame;
            const host = g.board.grid[0][1];
            const z = g.entities.find(e => e instanceof Zombie);
            return { shieldHp: host.shield ? host.shield.hp : null, hostHp: host.hp, zState: z ? z.state : null, zX: z ? z.x : null };
        });
        ok('S12 先啃南瓜壳(壳掉血、里面植物不掉)', s12.shieldHp !== null && s12.shieldHp < 4000 && s12.hostHp === 8000, JSON.stringify(s12));

        // 把壳血打空 → 打穿后植物才掉血
        await evalv(p, () => { const h = window._pvzGame.board.grid[0][1]; if (h && h.shield) h.shield.hp = 30; });
        await step(p, 2.5);
        const s12b = await evalv(p, () => {
            const g = window._pvzGame;
            const host = g.board.grid[0][1];
            return { shieldGone: host ? !host.shield && !host.shieldEl : false, hostHp: host ? host.hp : null };
        });
        ok('S12b 壳被打穿后植物才开始掉血', s12b.shieldGone && s12b.hostHp < 8000, JSON.stringify(s12b));
        await p.close();
    }

    // ===== S8 手套融合：大嘴坚果 + S13 咬死僵尸 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 2, 0);
        await plant(p, 'chomper', 2, 1);
        await gloveFuse(p, 2, 0, 2, 1);
        const t = await typeAt(p, 2, 1);
        ok('S8 手套产出大嘴坚果', t === 'fusion_chomper_wallnut', t);
        if (t === 'fusion_chomper_wallnut') {
            const st = await evalv(p, () => window._pvzGame.board.grid[2][1].state);
            ok('S8b 初始 idle(可咬)状态', st === 'idle', st);
            await addZombie(p, 2, 330); // col1 x≈170，僵尸在 330 走进 140 射程
            await step(p, 3);
            const s13 = await evalv(p, () => {
                const g = window._pvzGame;
                const nut = g.board.grid[2][1];
                const z = g.entities.find(e => e instanceof Zombie);
                return { nutState: nut ? nut.state : null, zHp: z ? z.hp : null, zDead: z ? z.isDead : false };
            });
            ok('S13 大嘴坚果咬死接近僵尸', s13.zHp !== null && (s13.zHp <= 0), JSON.stringify(s13));
        }
        await p.close();
    }

    // ===== S9 杨桃发射星光弹并伤害僵尸 =====
    {
        const p = await newPage();
        await plant(p, 'fusion_starfruit', 0, 1);
        await addZombie(p, 0, 700);
        await step(p, 3.5); // fireRate 1.5
        const s9 = await evalv(p, () => {
            const g = window._pvzGame;
            const stars = g.entities.filter(e => e instanceof Projectile && e.type === 'star').length;
            const z = g.entities.find(e => e instanceof Zombie);
            return { stars, zHp: z ? z.hp : null, zState: z ? z.state : null };
        });
        ok('S9 杨桃发射星光(star)', s9.stars > 0, JSON.stringify(s9));
        // 再走几秒让星命中（僵尸 20/s 向左，星 350/s 向右）
        await step(p, 3);
        const s9b = await evalv(p, () => {
            const g = window._pvzGame;
            const z = g.entities.find(e => e instanceof Zombie && !e.isDead);
            return { zHp: z ? z.hp : null };
        });
        ok('S9b 星光命中造成伤害', s9b.zHp !== null && s9b.zHp < 200, JSON.stringify(s9b));
        await p.close();
    }

    // ===== S10/S11 魅惑菇：吃下策反 + 友方肉搏敌方 =====
    {
        const p = await newPage();
        await plant(p, 'fusion_hypnoshroom', 0, 0); // x≈90
        await addZombie(p, 0, 150);
        await step(p, 2.5); // 僵尸走到蘑菇旁开吃
        const conv = await evalv(p, () => {
            const g = window._pvzGame;
            const z = g.entities.find(e => e instanceof Zombie);
            return { hypno: z ? z.hypnotized : null, plantGone: g.board.grid[0][0] === null };
        });
        ok('S10 僵尸吃魅惑菇后被策反、蘑菇消失', conv.hypno === true && conv.plantGone, JSON.stringify(conv));

        // 放一个敌方僵尸在同排前方 → 友方僵尸应向右迎战并咬伤对方
        await addZombie(p, 0, 420);
        await step(p, 5);
        const s11 = await evalv(p, () => {
            const g = window._pvzGame;
            const zombies = g.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
            const foe = zombies.find(e => !e.hypnotized);
            const ally = zombies.find(e => e.hypnotized);
            return { foeHp: foe ? foe.hp : null, allyX: ally ? ally.x : null, allyHp: ally ? ally.hp : null, foeX: foe ? foe.x : null };
        });
        ok('S11 友方僵尸向右迎战敌方(敌方掉血)', s11.foeHp !== null && s11.foeHp < 200, JSON.stringify(s11));
        await p.close();
    }

    // ===== S14 图鉴列表 =====
    {
        const p = await newPage();
        const txt = await evalv(p, () => {
            const g = window._pvzGame;
            if (!g._fusionUIInit) g.initFusionUI();
            const list = document.getElementById('recipe-list');
            return list ? list.innerText : '';
        });
        const need = ['杨桃', '魅惑菇', '南瓜壳', '西瓜猫尾草', '冰西瓜猫尾草', '大嘴坚果'];
        const missing = need.filter(n => !txt.includes(n));
        ok('S14 图鉴含全部新条目', missing.length === 0, '缺: ' + missing.join(','));
        await p.close();
    }

    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('====');
    console.log(failed.length === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed.length + ' / ' + results.length);
    process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
