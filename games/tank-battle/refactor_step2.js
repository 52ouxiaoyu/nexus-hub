const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add fields to Game constructor
let constrRegex = /this\.lives = 3;/;
let newConstr = `this.lives = 3;
        this.hitStopTimer = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.wreckages = [];`;
code = code.replace(constrRegex, newConstr);

// 2. Hit Stop and Combo logic in Game.update
let updateTopRegex = /update\(\) \{\n\s*if \(this\.gameState !== 'PLAYING'/;
let newUpdateTop = `update() {
        if (this.hitStopTimer > 0) {
            this.hitStopTimer--;
            return;
        }
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }
        
        if (this.gameState !== 'PLAYING'`;
code = code.replace(updateTopRegex, newUpdateTop);

// 3. Wreckages update
let updateBotRegex = /this\.bullets = this\.bullets\.filter\(b => b\.active && !isNaN\(b\.x\) && !isNaN\(b\.y\)\);/;
let newUpdateBot = `this.wreckages.forEach(w => w.timer--);
        this.wreckages = this.wreckages.filter(w => w.timer > 0);
        this.bullets = this.bullets.filter(b => b.active && !isNaN(b.x) && !isNaN(b.y));`;
code = code.replace(updateBotRegex, newUpdateBot);

// 4. Draw Wreckages
let drawForestRegex = /this\.drawForest\(\);/;
let drawWreckages = `// Draw Wreckages
            this.wreckages.forEach(w => {
                this.ctx.save();
                this.ctx.globalAlpha = Math.min(1, w.timer / 120) * 0.6;
                this.ctx.fillStyle = '#111';
                this.ctx.beginPath();
                this.ctx.arc(w.x + 30, w.y + 30, w.type === 'BOSS' ? 40 : 25, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
            this.drawForest();`;
code = code.replace(drawForestRegex, drawWreckages);

// 5. Tank Destroy - Wreckage, Combo, and Hit Stop
let tankDestroyRegex = /if \(this instanceof Enemy && !this\.isBoss\) \{/;
let newTankDestroy = `
        if (this instanceof Enemy) {
            // Wreckage
            this.game.wreckages.push({x: this.x, y: this.y, timer: 600, type: this.isBoss ? 'BOSS' : 'NORMAL'});
            
            // Hit Stop for Boss
            if (this.isBoss) this.game.hitStopTimer = 10;
            
            // Combo
            if (killer instanceof Player) {
                this.game.comboCount++;
                this.game.comboTimer = 180;
                let comboMsg = '';
                if (this.game.comboCount === 2) comboMsg = 'DOUBLE KILL!';
                else if (this.game.comboCount === 3) comboMsg = 'TRIPLE KILL!!';
                else if (this.game.comboCount === 4) comboMsg = 'DOMINATING!!!';
                else if (this.game.comboCount >= 5) comboMsg = 'UNSTOPPABLE!!!!';
                
                if (comboMsg) {
                    this.game.showFloatingText(comboMsg, this.x, this.y - 30, '#f0f');
                    killer.score += this.game.comboCount * 100;
                    if (this.game.comboCount >= 3) this.game.hitStopTimer = 4;
                }
            }
        }
        if (this instanceof Enemy && !this.isBoss) {`;
code = code.replace(tankDestroyRegex, newTankDestroy);

fs.writeFileSync('game.js', code);
console.log('Step 2 complete');
