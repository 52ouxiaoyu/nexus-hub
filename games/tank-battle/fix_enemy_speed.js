const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

code = code.replace(/this\.speed = \(3\.5 \+ Math\.min\(stage \* 0\.1, 1\.5\)\) \* diffMult;/g, 
    "this.speed = (2.5 + Math.min(stage * 0.05, 0.8)) * diffMult;");

code = code.replace(/this\.speed = \(1\.5 \+ Math\.min\(stage \* 0\.05, 1\)\) \* diffMult;/g, 
    "this.speed = (1.0 + Math.min(stage * 0.02, 0.5)) * diffMult;");

code = code.replace(/this\.speed = \(2\.5 \+ Math\.min\(stage \* 0\.1, 1\.5\)\) \* diffMult;/g, 
    "this.speed = (1.8 + Math.min(stage * 0.05, 0.8)) * diffMult;");

code = code.replace(/this\.speed = \(2 \+ Math\.min\(stage \* 0\.1, 2\)\) \* diffMult;/g, 
    "this.speed = (1.5 + Math.min(stage * 0.05, 0.8)) * diffMult;");

fs.writeFileSync('game.js', code);
