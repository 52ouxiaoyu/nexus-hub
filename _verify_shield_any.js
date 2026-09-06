/* 验证 v3.3.1 南瓜壳"可套任意植物"
   S1  墙果(wallnut)拖向日葵 → 向日葵保留并套壳(+4000)，墙果消耗
   S2  墙果拖豌豆 → 配方优先：融合为 坚果射手(fusion_nutshooter)，不套壳
   S3  墙果拖樱桃炸弹 → 拒绝(一次性植物不可套)，两株都保留
   S4  高坚果拖已套壳向日葵 → 拒绝(已套)，材料还原
   S5  高坚果(tallnut)拖向日葵 → 套壳成功，宿主向日葵保留
   S6  墙果拖墙果(同种) → 第二株套壳成功
   S7  向日葵(非材料)拖墙果 → 仍提示无法融合，两株保留
   S8  回归：wallnut+tallnut 仍套壳(原组合不破坏)
   S9  僵尸啃"被套壳的向日葵"：先啃壳，向日葵不掉血不消失
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

async function cellInfo(page, r, c) {
    return page.evaluate((rr, cc) => {
        const g = window._pvzGame;
        const p = g.board.grid[rr][cc];
        return p ? { type: p.type, shield: p.shield ? p.shield.hp : null, hasEl: !!p.shieldEl } : null;
    }, r, c);
}

async function addZombie(page, row, x) {
    return page.evaluate((rr, xx) => {
        const g = window._pvzGame;
        const z = new Zombie(g, rr, 'normal');
        z.x = xx;
        g.entities.push(z);
        return z;
    }, row, x);
}

async function step(page, secs) {
    await page.evaluate((s) => {
        const g = window._pvzGame;
        const n = Math.ceil(s / 0.1);
        for (let i = 0; i < n; i++) g.update(0.1);
    }, secs);
}

(async () => {
    browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    // ===== S1 墙果→向日葵 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 0, 0);
        await plant(p, 'sunflower', 0, 1);
        await gloveFuse(p, 0, 0, 0, 1);
        const src = await cellInfo(p, 0, 0);
        const host = await cellInfo(p, 0, 1);
        ok('S1 墙果拖向日葵=套壳成功(源消失/宿主向日葵带壳)', src === null && host && host.type === 'sunflower' && host.shield === 4000 && host.hasEl, JSON.stringify({ src, host }));
        await p.close();
    }

    // ===== S2 墙果→豌豆：配方优先融合坚果射手 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 1, 0);
        await plant(p, 'peashooter', 1, 1);
        await gloveFuse(p, 1, 0, 1, 1);
        const host = await cellInfo(p, 1, 1);
        ok('S2 墙果+豌豆仍走配方=坚果射手(不套壳)', host && host.type === 'fusion_nutshooter' && host.shield === null, JSON.stringify(host));
        await p.close();
    }

    // ===== S3 墙果→樱桃：拒绝 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 2, 0);
        await plant(p, 'cherrybomb', 2, 1);
        await gloveFuse(p, 2, 0, 2, 1);
        const src = await cellInfo(p, 2, 0);
        const host = await cellInfo(p, 2, 1);
        ok('S3 樱桃不可套(两株都保留)', src && src.type === 'wallnut' && host && host.type === 'cherrybomb' && host.shield === null, JSON.stringify({ src, host }));
        await p.close();
    }

    // ===== S4 已套壳宿主：拒绝 =====
    {
        const p = await newPage();
        await plant(p, 'sunflower', 3, 0);
        await plant(p, 'wallnut', 3, 1);
        await gloveFuse(p, 3, 1, 3, 0); // 先给向日葵套上
        const before = await cellInfo(p, 3, 0);
        await plant(p, 'tallnut', 3, 2);
        await gloveFuse(p, 3, 2, 3, 0); // 高坚果再拖已套壳向日葵
        const host = await cellInfo(p, 3, 0);
        const mat = await cellInfo(p, 3, 2);
        ok('S4 已套壳宿主拒绝再套(材料还原)', before && before.shield === 4000 && host && host.shield === 4000 && mat && mat.type === 'tallnut', JSON.stringify({ before, host, mat }));
        await p.close();
    }

    // ===== S5 高坚果→向日葵 =====
    {
        const p = await newPage();
        await plant(p, 'tallnut', 4, 0);
        await plant(p, 'sunflower', 4, 1);
        await gloveFuse(p, 4, 0, 4, 1);
        const src = await cellInfo(p, 4, 0);
        const host = await cellInfo(p, 4, 1);
        ok('S5 高坚果拖向日葵=套壳成功', src === null && host && host.type === 'sunflower' && host.shield === 4000 && host.hasEl, JSON.stringify({ src, host }));
        await p.close();
    }

    // ===== S6 墙果→墙果(同种) =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 0, 3);
        await plant(p, 'wallnut', 0, 4);
        await gloveFuse(p, 0, 3, 0, 4);
        const src = await cellInfo(p, 0, 3);
        const host = await cellInfo(p, 0, 4);
        ok('S6 墙果套墙果=第二株套壳', src === null && host && host.type === 'wallnut' && host.shield === 4000, JSON.stringify({ src, host }));
        await p.close();
    }

    // ===== S7 非材料源拖墙果：无法融合 =====
    {
        const p = await newPage();
        await plant(p, 'sunflower', 1, 0);
        await plant(p, 'wallnut', 1, 1);
        await gloveFuse(p, 1, 0, 1, 1);
        const src = await cellInfo(p, 1, 0);
        const host = await cellInfo(p, 1, 1);
        ok('S7 向日葵拖墙果=仍无法融合(两株保留)', src && src.type === 'sunflower' && host && host.type === 'wallnut' && host.shield === null, JSON.stringify({ src, host }));
        await p.close();
    }

    // ===== S8 回归：wallnut+tallnut 原组合 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 2, 0);
        await plant(p, 'tallnut', 2, 1);
        await gloveFuse(p, 2, 0, 2, 1);
        const src = await cellInfo(p, 2, 0);
        const host = await cellInfo(p, 2, 1);
        ok('S8 回归 wallnut+tallnut 仍套壳(宿主高坚果)', src === null && host && host.type === 'tallnut' && host.shield === 4000, JSON.stringify({ src, host }));
        await p.close();
    }

    // ===== S9 僵尸啃被套壳的向日葵：先啃壳，向日葵不掉血 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 3, 0);
        await plant(p, 'sunflower', 3, 1); // x≈170
        await gloveFuse(p, 3, 0, 3, 1);
        await addZombie(p, 3, 260);
        await step(p, 4);
        const res = await p.evaluate(() => {
            const g = window._pvzGame;
            const host = g.board.grid[3][1];
            const z = g.entities.find(e => e instanceof Zombie);
            return { shieldHp: host && host.shield ? host.shield.hp : null, hostHp: host ? host.hp : null, zState: z ? z.state : null };
        });
        ok('S9 僵尸先啃向日葵上的壳(壳掉血/向日葵基本满血)', res.shieldHp !== null && res.shieldHp < 4000 && res.hostHp !== null && res.hostHp > 250, JSON.stringify(res));
        await p.close();
    }

    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('====');
    console.log(failed.length === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed.length + ' / ' + results.length);
    process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
