const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Tank.destroy dropping items with 30% chance - change to 15% and standard types
code = code.replace(/if \(this instanceof Enemy && Math\.random\(\) < 0\.3\) {\s+const types = Object\.values\(POWERUP_TYPES\);\s+const type = types\[Math\.floor\(Math\.random\(\) \* types\.length\)\];\s+this\.game\.powerUps\.push\(new PowerUp\(this\.game, this\.x, this\.y, type\)\);\s+}/g,
    `if (this instanceof Enemy && Math.random() < 0.15) {
            const standardTypes = [
                POWERUP_TYPES.SHIELD, POWERUP_TYPES.SHIELD,
                POWERUP_TYPES.BOMB, POWERUP_TYPES.BOMB,
                POWERUP_TYPES.SHOVEL, POWERUP_TYPES.SHOVEL,
                POWERUP_TYPES.TIME, POWERUP_TYPES.TIME,
                POWERUP_TYPES.LIFE,
                POWERUP_TYPES.STAR
            ];
            const type = standardTypes[Math.floor(Math.random() * standardTypes.length)];
            this.game.powerUps.push(new PowerUp(this.game, this.x, this.y, type));
        }`);

// 2. Boss drop types
code = code.replace(/const types = Object\.values\(POWERUP_TYPES\);\s+const angle/g, 
    `const standardTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.BOMB, POWERUP_TYPES.SHOVEL, POWERUP_TYPES.TIME, POWERUP_TYPES.LIFE, POWERUP_TYPES.STAR];\n                const angle`);
code = code.replace(/types\[Math\.floor\(Math\.random\(\)\*types\.length\)\]/g, 'standardTypes[Math.floor(Math.random()*standardTypes.length)]');

// 3. Kill streak level up: from 5 to 10
code = code.replace(/if \(killer\.killStreak === 3\) this\.game\.showTip\('💡 TIP: 连续击杀不仅能获得分数，连击5次还可以直升1级并获得天赋！', 400\);/g, 
    "if (killer.killStreak === 3) this.game.showTip('💡 TIP: 连续击杀不仅能获得分数，连击10次还可以直升1级并获得天赋！', 400);");
code = code.replace(/if \(killer\.killStreak % 5 === 0\)/g, "if (killer.killStreak % 10 === 0)");

fs.writeFileSync('game.js', code);
