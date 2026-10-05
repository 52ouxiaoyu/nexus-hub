const fs = require('fs');
eval(fs.readFileSync('pvz-web/js/entities/Entity.js', 'utf8'));
eval(fs.readFileSync('pvz-web/js/entities/Plant.js', 'utf8'));

// Mock Game
const game = {
    entityLayer: { appendChild: () => {} },
    board: { grid: [[null]] }
};

// Mock DOM
global.document = {
    createElement: () => ({ style: {}, appendChild: () => {} })
};

try {
    let p = new Plant(game, 'peashooter');
    console.log("Normal plant OK: " + p.hp);
    
    let f = new Plant(game, 'fusion_peashooter_wallnut');
    console.log("Fusion plant OK: " + f.hp);
} catch (e) {
    console.error("ERROR: ", e);
}
