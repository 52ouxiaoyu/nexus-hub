const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// The steelDensity in map generation was: if (rng() < steelDensity * 3)
code = code.replace(/if \(rng\(\) < steelDensity \* 3\) level\.steels\.push/g, 'if (rng() < steelDensity) level.steels.push');

// The difficulty scaling:
// const count = Math.floor(20 + difficulty * 30); -> Maybe too many bricks?
code = code.replace(/const count = Math\.floor\(20 \+ difficulty \* 30\);/g, 'const count = Math.floor(15 + difficulty * 15);');

fs.writeFileSync('game.js', code);
