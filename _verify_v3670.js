// v3.67.0 验证：操作与说明文案修正（紫罐/删小丑铁梯/阳光菇/爆炸融合全名单/大招全名单）
const puppeteer = require('/Users/clawbox/nexus-hub/node_modules/puppeteer');
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--allow-file-access-from-files', '--no-sandbox'],
        userDataDir: '/tmp/pptr-prof-' + Date.now()
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('!!window._pvzGame', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    let pass = 0, fail = 0;
    const ok = (n, c, d) => { console.log((c ? '  ✅' : '  ❌') + ' ' + n + (d ? '  ' + d : '')); c ? pass++ : fail++; };

    // 打开操作与说明（玩法说明默认 tab）
    await page.click('#btn-help-guide');
    await page.waitForFunction(() => {
        const m = document.getElementById('help-modal');
        return m && getComputedStyle(m).display !== 'none';
    }, { timeout: 10000 });
    await new Promise(r => setTimeout(r, 400));

    const modesText = await page.evaluate(() => document.getElementById('help-modal').innerText);

    // T1 砸罐子：紫罐出僵尸（红罐不再出现）
    ok('T1 紫罐出僵尸', modesText.includes('紫罐出僵尸') && !modesText.includes('红罐出僵尸'));

    // T2 砸罐子：小丑盒/铁梯 已删，锤子僵尸保留
    ok('T2 删小丑盒/铁梯、留锤子僵尸', !modesText.includes('小丑盒') && !modesText.includes('铁梯') && modesText.includes('锤子僵尸会替你'));

    // T3 我是僵尸：阳光来源含阳光菇 +450
    ok('T3 阳光菇 +450 入阳光来源', modesText.includes('阳光菇 +450'));

    // T4 爆炸类融合全名单（5 一次性 + 樱桃射手/辣椒高坚果附注）
    ok('T4 爆炸融合全名单', ['寒冰炸弹（寒冰射手+樱桃炸弹', '爆炸弹跳（窝瓜+樱桃炸弹', '烈焰地雷（土豆地雷+火爆辣椒',
        '孢子地雷（土豆地雷+小喷菇', '毁灭向日葵（向日葵+毁灭菇', '樱桃射手（每第 10 发', '辣椒高坚果（啃它的僵尸持续被烫']
        .every(s => modesText.includes(s)));

    // T5 专属大招全名单（抽查全部 20 组大招名）
    ok('T5 大招全名单', ['极寒波动', '过热爆发', '三连焰豆', '烈焰热浪', '烈焰瓜', '瓜弹连射', '焦香连环爆', '双料连投',
        '双瓜齐射', '弹幕狂潮', '追踪弹幕', '星环爆发', '重击豆', '巨菜炮击', '径向突刺', '尖刺爆发', '蒜息冲击',
        '阳光雨', '双藤再生', '吞噬回血'].every(s => modesText.includes(s)));

    // T6 冰系 16 株名单抽查（含易漏的冰蒜卫士/冰双向射手/冰火西瓜/冰双果投手）
    ok('T6 冰系 16 株抽查', ['冰蒜卫士', '冰双向射手', '冰火西瓜', '冰双果投手', '冰雾小喷菇', '冰晶向日葵'].every(s => modesText.includes(s)));

    // T7 大招名单与实装代码一致性：逐个大招名在 Plant.js 都有 notice/播报或实装
    const t7 = await page.evaluate(() => {
        // 从页面读大招段落文本，逐名检查（在主页面上下文里 fetch Plant.js 源码比对）
        return fetch('js/entities/Plant.js').then(r => r.text()).then(src => {
            const ults = ['极寒波动', '过热爆发', '三连焰豆', '烈焰热浪', '烈焰瓜', '瓜弹连射', '焦香连环爆', '双料连投',
                '双瓜齐射', '弹幕狂潮', '追踪弹幕', '星环爆发', '重击豆', '巨型卷心菜', '钢刺暴起', '尖刺爆发', '蒜息冲击',
                '阳光雨', '吞噬回血', '连环爆炸', '烈焰回火', '毒孢子云'];
            return ults.filter(u => !src.includes(u));
        });
    });
    ok('T7 大招名与 Plant.js 实装一致', t7.length === 0, t7.length ? '缺失: ' + t7.join(',') : '22/22 命中');

    // 融合进化 tab 截图（大招/爆炸名单可见）——切到融合进化面板
    await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('#help-modal .help-tab, #help-modal [data-mode]')];
        const t = tabs.find(x => x.innerText && x.innerText.includes('融合进化'));
        if (t) t.click();
    });
    await new Promise(r => setTimeout(r, 400));
    const rect = await page.evaluate(() => {
        const m = document.getElementById('help-modal');
        const r = m.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: Math.min(r.height, 860) };
    });
    await page.screenshot({ path: '/Users/clawbox/nexus-hub/v367_help.png',
        clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.min(1280, rect.w), height: rect.h } });
    ok('T8 说明弹窗截图完成', true);

    console.log('\n==== 结果: ' + pass + ' 通过 / ' + fail + ' 失败 ====');
    await browser.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
