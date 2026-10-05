const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080});
    await page.goto('file://' + __dirname + '/index.html');
    
    // Start game
    await page.click('#btn-start');
    await page.waitForTimeout(500);
    
    // Select Archer tower
    await page.click('.tower-card[data-type="ARCHER"]');
    
    // Try to click on the grid (e.g., column 2, row 0, which should be empty empty. Wait, [0][2] is empty. x=80*2+40=200, y=40. But we must add offsetX/Y!
    // Instead of clicking by coordinate, let's just evaluate in page:
    
    const res = await page.evaluate(() => {
        let card = document.querySelector('.tower-card[data-type="ARCHER"]');
        let selected = card.classList.contains('selected');
        
        let overlay = document.getElementById('grid-overlay');
        let cell = overlay.children[2]; // row 0, col 2
        
        // Sim click
        cell.click();
        
        return {
            selectedTowerType: window.gameInstance ? window.gameInstance.selectedTowerType : null,
            cardSelected: selected,
            cellPointerEvents: window.getComputedStyle(cell).pointerEvents,
            overlayPointerEvents: window.getComputedStyle(overlay).pointerEvents,
            towersLength: window.gameInstance ? window.gameInstance.towers.length : null,
            rect: overlay.getBoundingClientRect()
        };
    });
    
    console.log(JSON.stringify(res, null, 2));
    await browser.close();
})();
