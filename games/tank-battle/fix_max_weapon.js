const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

code = code.replace(/player\.speed = Math\.min\(8, 4 \+ 30 \* 0\.15\);\s+player\.maxHealth = 1 \+ 30 \* 2;/g, 
    "player.speed = Math.min(8, 4 + 4 * 0.15);\n            player.maxHealth = 1 + 4 * 2;");

fs.writeFileSync('game.js', code);
