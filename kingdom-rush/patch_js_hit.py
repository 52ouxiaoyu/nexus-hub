import re

with open('js/main.js', 'r') as f:
    js = f.read()

# Update Enemy Stun Logic
old_enemy_slow = """            if (e.slowTimer > 0) e.slowTimer -= dt;
            if (e.poisonTimer > 0) {"""
new_enemy_slow = """            if (e.stunTimer > 0) {
                e.stunTimer -= dt;
                return; // Stunned enemies do not move or attack
            }
            if (e.slowTimer > 0) e.slowTimer -= dt;
            if (e.poisonTimer > 0) {"""
js = js.replace(old_enemy_slow, new_enemy_slow)

# Mine update logic (insert before projectile loop)
old_proj_start = """        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {"""
new_proj_start = """        // Mines logic
        if (this.mines) {
            for (let i = this.mines.length - 1; i >= 0; i--) {
                let m = this.mines[i];
                m.life -= dt;
                if (m.life <= 0) { this.mines.splice(i, 1); continue; }
                let triggered = false;
                for (let e of this.enemies) {
                    if (Math.hypot(e.x - m.x, e.y - m.y) < 30 && !e.def.flying) {
                        triggered = true;
                        // Splash damage
                        this.enemies.forEach(e2 => {
                            if (Math.hypot(e2.x - m.x, e2.y - m.y) < m.radius && !e2.def.flying) {
                                e2.hp -= m.dmg;
                            }
                        });
                        break;
                    }
                }
                if (triggered) {
                    this.spawnParticles(m.x, m.y, '#c0392b', 40, 2);
                    Audio.playExplosion();
                    this.mines.splice(i, 1);
                }
            }
        }
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {"""
js = js.replace(old_proj_start, new_proj_start)


# Projectile Hit Logic
old_hit = """                if (isSplash || p.def.type === 'poison') {
                    let splashColor = p.def.type === 'poison' ? '#2ecc71' : '#e74c3c';
                    this.spawnParticles(tx, ty, splashColor, 30, 2);
                    Audio.playExplosion();
                    
                    this.enemies.forEach(e => {
                        if (e.def.flying) return; // Flying immune to splash
                        if (Math.hypot(e.x - tx, e.y - ty) <= p.def.splash) {
                            let actualDmg = this.calculateDamage(p.def.dmg, p.baseDef.dmgType, e.def.armor, e.def.mr);
                            e.hp -= actualDmg;
                            if (p.def.slowDur) e.slowTimer = p.def.slowDur;
                            if (p.def.type === 'poison') {
                                e.poisonTimer = p.def.poisonDur;
                                // Magic resist reduces poison DoT as well
                                let red = e.def.mr / (e.def.mr + 100);
                                e.poisonDps = p.def.poisonDmg * (1 - red);
                            }
                        }
                    });
                } else {
                    let actualDmg = this.calculateDamage(p.def.dmg, p.baseDef.dmgType, p.target.def.armor, p.target.def.mr);
                    p.target.hp -= actualDmg;
                    this.spawnParticles(tx, ty, p.baseDef.color, 10, 1);
                }"""

new_hit = """                if (p.def.type === 'nuke') {
                    this.spawnParticles(tx, ty, '#fff', 200, 5); // Huge explosion
                    Audio.playExplosion();
                    this.enemies.forEach(e => {
                        e.hp -= p.def.dmg; // Map-wide damage
                    });
                }
                else if (isSplash || p.def.type === 'poison') {
                    let splashColor = p.def.type === 'poison' ? '#2ecc71' : '#e74c3c';
                    this.spawnParticles(tx, ty, splashColor, 30, 2);
                    Audio.playExplosion();
                    
                    this.enemies.forEach(e => {
                        if (e.def.flying) return; // Flying immune to splash
                        if (Math.hypot(e.x - tx, e.y - ty) <= p.def.splash) {
                            let actualDmg = this.calculateDamage(p.def.dmg, p.baseDef.dmgType, e.def.armor, e.def.mr);
                            e.hp -= actualDmg;
                            if (p.def.slowDur) e.slowTimer = p.def.slowDur;
                            if (p.def.type === 'poison') {
                                e.poisonTimer = p.def.poisonDur;
                                let red = e.def.mr / (e.def.mr + 100);
                                e.poisonDps = p.def.poisonDmg * (1 - red);
                            }
                        }
                    });
                } else {
                    // Single target effects
                    let baseDmg = p.def.dmg;
                    if (p.def.type === 'slot') baseDmg = Math.floor(Math.random() * p.def.maxDmg) + 1;
                    
                    let actualDmg = this.calculateDamage(baseDmg, p.baseDef.dmgType, p.target.def.armor, p.target.def.mr);
                    
                    if (p.def.type === 'execute') {
                        if (p.target.hp / p.target.maxHp <= p.def.thresh) actualDmg = p.target.hp; // Instakill
                    }
                    
                    p.target.hp -= actualDmg;
                    
                    if (p.def.type === 'vampire') {
                        this.hp = Math.min(CONFIG.START_HP, this.hp + 1);
                        this.updateHUD();
                        this.spawnParticles(tx, ty, '#8e44ad', 10, 1);
                    } else if (p.def.type === 'stun') {
                        if (Math.random() < p.def.prob) p.target.stunTimer = p.def.dur;
                        this.spawnParticles(tx, ty, '#f1c40f', 10, 1);
                    } else if (p.def.type === 'teleport') {
                        if (Math.random() < p.def.prob) {
                            p.target.wpIdx = Math.max(0, p.target.wpIdx - 3);
                            p.target.x = WAYPOINTS[p.target.wpIdx].x;
                            p.target.y = WAYPOINTS[p.target.wpIdx].y;
                        }
                        this.spawnParticles(tx, ty, '#3498db', 20, 2);
                    } else {
                        this.spawnParticles(tx, ty, p.baseDef.color, 10, 1);
                    }
                }"""
js = js.replace(old_hit, new_hit)


# Add Mine Drawing
old_draw_towers = """        this.towers.forEach(t => {"""
new_draw_towers = """        if (this.mines) {
            this.mines.forEach(m => {
                this.ctx.fillStyle = (m.life % 400 < 200) ? '#c0392b' : '#333';
                this.ctx.beginPath(); this.ctx.arc(m.x, m.y, 8, 0, Math.PI*2); this.ctx.fill();
            });
        }
        
        this.towers.forEach(t => {"""
js = js.replace(old_draw_towers, new_draw_towers)

with open('js/main.js', 'w') as f:
    f.write(js)
