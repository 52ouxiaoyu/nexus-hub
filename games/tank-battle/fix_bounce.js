const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Remove BOUNCE from available perks
code = code.replace(/\['SPREAD', 'BOUNCE', 'VAMPIRIC', 'PIERCING', 'RAPID'\]/g, "['SPREAD', 'VAMPIRIC', 'PIERCING', 'RAPID']");

// 2. Remove bounces logic from Tank.shoot
code = code.replace(/if \(this\.perks && this\.perks\.includes\('BOUNCE'\)\) b\.bounces = 2;/g, "");
code = code.replace(/if \(this\.perks && this\.perks\.includes\('BOUNCE'\)\) \{ b2\.bounces = 2; b3\.bounces = 2; \}/g, "");

// 3. Remove "弹射" from the tip text
code = code.replace(/善用散弹、穿甲、弹射、吸血等能力/g, "善用散弹、穿甲、吸血、连发等能力");

fs.writeFileSync('game.js', code);
