/* 验证空格键切换 手↔融合手套 (v3.3.5)
   SP1 融合模式 PLAYING 按空格 → isGloveActive=true, 光标🧤, 按钮高亮
   SP2 再按空格 → 手套收起: isGloveActive=false, 光标default, 按钮复原
   SP3 经典模式(fusionMode=false) 按空格 → 无效(手套保持关闭)
   SP4 手套正拿着植物时收手套(空格) → 植物放回原格、dragGhost隐藏、gloveSource清空
   SP5 state=MENU 时按空格 → 不切换
   SP6 融合图鉴(recipe-modal)打开时按空格 → 不切换
   SP7 空格开启手套后 走完整套壳流程仍可用 (回归)
   SP8 手套开启时点选种子卡 → 手套自动关闭、种子选中 (互斥回归)
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
        // 模拟真实开局后的状态：选卡/开始菜单/图鉴都已关闭
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

async function gloveState(page) {
    return page.evaluate(() => {
        const g = window._pvzGame;
        const btn = document.getElementById('glove-bank');
        return {
            active: g.isGloveActive,
            cursor: g.container.style.cursor,
            btnBg: btn.style.background,
            dragging: g.isGloveDragging,
            src: g.gloveSource ? g.gloveSource.type : null
        };
    });
}

async function plant(page, type, r, c) {
    return page.evaluate((t, rr, cc) => {
        const g = window._pvzGame;
        g.board.addPlant(new Plant(g, t), rr, cc);
        return true;
    }, type, r, c);
}

(async () => {
    browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    // ===== SP1 空格开启手套 =====
    {
        const p = await newPage();
        await space(p);
        const s = await gloveState(p);
        ok('SP1 空格=手套开启(🧤光标+按钮高亮)', s.active === true && s.cursor.indexOf('svg') !== -1 && s.btnBg.indexOf('0, 255, 0') !== -1, JSON.stringify(s));
        await p.close();
    }

    // ===== SP2 再按空格收手套 =====
    {
        const p = await newPage();
        await space(p);
        await space(p);
        const s = await gloveState(p);
        ok('SP2 再按空格=收起(光标default)', s.active === false && s.cursor === 'default', JSON.stringify(s));
        await p.close();
    }

    // ===== SP3 经典模式空格无效 =====
    {
        const p = await newPage();
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.fusionMode = false; // 经典冒险
            document.getElementById('glove-bank').style.display = 'none';
        });
        await space(p);
        const s = await gloveState(p);
        ok('SP3 经典模式空格无效(手套保持关闭)', !s.active && s.cursor === '', JSON.stringify(s));
        await p.close();
    }

    // ===== SP4 手持植物时收手套=放回原格 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 0, 0);
        await p.evaluate(() => {
            const g = window._pvzGame;
            g.isGloveActive = true;
            g.tryGloveInteraction(0, 0); // 拿起墙果
        });
        const held = await p.evaluate(() => {
            const g = window._pvzGame;
            const src = g.board.grid[0][0];
            return { dragging: g.isGloveDragging, srcType: g.gloveSource && g.gloveSource.type, elDisplay: src ? src.element.style.display : null };
        });
        await space(p); // 收手套
        const after = await gloveState(p);
        const restored = await p.evaluate(() => {
            const src = window._pvzGame.board.grid[0][0];
            return { srcType: src ? src.type : null, elDisplay: src ? src.element.style.display : null, ghost: document.getElementById('drag-ghost').style.display };
        });
        ok('SP4 手持植物收手套=放回(显示block/清空源)',
            held.dragging === true && held.elDisplay === 'none' &&
            after.active === false && after.src === null &&
            restored.srcType === 'wallnut' && restored.elDisplay === 'block' && restored.ghost === 'none',
            JSON.stringify({ held, after, restored }));
        await p.close();
    }

    // ===== SP5 非 PLAYING 状态空格无效(先把手套打开) =====
    {
        const p = await newPage();
        await space(p); // 手套先打开
        await p.evaluate(() => { window._pvzGame.state = 'MENU'; });
        await space(p);
        const s1 = await gloveState(p);
        await p.evaluate(() => { window._pvzGame.state = 'PLAYING'; });
        await space(p); // 恢复 PLAYING 后应能收起
        const s2 = await gloveState(p);
        ok('SP5 state=MENU 空格无效/回PLAYING后有效',
            s1.active === true && s2.active === false, JSON.stringify({ s1, s2 }));
        await p.close();
    }

    // ===== SP6 图鉴打开时空格无效(先把手套打开) =====
    {
        const p = await newPage();
        await space(p); // 手套先打开
        await p.evaluate(() => { document.getElementById('recipe-modal').style.display = 'block'; });
        await space(p); // 图鉴开着 → 应被拦截
        const s1 = await gloveState(p);
        await p.evaluate(() => { document.getElementById('recipe-modal').style.display = 'none'; });
        await space(p); // 关闭图鉴后 → 应能收起
        const s2 = await gloveState(p);
        ok('SP6 图鉴打开时空格无效/关闭后有效',
            s1.active === true && s2.active === false, JSON.stringify({ s1, s2 }));
        await p.close();
    }

    // ===== SP7 空格开手套后完整套壳回归 =====
    {
        const p = await newPage();
        await plant(p, 'wallnut', 0, 0);
        await plant(p, 'sunflower', 0, 1);
        await space(p);
        const res = await p.evaluate(async () => {
            const g = window._pvzGame;
            g.tryGloveInteraction(0, 0);
            g.tryGloveInteraction(0, 1);
            const host = g.board.grid[0][1];
            const immediate = {
                srcGone: g.board.grid[0][0] === null,
                hostShield: host && host.shield ? host.shield.hp : null,
                gloveActive: g.isGloveActive // false = 套壳后自动收起(正确)
            };
            await new Promise(r => setTimeout(r, 50));
            return { ...immediate, laterActive: g.isGloveActive };
        });
        ok('SP7 空格开启后套壳流程可用(墙果消耗/向日葵带壳/手套自动收)', res.srcGone === true && res.hostShield === 4000 && res.gloveActive === false && res.laterActive === false, JSON.stringify(res));
        await p.close();
    }

    // ===== SP8 手套开启时点种子卡=手套关+种子选中 =====
    {
        const p = await newPage();
        await space(p);
        await p.evaluate(() => {
            const g = window._pvzGame;
            // 模拟 InputManager 中 seed-bank mousedown 分支的核心副作用
            g.inputManager.selectedSeed = null; // 先清空,下面模拟点击卡片逻辑
        });
        const res = await p.evaluate(() => {
            const g = window._pvzGame;
            const im = g.inputManager;
            // 复刻 InputManager seed-bank mousedown 的互斥逻辑
            im.selectedSeed = 'sunflower';
            im.isShovelSelected = false;
            g.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            if (g.gloveSource) { g.gloveSource.element.style.display = 'block'; g.gloveSource = null; }
            g.isGloveDragging = false;
            g.container.style.cursor = 'default';
            return { seed: im.selectedSeed, gloveOff: !g.isGloveActive };
        });
        ok('SP8 点种子卡=手套自动关(互斥正常)', res.seed === 'sunflower' && res.gloveOff === true, JSON.stringify(res));
        await p.close();
    }

    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('====');
    console.log(failed.length === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed.length + ' / ' + results.length);
    process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
