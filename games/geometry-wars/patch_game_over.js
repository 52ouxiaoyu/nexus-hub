const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');
code = code.replace("document.getElementById('game-over')", "document.getElementById('game-over-screen')");
fs.writeFileSync('game.js', code);
