// v4.0.140 验收：大厅 10 张卡图标换图/改名 + 封面大蒜 + 10 个玩法仍可进入
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = 'file://' + path.resolve(__dirname, 'index.html');

let pass = 0, fail = 0;
function ok(c, m, extra) { if (c) { pass++; console.log('  ✅ ' + m + (extra ? ' · ' + extra : '')); } else { fail++; console.log('  ❌ ' + m + (extra ? ' · ' + extra : '')); } }

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME, headless: 'new',
        args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('requestfailed', r => errs.push('REQFAIL ' + r.url().split('/').slice(-2).join('/')));
    await page.goto(FILE, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    console.log('\n【A】封面 · 经典冒险换成大蒜');
    const adv = await page.evaluate(() => {
        const img = document.querySelector('#btn-adventure .pkt-art img');
        return { src: img.getAttribute('src'), alt: img.alt, nw: img.naturalWidth, cls: img.className };
    });
    ok(/Garlic/i.test(adv.src), '封面用图 = 大蒜', adv.src);
    ok(adv.nw > 0, '大蒜图真的加载成功', 'naturalWidth=' + adv.nw);
    ok(adv.alt === '大蒜', 'alt 文案同步', adv.alt);
    ok(!/Cattail/i.test(await page.evaluate(() => document.getElementById('btn-adventure').innerHTML)), '卡内已无猫尾草残留');

    console.log('\n【B】后院游乐场 · 10 张卡换图 / 改名');
    await page.evaluate(() => window.MiniGames.openLobby());
    await new Promise(r => setTimeout(r, 600));
    const cards = await page.evaluate(() => [...document.querySelectorAll('#mini-grid .mini-card')].map(c => {
        const img = c.querySelector('.ico img');
        return { id: c.dataset.id, name: c.querySelector('h3').textContent, src: img.getAttribute('src'), nw: img.naturalWidth, alt: img.alt };
    }));
    ok(cards.length === 10, '卡片数 = 10', cards.length);
    const byId = Object.fromEntries(cards.map(c => [c.id, c]));
    const want = [
        ['tetris', '玉米方块', /Cob\.png$/],
        ['whack', '僵尸地鼠', /BucketheadZombie/],
        ['g2048', '花园 2048', /WinterMelon\.png$/],
        ['match3', '植物消消乐', /TallNut/],
        ['duck', '豌豆射击场', /Spikeweed/],
        ['memory', '花园连连看', /CobCannon/],
        ['snake', '植物贪吃蛇', /PumpkinHead/]
    ];
    for (const [id, name, re] of want) {
        const c = byId[id];
        ok(c && c.name === name, '#' + id + ' 名称 = ' + name, c && c.name);
        ok(c && re.test(c.src), '#' + id + ' 图片 = ' + re.source, c && c.src.split('/').slice(-2).join('/'));
        ok(c && c.nw > 0, '#' + id + ' 图片加载成功', c && ('nw=' + c.nw));
        ok(c && c.alt === name, '#' + id + ' alt 与名称一致', c && c.alt);
    }
    ok(!cards.some(c => c.nw === 0), '10 张卡图片零 404');
    ok(cards.filter(c => /僵尸贪吃蛇/.test(c.name)).length === 0, '旧名「僵尸贪吃蛇」已消失');

    console.log('\n【C】10 个玩法逐个进入（含改名后的贪吃蛇）');
    const ids = cards.map(c => c.id);
    for (const id of ids) {
        const st = await page.evaluate(async (gid) => {
            window.MiniGames.openGame(gid);
            await new Promise(r => setTimeout(r, 260));
            const a = window.MiniGames.active;
            const shown = getComputedStyle(document.getElementById('mini-stage')).display;
            return { cls: a ? a.constructor.name : null, shown };
        }, id);
        ok(!!st.cls && st.shown !== 'none', '进入 ' + id + ' → 有活动实例', st.cls);
    }
    // ESC 逐层返回
    const esc = await page.evaluate(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 260));
        const inLobby = getComputedStyle(document.getElementById('mini-lobby')).display !== 'none';
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 260));
        const closed = getComputedStyle(document.getElementById('mini-screen')).display === 'none';
        return { inLobby, closed };
    });
    ok(esc.inLobby, 'ESC 从游戏回到大厅');
    ok(esc.closed, 'ESC 再回主菜单');

    console.log('\n【D】图文说明同步');
    const hg = fs.readFileSync(path.join(__dirname, 'js/HelpGuide.js'), 'utf8');
    ok(hg.includes('植物贪吃蛇'), 'HelpGuide 文案 = 植物贪吃蛇');
    ok(!hg.includes('僵尸贪吃蛇'), 'HelpGuide 无旧名残留');
    const mgSrc = fs.readFileSync(path.join(__dirname, 'js/MiniGames.js'), 'utf8');
    ok(!mgSrc.includes("txt('僵尸贪吃蛇'"), '场内标题已改');
    ok(/name: '植物贪吃蛇'/.test(mgSrc), '注册表名称已改');

    console.log('\n【E】运行期无异常');
    const realErrs = errs.filter(e => !/favicon/i.test(e));
    ok(realErrs.length === 0, '无 pageerror / 资源加载失败', realErrs.slice(0, 4).join(' | '));

    console.log('\n===== ' + pass + ' / ' + (pass + fail) + ' 通过 =====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})();
