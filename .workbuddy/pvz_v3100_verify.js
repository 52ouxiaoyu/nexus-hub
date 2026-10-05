/**
 * pvz-web v3.10.0 端到端验证：卷心菜投手 / 玉米投手
 * 用法：node /tmp/pvz_v3100_verify.js
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

const BASE = 'http://127.0.0.1:8777/index.html';
let pass = 0, fail = 0;
const fails = [];
function ck(name, cond, extra) {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; fails.push(name + (extra ? '  → ' + extra : '')); console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    const badRes = [];
    page.on('response', r => { if (r.status() >= 400) badRes.push(r.status() + ' ' + r.url()); });
    page.on('requestfailed', r => badRes.push('FAILED ' + r.url()));

    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window._pvzGame !== undefined, { timeout: 20000 });
    await sleep(800);

    // ============ A. 素材像素级校验 ============
    console.log('\n[A] 素材（尺寸 + 不透明像素数）');
    const assets = await page.evaluate(async () => {
        const list = {
            Cabbage: 'assets/images/Plants/CabbagePult/Cabbage.png',
            Kernel: 'assets/images/Plants/KernelPult/Kernel.png',
            Butter: 'assets/images/Plants/KernelPult/Butter.png',
            CabbagePult: 'assets/images/Plants/CabbagePult/CabbagePult.png',
            KernelPult: 'assets/images/Plants/KernelPult/KernelPult.png',
            CardCabbage: 'assets/images/Card/Plants/CabbagePult.png',
            CardKernel: 'assets/images/Card/Plants/KernelPult.png',
        };
        const out = {};
        for (const [k, src] of Object.entries(list)) {
            const im = new Image();
            await new Promise(res => { im.onload = res; im.onerror = res; im.src = src + '?t=' + Date.now(); });
            if (!im.naturalWidth) { out[k] = { w: 0, h: 0, opaque: -1 }; continue; }
            const cv = document.createElement('canvas');
            cv.width = im.naturalWidth; cv.height = im.naturalHeight;
            const ctx = cv.getContext('2d');
            ctx.drawImage(im, 0, 0);
            const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
            let n = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
            out[k] = { w: im.naturalWidth, h: im.naturalHeight, opaque: n };
        }
        return out;
    });
    ck('Cabbage.png 载入且 30×27', assets.Cabbage.w === 30 && assets.Cabbage.h === 27, JSON.stringify(assets.Cabbage));
    ck('Cabbage.png 不透明 ≥600', assets.Cabbage.opaque >= 600, String(assets.Cabbage.opaque));
    ck('Kernel.png 载入且 ≈16×17', assets.Kernel.w >= 14 && assets.Kernel.h >= 14 && assets.Kernel.w <= 22, JSON.stringify(assets.Kernel));
    ck('Butter.png 载入且 ≈46×48', assets.Butter.w >= 40 && assets.Butter.h >= 40, JSON.stringify(assets.Butter));
    ck('CabbagePult.png 96×96 且不透明 ≥3300（对标 MelonPult 3758）', assets.CabbagePult.w === 96 && assets.CabbagePult.opaque >= 3300, JSON.stringify(assets.CabbagePult));
    ck('KernelPult.png 96×96 且不透明 ≥3300', assets.KernelPult.w === 96 && assets.KernelPult.opaque >= 3300, JSON.stringify(assets.KernelPult));
    ck('卡面 100×120', assets.CardCabbage.w === 100 && assets.CardCabbage.h === 120 && assets.CardKernel.w === 100, JSON.stringify([assets.CardCabbage, assets.CardKernel]));

    // ============ B. 经典模式 ============
    console.log('\n[B] 经典模式：选卡 / 种植 / 弹道 / 黄油概率');
    const b = await page.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = false; g.vaseMode = false; g.zombieMode = false;
        const seeds = g.seeds.map(s => s.type);
        return {
            hasCab: seeds.includes('cabbagepult'), hasKer: seeds.includes('kernelpult'),
            cab: g.seeds.find(s => s.type === 'cabbagepult'), ker: g.seeds.find(s => s.type === 'kernelpult'),
        };
    });
    ck('经典种子栏含 cabbagepult / kernelpult', b.hasCab && b.hasKer);
    ck('两张卡都是 100 阳光', b.cab && b.cab.cost === 100 && b.ker && b.ker.cost === 100, JSON.stringify([b.cab && b.cab.cost, b.ker && b.ker.cost]));

    const fire = await page.evaluate(() => {
        const g = window._pvzGame;
        g.fusionMode = false; g.vaseMode = false; g.zombieMode = false;
        g.selectedSeeds = g.seeds.filter(s => ['cabbagepult', 'kernelpult'].includes(s.type));
        g.startGame();
        g.update = () => { };                    // 冻结主循环，改手动步进
        const res = {};
        const nativeRandom = Math.random;

        // 卷心菜投手
        const cp = new Plant(g, 'cabbagepult');
        g.board.addPlant(cp, 2, 0); g.entities.push(cp);
        const z1 = new Zombie(g, 2, 'normal'); z1.x = 600; g.entities.push(z1);
        cp.fireTimer = cp.fireRate; cp.update(0.001);
        let shots = g.entities.filter(e => e instanceof Projectile && e.row === 2 && e.x > 100);
        res.cabShot = shots.length ? { type: shots[0].type, dmg: shots[0].damage, lobbed: shots[0].lobbed, tg: !!shots[0].targetZombie } : null;
        res.cabIsLob = shots.length ? (shots[0].vy < 0 && shots[0].gravity > 0) : false;
        res.cabPlantHp = cp.hp;
        res.cabImg = (cp.element.getAttribute('src') || '').split('/').pop();
        g.entities = g.entities.filter(e => ![cp, z1].includes(e) && !(e instanceof Projectile));

        // 玉米投手：random=0.9 → kernel
        Math.random = () => 0.9;
        const kp = new Plant(g, 'kernelpult');
        g.board.addPlant(kp, 2, 1); g.entities.push(kp);
        const z2 = new Zombie(g, 2, 'normal'); z2.x = 600; g.entities.push(z2);
        kp.fireTimer = kp.fireRate; kp.update(0.001);
        let s2 = g.entities.filter(e => e instanceof Projectile);
        res.kerShot = s2.length ? { type: s2[0].type, dmg: s2[0].damage } : null;
        g.entities = g.entities.filter(e => !(e instanceof Projectile));

        // random=0.05 → butter
        Math.random = () => 0.05;
        kp.fireTimer = kp.fireRate; kp.update(0.001);
        let s3 = g.entities.filter(e => e instanceof Projectile);
        res.butterShot = s3.length ? { type: s3[0].type, dmg: s3[0].damage, w: s3[0].element.style.width } : null;
        g.entities = g.entities.filter(e => !(e instanceof Projectile));

        // 黄油概率采样（真随机）
        Math.random = nativeRandom;
        let butter = 0, total = 0;
        for (let i = 0; i < 5000; i++) {
            g.entities = g.entities.filter(e => !(e instanceof Projectile));
            kp.fireTimer = kp.fireRate; kp.update(0.001);
            const ss = g.entities.filter(e => e instanceof Projectile);
            if (ss.length) { total++; if (ss[0].type === 'butter') butter++; }
        }
        res.rate = { butter, total, r: butter / total };
        Math.random = nativeRandom;
        return res;
    });
    ck('卷心菜投手发射 cabbage 弹（40 伤害）', fire.cabShot && fire.cabShot.type === 'cabbage' && fire.cabShot.dmg === 40, JSON.stringify(fire.cabShot));
    ck('卷心菜弹走抛物线（lobbed + 初速向上 + 有重力）', fire.cabShot && fire.cabShot.lobbed === true && fire.cabIsLob === true, JSON.stringify([fire.cabShot, fire.cabIsLob]));
    ck('卷心菜弹带目标僵尸（决定抛物线跨度）', fire.cabShot && fire.cabShot.tg === true);
    ck('卷心菜投手 HP=300 且贴图正确', fire.cabPlantHp === 300 && /CabbagePult\.png/.test(fire.cabImg), JSON.stringify([fire.cabPlantHp, fire.cabImg]));
    ck('玉米投手（random=0.9）发射 kernel（20 伤害）', fire.kerShot && fire.kerShot.type === 'kernel' && fire.kerShot.dmg === 20, JSON.stringify(fire.kerShot));
    ck('玉米投手（random=0.05）发射 butter（40 伤害、显示缩到 30px）', fire.butterShot && fire.butterShot.type === 'butter' && fire.butterShot.dmg === 40 && fire.butterShot.w === '30px', JSON.stringify(fire.butterShot));
    ck('黄油概率 ≈20%（' + fire.rate.total + ' 次采样实测 ' + (fire.rate.r * 100).toFixed(1) + '%）', Math.abs(fire.rate.r - 0.2) < 0.035, JSON.stringify(fire.rate));

    // ============ C. 破甲 ============
    console.log('\n[C] 破甲规则');
    const armor = await page.evaluate(() => {
        const g = window._pvzGame;
        const out = {};
        const step = z => { z.update(0.001); return z; };

        const c1 = new Zombie(g, 1, 'conehead');
        for (let i = 0; i < 4; i++) c1.takeDamage(50, { pierce: true });
        step(c1);
        out.cone = { type: c1.type, hp: c1.hp, armorHp: c1.armorHp };

        // 对照：普通伤害要打到 armorHp ≤ 200 才脱落 → 路障需 360 点（hp 560）
        const c2 = new Zombie(g, 1, 'conehead');
        for (let i = 0; i < 8; i++) c2.takeDamage(50);
        step(c2);
        out.coneNormal = { type: c2.type, hp: c2.hp };

        const b1 = new Zombie(g, 1, 'buckethead');
        for (let i = 0; i < 7; i++) b1.takeDamage(50, { pierce: true });
        step(b1);
        out.bucket = { type: b1.type, hp: b1.hp, armorHp: b1.armorHp };
        // 对照：铁桶需 1100 点（hp 1300）才脱落
        const b2 = new Zombie(g, 1, 'buckethead');
        for (let i = 0; i < 23; i++) b2.takeDamage(50);
        step(b2);
        out.bucketNormal = { type: b2.type };

        const n1 = new Zombie(g, 1, 'newspaper');
        for (let i = 0; i < 3; i++) n1.takeDamage(50, { pierce: true });
        step(n1);
        out.news = { lost: !!n1.hasLostNewspaper, speed: n1.speed, hp: n1.hp };
        const n2 = new Zombie(g, 1, 'newspaper');
        for (let i = 0; i < 3; i++) n2.takeDamage(50);
        step(n2);
        out.newsNormal = { lost: !!n2.hasLostNewspaper, speed: n2.speed };

        const d1 = new Zombie(g, 1, 'screendoor');
        for (let i = 0; i < 7; i++) d1.takeDamage(50, { pierce: true });
        step(d1);
        out.door = { type: d1.type };

        const zb1 = new Zombie(g, 1, 'zomboni'); zb1.takeDamage(50, { pierce: true }); step(zb1);
        const zb2 = new Zombie(g, 1, 'zomboni'); zb2.takeDamage(50); step(zb2);
        out.zomboni = { pierceHp: zb1.hp, normalHp: zb2.hp, maxHp: zb1.maxHp };

        const c3 = new Zombie(g, 1, 'conehead');
        for (let i = 0; i < 12; i++) c3.takeDamage(50, { pierce: true });
        c3.update(0.001);
        out.dead = { hp: c3.hp, state: c3.state };

        z1: for (const z of [c1, c2, b1, b2, n1, n2, d1, zb1, zb2]) z.isDead = true;
        return out;
    });
    ck('路障僵尸被破甲伤害打：帽子不脱落（type 仍 conehead、armorHp 未动）', armor.cone.type === 'conehead' && armor.cone.armorHp === 560, JSON.stringify(armor.cone));
    ck('路障僵尸破甲后本体确实掉血（560→360）', armor.cone.hp === 360, String(armor.cone.hp));
    ck('对照：普通伤害 400 点（打到 armorHp≤200）→ 帽子脱落变 normal', armor.coneNormal.type === 'normal', JSON.stringify(armor.coneNormal));
    ck('铁桶僵尸被破甲：桶不脱落（1300→950）', armor.bucket.type === 'buckethead' && armor.bucket.hp === 950, JSON.stringify(armor.bucket));
    ck('对照：铁桶被普通伤害 1150 点（打到 armorHp≤200）→ 桶脱落', armor.bucketNormal.type === 'normal', JSON.stringify(armor.bucketNormal));
    ck('报纸僵尸被破甲：报纸不破、速度不变', armor.news.lost === false && armor.news.speed === 20, JSON.stringify(armor.news));
    ck('对照：报纸被普通伤害 150 点 → 报纸破损加速', armor.newsNormal.lost === true && armor.newsNormal.speed === 45, JSON.stringify(armor.newsNormal));
    ck('铁门僵尸被破甲：门不脱落', armor.door.type === 'screendoor', JSON.stringify(armor.door));
    ck('冰车僵尸：破甲/普通伤害掉血量一致（无护甲概念）', armor.zomboni.pierceHp === armor.zomboni.normalHp && armor.zomboni.maxHp === 1300, JSON.stringify(armor.zomboni));
    ck('破甲伤害仍可正常打死僵尸', armor.dead.hp <= 0 && armor.dead.state === 'DYING', JSON.stringify(armor.dead));

    const realPierce = await page.evaluate(() => {
        const g = window._pvzGame;
        const z = new Zombie(g, 1, 'conehead'); z.x = 500; g.entities.push(z);
        const mk = t => { const p = new Projectile(g, 480, z.y, 1, t, z); p.vy = 10; p.y = p.baseY - 5; g.entities.push(p); return p; };
        mk('cabbage'); g.collisionManager.update();
        mk('kernel'); g.collisionManager.update();
        const out = { type: z.type, hp: z.hp, armorHp: z.armorHp };
        z.isDead = true;
        return out;
    });
    ck('真实碰撞：卷心菜+玉米粒共 60 点破甲伤害 → 帽子仍在、本体掉 60 血', realPierce.type === 'conehead' && realPierce.hp === 500 && realPierce.armorHp === 560, JSON.stringify(realPierce));

    // ============ D. 黄油定身 ============
    console.log('\n[D] 黄油定身（3 秒）');
    const butter = await page.evaluate(() => {
        const g = window._pvzGame;
        const out = {};
        const z = new Zombie(g, 4, 'normal'); z.x = 800; g.entities.push(z);
        z.freezeButter(3.0);
        out.tinted = /sepia/.test(z.element.style.filter);
        for (let i = 0; i < 60; i++) z.update(1 / 60);
        out.xAfter1s = z.x;
        for (let i = 0; i < 90; i++) z.update(1 / 60);
        out.xAfter2p5s = z.x;
        out.butterAt2p5 = z.butterTimer > 0;
        for (let i = 0; i < 60; i++) z.update(1 / 60);
        out.butterAfter = z.butterTimer;
        out.xAfter3p5s = z.x;
        out.filterCleared = z.element.style.filter === '';

        const pl = new Plant(g, 'wallnut'); pl.row = 2; pl.x = 400; pl.y = z.y; g.entities.push(pl);
        const z2 = new Zombie(g, 2, 'normal'); z2.x = 400; z2.y = pl.y; g.entities.push(z2);
        z2.state = 'EATING'; z2.eatTarget = pl;
        z2.freezeButter(3.0);
        const hp0 = pl.hp;
        for (let i = 0; i < 60; i++) z2.update(1 / 60);
        out.plantHpWhileButtered = pl.hp - hp0;
        for (let i = 0; i < 200; i++) z2.update(1 / 60);
        out.plantHpAfter = pl.hp - hp0;
        out.eatStateAfter = z2.state;
        z.isDead = true; z2.isDead = true; pl.isDead = true;
        return out;
    });
    ck('黄油期间僵尸泛起黄色状态滤镜', butter.tinted === true);
    ck('定身 1 秒内一步不动', Math.abs(butter.xAfter1s - 800) < 0.001, String(butter.xAfter1s));
    ck('定身 2.5 秒仍一步不动', Math.abs(butter.xAfter2p5s - 800) < 0.001, String(butter.xAfter2p5s));
    ck('3 秒后自动解除并恢复行走', butter.butterAfter === 0 && butter.xAfter3p5s < 800, JSON.stringify([butter.butterAfter, butter.xAfter3p5s]));
    ck('解除后状态滤镜被清掉', butter.filterCleared === true);
    ck('定身期间僵尸咬不动植物（0 伤害）', butter.plantHpWhileButtered === 0, String(butter.plantHpWhileButtered));
    ck('定身解除后恢复啃咬（hp 下降）', butter.plantHpAfter < 0, String(butter.plantHpAfter));

    // ============ E. 四模式接入 ============
    console.log('\n[E] 四模式接入');
    const modes = await page.evaluate(() => {
        const g = window._pvzGame;
        const out = {};
        g.fusionMode = true; g.vaseMode = false; g.zombieMode = false;
        g.selectedSeeds = [];
        g.showSeedChooser();
        const types = [...document.querySelectorAll('#chooser-grid .chooser-card')].map(c => c.dataset.type || '');
        out.fusionCards = types.length;
        out.fusionHasCab = types.includes('cabbagepult');
        out.fusionHasKer = types.includes('kernelpult');
        g.initFusionUI();
        const txt = document.getElementById('recipe-list').innerText;
        out.recipeIce = txt.includes('寒冰卷心菜');
        out.recipePop = txt.includes('爆米花投手');
        out.recipeNut = txt.includes('卷心菜堡垒');
        out.recipeVeg = txt.includes('双料投手');
        const pool = g._vasePermPool();
        out.vaseCab = pool.includes('cabbagepult');
        out.vaseKer = pool.includes('kernelpult');
        g.fusionMode = false; g.zombieMode = true; g.zombieDifficulty = 'hell';
        let seenCab = 0, seenKer = 0;
        const hist = {};
        for (let t = 0; t < 60; t++) {
            // 关键：setupZombieEnemies 只在空格子上落子，必须像 restartZombieLevel 那样先清棋盘，
            // 否则第 2 次起全部 addPlant 失败 → 永远只统计到同一张棋盘（曾导致 0/60 的假失败）
            for (let r = 0; r < g.board.rows; r++) {
                for (let c = 0; c < g.board.cols; c++) g.board.grid[r][c] = null;
            }
            g.entities = g.entities.filter(e => !e._zombieEnemy);
            g.setupZombieEnemies();
            const es = g.entities.filter(e => e._zombieEnemy);
            if (es.some(e => e.type === 'cabbagepult')) seenCab++;
            if (es.some(e => e.type === 'kernelpult')) seenKer++;
            es.forEach(e => { hist[e.type] = (hist[e.type] || 0) + 1; });
        }
        out.zHist = hist;
        out.zCab = seenCab; out.zKer = seenKer;
        out.zTotal = g.entities.filter(e => e._zombieEnemy).length;
        g.zombieMode = false;
        return out;
    });
    ck('融合模式选卡含 卷心菜投手/玉米投手', modes.fusionHasCab && modes.fusionHasKer, JSON.stringify(modes));
    ck('配方书出现 4 条新融合', modes.recipeIce && modes.recipePop && modes.recipeNut && modes.recipeVeg, JSON.stringify(modes));
    ck('砸罐子植物池含 两者', modes.vaseCab && modes.vaseKer);
    // 权重 4/114 × 30 格 ≈ 每局 1 株，故"每局都有"不是合理期望；
    // 断言改为：出现在足够多局 + 总株数落在期望区间（4/114×1800≈63），确保确实进了敌人抽签池
    const nCab = modes.zHist.cabbagepult || 0, nKer = modes.zHist.kernelpult || 0;
    ck('我是僵尸敌阵：两投手进入抽签池（出现局数 ≥20/60，总株数 20~150）',
        modes.zCab >= 20 && modes.zKer >= 20 && nCab >= 20 && nCab <= 150 && nKer >= 20 && nKer <= 150,
        JSON.stringify({ seen: [modes.zCab, modes.zKer], count: [nCab, nKer], total: modes.zHist }));

    // ============ F. 融合植物 ============
    console.log('\n[F] 融合植物');
    const fus = await page.evaluate(() => {
        const g = window._pvzGame;
        g.zombieMode = false; g.vaseMode = false; g.fusionMode = true;
        g.entities.length = 0;
        const out = {};
        const R = (a, b) => g.getFusionResult(a, b);
        out.r1 = R('cabbagepult', 'iceshroom');
        out.r1b = R('iceshroom', 'cabbagepult');
        out.r2 = R('kernelpult', 'jalapeno');
        out.r3 = R('cabbagepult', 'wallnut');
        out.r4 = R('cabbagepult', 'kernelpult');
        out.names = ['fusion_icecabbage', 'fusion_popcorn', 'fusion_cabbagenut', 'fusion_veggiepult'].map(t => g.getPlantName(t));

        const shoot = (type, row) => {
            const p = new Plant(g, type); p.row = row; p.x = 100; p.y = 300;
            g.entities.push(p);
            const z = new Zombie(g, row, 'conehead'); z.x = 600; g.entities.push(z);
            p.fireTimer = p.fireRate; p.update(0.001);
            const s = g.entities.filter(e => e instanceof Projectile);
            const r = s.length ? { t: s[0].type, d: s[0].damage, lob: s[0].lobbed } : null;
            g.entities = g.entities.filter(e => !(e instanceof Projectile));
            z.isDead = true;
            return { shot: r, hp: p.hp, src: (p.element.getAttribute('src') || '').split('/').pop(), overlay: !!p.fusionOverlay };
        };
        out.ice = shoot('fusion_icecabbage', 0);
        out.pop = shoot('fusion_popcorn', 1);
        out.nut = shoot('fusion_cabbagenut', 2);
        // 交替必须同一实例连发两次才算数（新建实例的 veggieToggle 必然是第一发）
        const pv = new Plant(g, 'fusion_veggiepult'); pv.row = 3; pv.x = 100; pv.y = 300;
        g.entities.push(pv);
        const zv = new Zombie(g, 3, 'conehead'); zv.x = 600; g.entities.push(zv);
        const pick = i => {
            pv.fireTimer = pv.fireRate; pv.update(0.001);
            const ss = g.entities.filter(e => e instanceof Projectile);
            const t = ss.length ? ss[ss.length - 1].type : null;
            for (let k = g.entities.length - 1; k >= 0; k--) if (g.entities[k] instanceof Projectile) g.entities.splice(k, 1);
            return t;
        };
        const seq = [];
        const rr = Math.random; Math.random = () => 0.9; // 关掉黄油的随机干扰
        for (let i = 0; i < 4; i++) seq.push(pick(i));
        Math.random = rr;
        out.veg = { seq };
        out.vegSrc = { src: (pv.element.getAttribute('src') || '').split('/').pop(), overlay: !!pv.fusionOverlay };
        zv.isDead = true;
        out.srcs = [out.ice.src, out.pop.src, out.nut.src, out.vegSrc.src];
        out.overlays = [out.nut.overlay, out.vegSrc.overlay];

        const z2 = new Zombie(g, 0, 'conehead'); z2.x = 500; g.entities.push(z2);
        const pi = new Projectile(g, 480, z2.y, 0, 'icecabbage', z2); pi.vy = 10; pi.y = pi.baseY - 5;
        g.entities.push(pi); g.collisionManager.update();
        out.iceSlow = { slowed: z2.isSlowed, type: z2.type, hp: z2.hp, armorHp: z2.armorHp };
        z2.isDead = true;

        const zA = new Zombie(g, 2, 'conehead'); zA.x = 500; g.entities.push(zA);
        const zB = new Zombie(g, 1, 'conehead'); zB.x = 520; g.entities.push(zB);
        const pp = new Projectile(g, 480, zA.y, 2, 'popcorn', zA); pp.vy = 10; pp.y = pp.baseY - 5;
        g.entities.push(pp); g.collisionManager.update();
        out.popSplash = { a: zA.hp, b: zB.hp, aArmor: zA.armorHp, bArmor: zB.armorHp, aType: zA.type, bType: zB.type };
        zA.isDead = true; zB.isDead = true;
        return out;
    });
    ck('配方 卷心菜投手+寒冰菇 → fusion_icecabbage（双向）', fus.r1 === 'fusion_icecabbage' && fus.r1b === 'fusion_icecabbage', JSON.stringify([fus.r1, fus.r1b]));
    ck('配方 玉米投手+火爆辣椒 → fusion_popcorn', fus.r2 === 'fusion_popcorn', String(fus.r2));
    ck('配方 卷心菜投手+坚果墙 → fusion_cabbagenut', fus.r3 === 'fusion_cabbagenut', String(fus.r3));
    ck('配方 卷心菜投手+玉米投手 → fusion_veggiepult', fus.r4 === 'fusion_veggiepult', String(fus.r4));
    ck('四个融合植物都有中文名', fus.names.every(n => n && !n.startsWith('fusion_')), JSON.stringify(fus.names));
    ck('四个融合植物贴图/叠加层正常', fus.srcs.every(s => /\.(png|gif)$/.test(String(s).split('?')[0])) && fus.overlays[0] === true, JSON.stringify([fus.srcs, fus.overlays]));
    ck('寒冰卷心菜 发射 icecabbage 抛物线弹', fus.ice.shot && fus.ice.shot.t === 'icecabbage' && fus.ice.shot.lob === true, JSON.stringify(fus.ice));
    ck('爆米花投手 发射 popcorn 弹（40 伤害）', fus.pop.shot && fus.pop.shot.t === 'popcorn' && fus.pop.shot.d === 40, JSON.stringify(fus.pop));
    ck('卷心菜堡垒 HP=4000（坚果墙级）且仍能投掷', fus.nut.hp === 4000 && fus.nut.shot && fus.nut.shot.t === 'cabbage', JSON.stringify(fus.nut));
    ck('双料投手 交替发射 cabbage / kernel（同一实例连发 4 次）',
        fus.veg.seq.join(',') === 'cabbage,kernel,cabbage,kernel', JSON.stringify(fus.veg));
    ck('寒冰卷心菜命中 → 减速 + 破甲（帽子不脱落）', fus.iceSlow.slowed === true && fus.iceSlow.type === 'conehead' && fus.iceSlow.hp === 520 && fus.iceSlow.armorHp === 560, JSON.stringify(fus.iceSlow));
    ck('爆米花命中 → 溅射到相邻僵尸 且 同为破甲', fus.popSplash.a === 520 && fus.popSplash.b === 540 && fus.popSplash.bArmor === 560 && fus.popSplash.bType === 'conehead', JSON.stringify(fus.popSplash));

    // ============ G. 运行时 ============
    console.log('\n[G] 运行时');
    // 既有缺口（HEAD 就存在，与本版无关）：favicon.ico 未提供、bgm uraniwani.mp3 缺失
    const knownBad = u => /favicon\.ico/.test(u) || /uraniwani\.mp3/.test(u);
    const jsErrors = errors.filter(e => !/Failed to load resource/.test(e)); // 资源类交给 badRes 判定
    ck('无 JS 运行时错误（pageerror / 非资源类 console.error）', jsErrors.length === 0, jsErrors.slice(0, 5).join(' | '));
    const unexpectedBad = [...new Set(badRes)].filter(u => !knownBad(u));
    ck('无新增资源 404（仅既有 favicon/bgm 缺口）', unexpectedBad.length === 0,
        '既有: ' + [...new Set(badRes)].filter(knownBad).join(', ') + ' | 新增: ' + unexpectedBad.join(', '));

    console.log(`\n===== 结果：${pass} PASS / ${fail} FAIL =====`);
    if (fails.length) console.log('失败项：\n - ' + fails.join('\n - '));
    await browser.close();
    process.exit(fail ? 1 : 0);
})();
