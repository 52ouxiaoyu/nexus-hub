const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Update PowerUp.draw
let drawRegex = /draw\(ctx\) \{ if \(Math\.floor\(this\.timer \/ 10\) % 2 === 0\) \{ ctx\.font = '48px Arial'; ctx\.fillText\(this\.type, this\.x, this\.y \+ 48\); \} \}/;
let newDraw = `draw(ctx) {
        if (this.timer < 300 && Math.floor(this.timer / 10) % 2 !== 0) return;
        let scale = 1 + Math.sin(Date.now() / 150) * 0.2;
        ctx.save();
        ctx.translate(this.x + 32, this.y + 32);
        ctx.scale(scale, scale);
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type, 0, 0);
        ctx.restore();
    }`;
code = code.replace(drawRegex, newDraw);

// 2. Update PowerUp.applyEffect
let applyEffectRegex = /applyEffect\(player\) \{\n\s*audio\.play\('powerup'\);\n\s*this\.game\.effects\.push\(new Effect\(this\.x \+ 32, this\.y \+ 32, 'EXPLOSION'\)\);/;
let newApplyEffect = `applyEffect(player) {
        audio.play('powerup');
        this.game.shakeScreen(6);
        this.game.effects.push(new Effect(this.x + 32, this.y + 32, 'EXPLOSION', 1.5));
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.game.effects.push(new Effect(this.x + 32 + (Math.random() - 0.5) * 60, this.y + 32 + (Math.random() - 0.5) * 60, 'SPARK'));
            }, i * 80);
        }`;
code = code.replace(applyEffectRegex, newApplyEffect);

// 3. Update handleWeaponPickup
let handleRegex = /handleWeaponPickup\(player, newClass, name, color\) \{[\s\S]*?\}\n\s*\}\n\s*applyEffect/;
let newHandle = `handleWeaponPickup(player, newClass, name, color) {
        if (player.weaponClass !== newClass) {
            player.weaponClass = newClass;
            this.game.showAnnouncement(\`火力切换: \${name}!\`, color);
        }
        if (player.level < 5) {
            player.upgrade();
            this.game.showAnnouncement(\`\${name}升级 (Lv \${player.level})!\`, color);
        } else {
            player.overdriveTimer = 600; // 10 seconds
            this.game.showAnnouncement(\`火力超载 (OVERDRIVE) 启动!\`, '#f0f');
            this.game.shakeScreen(15);
            this.game.hitStopTimer = 10;
        }
    }
    applyEffect`;
code = code.replace(handleRegex, newHandle);

// 4. Update Tank update() to handle overdriveTimer
let tankUpdateRegex = /if \(this\.cooldown > 0\) this\.cooldown--;/;
let newTankUpdate = `if (this.cooldown > 0) this.cooldown--;
        if (this.overdriveTimer > 0) this.overdriveTimer--;`;
code = code.replace(tankUpdateRegex, newTankUpdate);

// 5. Update Tank shoot() to use overdrive
let shootCooldownRegex = /this\.cooldown = 20 - Math\.min\(this\.level, 5\) \* 2;\n\s*if \(this\.weaponClass === 'EXPLOSIVE'\) this\.cooldown \+= 15;\n\s*if \(this\.weaponClass === 'LASER'\) this\.cooldown \+= 10;/;
let newShootCooldown = `this.cooldown = 20 - Math.min(this.level, 5) * 2;
        if (this.weaponClass === 'EXPLOSIVE') this.cooldown += 15;
        if (this.weaponClass === 'LASER') this.cooldown += 10;
        if (this.overdriveTimer > 0) this.cooldown = Math.max(2, Math.floor(this.cooldown * 0.3)); // 70% cooldown reduction in overdrive`;
code = code.replace(shootCooldownRegex, newShootCooldown);

// 6. Update Tank draw() to add overdrive visual
let tankDrawRegex = /if \(this\.level >= 1\) \{\n\s*ctx\.shadowBlur = 8 \+ Math\.min\(this\.level, 5\) \* 4;\n\s*ctx\.shadowColor = this\.level >= 4 \? '#f0f' : \(this\.level >= 3 \? '#0ff' : \(this\.level >= 2 \? '#f00' : \(this\.level >= 1 \? '#ff0' : '#fff'\)\)\);\n\s*\}/;
let newTankDraw = `if (this.overdriveTimer > 0) {
            ctx.shadowBlur = 30 + Math.sin(Date.now() / 50) * 20;
            ctx.shadowColor = Math.floor(Date.now() / 100) % 2 === 0 ? '#ff0000' : '#ffff00';
        } else if (this.level >= 1) {
            ctx.shadowBlur = 8 + Math.min(this.level, 5) * 4;
            ctx.shadowColor = this.level >= 4 ? '#f0f' : (this.level >= 3 ? '#0ff' : (this.level >= 2 ? '#f00' : (this.level >= 1 ? '#ff0' : '#fff')));
        }`;
code = code.replace(tankDrawRegex, newTankDraw);

fs.writeFileSync('game.js', code);
console.log('Powerup visual and logic upgrade complete');
