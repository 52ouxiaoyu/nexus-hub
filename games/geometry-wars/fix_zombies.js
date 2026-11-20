const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// Shooter: #ff00ff -> #ff0044
code = code.replace(/this\.color = '#ff00ff';/g, "this.color = '#ff0044';");

// Fast: #aa00ff -> #ff8800
code = code.replace(/this\.color = '#aa00ff';/g, "this.color = '#ff8800';");

// Tank: #00ff00 -> #aa3300
code = code.replace(/this\.color = '#00ff00';/g, "this.color = '#aa3300';");

// Normal: #0088ff -> #ff3300
code = code.replace(/this\.color = '#0088ff';/g, "this.color = '#ff3300';");

// Exploder: #ffaa00 -> #ff4400 (if it's the exploder color)
code = code.replace(/this\.color = '#ffaa00';/g, "this.color = '#ff4400';");

// LootBoxes in switch statement:
// heal: #0f0 -> #00ff00 (Green)
code = code.replace(/this\.color = '#0f0';/g, "this.color = '#00ff00';");
// shield: #00f -> #0088ff
code = code.replace(/this\.color = '#00f';/g, "this.color = '#0088ff';");
// buff: #0ff -> #00ffff
code = code.replace(/this\.color = '#0ff';/g, "this.color = '#00ffff';");
// weapon_box: #aa00ff -> #00bfff
code = code.replace(/this\.color = '#aa00ff';/g, "this.color = '#00bfff';");
// vehicle: #ffaa00 (now #ff4400 due to replace above) -> #00ccff
code = code.replace(/this\.color = '#ff4400';(.*'vehicle')/g, "this.color = '#00ccff';$1");
// nuke: #ff0000 -> #00ffff (Wait, nuke was #ff0000)
// wait, if I want harmful to be red and nuke is beneficial
code = code.replace(/this\.color = '#ff0000';\s*\/\/\s*nuke/g, "this.color = '#00ffff';");

fs.writeFileSync('game.js', code);
