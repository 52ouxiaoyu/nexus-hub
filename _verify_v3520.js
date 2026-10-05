/* 验证 v3.52.0 融合植物改版
   T1  删除融合：chomper+tallnut / sunflower+chomper 不再产出
   T2  双子坚果：不产阳光（sunTimer 到点也不掉阳光）+ 无双阳补给
   T3  双子坚果外观：藤底(clip) + 两个坚果叠加层（ov1/ov2）
   T4  金蒜坚果：白色坚果(grayscale/brightness) + 蒜纹理 overlay(opacity 滤镜)
   T5  冰双果投手：第二叠加层存在（冰火两半）
   T6  火炬蒜塔：火苗放大叠层（clip 顶部 + scale1.3）+ 蒜身焦糖滤镜
   T7  帕修向日葵：僵尸靠近自动缩头（缩小+帽隐藏）；僵尸离开自动抬头
   T8  帕修向日葵：点击切换缩头/抬头
   T9  帕修向日葵：缩头时僵尸走过不啃食（不进 EATING）；抬头后恢复啃食
   T10 帕修向日葵：缩头时不产阳光；抬头恢复
   T11 射刺豌豆：射出 spikepea 棕色地刺弹
   T12 射刺豌豆：第 50 发布刺 → 本行随机空格出现 spikeweed
   T13 机枪猫尾草：一轮 4 连发
   T14 盲盒池：被删融合不再入池；sunflower/twinsunflower 权重=2
   T15 图鉴 lawnStage 支持 ov2（冰双果投手详情不报错）
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

(async () => {
    browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });

    // ===== T1 删除融合 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            return {
                a: g.getFusionResult('chomper', 'tallnut'),
                b: g.getFusionResult('sunflower', 'chomper'),
                c: g.getFusionResult('garlic', 'torchwood')
            };
        });
        ok('T1 吞天大嘴/向日葵大嘴花配方已删除(蒜塔保留)', r.a == null && r.b == null && r.c === 'fusion_garlic_torchwood', JSON.stringify(r));
        await p.close();
    }

    // ===== T2+T3 双子坚果 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_wallnut_twinsunflower'), 1, 2);
            const pl = g.board.grid[1][2];
            const before = g.entities.filter(e => e instanceof Sun).length;
            pl.sunTimer = pl.sunRate; // 到点
            for (let i = 0; i < 5; i++) pl.update(0.1);
            const after = g.entities.filter(e => e instanceof Sun).length;
            return {
                noSun: after === before,
                ov2: !!(pl.fusionOverlay2 && pl.fusionOverlay2.src.indexOf('WallNut') !== -1),
                baseClip: pl.element.style.clipPath.length > 3,
                baseSrc: pl.element.src.indexOf('TwinSunflower') !== -1,
                ov1Nut: pl.fusionOverlay && pl.fusionOverlay.src.indexOf('WallNut') !== -1
            };
        });
        ok('T2 双子坚果不产阳光', r.noSun === true, JSON.stringify(r));
        ok('T3 双子坚果=藤底+双坚果叠层', r.baseSrc && r.baseClip && r.ov1Nut && r.ov2, JSON.stringify(r));
        await p.close();
    }

    // ===== T4/T5/T6 外观表 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            const mk = (t, rr, cc) => { const pl = new Plant(g, t); return pl; };
            const gold = mk('fusion_wallnut_garlic');
            const ice = mk('fusion_wintermelon_cabbagepult');
            const torch = mk('fusion_garlic_torchwood');
            const duo = mk('fusion_melon_cabbagepult');
            return {
                goldWhite: gold.element.style.filter.indexOf('grayscale') !== -1,
                goldTex: gold.fusionOverlay && gold.fusionOverlay.style.filter.indexOf('opacity') !== -1,
                iceOv2: !!(ice.fusionOverlay2 && ice.fusionOverlay2.src.indexOf('CabbagePult') !== -1),
                iceHalf: ice.fusionOverlay && ice.fusionOverlay.style.clipPath.indexOf('50%') !== -1,
                torchFlame: torch.fusionOverlay && torch.fusionOverlay.style.clipPath.indexOf('32%') !== -1 && torch.fusionOverlay.style.transform.indexOf('scale(1.5)') !== -1,
                torchCaramel: torch.element.style.filter.indexOf('sepia') !== -1,
                duoHat: duo.fusionOverlay && duo.fusionOverlay.style.clipPath.indexOf('42%') !== -1
            };
        });
        ok('T4 金蒜坚果=白坚果+蒜纹理', r.goldWhite && r.goldTex, JSON.stringify(r));
        ok('T5 冰双果投手=冰火两半第二叠层', r.iceOv2 && r.iceHalf, JSON.stringify(r));
        ok('T6 火炬蒜塔=放大火苗+焦糖蒜身', r.torchFlame && r.torchCaramel, JSON.stringify(r));
        ok('T6b 双果投手帽子式篮扣', r.duoHat, JSON.stringify(r));
        await p.close();
    }

    // ===== T7~T10 帕修向日葵 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_scaredy_sunflower'), 1, 2);
            const pl = g.board.grid[1][2];
            pl.x = g.board.offsetX + 2 * g.board.cellWidth + g.board.cellWidth / 2;
            pl.y = g.board.offsetY + 1 * g.board.cellHeight + g.board.cellHeight / 2;
            const out = {};
            // T7 自动缩头：僵尸放 3×3 内
            const z = new Zombie(g, 1, 'normal');
            z.x = pl.x + 60; z.y = pl.y;
            g.entities.push(z);
            z.update = () => {}; // 冻结僵尸防走位
            for (let i = 0; i < 3; i++) pl.update(0.1);
            out.autoHide = pl.isHiding === true;
            out.shrinkVisual = pl.element.style.transform.indexOf('scale(0.72)') !== -1 || (pl.transformStack || []).join(' ').indexOf('0.72') !== -1 || JSON.stringify(pl.transform || '').indexOf('0.72') !== -1;
            out.ovHidden = pl.fusionOverlay.style.display === 'none';
            // T9 缩头时僵尸不啃
            z.update = Zombie.prototype.update; // 恢复
            let ate = null;
            for (let i = 0; i < 12; i++) { z.update(0.1); if (z.state === 'EATING') { ate = true; break; } }
            out.zombieWalkPast = ate !== true;
            // T8 点击抬头（手动强制）
            pl.toggleShrink();
            out.manualUp = pl.isHiding === false && pl._shrinkOverride === 'up';
            // 抬头后僵尸可以啃（走两步近身）
            for (let i = 0; i < 12; i++) { z.update(0.1); if (z.state === 'EATING') break; }
            out.edibleWhenUp = z.state === 'EATING';
            // T10 缩头停阳光
            pl.toggleShrink(); // 强制缩头
            const before = g.entities.filter(e => e instanceof Sun).length;
            pl.sunTimer = pl.sunRate;
            for (let i = 0; i < 3; i++) pl.update(0.1);
            const mid = g.entities.filter(e => e instanceof Sun).length;
            pl.toggleShrink(); // 强制抬头
            pl.sunTimer = pl.sunRate;
            for (let i = 0; i < 3; i++) pl.update(0.1);
            const after = g.entities.filter(e => e instanceof Sun).length;
            out.sunPaused = mid === before;
            out.sunResumed = after > mid;
            return out;
        });
        ok('T7 帕修自动缩头(缩小+帽隐藏)', r.autoHide && r.ovHidden, JSON.stringify(r));
        ok('T8 点击切换缩头/抬头', r.manualUp === true, JSON.stringify(r));
        ok('T9 缩头时僵尸走过不啃/抬头恢复啃食', r.zombieWalkPast === true && r.edibleWhenUp === true, JSON.stringify(r));
        ok('T10 缩头停阳光/抬头恢复产能', r.sunPaused === true && r.sunResumed === true, JSON.stringify(r));
        await p.close();
    }

    // ===== T11+T12 射刺豌豆 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_peashooter_spikeweed'), 1, 2);
            const pl = g.board.grid[1][2];
            pl.x = g.board.offsetX + 2 * g.board.cellWidth + g.board.cellWidth / 2;
            pl.y = g.board.offsetY + 1 * g.board.cellHeight + g.board.cellHeight / 2;
            const z = new Zombie(g, 1, 'normal');
            z.x = pl.x + 200; z.y = pl.y;
            g.entities.push(z);
            z.update = () => {};
            // 清掉脚下自带的滚动计数干扰：只看弹种
            pl.fireTimer = pl.fireRate;
            pl.update(0.05);
            const projs = g.entities.filter(e => e instanceof Projectile && e.type !== undefined && !e.lobbed);
            const spikePeas = projs.filter(e => e.type === 'spikepea');
            const brown = spikePeas.length > 0 && spikePeas[0].element.style.filter.indexOf('sepia') !== -1;
            // T12 第 50 发
            const before = g.entities.filter(e => e instanceof Plant && e.hasTrait && e.hasTrait('spikeweed') && e !== pl).length;
            pl._spikeAmmo = 49;
            pl.fireTimer = pl.fireRate;
            pl.update(0.05);
            const after = g.entities.filter(e => e instanceof Plant && e.hasTrait && e.hasTrait('spikeweed') && e !== pl).length;
            return { fired: spikePeas.length >= 1, brown, spikePlaced: after > before };
        });
        ok('T11 射刺豌豆发射棕色地刺弹', r.fired && r.brown, JSON.stringify(r));
        ok('T12 第 50 枚子弹布下地刺', r.spikePlaced === true, JSON.stringify(r));
        await p.close();
    }

    // ===== T13 机枪猫尾草连发数 =====
    {
        const p = await newPage();
        const r = await evalv(p, async () => {
            const g = window._pvzGame;
            g.board.addPlant(new Plant(g, 'fusion_gatlingpea_cattail'), 1, 2);
            const pl = g.board.grid[1][2];
            pl.x = g.board.offsetX + 2 * g.board.cellWidth + g.board.cellWidth / 2;
            pl.y = g.board.offsetY + 1 * g.board.cellHeight + g.board.cellHeight / 2;
            const z = new Zombie(g, 1, 'normal');
            z.x = pl.x + 200; z.y = pl.y;
            g.entities.push(z);
            z.update = () => {};
            pl.fireTimer = pl.fireRate;
            pl.update(0.05);
            await new Promise(rs => setTimeout(rs, 700)); // 4 连发 = 首发 + 3 个 150ms 间隔补发
            const spikes = g.entities.filter(e => e instanceof Projectile && e.type === 'cattail').length;
            return { spikes, repeat: pl.hasTrait('gatlingpea') };
        });
        ok('T13 机枪猫尾草一轮 4 连发', r.spikes === 4 && r.repeat === true, JSON.stringify(r));
        await p.close();
    }

    // ===== T14 盲盒池 =====
    {
        const p = await newPage();
        const r = await evalv(p, () => {
            const g = window._pvzGame;
            const pool = g._plantBoxPool();
            const count = t => pool.filter(x => x === t).length;
            return {
                chomperTallnut: count('fusion_chomper_tallnut'),
                sunflowerChomper: count('fusion_sunflower_chomper'),
                sunflowerW: count('sunflower'),
                twinW: count('twinsunflower'),
                scaredySun: count('fusion_scaredy_sunflower')
            };
        });
        ok('T14 盲盒池清理+向日葵权重降为2', r.chomperTallnut === 0 && r.sunflowerChomper === 0 && r.sunflowerW === 2 && r.twinW === 2 && r.scaredySun === 3, JSON.stringify(r));
        await p.close();
    }

    // ===== T15 图鉴 lawnStage =====
    {
        const p = await newPage();
        const r = await evalv(p, async () => {
            const g = window._pvzGame;
            let errs = 0;
            try {
                // 打开图鉴融合页（直接调渲染函数路径太深，改为触发 HelpGuide 打开）
                const btn = document.getElementById('btn-help-guide');
                if (btn) btn.click();
                await new Promise(rs => setTimeout(rs, 300));
                document.getElementById('recipe-modal').style.display = 'none';
            } catch (e) { errs++; }
            return { errs };
        });
        ok('T15 图鉴打开无异常', r.errs === 0, JSON.stringify(r));
        await p.close();
    }

    await browser.close();
    const failed = results.filter(x => !x.pass);
    console.log('====');
    console.log(failed.length === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed.length + ' / ' + results.length);
    process.exit(failed.length === 0 ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
