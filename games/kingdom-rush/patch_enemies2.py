import re

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Update ENEMY_DEFS
old_defs = """const ENEMY_DEFS = {
    'GOBLIN': { name: '哥布林', hp: 80, speed: 2.5, reward: 10, color: '#2ecc71', size: 10, armor: 0, mr: 0, flying: false },
    'ORC': { name: '重甲兽人', hp: 250, speed: 1.2, reward: 20, color: '#27ae60', size: 16, armor: 50, mr: 0, flying: false },
    'GARGOYLE': { name: '石像鬼', hp: 120, speed: 1.8, reward: 25, color: '#7f8c8d', size: 14, armor: 0, mr: 70, flying: true },
    'BOSS': { name: '巨魔首领', hp: 1500, speed: 0.8, reward: 150, color: '#1abc9c', size: 24, armor: 30, mr: 30, flying: false, boss: true }
};"""

new_defs = """const ENEMY_DEFS = {
    'GOBLIN': { name: '哥布林', hp: 80, speed: 2.5, reward: 10, color: '#2ecc71', size: 10, armor: 0, mr: 0, flying: false },
    'ORC': { name: '重甲兽人', hp: 250, speed: 1.2, reward: 20, color: '#27ae60', size: 16, armor: 50, mr: 0, flying: false },
    'GARGOYLE': { name: '石像鬼', hp: 120, speed: 1.8, reward: 25, color: '#7f8c8d', size: 14, armor: 0, mr: 70, flying: true },
    'BOSS': { name: '巨魔首领', hp: 1500, speed: 0.8, reward: 150, color: '#1abc9c', size: 24, armor: 30, mr: 30, flying: false, boss: true },
    'THIEF': { type: 'thief', name: '窃贼', hp: 100, speed: 4.0, reward: 30, color: '#f1c40f', size: 12, armor: 10, mr: 10, flying: false },
    'SHAMAN': { type: 'shaman', name: '治疗者', hp: 300, speed: 1.5, reward: 40, color: '#2ecc71', size: 14, armor: 0, mr: 40, flying: false },
    'BOMBER': { type: 'bomber', name: '自爆怪', hp: 200, speed: 2.0, reward: 40, color: '#c0392b', size: 16, armor: 20, mr: 20, flying: false },
    'GHOST': { type: 'ghost', name: '物理免疫', hp: 150, speed: 1.8, reward: 35, color: '#bdc3c7', size: 14, armor: 9999, mr: -50, flying: false }
};"""
js = js.replace(old_defs, new_defs)

# 2. Update Wave Generator
old_wave = """        let types = ['GOBLIN', 'ORC'];
        
        // Massive swarm mode! Triple the enemies, but scale HP slightly slower
        let count = 20 + this.wave * 8; 
        let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.15, this.wave);"""
        
# Actually let's search dynamically for wave generator logic
# In previous version, wave gen was like:
# let type = types[Math.floor(Math.random() * types.length)];
# let count = 20 + this.wave * 8; // Massive Swarm

def wave_repl(m):
    return """        let types = ['GOBLIN'];
        if (this.wave >= 2) types.push('ORC');
        if (this.wave >= 4) types.push('THIEF');
        if (this.wave >= 6) types.push('SHAMAN');
        if (this.wave >= 8) types.push('GHOST');
        if (this.wave >= 10) types.push('BOMBER');
        let type = types[Math.floor(Math.random() * types.length)];"""

js = re.sub(r"        let types = \['GOBLIN', 'ORC'\];\s*let type = types\[Math.floor\(Math.random\(\) \* types.length\)\];", wave_repl, js)


# 3. Enemy creation properties
js = js.replace("spawnTimer: 0, poisonTimer: 0, poisonDps: 0", "spawnTimer: 0, poisonTimer: 0, poisonDps: 0, healTimer: 3000")

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
                            t.stunTimer = Math.max(t.stunTimer || 0, 3000); // 3 second stun
                        }
                    });
                }
                this.gold += e.def.reward;
                this.enemies.splice(i, 1);
                continue;
            }"""
js = js.replace(old_death, new_death)

old_mechanics = """            // Boss mechanics
            if (e.def.boss) {"""
new_mechanics = """            // Shaman mechanics
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
            if (e.def.boss) {"""
js = js.replace(old_mechanics, new_mechanics)


# 5. Enemy Drawing (Labels & Auras)
old_draw_enemy = """            this.ctx.fillRect(-e.def.size, -e.def.size, e.def.size*2, e.def.size*2);
            
            if (e.def === ENEMY_DEFS['ORC']) {
                this.ctx.strokeStyle = '#bdc3c7'; this.ctx.lineWidth = 3;
                this.ctx.strokeRect(-e.def.size-2, -e.def.size-2, e.def.size*2+4, e.def.size*2+4);
            } else if (e.def === ENEMY_DEFS['GARGOYLE']) {
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.beginPath(); this.ctx.moveTo(-10, 0); this.ctx.lineTo(-20, -10); this.ctx.lineTo(-10, 10); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(10, 0); this.ctx.lineTo(20, -10); this.ctx.lineTo(10, 10); this.ctx.fill();
            }
            
            // Draw HP bar"""

new_draw_enemy = """            // Ghost translucency
            if (e.def.type === 'ghost') this.ctx.globalAlpha = 0.5;
            
            this.ctx.fillRect(-e.def.size, -e.def.size, e.def.size*2, e.def.size*2);
            
            if (e.def === ENEMY_DEFS['ORC']) {
                this.ctx.strokeStyle = '#bdc3c7'; this.ctx.lineWidth = 3;
                this.ctx.strokeRect(-e.def.size-2, -e.def.size-2, e.def.size*2+4, e.def.size*2+4);
            } else if (e.def === ENEMY_DEFS['GARGOYLE']) {
                this.ctx.fillStyle = '#7f8c8d';
                this.ctx.beginPath(); this.ctx.moveTo(-10, 0); this.ctx.lineTo(-20, -10); this.ctx.lineTo(-10, 10); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(10, 0); this.ctx.lineTo(20, -10); this.ctx.lineTo(10, 10); this.ctx.fill();
            } else if (e.def.type === 'bomber') {
                if (performance.now() % 400 < 200) {
                    this.ctx.fillStyle = '#fff'; this.ctx.fillRect(-e.def.size/2, -e.def.size/2, e.def.size, e.def.size);
                }
            } else if (e.def.type === 'shaman') {
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(-2, -6, 4, 12); 
                this.ctx.fillRect(-6, -2, 12, 4); 
            }
            
            this.ctx.globalAlpha = 1.0;
            
            // Draw special labels/auras above head
            if (e.def.type) {
                // Floating text label
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px "Noto Serif SC"';
                this.ctx.textAlign = 'center';
                
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = '#000';
                this.ctx.strokeText(`[${e.def.name}]`, 0, -35);
                
                if (e.def.type === 'thief') this.ctx.fillStyle = '#f1c40f';
                if (e.def.type === 'bomber') this.ctx.fillStyle = '#e74c3c';
                if (e.def.type === 'ghost') this.ctx.fillStyle = '#3498db';
                if (e.def.type === 'shaman') this.ctx.fillStyle = '#2ecc71';
                
                this.ctx.fillText(`[${e.def.name}]`, 0, -35);
                
                // Auras
                if (e.def.type === 'thief' && performance.now() % 200 < 100) {
                    this.ctx.strokeStyle = '#f1c40f'; this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(-e.def.size-6, -e.def.size-6, e.def.size*2+12, e.def.size*2+12);
                }
            }
            
            // Draw HP bar"""
js = js.replace(old_draw_enemy, new_draw_enemy)

# Add stun logic to towers since bomber stuns them
js = js.replace("            if (t.buffTimer > 0) t.buffTimer -= dt;\n", "            if (t.buffTimer > 0) t.buffTimer -= dt;\n            if (t.stunTimer > 0) { t.stunTimer -= dt; continue; } // Stunned tower cannot do anything\n")

with open('js/main.js', 'w') as f:
    f.write(js)
