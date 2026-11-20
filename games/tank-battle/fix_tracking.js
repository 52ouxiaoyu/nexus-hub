const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Reduce target acquisition range from 20 tiles to 8 tiles
code = code.replace(/d < TILE_SIZE \* 20/g, "d < TILE_SIZE * 8");

// 2. Reduce turn speed drastically so it can't make sharp 90-degree turns instantly
code = code.replace(/let turnSpeed = 0\.15 \+ Math\.min\(this\.level \* 0\.01, 0\.3\);/g, "let turnSpeed = 0.04;");

fs.writeFileSync('game.js', code);
