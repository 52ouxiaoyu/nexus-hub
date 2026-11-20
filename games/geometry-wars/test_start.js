const fs = require('fs');
try {
    let code = fs.readFileSync('/Users/clawbox/nexus-hub/geometry-wars/game.js', 'utf8');
    // Check syntax
    new Function(code);
    console.log("Syntax is OK.");
    
    let mockDOM = `
class DOMElement {
    constructor(id) { this.id = id; this.classList = { add: ()=>{}, remove: ()=>{} }; this.value = 'normal'; this.textContent = ''; this.style = {}; }
    addEventListener() {}
    getContext() { return { 
        fillRect: ()=>{}, strokeRect: ()=>{}, beginPath: ()=>{}, moveTo: ()=>{}, lineTo: ()=>{},
        arc: ()=>{}, fill: ()=>{}, stroke: ()=>{}, closePath: ()=>{}, save: ()=>{}, restore: ()=>{},
        translate: ()=>{}, rotate: ()=>{}, scale: ()=>{}, fillText: ()=>{}, measureText: ()=>({width:10}),
        setLineDash: ()=>{}, ellipse: ()=>{}, rect: ()=>{},
        shadowBlur: 0, shadowColor: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1
    }; }
    captureStream() { return {}; }
}
global.window = { innerWidth: 800, innerHeight: 600, addEventListener: ()=>{}, AudioContext: class { constructor(){ this.state='running'; } } };
global.document = { 
    getElementById: (id) => new DOMElement(id),
    createElement: (tag) => new DOMElement(tag)
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.localStorage = { getItem: ()=>null, setItem: ()=>{} };
global.MediaRecorder = class { constructor() {} start() {} stop() {} };
global.URL = { createObjectURL: ()=>{} };
global.Blob = class {};
`;
    let evalCode = mockDOM + code + "\nstartGame();\nfor(let i=0;i<100;i++){update();draw();}\nconsole.log('Runtime is OK.');";
    fs.writeFileSync('test_start_eval.js', evalCode);
} catch (e) {
    console.error("Syntax Error!", e);
}
