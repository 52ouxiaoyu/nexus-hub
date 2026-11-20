const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add Telegraph to Enemy/Boss
let enemyDrawRegex = /draw\(ctx\) \{\n\s*const px = this\.x;/;
let newEnemyDraw = `draw(ctx) {
        const px = this.x; const py = this.y; const w = this.width; const h = this.height;
        
        // Boss Telegraph
        if (this.isBoss && this.cooldown > 0 && this.cooldown < 20) {
            ctx.save();
            ctx.strokeStyle = \`rgba(255, 0, 0, \${(20 - this.cooldown) / 20})\`;
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            let startX = px + w/2, startY = py + h/2;
            ctx.moveTo(startX, startY);
            if (this.direction === 'UP') ctx.lineTo(startX, startY - 800);
            else if (this.direction === 'DOWN') ctx.lineTo(startX, startY + 800);
            else if (this.direction === 'LEFT') ctx.lineTo(startX - 800, startY);
            else if (this.direction === 'RIGHT') ctx.lineTo(startX + 800, startY);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.save();`;
code = code.replace(enemyDrawRegex, newEnemyDraw);

// 2. Enhance BOMB powerup (Hit stop + delayed explosions)
let bombRegex = /\} else if \(this\.type === POWERUP_TYPES\.BOMB\) \{[\s\S]*?this\.game\.showFloatingText\('BOOM!', player\.x, player\.y - 20, '#f00'\);/;
let newBomb = `} else if (this.type === POWERUP_TYPES.BOMB) {
                audio.play('explosion');
                this.game.hitStopTimer = 20;
                this.game.shakeScreen(20);
                this.game.showAnnouncement('⚠️ 战术核打击！ ⚠️', '#f00');
                
                this.game.enemies.forEach(e => {
                    setTimeout(() => {
                        this.game.effects.push(new Effect(e.x+30, e.y+30, 'EXPLOSION', 2.5));
                        e.destroy(player, 10);
                    }, Math.random() * 600);
                });
                this.game.showFloatingText('TACTICAL NUKE!', player.x, player.y - 20, '#f00');`;
code = code.replace(bombRegex, newBomb);

fs.writeFileSync('game.js', code);
console.log('Step 3 complete');
