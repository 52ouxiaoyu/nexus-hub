/**
 * pvz-web v4.0.126 主菜单整屏收口验证
 * 背景：#game-container 是 900x600 设计面，外层 scale(1.42) 铺满 1280x860。
 * v4.0.125 把 4 张模式卡 + 操作与说明挤成一行却没算宽度（min-width:172 撑着），
 * 结果整行 1040px 宽：最左卡被屏幕左缘裁掉，说明卡被右缘裁掉，下排双人/守屋卡被底部切掉。
 * 本脚本按「CSS 设计面坐标（= 屏幕坐标 / 缩放比对）」断言所有卡都在 900x600 内且互不裁切。
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');

const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(cond, msg) {
    if (cond) { pass++; console.log('  PASS ' + msg); }
    else { fail++; console.log('  FAIL ' + msg); }
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 860 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
    await page.waitForFunction('typeof window.startHauntedDorm === "function"');
    await page.evaluate(() => localStorage.clear());
    await sleep(900);

    const M = await page.evaluate(() => {
        const gc = document.getElementById('game-container');
        const S = gc.getBoundingClientRect().width / gc.offsetWidth; // 设计面 -> 屏幕 缩放
        const gx = gc.getBoundingClientRect().left, gy = gc.getBoundingClientRect().top;
        const D = n => +(((n - gx) / S)).toFixed(1);          // 屏幕 x -> 设计面 x
        const DY = n => +(((n - gy) / S)).toFixed(1);         // 屏幕 y -> 设计面 y
        const W = n => +(n / S).toFixed(1);
        const R = e => e.getBoundingClientRect();

        const scene = document.querySelector('.menu-scene');
        const row = document.querySelector('#start-menu .menu-cards');
        const title = document.querySelector('#start-menu .game-title');
        const vsRow = document.getElementById('vs-row');
        const ver = document.getElementById('start-version');

        const cards = [...document.querySelectorAll('#start-menu .mode-card'), document.getElementById('btn-help-guide')]
            .filter(Boolean).map(c => {
                const cr = R(c);
                const art = c.querySelector('.pkt-art');
                const img = art ? art.querySelector('img') : null;
                const sub = c.querySelector('.pkt-sub');
                let subLines = 0;
                if (sub) {
                    const s = R(sub);
                    const lh = parseFloat(getComputedStyle(sub).lineHeight) || 15;
                    subLines = Math.round((s.height / S) / lh);
                }
                let imgClip = null;
                if (img) {
                    const ir = R(img), ar = R(art);
                    imgClip = ir.top < ar.top - 0.6 || ir.bottom > ar.bottom + 0.6 ||
                              ir.left < ar.left - 0.6 || ir.right > ar.right + 0.6;
                }
                return {
                    id: c.id,
                    x: D(cr.left), y: DY(cr.top), w: W(cr.width), h: W(cr.height),
                    right: D(cr.right), bottom: DY(cr.bottom),
                    ovfY: c.scrollHeight - c.clientHeight,
                    ovfX: c.scrollWidth - c.clientWidth,
                    artH: art ? W(R(art).height) : null,
                    imgClip, subLines,
                };
            });

        const tr = R(title), vr = R(vsRow), rr = R(ver), rrow = R(row);
        return {
            scale: +S.toFixed(4),
            designW: gc.offsetWidth, designH: gc.offsetHeight,
            cards,
            row: { x: D(rrow.left), right: D(rrow.right), w: W(rrow.width) },
            title: { y: DY(tr.top), bottom: DY(tr.bottom) },
            vs: { x: D(vr.left), right: D(vr.right), y: DY(vr.top), bottom: DY(vr.bottom) },
            ver: { y: DY(rr.top), bottom: DY(rr.bottom), x: D(rr.left), right: D(rr.right), lines: Math.round(R(ver).height / 20) },
            sceneScrollW: scene.scrollWidth,
            sceneScrollH: scene.scrollHeight,
            docScrollW: document.documentElement.scrollWidth,
            innerW: window.innerWidth,
        };
    });

    console.log('    设计面 ' + M.designW + 'x' + M.designH + ' · 缩放 ' + M.scale);
    console.log('    卡片行 x ' + M.row.x + '..' + M.row.right + '（宽 ' + M.row.w + '）');
    M.cards.forEach(c => console.log('    ' + c.id + ' @' + c.x + ',' + c.y + ' ' + c.w + 'x' + c.h +
        ' art=' + c.artH + ' sub=' + c.subLines + '行'));

    console.log('\n[A] 设计面不溢出');
    ok(M.sceneScrollW <= M.designW + 0.5, '横向不溢出（内容 ' + M.sceneScrollW + ' ≤ ' + M.designW + '）');
    ok(M.sceneScrollH <= M.designH + 0.5, '纵向不溢出（内容 ' + M.sceneScrollH + ' ≤ ' + M.designH + '）');
    ok(M.docScrollW <= M.innerW, '页面不出现横向滚动（' + M.docScrollW + ' ≤ ' + M.innerW + '）');

    console.log('\n[B] 七张卡都在画面内、左右留白对称');
    const oob = M.cards.filter(c => c.x < 0 || c.right > M.designW || c.y < 0 || c.bottom > M.designH);
    ok(oob.length === 0, '所有卡片完整落在画面内（越界 ' + oob.length + ' 张' +
        (oob.length ? '：' + oob.map(c => c.id).join(',') : '') + '）');
    const leftPad = M.row.x, rightPad = M.designW - M.row.right;
    ok(leftPad >= 24 && rightPad >= 24, '卡片行左右留白 ' + leftPad + ' / ' + rightPad + 'px（≥24，不再贴边）');
    ok(Math.abs(leftPad - rightPad) <= 6, '左右留白基本对称（差 ' + Math.abs(leftPad - rightPad).toFixed(1) + 'px）');

    console.log('\n[C] 卡片内部不裁切');
    const ovf = M.cards.filter(c => c.ovfY > 0 || c.ovfX > 0);
    ok(ovf.length === 0, '卡片文字不溢出边框（溢出 ' + ovf.length + ' 张）');
    const clipped = M.cards.filter(c => c.imgClip === true);
    ok(clipped.length === 0, '插图区图片未被裁切（被裁 ' + clipped.length + ' 张' +
        (clipped.length ? '：' + clipped.map(c => c.id).join(',') : '') + '）');
    const thinArt = M.cards.filter(c => c.artH !== null && c.artH < 78);
    ok(thinArt.length === 0, '插图区未被 flex 压缩（最矮 ' + Math.min(...M.cards.filter(c => c.artH).map(c => c.artH)) + 'px）');
    const longSub = M.cards.filter(c => c.subLines > 2);
    ok(longSub.length === 0, '副标题都不超过两行（超行 ' + longSub.length + ' 张）');

    console.log('\n[D] 排版关系');
    const firstRow = M.cards.filter(c => c.y < M.title.bottom + 400 && c.y < M.vs.y);
    ok(firstRow.length === 5, '第一行 5 张卡（4 模式 + 操作与说明），实际 ' + firstRow.length + ' 张');
    ok(M.title.bottom <= Math.min(...firstRow.map(c => c.y)) + 0.5, '标题在卡片上方（标题底 ' + M.title.bottom +
        ' ≤ 卡片顶 ' + Math.min(...firstRow.map(c => c.y)) + '）');
    ok(M.vs.bottom <= M.designH - 4, '下排双人/守屋卡完整可见（底 ' + M.vs.bottom + ' ≤ ' + (M.designH - 4) + '）');
    const verOverlap = !(M.ver.x >= M.vs.right || M.ver.right <= M.vs.x || M.ver.y >= M.vs.bottom || M.ver.bottom <= M.vs.y);
    ok(!verOverlap, '版本徽标不压住下排卡片（徽标 x ' + M.ver.x + '..' + M.ver.right + ' / 卡片 x ' + M.vs.x + '..' + M.vs.right + '）');

    console.log('\n[E] 运行时');
    ok(errors.length === 0, '无 JS 报错' + (errors.length ? '：' + errors[0] : ''));

    console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
    await browser.close();
    process.exit(fail ? 1 : 0);
})();
