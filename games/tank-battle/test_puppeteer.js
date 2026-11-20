const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Set viewport to square as game-container does 100vmin
    await page.setViewport({ width: 800, height: 800 });
    
    await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'networkidle0' });
    await page.click('#start-btn');
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: 'screenshot.png' });
    await browser.close();
})();
