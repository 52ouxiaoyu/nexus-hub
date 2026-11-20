import re

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Update ENEMY_DEFS
old_enemy_defs = """const ENEMY_DEFS = {
    'GOBLIN': { speed: 80, baseHp: 30, reward: 5, color: '#27ae60', armor: 0, mr: 0 },
    'ORC': { speed: 50, baseHp: 80, reward: 10, color: '#16a085', armor: 50, mr: 10 },
    'GARGOYLE': { speed: 70, baseHp: 40, reward: 15, color: '#7f8c8d', armor: 20, mr: 60, flying: true },
    'BOSS': { speed: 40, baseHp: 500, reward: 100, color: '#8e44ad', armor: 30, mr: 30 }
};"""

new_enemy_defs = """const ENEMY_DEFS = {
    'GOBLIN': { speed: 80, baseHp: 30, reward: 5, color: '#27ae60', armor: 0, mr: 0 },
    'ORC': { speed: 50, baseHp: 80, reward: 10, color: '#16a085', armor: 50, mr: 10 },
    'GARGOYLE': { speed: 70, baseHp: 40, reward: 15, color: '#7f8c8d', armor: 20, mr: 60, flying: true },
    'BOSS': { speed: 40, baseHp: 500, reward: 100, color: '#8e44ad', armor: 30, mr: 30 },
    'THIEF': { type: 'thief', name: '窃贼', speed: 150, baseHp: 40, reward: 20, color: '#f1c40f', armor: 10, mr: 10 },
    'SHAMAN': { type: 'shaman', name: '治疗者', speed: 60, baseHp: 100, reward: 25, color: '#2ecc71', armor: 0, mr: 40 },
    'BOMBER': { type: 'bomber', name: '自爆', speed: 65, baseHp: 120, reward: 30, color: '#c0392b', armor: 20, mr: 20 },
    'GHOST': { type: 'ghost', name: '物理免疫', speed: 55, baseHp: 60, reward: 25, color: '#bdc3c7', armor: 9999, mr: -50 } // Weak to magic
};"""
js = js.replace(old_enemy_defs, new_enemy_defs)


# 2. Update Wave Generator
old_wave_gen = """        let types = ['GOBLIN', 'ORC'];
        // Massive Swarm
        let count = 20 + this.wave * 8; 
        let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.15, this.wave);"""

new_wave_gen = """        let types = ['GOBLIN'];
        if (this.wave >= 2) types.push('ORC');
        if (this.wave >= 4) types.push('THIEF');
        if (this.wave >= 6) types.push('SHAMAN');
        if (this.wave >= 8) types.push('GHOST');
        if (this.wave >= 10) types.push('BOMBER');
        
        // Massive Swarm
        let count = 20 + this.wave * 8; 
        let type = types[Math.floor(Math.random() * types.length)];
        let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.15, this.wave);"""
js = js.replace("        let type = types[Math.floor(Math.random() * types.length)];\n" + old_wave_gen, new_wave_gen)


# 3. Enemy creation properties
old_enemy_push = """                    maxHp: maxHp, hp: maxHp, slowTimer: 0,
                    spawnTimer: 0, poisonTimer: 0, poisonDps: 0
                });"""
new_enemy_push = """                    maxHp: maxHp, hp: maxHp, slowTimer: 0,
                    spawnTimer: 0, poisonTimer: 0, poisonDps: 0, healTimer: 3000
                });"""
js = js.replace(old_enemy_push, new_enemy_push)


# 4. Enemy Update Logic (Shaman Heal, Bomber Death, Thief Hit)
old_base_hit = """            if (e.wpIdx >= WAYPOINTS.length) {
                this.enemies.splice(i, 1);
                this.hp = Math.max(0, this.hp - 1);
                this.updateHUD();
                Audio.playHit();
                if (this.hp === 0) this.gameOver();
                continue;
            }"""
new_base_hit = """            if (e.wpIdx >= WAYPOINTS.length) {
                this.enemies.splice(i, 1);
                if (e.def.type === 'thief') {
                    this.gold = Math.max(0, this.gold - 50); // Steal 50 gold!
                    this.spawnParticles(this.towers.length>0?this.towers[0].x:e.x, e.y, '#f1c40f', 20, 2); 
                } else {
                    this.hp = Math.max(0, this.hp - 1);
                }
                this.updateHUD();
                Audio.playHit();
                if (this.hp === 0) this.gameOver();
                continue;
            }"""
js = js.replace(old_base_hit, new_base_hit)

old_death = """            if (e.hp <= 0) {
                this.spawnParticles(e.x, e.y, e.def.color, 20, 1.5); // Death splat
                this.gold += e.def.reward;
                this.enemies.splice(i, 1);
                continue;
            }"""
new_death = """            if (e.hp <= 0) {
                this.spawnParticles(e.x, e.y, e.def.color, 20, 1.5); // Death splat
                if (e.def.type === 'bomber') {
                    // Explode and stun nearby towers
                    this.spawnParticles(e.x, e.y, '#c0392b', 50, 4);
                    Audio.playExplosion();
                    this.towers.forEach(t => {
                        if (Math.hypot(t.x - e.x, t.y - e.y) < 150) {
                            t.cdTimer = Math.max(t.cdTimer, 3000); // 3 second stun
                        }
                    });
                }
                this.gold += e.def.reward;
                this.enemies.splice(i, 1);
                continue;
            }"""
js = js.replace(old_death, new_death)

old_enemy_mechanics = """            // Boss mechanics
            if (e.def === ENEMY_DEFS['BOSS']) {"""
new_enemy_mechanics = """            // Shaman mechanics
            if (e.def.type === 'shaman') {
                e.healTimer -= dt;
                if (e.healTimer <= 0) {
                    e.healTimer = 3000;
                    this.spawnParticles(e.x, e.y, '#2ecc71', 15, 2);
                    this.enemies.forEach(e2 => {
                        if (Math.hypot(e2.x - e.x, e2.y - e.y) < 120) {
                            e2.hp = Math.min(e2.maxHp, e2.hp + e2.maxHp * 0.2); // Heal 20%
                        }
                    });
                }
            }
            
            // Boss mechanics
            if (e.def === ENEMY_DEFS['BOSS']) {"""
js = js.replace(old_enemy_mechanics, new_enemy_mechanics)


# 5. Enemy Drawing (Labels & Auras)
old_draw_enemy = """            this.ctx.fillRect(-15, -15, 30, 30);
            
            if (e.def === ENEMY_DEFS['ORC']) {
                this.ctx.strokeStyle = '#bdc3c7'; this.ctx.lineWidth = 4;
                this.ctx.strokeRect(-17, -17, 34, 34);
            } else if (e.def === ENEMY_DEFS['GARGOYLE']) {
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.beginPath(); this.ctx.moveTo(-15, 0); this.ctx.lineTo(-30, -10); this.ctx.lineTo(-15, 15); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(15, 0); this.ctx.lineTo(30, -10); this.ctx.lineTo(15, 15); this.ctx.fill();
            } else if (e.def === ENEMY_DEFS['BOSS']) {
                this.ctx.fillRect(-25, -25, 50, 50); // Big square
            }"""

new_draw_enemy = """            
            // Ghost translucency
            if (e.def.type === 'ghost') this.ctx.globalAlpha = 0.5;
            
            this.ctx.fillRect(-15, -15, 30, 30);
            
            if (e.def === ENEMY_DEFS['ORC']) {
                this.ctx.strokeStyle = '#bdc3c7'; this.ctx.lineWidth = 4;
                this.ctx.strokeRect(-17, -17, 34, 34);
            } else if (e.def === ENEMY_DEFS['GARGOYLE']) {
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.beginPath(); this.ctx.moveTo(-15, 0); this.ctx.lineTo(-30, -10); this.ctx.lineTo(-15, 15); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(15, 0); this.ctx.lineTo(30, -10); this.ctx.lineTo(15, 15); this.ctx.fill();
            } else if (e.def === ENEMY_DEFS['BOSS']) {
                this.ctx.fillRect(-25, -25, 50, 50); // Big square
            } else if (e.def.type === 'bomber') {
                // Flashing red center
                if (performance.now() % 400 < 200) {
                    this.ctx.fillStyle = '#fff'; this.ctx.fillRect(-8, -8, 16, 16);
                }
            } else if (e.def.type === 'shaman') {
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(-4, -10, 8, 20); // Cross vertical
                this.ctx.fillRect(-10, -4, 20, 8); // Cross horizontal
            }
            
            this.ctx.globalAlpha = 1.0;
            
            // Draw special labels/auras above head
            if (e.def.name) {
                // Floating text label
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px "Noto Serif SC"';
                this.ctx.textAlign = 'center';
                
                // Add a black outline to text for readability
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = '#000';
                this.ctx.strokeText(`[${e.def.name}]`, 0, -35);
                
                // Text fill based on type
                if (e.def.type === 'thief') this.ctx.fillStyle = '#f1c40f';
                if (e.def.type === 'bomber') this.ctx.fillStyle = '#e74c3c';
                if (e.def.type === 'ghost') this.ctx.fillStyle = '#3498db';
                if (e.def.type === 'shaman') this.ctx.fillStyle = '#2ecc71';
                
                this.ctx.fillText(`[${e.def.name}]`, 0, -35);
                
                // Auras
                if (e.def.type === 'thief' && performance.now() % 200 < 100) {
                    this.ctx.strokeStyle = '#f1c40f'; this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(-20, -20, 40, 40);
                }
            }"""
js = js.replace(old_draw_enemy, new_draw_enemy)


with open('js/main.js', 'w') as f:
    f.write(js)
