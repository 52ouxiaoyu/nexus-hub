const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.goto('file://' + path.resolve('zombie-shooter/index.html'));
    
    console.log("Clicking start...");
    await page.click('#start-btn');
    
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
