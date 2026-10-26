/**
 * pvz-web v4.0.127 画布缩放铺满验证
 * 病根：v4.0.125 在 resizeGame() 里写了 `Math.min(scaleX, scaleY, 1.5)`，
 * 1350×900 以上的屏幕不再放大 —— 1920×1080 下画布只有 1350×900，
 * 四周一圈黑边、整个游戏缩在中间（用户原话「调回去，调回去，调回去」）。
 * v4.0.127 撤掉上限，恢复纯等比 Math.min(scaleX, scaleY)。
 */
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(cond, msg) {
    if (cond) { pass++; console.log('  PASS ' + msg); }
    else { fail++; console.log('  FAIL ' + msg); }
}

(async () => {
    console.log('[A] 源码不再有 1.5 倍上限');
    const html = fs.readFileSync('/Users/clawbox/nexus-hub/pvz-web/index.html', 'utf8');
    ok(!/Math\.min\(\s*scaleX\s*,\s*scaleY\s*,\s*1\.5\s*\)/.test(html), 'resizeGame() 里没有 `, 1.5` 硬上限');
    ok(/const scale = Math\.min\(scaleX, scaleY\);/.test(html), 'scale = Math.min(scaleX, scaleY)（纯等比）');

    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-background-timer-throttling'],
        userDataDir: '/tmp/pptr-prof-' + Date.now(),
    });

    const VPS = [[1280, 860], [1512, 982], [1600, 1000], [1920, 1080], [2560, 1440], [1024, 768]];
    const rows = [];
    for (const [w, h] of VPS) {
        const page = await browser.newPage();
        await page.setViewport({ width: w, height: h });
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html');
        await page.waitForFunction('typeof window.startHauntedDorm === "function"');
        await sleep(450);
        const r = await page.evaluate(() => {
            const gc = document.getElementById('game-container');
            const b = gc.getBoundingClientRect();
            const cards = [...document.querySelectorAll('#start-menu .mode-card'), document.getElementById('btn-help-guide')].filter(Boolean);
            const oob = cards.filter(c => {
                const cb = c.getBoundingClientRect();
                return cb.left < b.left - 1 || cb.right > b.right + 1 || cb.top < b.top - 1 || cb.bottom > b.bottom + 1;
            }).map(c => c.id);
            return {
                vp: innerWidth + 'x' + innerHeight,
                scale: window.gameScale,
                expect: Math.min(innerWidth / 900, innerHeight / 600),
                bw: b.width, bh: b.height,
                fillW: b.width / innerWidth, fillH: b.height / innerHeight,
                ratio: b.width / b.height,
                oob,
            };
        });
        await page.close();
        rows.push(Object.assign(r, { errs }));
    }

    rows.forEach(r => console.log('    ' + r.vp.padEnd(10) + ' scale ' + r.scale.toFixed(4) +
        '  画布 ' + Math.round(r.bw) + 'x' + Math.round(r.bh) +
        '  铺满 ' + r.fillW.toFixed(3) + '/' + r.fillH.toFixed(3)));

    console.log('\n[B] 缩放跟随视口（不再被封顶）');
    const bad = rows.filter(r => Math.abs(r.scale - r.expect) > 0.002);
    ok(bad.length === 0, '每档 scale 都等于 min(宽/900, 高/600)' +
        (bad.length ? '，偏差：' + bad.map(r => r.vp + ' ' + r.scale.toFixed(3) + '≠' + r.expect.toFixed(3)).join(' / ') : ''));
    const capped = rows.filter(r => r.expect > 1.52 && r.scale < 1.52);
    ok(capped.length === 0, '大屏（需 >1.5 倍）不再被压到 1.5：' +
        rows.filter(r => r.expect > 1.52).map(r => r.vp + '→' + r.scale.toFixed(2)).join(' / '));

    console.log('\n[C] 铺满率：至少一个方向贴边');
    const notFull = rows.filter(r => Math.max(r.fillW, r.fillH) < 0.995);
    ok(notFull.length === 0, '每档分辨率至少一方向铺满 ≥99.5%' +
        (notFull.length ? '：' + notFull.map(r => r.vp).join(',') : ''));

    console.log('\n[D] 1920×1080 重点回归（用户看到的「缩在中间」）');
    const big = rows.find(r => r.vp === '1920x1080');
    ok(big && big.scale > 1.75, '1920×1080 scale = ' + (big ? big.scale.toFixed(3) : '?') + '（>1.75，旧值 1.5）');
    ok(big && Math.abs(big.bh - 1080) <= 2, '画面高度铺满（' + Math.round(big.bh) + ' ≈ 1080）');
    ok(big && big.bw > 1600, '画面宽度 ' + (big ? Math.round(big.bw) : '?') + '（旧值 1350）');
    ok(big && big.oob.length === 0, '主菜单卡片仍在画布内（越界 ' + (big ? big.oob.join(',') : '') + '）');

    console.log('\n[E] 比例与稳定性');
    const distort = rows.filter(r => Math.abs(r.ratio - 1.5) > 0.01);
    ok(distort.length === 0, '画布始终保持 3:2（等比，不变形）');
    ok(rows.every(r => r.errs.length === 0), '所有分辨率零 JS 报错');

    console.log('\n结果: ' + pass + ' 通过, ' + fail + ' 失败');
    await browser.close();
    process.exit(fail ? 1 : 0);
})();
