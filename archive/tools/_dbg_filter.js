const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
    });
    const p = await browser.newPage();
    await p.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'domcontentloaded' });
    await sleep(600);
    const r = await p.evaluate(() => {
        const g = window._pvzGame;
        const mk = (t) => { const pl = new Plant(g, t); return { f: pl.element.style.filter, src: pl.element.src.split('/').pop() }; };
        return {
            sun: mk('fusion_sunshroom_puffshroom'),
            icefume: mk('fusion_fumeshroom_iceshroom'),
            lookSun: window.PVZ_FUSION_LOOK['fusion_sunshroom_puffshroom'].bf,
            lookIce: window.PVZ_FUSION_LOOK['fusion_fumeshroom_iceshroom'].bf
        };
    });
    console.log(JSON.stringify(r, null, 1));
    await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
