const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('pvz-web/index.html', 'utf8');

const jsdom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'file:///Users/clawbox/nexus-hub/pvz-web/index.html'
});

jsdom.window.Audio = class {
    constructor() {
        this.loop = false;
    }
    play() {
        return Promise.resolve();
    }
};
jsdom.window.requestAnimationFrame = (cb) => {};

jsdom.window.addEventListener('load', () => {
    setTimeout(() => {
        const startBtn = jsdom.window.document.getElementById('start-btn');
        startBtn.click();
        console.log("Clicked! Menu display:", jsdom.window.document.getElementById('start-menu').style.display);
    }, 100);
});
