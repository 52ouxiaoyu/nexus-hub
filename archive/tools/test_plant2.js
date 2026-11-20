const fs = require('fs');
let code = fs.readFileSync('pvz-web/js/entities/Entity.js', 'utf8') + "\n" + fs.readFileSync('pvz-web/js/entities/Plant.js', 'utf8');

// Mock Game
const game = {
    entityLayer: { appendChild: () => {} },
    board: { grid: [[null]] }
};

// Mock DOM
global.document = {
    createElement: () => ({ style: {}, appendChild: () => {} })
};

eval(code + `
try {
    let p = new Plant(game, 'peashooter');
    console.log("Normal plant OK: " + p.hp + " src: " + p.element.src);
    
    let f = new Plant(game, 'fusion_peashooter_wallnut');
    console.log("Fusion plant OK: " + f.hp + " src: " + f.element.src);
} catch (e) {
    console.error("ERROR: ", e);
}
`);
