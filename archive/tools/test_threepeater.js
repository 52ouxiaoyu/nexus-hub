const fs = require('fs');

let window = {
    document: {
        createElement: () => ({ style: {}, classList: { add: () => {} } }),
        getElementById: () => ({ appendChild: () => {}, innerHTML: '' })
    },
    setTimeout: setTimeout,
    setInterval: setInterval
};
global.document = window.document;
global.window = window;
global.Image = function() {};

eval(fs.readFileSync('pvz-web/js/entities/Plant.js', 'utf8'));

let mockGame = {
    container: { appendChild: () => {} },
    board: { cellWidth: 80, cellHeight: 100, offsetX: 0, offsetY: 0, grid: [] },
    entities: [],
    zombies: []
};

try {
    let p = new Plant(mockGame, 'threepeater');
    console.log("SUCCESS:", p.type, p.hp);
} catch (e) {
    console.log("ERROR:", e);
}
