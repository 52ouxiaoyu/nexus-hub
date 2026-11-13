// v4.0.155 泡泡观感重画 + 小鬼僵尸改成真走路 验收脚本
// 用户报：①「泡泡工厂的泡泡太丑了，就是一个球球」②「随处往来的小鬼僵尸脚没动，是直接平移过去的」
// 跑法：node _verify_v4155.js
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
    if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  [' + extra + ']' : '')); }
    else { fail++; console.log('  ❌ ' + name + (extra ? '  [' + extra + ']' : '')); }
};

const ROOT = '/Users/clawbox/nexus-hub/pvz-web';

(async () => {
    const b = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + ROOT + '/index.html', { waitUntil: 'networkidle2' });
    await sleep(1600);

    // ================= 1. 泡泡：绘制实现已收敛，且不再是「白核实心球」 =================
    console.log('\n【1】泡泡绘制（球体质感）');
    const srcCheck = await page.evaluate(() => {
        window.MiniGames.openGame('farm');
        const classic = window.MiniGames.active.lane.bub.toString();
        window.MiniGames.openGame('dragon');
        const lane = window.MiniGames.active.lane.bub.toString();
        window.MiniGames.openGame('tower');
        const tower = window.MiniGames.active.lane.bub.toString();
        return { classic: classic, lane: lane, tower: tower };
    });
    ok(/paintBub/.test(srcCheck.classic), '泡泡牧场的 bub() 走共享实现 paintBub');
    ok(/paintBub/.test(srcCheck.lane) && /paintBub/.test(srcCheck.tower),
        'BubLane.bub() 也走同一份实现（三块场地不会分叉）');

    const px = await page.evaluate(() => {
        window.MiniGames.openGame('farm');
        const x = window.MiniGames.active;
        const c = document.getElementById('mini-canvas'), g2 = c.getContext('2d');
        g2.clearRect(0, 0, 900, 600);
        x.draw();
        const W = 900, H = 600;
        const d = g2.getImageData(0, 0, W, H).data;
        const at = (px2, py2) => {
            const i = (py2 * W + px2) * 4;
            return [d[i], d[i + 1], d[i + 2]];
        };
        const lum = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];

        let white = 0, tot = 0, sum = 0, sum2 = 0;
        const hue = { green: 0, blue: 0, purple: 0, yellow: 0 };
        // v4.0.157：经典泡泡龙换成牧场后，草地底色会稀释色相统计（绿 14%、蓝紫不足 3%）。
        // 改成只统计「泡泡所在的那几行」，背景不参与 —— 断言量的是球本身，不是场景。
        const sy0 = Math.max(0, Math.round(x.lane.TOP - 10));
        const sy1 = Math.min(H, Math.round(x.lane.TOP + x.lane.ROWH * 5));
        const sx0 = Math.max(0, Math.round(x.lane.wallL));
        const sx1 = Math.min(W, Math.round(x.lane.wallR));
        for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) {
            const i = (yy * W + xx) * 4;
            const r2 = d[i], g3 = d[i + 1], b3 = d[i + 2];
            tot++;
            if (r2 > 245 && g3 > 245 && b3 > 245) white++;
            const L = 0.299 * r2 + 0.587 * g3 + 0.114 * b3;
            sum += L; sum2 += L * L;
            const mx = Math.max(r2, g3, b3), mn = Math.min(r2, g3, b3), dl = mx - mn;
            if (dl > 40 && mx > 80) {
                let h;
                if (mx === r2) h = 60 * (((g3 - b3) / dl) % 6);
                else if (mx === g3) h = 60 * ((b3 - r2) / dl + 2);
                else h = 60 * ((r2 - g3) / dl + 4);
                if (h < 0) h += 360;
                if (h >= 35 && h < 75) hue.yellow++;
                else if (h >= 75 && h < 165) hue.green++;
                else if (h >= 185 && h < 250) hue.blue++;
                else if (h >= 250 && h < 320) hue.purple++;
            }
        }
        const mean = sum / tot, sd = Math.sqrt(sum2 / tot - mean * mean);

        // 第一颗球（r=0,c=0）：把球盘分成左上 / 右下两块，量明暗
        const R = x.lane.R;
        const c0x = x.lane.LEFT + R, c0y = x.lane.TOP + R;
        let lu = 0, nu = 0, ld = 0, nd = 0, peak = 0;
        for (let dy = -18; dy <= 18; dy++) for (let dx = -18; dx <= 18; dx++) {
            const q = at(c0x + dx, c0y + dy);
            const L = lum(q);
            peak = Math.max(peak, L);
            if (dx < -4 && dy < -4) { lu += L; nu++; }
            if (dx > 5 && dy > 6) { ld += L; nd++; }
        }
        return {
            whitePct: +(white / tot * 100).toFixed(2),
            sd: +sd.toFixed(1),
            hue: {
                green: +(hue.green / tot * 100).toFixed(2),
                blue: +(hue.blue / tot * 100).toFixed(2),
                purple: +(hue.purple / tot * 100).toFixed(2),
                yellow: +(hue.yellow / tot * 100).toFixed(2)
            },
            upper: +(lu / nu).toFixed(1), lower: +(ld / nd).toFixed(1), peak: Math.round(peak)
        };
    });
    ok(px.whitePct < 3, '球心没有白色核心（旧版「白核」会读成塑料球）', '纯白占比 ' + px.whitePct + '%');
    ok(px.sd > 25, '画面亮度层次足够（球体有明暗，不是平涂）', '亮度标准差 ' + px.sd);
    ok(px.upper - px.lower > 18, '单个球体「上亮下暗」（光源在左上的球体照明）',
        '左上 ' + px.upper + ' / 右下 ' + px.lower);
    ok(px.peak > 200, '球面有镜面高光', '球内峰值亮度 ' + px.peak);
    ok(Object.values(px.hue).every(v => v > 3),
        '四种颜色的球都清晰可辨（绿/蓝/紫/黄都在 3% 以上）',
        '绿 ' + px.hue.green + '% / 蓝 ' + px.hue.blue + '% / 紫 ' + px.hue.purple + '% / 黄 ' + px.hue.yellow + '%');

    // ================= 2. 四块场地都能正常绘制 =================
    console.log('\n【2】四块泡泡场地');
    for (const id of ['farm', 'dragon', 'duel', 'tower']) {
        const r = await page.evaluate((gid) => {
            window.MiniGames.openGame(gid);
            const x = window.MiniGames.active;
            const c = document.getElementById('mini-canvas'), g2 = c.getContext('2d');
            g2.clearRect(0, 0, 900, 600);
            try { x.draw(); x.update(1 / 60); return { ok: true }; }
            catch (e) { return { ok: false, err: String(e) }; }
        }, id);
        ok(r.ok, id + ' 能正常绘制并推进一帧', r.err || '');
    }

    // ================= 3. 小鬼僵尸：行走动画 =================
    console.log('\n【3】小鬼僵尸（守屋尸潮小怪）');
    await page.evaluate(() => { document.getElementById('dorm-screen').style.display = 'block'; });
    const t3 = await page.evaluate(() => {
        const g = window.startHauntedDorm({ mode: '1p', faction: 'zombie', role1: 'peashooter' });
        const p = g.player;
        g._spawnMinion(false, 0, 1, { x: p.x + 90, y: p.y });
        const zb = g.zombies[g.zombies.length - 1];
        const born = { src: zb.imgEl.getAttribute('src'), transform: zb.imgEl.style.transform };
        // 走到有植物的地方 → 应该切啃食
        g._setZombiePose(zb, 'walk');
        const walkSrc = zb.imgEl.getAttribute('src');
        g._setZombiePose(zb, 'atk');
        const atkSrc = zb.imgEl.getAttribute('src');
        g._setZombiePose(zb, 'atk');
        const sameAgain = zb.imgEl.getAttribute('src');
        return {
            cfgImg: zb.cfg.img, cfgAtk: zb.cfg.imgAtk,
            born, walkSrc, atkSrc, sameAgain,
            isMinion: zb.isMinion, hasPose: typeof g._setZombiePose === 'function'
        };
    });
    ok(t3.cfgImg === 'Zombies/Imp/Zombie.gif', '小鬼的行走图是 33 帧动画 Imp/Zombie.gif', t3.cfgImg);
    ok(t3.born.src.indexOf('Imp/Zombie.gif') > 0, '出生时 img 就指向行走动画', t3.born.src);
    ok(t3.cfgAtk === 'Zombies/Imp/ZombieAttack.gif', '备了啃食动画 Imp/ZombieAttack.gif', t3.cfgAtk);
    ok(t3.walkSrc.indexOf('Imp/Zombie.gif') > 0 && t3.atkSrc.indexOf('ZombieAttack.gif') > 0,
        '姿态切换：走 → Zombie.gif，啃 → ZombieAttack.gif');
    ok(t3.hasPose, '_setZombiePose 存在（按状态切图，不每帧重设 src）');

    // 文件级：静态 0.gif 只有 1 帧 3KB，行走图 33 帧 67KB
    const gifStat = (f) => fs.statSync(path.join(ROOT, 'assets/images/Zombies/Imp', f)).size;
    ok(gifStat('Zombie.gif') > gifStat('0.gif') * 8,
        '行走图确实是多帧动画（体积是单帧静立图的 8 倍以上）',
        (gifStat('0.gif') / 1024).toFixed(0) + 'KB → ' + (gifStat('Zombie.gif') / 1024).toFixed(0) + 'KB');

    // 播放中：连续三帧画面不同 = gif 真的在动
    await page.evaluate(() => {
        const g = window.game, zb = g.zombies[g.zombies.length - 1];
        zb.el1.id = 'test-imp';
        zb.el1.style.zIndex = 999;
    });
    const el = await page.$('#test-imp');
    await el.screenshot({ path: '/tmp/_v4155_f1.png' });
    await sleep(170);
    await el.screenshot({ path: '/tmp/_v4155_f2.png' });
    await sleep(170);
    await el.screenshot({ path: '/tmp/_v4155_f3.png' });
    const f1 = fs.readFileSync('/tmp/_v4155_f1.png');
    const f2 = fs.readFileSync('/tmp/_v4155_f2.png');
    const f3 = fs.readFileSync('/tmp/_v4155_f3.png');
    ok(!f1.equals(f2) && !f2.equals(f3), '同一个元素连续三帧画面都不一样 → gif 正在播放（脚在动）');

    // ================= 4. 首页彩蛋小鬼也换成行走图 =================
    console.log('\n【4】首页彩蛋小鬼');
    const homeHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const eggLine = homeHtml.split('\n').filter(l => l.indexOf("cls: 'egg-imp'") >= 0)[0] || '';
    ok(eggLine.indexOf('Imp/Zombie.gif') > 0, '彩蛋 imp 用的是行走动画', eggLine.trim().slice(0, 80));
    ok(homeHtml.indexOf('impBob') > 0, '彩蛋加了步频起伏（4.4s 走 128vw，压掉滑步感）');
    ok(/btn-bubble \.bp1[\s\S]{0,400}rgba\(255,255,255,0\.98\)/.test(homeHtml),
        '首页工坊卡的三颗泡泡也换成了多层高光的肥皂泡');

    // ================= 5. 大厅与报错 =================
    console.log('\n【5】结构回归');
    const t5 = await page.evaluate(() => {
        window.MiniGames.quit();
        window.MiniGames.openBubble();
        const lab = document.querySelectorAll('#mini-grid .mini-card').length;
        window.MiniGames.openLobby();
        const all = document.querySelectorAll('#mini-grid .mini-card').length;
        return { lab, all, games: window.MiniGames.games.length };
    });
    ok(t5.lab === 4, '泡泡工坊仍是 4 个玩法', String(t5.lab));
    ok(t5.all === 6, '小游戏大厅仍是 6 个玩法', String(t5.all));
    ok(t5.games === 10, '总玩法数仍是 10', String(t5.games));

    console.log('\n【6】运行期报错');
    ok(errs.length === 0, '全程没有 JS 报错', errs.length + ' 条');
    if (errs.length) errs.slice(0, 5).forEach(e => console.log('     ! ' + e));

    console.log('\n结果 ' + pass + '/' + (pass + fail) + (fail === 0 ? '  全过' : '  有 ' + fail + ' 项失败'));
    await b.close();
    process.exit(fail === 0 ? 0 : 1);
})();
