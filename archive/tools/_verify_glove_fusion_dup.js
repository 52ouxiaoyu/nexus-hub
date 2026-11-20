/* 验证手套拿起→撤回后融合植物"双本体"bug 修复 (v3.45.1)
   根因：滤镜路线融合体（如寒冰炸弹）的 fusionOverlay 构造时就是 display:none，
   但所有手套放回路径无条件写 display='block' → 凭空多亮一张完整本体原图。
   GD1 隐藏叠加层融合体：拿起→空格收手套 → overlay 仍为 none、主体恢复、ghost 隐藏
   GD2 可见叠加层融合体（豌豆向日葵）：拿起→再点同格撤回 → overlay 恢复 block
   GD3 隐藏叠加层融合体：拿起→点空格撤回 → overlay 仍为 none
   GD4 拿起后点另一株不可融合植物 → 源植物恢复、overlay 状态不破坏
   GD5 套壳回归：墙果+向日葵 → 向日葵带壳、墙果消耗
   GD6 空格收手套基础回归（复用 SP4 语义）
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
        document.getElementById('glove-bank').style.display = 'flex';
        document.getElementById('seed-chooser').style.display = 'none';
        document.getElementById('start-menu').style.display = 'none';
        document.getElementById('recipe-modal').style.display = 'none';
    });
    return p;
}

async function space(page) {
    return page.evaluate(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
    });
}

async function snap(page) {
    return page.evaluate(() => {
        const g = window._pvzGame;
        const src = g.board.grid[0][0];
        return {
            elDisplay: src ? src.element.style.display : null,
            ovDisplay: (src && src.fusionOverlay) ? src.fusionOverlay.style.display : null,
            ghost: document.getElementById('drag-ghost').style.display,
            held: !!g.gloveSource,
            active: g.isGloveActive
        };
    });
}

(async () => {
    browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    // ===== GD1 寒冰炸弹（overlay 设计隐藏）：拿起→空格收手套 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_frostbomb'), 0, 0);
        });
        const before = await snap(p);
        await p.evaluate(() => { window._pvzGame.isGloveActive = true; window._pvzGame.tryGloveInteraction(0, 0); });
        const held = await snap(p);
        await space(p); // 收手套 = 撤回
        const after = await snap(p);
        ok('GD1 寒冰炸弹撤回后 overlay 保持隐藏(不出现双本体)',
            before.ovDisplay === 'none' && held.elDisplay === 'none' && held.ovDisplay === 'none' &&
            after.elDisplay === 'block' && after.ovDisplay === 'none' && after.ghost === 'none' && !after.held,
            JSON.stringify({ before, held, after }));
        await p.close();
    }

    // ===== GD2 豌豆向日葵（overlay 可见）：拿起→再点同格撤回 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_peaflower'), 0, 0);
        });
        await p.evaluate(() => { window._pvzGame.isGloveActive = true; window._pvzGame.tryGloveInteraction(0, 0); });
        await p.evaluate(() => { window._pvzGame.tryGloveInteraction(0, 0); }); // 再点同格 = 取消
        const after = await snap(p);
        ok('GD2 豌豆向日葵撤回后 overlay 恢复显示',
            after.elDisplay === 'block' && after.ovDisplay === 'block' && after.ghost === 'none' && !after.held,
            JSON.stringify(after));
        await p.close();
    }

    // ===== GD3 寒冰炸弹：拿起→点空格（空地）撤回 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_frostbomb'), 0, 0);
            g.isGloveActive = true;
            g.tryGloveInteraction(0, 0);
            g.tryGloveInteraction(2, 2); // 空地 = 撤回
        });
        const after = await snap(p);
        ok('GD3 点空地撤回后 overlay 保持隐藏',
            after.elDisplay === 'block' && after.ovDisplay === 'none' && !after.held && !after.active,
            JSON.stringify(after));
        await p.close();
    }

    // ===== GD4 拿起寒冰炸弹→点向日葵（无法融合）→源植物恢复 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_frostbomb'), 0, 0);
            g.board.addPlant(new Plant(g, 'sunflower'), 0, 1);
            g.isGloveActive = true;
            g.tryGloveInteraction(0, 0);
            g.tryGloveInteraction(0, 1); // 不可融合
        });
        const after = await p.evaluate(() => {
            const g = window._pvzGame;
            const src = g.board.grid[0][0];
            return {
                elDisplay: src.element.style.display,
                ovDisplay: src.fusionOverlay.style.display,
                bothAlive: !!g.board.grid[0][0] && !!g.board.grid[0][1]
            };
        });
        ok('GD4 无法融合分支源植物 overlay 保持隐藏',
            after.bothAlive && after.elDisplay === 'block' && after.ovDisplay === 'none',
            JSON.stringify(after));
        await p.close();
    }

    // ===== GD5 套壳回归 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'wallnut'), 0, 0);
            g.board.addPlant(new Plant(g, 'sunflower'), 0, 1);
            g.isGloveActive = true;
            g.tryGloveInteraction(0, 0);
            g.tryGloveInteraction(0, 1);
        });
        const res = await p.evaluate(() => {
            const g = window._pvzGame;
            const host = g.board.grid[0][1];
            return { srcGone: g.board.grid[0][0] === null, hostShield: host && host.shield ? host.shield.hp : null };
        });
        ok('GD5 套壳回归(墙果消耗/向日葵带壳4000)', res.srcGone === true && res.hostShield === 4000, JSON.stringify(res));
        await p.close();
    }

    // ===== GD6 融合回归：寒冰炸弹（snowpea+cherrybomb）手套合成成功且无双本体 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'snowpea'), 0, 0);
            g.board.addPlant(new Plant(g, 'cherrybomb'), 0, 1);
            g.isGloveActive = true;
            g.tryGloveInteraction(0, 0);
            g.tryGloveInteraction(0, 1);
        });
        const res = await p.evaluate(() => {
            const g = window._pvzGame;
            const fused = g.board.grid[0][1];
            return {
                type: fused ? fused.type : null,
                srcGone: g.board.grid[0][0] === null,
                ovDisplay: fused && fused.fusionOverlay ? fused.fusionOverlay.style.display : null
            };
        });
        ok('GD6 融合成功且新株生成', res.type === 'fusion_frostbomb' && res.srcGone === true,
            JSON.stringify(res));
        await p.close();
    }

    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('====');
    console.log(failed.length === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed.length + ' / ' + results.length);
    process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
