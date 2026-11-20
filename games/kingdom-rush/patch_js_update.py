import re

with open('js/main.js', 'r') as f:
    js = f.read()

# Modify Tower Update Logic
old_tower_update = """            if (t.cdTimer > 0) t.cdTimer -= dt;
            
            // Auto-targeting
            if (t.cdTimer <= 0) {"""

new_tower_update = """            if (t.buffTimer > 0) t.buffTimer -= dt;
            
            let actualCd = t.cdTimer;
            if (t.cdTimer > 0) {
                // Aura buff speeds up cooldown by 'buff' percentage (e.g. 50% faster)
                if (t.buffTimer > 0) t.cdTimer -= dt * 1.5; 
                else t.cdTimer -= dt;
            }
            
            let def = TOWER_DEFS[t.type].levels[t.lvl];
            
            // Passive Towers
            if (def.type === 'gold') {
                if (t.cdTimer <= 0) {
                    this.gold += def.income;
                    this.spawnParticles(t.x, t.y-20, '#f1c40f', 10, 1.5); // Gold popup
                    t.cdTimer = def.cd;
                }
                continue;
            }
            if (def.type === 'aura') {
                // Find nearby towers and buff them
                this.towers.forEach(other => {
                    if (other !== t && other.isTower && Math.hypot(other.x - t.x, other.y - t.y) <= def.range) {
                        other.buffTimer = 200; // buff duration
                        if (Math.random() < 0.05) this.spawnParticles(other.x, other.y, '#e74c3c', 1, 0.5);
                    }
                });
                continue;
            }
            
            // Continuous Attack Towers
            if (def.type === 'flame') {
                this.enemies.forEach(e => {
                    if (Math.hypot(e.x - t.x, e.y - t.y) <= def.range) {
                        e.hp -= def.dmg * (dt/1000);
                        if (Math.random() < 0.2) this.spawnParticles(e.x, e.y, '#e74c3c', 2, 1);
                    }
                });
                continue; // No projectile
            }
            
            // Auto-targeting for normal towers
            if (t.cdTimer <= 0) {"""
js = js.replace(old_tower_update, new_tower_update)

# Add special shoot logic for laser, bomber, blackhole, money, slot
old_shoot = """                if (target) {
                    let dx = target.x - t.x; let dy = target.y - t.y;
                    t.angle = Math.atan2(dy, dx);
                    t.recoil = 10;
                    
                    this.projectiles.push({
                        x: t.x, y: t.y, vx: Math.cos(t.angle)*600, vy: Math.sin(t.angle)*600,
                        target: target, def: baseDef.levels[t.lvl], baseDef: baseDef,
                        isProp: target === t.propTarget
                    });
                    
                    t.cdTimer = baseDef.levels[t.lvl].cd;
                    if (baseDef.levels[t.lvl].type === 'splash') Audio.playExplosion();
                    else Audio.playShoot();
                }"""

new_shoot = """                if (target) {
                    let dx = target.x - t.x; let dy = target.y - t.y;
                    t.angle = Math.atan2(dy, dx);
                    t.recoil = 10;
                    
                    if (def.type === 'laser') {
                        target.hp -= def.dmg * (dt/1000);
                        this.ctx.save();
                        this.ctx.translate(this.offsetX, this.offsetY);
                        this.ctx.scale(this.scale, this.scale);
                        this.ctx.strokeStyle = '#f1c40f'; this.ctx.lineWidth = 4;
                        this.ctx.beginPath(); this.ctx.moveTo(t.x, t.y); this.ctx.lineTo(target.x, target.y); this.ctx.stroke();
                        this.ctx.restore();
                        if (Math.random() < 0.3) this.spawnParticles(target.x, target.y, '#f1c40f', 2, 1);
                        t.cdTimer = 0; // fires every frame
                    } else if (def.type === 'bomber') {
                        // Drops a mine randomly near the tower on the path
                        let rX = t.x + (Math.random()-0.5)*def.range;
                        let rY = t.y + (Math.random()-0.5)*def.range;
                        if (!this.mines) this.mines = [];
                        this.mines.push({x: rX, y: rY, dmg: def.dmg, radius: 60, life: 10000});
                        t.cdTimer = def.cd;
                    } else if (def.type === 'blackhole') {
                        // Suck all enemies in range towards the target
                        this.enemies.forEach(e => {
                            if (Math.hypot(e.x - target.x, e.y - target.y) <= def.range) {
                                e.x += (target.x - e.x) * 0.1;
                                e.y += (target.y - e.y) * 0.1;
                                e.hp -= def.dmg;
                            }
                        });
                        this.spawnParticles(target.x, target.y, '#2c3e50', 50, 3);
                        t.cdTimer = def.cd;
                    } else if (def.type === 'money') {
                        if (this.gold >= def.spend) {
                            this.gold -= def.spend;
                            this.projectiles.push({
                                x: t.x, y: t.y, vx: Math.cos(t.angle)*800, vy: Math.sin(t.angle)*800,
                                target: target, def: def, baseDef: TOWER_DEFS[t.type], isProp: target === t.propTarget
                            });
                            t.cdTimer = def.cd;
                            Audio.playShoot();
                        }
                    } else {
                        // Normal projectile
                        this.projectiles.push({
                            x: t.x, y: t.y, vx: Math.cos(t.angle)*600, vy: Math.sin(t.angle)*600,
                            target: target, def: def, baseDef: TOWER_DEFS[t.type], isProp: target === t.propTarget
                        });
                        t.cdTimer = def.cd;
                        if (def.type === 'splash' || def.type === 'nuke') Audio.playExplosion();
                        else Audio.playShoot();
                    }
                }"""
js = js.replace(old_shoot, new_shoot)


with open('js/main.js', 'w') as f:
    f.write(js)
