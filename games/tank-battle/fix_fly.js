const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Update PowerUp.applyEffect for FLY
code = code.replace(/player\.canFly = true;\s+this\.game\.showAnnouncement\('获得飞行能力 CAN FLY!', '#ccc'\);/g, 
    `player.canFly = true;
            player.flyTimer = 1800;
            this.game.showAnnouncement('获得飞行能力 CAN FLY!', '#ccc');`);

// 2. Add flyTimer logic to Player.update
code = code.replace(/super\.update\(\);/g,
    `super.update();
        if (this.canFly && this.flyTimer > 0) {
            this.flyTimer--;
            if (this.flyTimer <= 0) {
                if (!this.game.map.isBlocked(this.x, this.y, this.width, this.height, false, this.canBoat, false)) {
                    this.canFly = false;
                    this.game.showFloatingText('降落！', this.x, this.y, '#ccc');
                } else {
                    this.flyTimer = 1;
                }
            }
        }`);

fs.writeFileSync('game.js', code);
