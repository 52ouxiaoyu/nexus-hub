const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.goto('file:///Users/clawbox/nexus-hub/pvz-web/index.html', { waitUntil: 'networkidle0' });
    
    console.log("Page loaded. Clicking start menu...");
    try {
        await page.click('#start-menu div'); // The startBtn is the only div inside start-menu
        console.log("Clicked.");
        await page.waitForTimeout(1000);
        const menuVisible = await page.$eval('#start-menu', el => !!el).catch(() => false);
        console.log("Menu visible after click:", menuVisible);
    } catch (e) {
        console.log("Error clicking:", e);
    }
    
    await browser.close();
})();
