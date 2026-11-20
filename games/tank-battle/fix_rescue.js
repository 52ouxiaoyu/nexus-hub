const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Remove downed logic from Tank.destroy
code = code.replace(/if \(this instanceof Player && !this\.downed\) {[\s\S]*?audio\.play\('explosion'\);\s+return;\s+}/, "");

// 2. Remove downed logic and revive teammate logic from Player.update
code = code.replace(/if \(this\.downed\) {[\s\S]*?this\.game\.handlePlayerDeath\(this\);\s+}\s+return;\s+}/, "");
code = code.replace(/\/\/ Revive teammate logic[\s\S]*?audio\.play\('powerup'\);\s+}/, "");

fs.writeFileSync('game.js', code);
