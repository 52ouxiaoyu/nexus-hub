// v3.80.2 验证：砸罐子每行保底 1 株进攻植物（三难度统计审计）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log('PASS ' + name); }
    else { fail++; console.log('FAIL ' + name + '  ' + JSON.stringify(extra)); }
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // 真实菜单进一局困难（把游戏带到 vaseMode PLAYING 态）
    await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, .menu-btn, [id*=vase]')];
        const b = btns.find(e => (e.textContent || '').includes('砸罐子'));
        if (b) b.click(); else window._pvzGame._openVaseDifficulty();
    });
    await new Promise(r => setTimeout(r, 400));
    await page.click('#diff-hard');
    await new Promise(r => setTimeout(r, 1200));

    // 统计审计：三难度各 250 局，断言每行 ≥1 进攻植物 + 全局总数下限
    const stat = await page.evaluate(() => {
        const g = window._pvzGame;
        const atkSet = new Set(g._vaseAttackerPool());
        const MIN = { easy: 6, hard: 4, hell: 3 };
        const out = {};
        for (const diff of ['easy', 'hard', 'hell']) {
            g.vaseDifficulty = diff;
            let worstRow = 99, minTotal = 99, badGames = 0, N = 250;
            for (let n = 0; n < N; n++) {
                g._hardSweepEntityLayer();
                g.vases = [];
                g.entities = [];
                g.setupVases();
                const perRow = new Array(g.board.rows).fill(0);
                const rowHasVase = new Array(g.board.rows).fill(false);
                let totalAtk = 0;
                for (const v of g.vases) {
                    rowHasVase[v.row] = true;
                    if (v.golden) continue;
                    if (v.content && v.content.kind === 'plant' && atkSet.has(v.content.type)) {
                        totalAtk++;
                        perRow[v.row]++;
                    }
                }
                // 断言口径：有罐子的行必须 ≥1 进攻植物（第 0 行本就不布罐，天然豁免）
                const rowsBad = rowHasVase.some((hv, i) => hv && perRow[i] < 1);
                rowsBad && (worstRow = 0);
                minTotal = Math.min(minTotal, totalAtk);
                if (rowsBad || totalAtk < MIN[diff]) badGames++;
            }
            out[diff] = { worstRow, minTotal, badGames, N, rows: g.board.rows };
        }
        return out;
    });
    check('简单 250 局每行≥1进攻且总数≥6', stat.easy.badGames === 0, stat.easy);
    check('困难 250 局每行≥1进攻且总数≥4', stat.hard.badGames === 0, stat.hard);
    check('地狱 250 局每行≥1进攻且总数≥3', stat.hell.badGames === 0, stat.hell);

    // 视觉：当前局（困难）罐子布局截图
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/_c1_vase_rows.png' });

    await browser.close();
    console.log(`\n==== RESULT: ${pass} pass, ${fail} fail ====`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
