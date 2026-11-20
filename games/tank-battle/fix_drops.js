const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

code = code.replace(
    /if \(this\.isFlashing\) {\s+const types = Object\.values\(POWERUP_TYPES\);\s+const type = types\[Math\.floor\(Math\.random\(\) \* types\.length\)\];\s+this\.game\.powerUps\.push\(new PowerUp\(this\.game, this\.x, this\.y, type\)\);\s+}/g,
    `if (this.isFlashing) {
            const standardTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.BOMB, POWERUP_TYPES.STAR, POWERUP_TYPES.SHOVEL, POWERUP_TYPES.LIFE, POWERUP_TYPES.TIME];
            const type = standardTypes[Math.floor(Math.random() * standardTypes.length)];
            this.game.powerUps.push(new PowerUp(this.game, this.x, this.y, type));
        }`
);

code = code.replace(
    /\/\/ Random Airdrop for MAX_WEAPON\s+if \(Math\.random\(\) < 0\.0005\) {\s+const px = TILE_SIZE \* 2 \+ Math\.random\(\) \* \(CANVAS_SIZE - TILE_SIZE \* 4\);\s+const py = TILE_SIZE \* 2 \+ Math\.random\(\) \* \(CANVAS_SIZE - TILE_SIZE \* 4\);\s+this\.powerUps\.push\(new PowerUp\(this, px, py, POWERUP_TYPES\.MAX_WEAPON\)\);\s+this\.effects\.push\(new Effect\(px \+ 32, py \+ 32, 'SPAWN', 5\)\);\s+this\.showAnnouncement\('天降奇遇 AIRDROP!', '#0ff'\);\s+}/g,
    `// Random Airdrop for Rare Items
        if (Math.random() < 0.0001) {
            const px = TILE_SIZE * 2 + Math.random() * (CANVAS_SIZE - TILE_SIZE * 4);
            const py = TILE_SIZE * 2 + Math.random() * (CANVAS_SIZE - TILE_SIZE * 4);
            const rareTypes = [POWERUP_TYPES.MAX_WEAPON, POWERUP_TYPES.BOAT, POWERUP_TYPES.FLY];
            const type = rareTypes[Math.floor(Math.random() * rareTypes.length)];
            this.powerUps.push(new PowerUp(this, px, py, type));
            this.effects.push(new Effect(px + 32, py + 32, 'SPAWN', 5));
            this.showAnnouncement('天降奇遇 AIRDROP!', '#0ff');
        }`
);

fs.writeFileSync('game.js', code);
