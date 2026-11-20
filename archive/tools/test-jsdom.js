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
        console.log('Audio played');
        return Promise.resolve();
    }
    cloneNode() {
        return new jsdom.window.Audio();
    }
};

jsdom.window.requestAnimationFrame = (cb) => {
    // Only call once
    if (!jsdom.window.rafCalled) {
        jsdom.window.rafCalled = true;
        setTimeout(() => cb(100), 10);
    }
};

jsdom.window.addEventListener('load', () => {
    console.log("Window loaded");
    
    setTimeout(() => {
        const startMenu = jsdom.window.document.getElementById('start-menu');
        console.log("Start menu exists:", !!startMenu);
        if (startMenu) {
            const btn = startMenu.querySelector('div');
            console.log("Btn exists:", !!btn);
            if (btn) {
                console.log("Clicking btn...");
                btn.click();
            }
        }
    }, 100);
});

jsdom.window.addEventListener('error', (e) => {
    console.error("Window Error:", e.error);
});
