const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add collision logic to trigger announcements
code = code.replace(/this\.game\.baseHealth--;/g, 
    `this.game.baseHealth--;
                    if (this.game.baseHealth === 2 || this.game.baseHealth === 1) {
                        this.game.showAnnouncement('⚠️ 警告！大本营血量告急！ ⚠️', '#f00');
                        audio.play('explosion');
                    }`);

// 2. Add visual warning to Game.draw
code = code.replace(/this\.drawForest\(\);\s+this\.ctx\.restore\(\);/g,
    `this.drawForest();
            this.ctx.restore();
            if (this.baseHealth > 0 && this.baseHealth <= 2) {
                this.ctx.save();
                this.ctx.fillStyle = \`rgba(255, 0, 0, \${Math.abs(Math.sin(Date.now() / 200)) * 0.3})\`;
                this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                this.ctx.fillStyle = '#f00';
                this.ctx.font = 'bold 48px Arial';
                this.ctx.textAlign = 'center';
                if (Math.floor(Date.now() / 500) % 2 === 0) {
                    this.ctx.fillText("🚨 大本营血量告急！速回防！ 🚨", CANVAS_SIZE/2, 100);
                }
                this.ctx.restore();
            }`);

fs.writeFileSync('game.js', code);
