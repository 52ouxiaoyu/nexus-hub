const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');
code = code.replace(/window\.onload = \(\) => new Game\(\);/, '');

// Mock DOM
global.window = global;
global.document = {
    getElementById: (id) => ({ 
        value: 1, 
        classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false }, 
        innerText: '',
        innerHTML: '',
        style: {},
        focus: ()=>{}
    }),
    addEventListener: () => {}
};
global.Math.random = () => 0.5; // deterministic
global.audio = { play: () => {} };
global.requestAnimationFrame = (cb) => { 
    if (global.frames < 5000) { global.frames++; setTimeout(cb, 0); }
    else { console.log('Finished 5000 frames successfully'); process.exit(0); }
};
global.frames = 0;

// Mock Canvas
class MockCtx {
    fillRect() {} strokeRect() {} fill() {} stroke() {} beginPath() {} arc() {} 
    save() {} restore() {} translate() {} rotate() {} scale() {} 
    fillText() {} moveTo() {} lineTo() {}
}
const mockCanvas = { width: 800, height: 800, getContext: () => new MockCtx(), focus: ()=>{} };
global.document.getElementById = (id) => {
    if (id === 'game-canvas') return mockCanvas;
    return { classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false }, innerText: '', innerHTML: '', value: '1', style: {}, focus: ()=>{} };
};

eval(code);

const game = new Game();
game.startGame();
