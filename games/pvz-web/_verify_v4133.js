// v4.0.133 校验：四处封面换图 + 不裁切不溢出 + 版本徽标
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const path = require('path');

const P = [];
const F = [];
function ok(cond, name, extra) { (cond ? P : F).push(name + (extra ? ' — ' + extra : '')); }

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('file://' + path.resolve('/Users/clawbox/nexus-hub/pvz-web/index.html'), { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const probe = await page.evaluate(() => {
        const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
        const out = {};
        const g = (sel, key) => {
            const el = document.querySelector(sel);
            out[key] = el ? { src: el.getAttribute('src'), alt: el.alt, natW: el.naturalWidth, natH: el.naturalHeight, box: box(el), art: box(el.closest('.pkt-art')), card: box(el.closest('.mode-card')) } : null;
        };
        g('#btn-adventure .pkt-art img', 'adventure');
        g('#btn-fusion .img-b', 'fusionB');
        g('#btn-fusion .img-a', 'fusionA');
        g('#btn-vs .vs-p', 'vsP');
        g('#btn-vs .vs-z', 'vsZ');
        g('#btn-minigame .mg-c', 'miniC');
        g('#btn-minigame .mg-a', 'miniA');
        g('#btn-minigame .mg-b', 'miniB');

        // 文字溢出检测
        const cardOf = sel => {
            const el = document.querySelector(sel);
            return el ? { sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth } : null;
        };
        out.overflow = {
            mini: cardOf('#btn-minigame'),
            adventure: cardOf('#btn-adventure'),
            fusion: cardOf('#btn-fusion'),
            vs: cardOf('#btn-vs'),
        };
        out.subLines = (() => {
            const el = document.querySelector('#btn-minigame .pkt-sub');
            if (!el) return null;
            const cs = getComputedStyle(el);
            const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.45;   // lineHeight 可能是 'normal'
            const rg = document.createRange(); rg.selectNodeContents(el);
            const lines = Array.from(rg.getClientRects()).filter(r => r.width > 0.5).length;
            const r = el.getBoundingClientRect();
            const card = el.closest('.mode-card').getBoundingClientRect();
            return { h: r.height, lh, lines, bottom: r.bottom, cardBottom: card.bottom, text: el.innerText.replace(/\n/g, '|') };
        })();
        out.ver = (document.getElementById('start-version') || {}).textContent || '';
        out.cats = {
            cherryInMenu: Array.from(document.querySelectorAll('#start-menu img')).filter(i => /CherryBomb/.test(i.getAttribute('src') || '')).length,
        };
        return out;
    });

    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    const inside = (el, tol = 1.5) => el.box.top >= el.art.top - tol && el.box.bottom <= el.art.bottom + tol &&
        el.box.left >= el.art.left - tol && el.box.right <= el.art.right + tol;

    // ① 经典冒险 = 猫尾草
    ok(probe.adventure && /Cattail\/Cattail\.gif/.test(probe.adventure.src), '① 经典冒险图 = Cattail.gif', probe.adventure && probe.adventure.src);
    ok(probe.adventure && probe.adventure.alt === '猫尾草', '① alt = 猫尾草', probe.adventure && probe.adventure.alt);
    ok(probe.adventure && probe.adventure.natW > 0, '① 猫尾草图片已加载', probe.adventure && probe.adventure.natW + 'px');
    ok(probe.adventure && inside(probe.adventure), '① 猫尾草未被插图框裁切');
    ok(probe.adventure && probe.adventure.box.h >= 100, '① 猫尾草足够大（≥100px）', probe.adventure && Math.round(probe.adventure.box.h));

    // ② 融合卡第二植物 = 火炬树桩，且与豌豆射手体量接近
    ok(probe.fusionB && /Torchwood\/0\.gif/.test(probe.fusionB.src), '② 融合卡 img-b = 火炬树桩', probe.fusionB && probe.fusionB.src);
    ok(probe.fusionB && probe.fusionB.alt === '火炬树桩', '② alt = 火炬树桩');
    ok(probe.fusionB && inside(probe.fusionB), '② 火炬树桩未被裁切');
    ok(probe.fusionB && probe.fusionA && Math.abs(probe.fusionB.box.h - probe.fusionA.box.h) <= 2,
        '② 火炬树桩与豌豆射手等高', probe.fusionB && (Math.round(probe.fusionB.box.h) + ' vs ' + Math.round(probe.fusionA.box.h)));
    ok(probe.fusionA && /Peashooter/.test(probe.fusionA.src), '② 公式左侧仍是豌豆射手');

    // ③ 双人 = 寒冰豌豆
    ok(probe.vsP && /SnowPea\/0\.gif/.test(probe.vsP.src), '③ 双人植物 = 寒冰豌豆', probe.vsP && probe.vsP.src);
    ok(probe.vsP && probe.vsP.alt === '寒冰豌豆', '③ alt = 寒冰豌豆');
    ok(probe.vsP && probe.vsP.natW > 0 && inside(probe.vsP), '③ 寒冰豌豆已加载且未裁切');
    ok(probe.vsP && probe.vsZ && Math.abs(probe.vsP.box.h - probe.vsZ.box.h) <= 3,
        '③ 与僵尸体量协调', probe.vsP && (Math.round(probe.vsP.box.h) + ' vs ' + Math.round(probe.vsZ.box.h)));

    // ④ 小游戏最右 = 毁灭菇
    ok(probe.miniC && /DoomShroom\/0\.gif/.test(probe.miniC.src), '④ 小游戏最右 = 毁灭菇', probe.miniC && probe.miniC.src);
    ok(probe.miniC && probe.miniC.alt === '毁灭菇', '④ alt = 毁灭菇');
    ok(probe.miniC && probe.miniC.natW > 0 && inside(probe.miniC), '④ 毁灭菇已加载且未裁切');
    ok(probe.miniC && probe.miniA && probe.miniC.box.left > probe.miniB.box.left && probe.miniB.box.left > probe.miniA.box.left,
        '④ 顺序仍为 小喷菇 < 土豆雷 < 毁灭菇');

    // ⑤ 全菜单不再有樱桃炸弹，且总图数量正确
    ok(probe.cats.cherryInMenu === 0, '⑤ 主菜单已无樱桃炸弹', '剩 ' + probe.cats.cherryInMenu + ' 张');

    // ⑥ 文字不溢出卡片
    Object.keys(probe.overflow).forEach(k => {
        const o = probe.overflow[k];
        ok(o && o.sh <= o.ch + 1, '⑥ ' + k + ' 卡内文字未溢出纵向', o && (o.sh + '/' + o.ch));
        ok(o && o.sw <= o.cw + 1, '⑥ ' + k + ' 卡内文字未溢出横向', o && (o.sw + '/' + o.cw));
    });
    ok(probe.subLines && probe.subLines.lines === 1, '⑥ 小游戏副标题单行显示（不换行）', probe.subLines && probe.subLines.text);
    ok(probe.subLines && probe.subLines.bottom <= probe.subLines.cardBottom - 2, '⑥ 小游戏副标题在卡片内', probe.subLines && (Math.round(probe.subLines.bottom) + ' <= ' + Math.round(probe.subLines.cardBottom)));

    // ⑦ 版本徽标
    ok(/pvz-web v4\.0\.\d+/.test(probe.ver), '⑦ 版本徽标格式正常', probe.ver);

    // ⑧ 无运行时报错
    ok(errs.length === 0, '⑧ 无 pageerror', errs.join(' / '));

    console.log('通过 %d / 失败 %d', P.length, F.length);
    P.forEach(t => console.log('  PASS', t));
    F.forEach(t => console.log('  FAIL', t));
    await browser.close();
    process.exit(F.length ? 1 : 0);
})();
