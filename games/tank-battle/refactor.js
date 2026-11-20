const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. POWERUP_TYPES removal
code = code.replace(/, W_SPREAD: '🎇', W_BOUNCE: '🪀'/, '');

// 2. PowerUp tips removal
code = code.replace(/else if \(type === POWERUP_TYPES.W_SPREAD\) this\.game\.showTip\("💡 TIP: 吃到🎇切换为【霰弹枪】，近战大范围扇形攻击！", 400\);\n/, '');
code = code.replace(/else if \(type === POWERUP_TYPES.W_BOUNCE\) this\.game\.showTip\("💡 TIP: 吃到🪀切换为【弹射弹】，能在墙壁反弹！", 400\);\n/, '');

// 3. handleWeaponPickup
code = code.replace(/else if \(this\.type === POWERUP_TYPES\.W_SPREAD\) \{ this\.handleWeaponPickup\(player, 'SPREAD', '霰弹枪', '#ff0'\); \}\n/, '');
code = code.replace(/else if \(this\.type === POWERUP_TYPES\.W_BOUNCE\) \{ this\.handleWeaponPickup\(player, 'BOUNCE', '弹射弹', '#0f0'\); \}\n/, '');

// 4. Bullet constructor
code = code.replace(/\} else if \(this\.type === 'SPREAD'\) \{[\s\S]*?this\.piercing = true;\n\s*\}/, '}');

// 5. Bullet update (remove BOUNCE bounce logic)
code = code.replace(/if \(this\.bounces > 0\) \{[\s\S]*?\} else \{ this\.active = false; \}/, 'this.active = false;');
code = code.replace(/if \(this\.bounces > 0 && tile !== TILE_TYPES\.BASE\) \{[\s\S]*?\} else \{[\s\S]*?this\.active = false;[\s\S]*?\}/, 'this.active = false;');

// 6. Tank perks removal
code = code.replace(/if \(!this\.perks\) this\.perks = \[\];\n\s*const availablePerks = \['SPREAD', 'VAMPIRIC', 'PIERCING', 'RAPID'\].filter\(p => !this\.perks\.includes\(p\) || p === 'RAPID'\);\n\s*if \(availablePerks\.length > 0\) \{\n\s*const perk = availablePerks\[Math\.floor\(Math\.random\(\) \* availablePerks\.length\)\];\n\s*this\.perks\.push\(perk\);\n\s*this\.game\.showFloatingText\(`\+\$\{perk\}`\, this\.x, this\.y, '#f0f'\);\n\s*\}/g, '');

// 7. Reduce Drop Chances
code = code.replace(/let dropChance = 0\.15;/g, 'let dropChance = 0.08;');
code = code.replace(/dropChance = 0\.4;/g, 'dropChance = 0.2;');
code = code.replace(/dropChance = 0\.3;/g, 'dropChance = 0.15;');
code = code.replace(/dropChance = 0\.8;/g, 'dropChance = 0.4;');
code = code.replace(/dropChance = 0\.5;/g, 'dropChance = 0.25;');

// 8. Remove W_SPREAD and W_BOUNCE from dropTypes
code = code.replace(/, POWERUP_TYPES\.W_SPREAD, POWERUP_TYPES\.W_BOUNCE/g, '');
code = code.replace(/, POWERUP_TYPES\.W_SPREAD/g, '');
code = code.replace(/, POWERUP_TYPES\.W_BOUNCE/g, '');
code = code.replace(/POWERUP_TYPES\.W_SPREAD, /g, '');
code = code.replace(/POWERUP_TYPES\.W_BOUNCE, /g, '');

// 9. Fix Tank.shoot()
let shootRegex = /shoot\(\) \{[\s\S]*?this\.game\.bullets\.push\(b\);\n\s*\}\n\s*\}/;
let newShoot = `shoot() {
        if (!this.alive) return;
        if (this.cooldown > 0) return;
        
        // Cooldown depends on level and type
        this.cooldown = 20 - Math.min(this.level, 5) * 2;
        if (this.weaponClass === 'EXPLOSIVE') this.cooldown += 15;
        if (this.weaponClass === 'LASER') this.cooldown += 10;
        
        audio.play('shoot');
        
        let bx = this.x + this.width / 2 - 4;
        let by = this.y + this.height / 2 - 4;
        if (this.direction === 'UP') by = this.y - 8;
        else if (this.direction === 'DOWN') by = this.y + this.height;
        else if (this.direction === 'LEFT') bx = this.x - 8;
        else if (this.direction === 'RIGHT') bx = this.x + this.width;
        
        let bType = this.weaponClass || 'NORMAL';
        let numShots = 1;
        
        // Weapon Logic Revamp
        if (bType === 'NORMAL') {
            if (this.level >= 5) numShots = 3;
            else if (this.level >= 3) numShots = 2;
        } else if (bType === 'MISSILE') {
            if (this.level >= 3) numShots = 2;
        } else if (bType === 'LASER') {
            numShots = 1; // Always 1 thick beam
        } else if (bType === 'EXPLOSIVE') {
            numShots = 1; // Always 1 big shell
        }
        
        for (let i = 0; i < numShots; i++) {
            let offset = (numShots === 1) ? 0 : (i - (numShots - 1) / 2);
            let bx_i = bx, by_i = by;
            if (this.direction === 'UP' || this.direction === 'DOWN') { bx_i += offset * 12; }
            else { by_i += offset * 12; }
            
            let b = new Bullet(this.game, this, bx_i, by_i, this.direction, Math.min(this.level, 5), bType);
            this.game.bullets.push(b);
        }
    }`;
code = code.replace(shootRegex, newShoot);

// 10. Update Bullet Constructor to match new stats
let bulletConstRegex = /constructor\(game, owner, x, y, dir, level = 0, type = 'NORMAL'\) \{[\s\S]*?this\.vx = undefined; this\.vy = undefined;\n\s*\}/;
let newBulletConst = `constructor(game, owner, x, y, dir, level = 0, type = 'NORMAL') {
        this.game = game; this.owner = owner; this.x = x; this.y = y; this.dir = dir;
        this.level = level; this.type = type;
        this.active = true;
        this.size = 8;
        this.speed = 6;
        this.damage = 1 + Math.floor(level / 2);
        this.piercing = false;

        if (this.type === 'NORMAL') {
            if (level >= 5) this.speed = 10;
            else if (level >= 3) this.speed = 8;
        } else if (this.type === 'LASER') {
            this.speed = 12;
            this.piercing = true;
            this.size = level >= 3 ? 14 : 8;
            if (level >= 3) this.damage *= 1.5;
        } else if (this.type === 'MISSILE') {
            this.speed = level >= 5 ? 7 : 5;
        } else if (this.type === 'EXPLOSIVE') {
            this.speed = 5;
            this.damage *= 2;
            this.size = 12;
        }
        this.vx = undefined; this.vy = undefined;
    }`;
code = code.replace(bulletConstRegex, newBulletConst);

// 11. Update triggerExplosion
let expRegex = /triggerExplosion\(ex, ey, small = false\) \{[\s\S]*?audio\.play\('explosion'\);\n\s*this\.game\.effects\.push\(new Effect\(ex, ey, 'EXPLOSION', radius\)\);\n\s*if \(small\) return;\n\s*const gridX = Math\.floor\(ex \/ TILE_SIZE\); const gridY = Math\.floor\(ey \/ TILE_SIZE\); const range = Math\.ceil\(radius\);\n\s*for \(let iy = gridY - range; iy <= gridY \+ range; iy\+\+\) \{[\s\S]*?\}\n\s*\}\n\s*\}/;
let newExp = `triggerExplosion(ex, ey, small = false) {
        let radius = 0.5;
        if (!small && this.type === 'EXPLOSIVE') {
            if (this.level >= 5) radius = 3.5;
            else if (this.level >= 3) radius = 2.5;
            else radius = 1.5;
        }
        audio.play('explosion');
        this.game.effects.push(new Effect(ex, ey, 'EXPLOSION', radius));
        if (small || this.type !== 'EXPLOSIVE') return;
        
        const gridX = Math.floor(ex / TILE_SIZE); const gridY = Math.floor(ey / TILE_SIZE); const range = Math.ceil(radius);
        for (let iy = gridY - range; iy <= gridY + range; iy++) {
            for (let ix = gridX - range; ix <= gridX + range; ix++) {
                if (iy >= 0 && iy < GRID_SIZE && ix >= 0 && ix < GRID_SIZE) {
                    let d = Math.hypot(ix - gridX, iy - gridY);
                    if (d <= radius) {
                        let t = this.game.map.grid[iy][ix];
                        if (t === TILE_TYPES.BRICK) {
                            this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                        } else if (t === TILE_TYPES.HARD_BRICK && this.level >= 5) {
                            this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                        } else if (t === TILE_TYPES.STEEL && this.level >= 5 && d <= radius - 1.5) {
                            this.game.map.grid[iy][ix] = TILE_TYPES.EMPTY;
                        }
                    }
                }
            }
        }
    }`;
code = code.replace(expRegex, newExp);

// 12. Fix Bullet.update LASER breaking STEEL
let steelRegex = /if \(tile === TILE_TYPES\.BRICK \|\| tile === TILE_TYPES\.HARD_BRICK \|\| tile === TILE_TYPES\.STEEL \|\| tile === TILE_TYPES\.UNBREAKABLE \|\| tile === TILE_TYPES\.BASE\) \{/;
let newSteel = `if (tile === TILE_TYPES.BRICK || tile === TILE_TYPES.HARD_BRICK || tile === TILE_TYPES.STEEL || tile === TILE_TYPES.UNBREAKABLE || tile === TILE_TYPES.BASE) {
            if (tile === TILE_TYPES.STEEL && this.type === 'LASER' && this.level >= 5) {
                this.game.map.grid[ty][tx] = TILE_TYPES.EMPTY;
                return;
            }`;
code = code.replace(steelRegex, newSteel);

fs.writeFileSync('game.js', code);
console.log('Refactor complete');
