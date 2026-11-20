const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Add flyBombCooldown to Tank.update
code = code.replace(/update\(\) \{ if \(this\.cooldown > 0\) this\.cooldown--; if \(this\.shieldTimer > 0\) this\.shieldTimer--; \}/, 
    "update() { if (this.cooldown > 0) this.cooldown--; if (this.shieldTimer > 0) this.shieldTimer--; if (this.flyBombCooldown > 0) this.flyBombCooldown--; }");

// 2. Fix Player.shoot / Tank.shoot for canFly behavior
code = code.replace(/if \(this\.canFly\) {\s+if \(this\.cooldown > 0\) return;\s+this\.cooldown = 45;\s+this\.game\.effects\.push\(new Effect\(this\.x \+ 30, this\.y \+ 30, 'EXPLOSION', 1\.5\)\);\s+audio\.play\('explosion'\);\s+this\.game\.enemies\.forEach\(e => {\s+if \(e\.alive && Math\.hypot\(e\.x \+ e\.width\/2 - \(this\.x \+ 30\), e\.y \+ e\.height\/2 - \(this\.y \+ 30\)\) < TILE_SIZE \* 3\) e\.destroy\(this, 100\);\s+}\);\s+return;\s+}/g, 
    `if (this.canFly) {
            if (this.flyBombCooldown === undefined || this.flyBombCooldown <= 0) {
                this.flyBombCooldown = 45;
                this.game.effects.push(new Effect(this.x + 30, this.y + 30, 'EXPLOSION', 1.5));
                audio.play('explosion');
                this.game.enemies.forEach(e => {
                    if (e.alive && Math.hypot(e.x + e.width/2 - (this.x + 30), e.y + e.height/2 - (this.y + 30)) < TILE_SIZE * 3) e.destroy(this, 100);
                });
            }
            if (this.level < 2) return;
        }`);

// 3. Prevent enemies from getting tracking missiles, and scale their level
code = code.replace(/let bType = 'NORMAL';\s+if \(this\.level >= 4\) bType = 'LASER_MISSILE';\s+else if \(this\.level >= 3\) bType = 'LASER';\s+else if \(this\.level >= 2\) bType = 'MISSILE';\s+else if \(this\.level >= 1\) bType = 'EXPLOSIVE';/g,
    `let bType = 'NORMAL';
            if (this.level >= 4) bType = 'LASER_MISSILE';
            else if (this.level >= 3) bType = 'LASER';
            else if (this.level >= 2) bType = 'MISSILE';
            else if (this.level >= 1) bType = 'EXPLOSIVE';
            
            if (this instanceof Enemy) {
                if (bType === 'MISSILE') bType = 'EXPLOSIVE';
                if (bType === 'LASER_MISSILE') bType = 'LASER';
            }`);

code = code.replace(/else if \(this\.variant === 'ELITE'\) \{ this\.speed = \(2\.5 \+ Math\.min\(stage \* 0\.1, 1\.5\)\) \* diffMult; this\.health = 1; this\.level = 2; this\.color = '#FF55FF'; \}/g,
    `else if (this.variant === 'ELITE') { this.speed = (2.5 + Math.min(stage * 0.1, 1.5)) * diffMult; this.health = 1; this.level = Math.min(3, 1 + Math.floor(stage / 10)); this.color = '#FF55FF'; }`);

code = code.replace(/else \{ this\.speed = \(2 \+ Math\.min\(stage \* 0\.1, 2\)\) \* diffMult; this\.health = 1; \}/g,
    `else { this.speed = (2 + Math.min(stage * 0.1, 2)) * diffMult; this.health = 1; this.level = Math.min(3, Math.floor(stage / 15)); }`);

fs.writeFileSync('game.js', code);
