import re

# 1. Update index.html for UI (Speed button + 2 new towers)
with open('index.html', 'r') as f:
    html = f.read()

# Make build-menu slightly wider or let it flex
old_build_menu = """                <div id="build-menu" class="bottom-bar" style="display: none;">
                    <div class="tower-card" data-type="ARCHER"><div class="tower-icon">🏹</div><div class="tower-cost">70</div></div>
                    <div class="tower-card" data-type="MAGE"><div class="tower-icon">🔮</div><div class="tower-cost">100</div></div>
                    <div class="tower-card" data-type="ARTILLERY"><div class="tower-icon">💣</div><div class="tower-cost">125</div></div>
                    <div class="tower-card" data-type="ICE"><div class="tower-icon">❄️</div><div class="tower-cost">150</div></div>
                </div>"""

new_build_menu = """                <div id="build-menu" class="bottom-bar" style="display: none; flex-wrap: wrap; justify-content: center; max-width: 600px;">
                    <div class="tower-card" data-type="ARCHER" title="物理单体速射"><div class="tower-icon">🏹</div><div class="tower-cost">70</div></div>
                    <div class="tower-card" data-type="MAGE" title="魔法穿甲单体"><div class="tower-icon">🔮</div><div class="tower-cost">100</div></div>
                    <div class="tower-card" data-type="ARTILLERY" title="物理群体溅射"><div class="tower-icon">💣</div><div class="tower-cost">125</div></div>
                    <div class="tower-card" data-type="ICE" title="魔法群体减速"><div class="tower-icon">❄️</div><div class="tower-cost">150</div></div>
                    <div class="tower-card" data-type="SNIPER" title="超远物理重击"><div class="tower-icon">🎯</div><div class="tower-cost">180</div></div>
                    <div class="tower-card" data-type="POISON" title="魔法群体持续毒伤"><div class="tower-icon">🍄</div><div class="tower-cost">140</div></div>
                </div>"""
html = html.replace(old_build_menu, new_build_menu)

with open('index.html', 'w') as f:
    f.write(html)

# 2. Update js/main.js
with open('js/main.js', 'r') as f:
    js = f.read()

# Speed Button Logic
old_speed = """        document.getElementById('btn-speed').onclick = () => {
            this.gameSpeed = this.gameSpeed === 1.0 ? 2.0 : 1.0;
            document.getElementById('btn-speed').innerText = `▶️ ${this.gameSpeed}x`;
        };"""
new_speed = """        this.speeds = [1.0, 2.0, 3.0, 5.0];
        document.getElementById('btn-speed').onclick = () => {
            let idx = this.speeds.indexOf(this.gameSpeed);
            idx = (idx + 1) % this.speeds.length;
            this.gameSpeed = this.speeds[idx];
            document.getElementById('btn-speed').innerText = `▶️ ${this.gameSpeed}x`;
        };"""
js = js.replace(old_speed, new_speed)

# Add SNIPER and POISON to TOWER_DEFS
old_tower_defs_end = """        levels: [
            { cost: 150, range: 140, dmg: 15, cd: 1000, type: 'splash', splash: 80, slowDur: 1500, slowMult: 0.6 },
            { cost: 200, range: 180, dmg: 30, cd: 950, type: 'splash', splash: 90, slowDur: 2000, slowMult: 0.5 },
            { cost: 250, range: 220, dmg: 50, cd: 900, type: 'splash', splash: 100, slowDur: 2500, slowMult: 0.4 }
        ]
    }
};"""

new_tower_defs_end = """        levels: [
            { cost: 150, range: 140, dmg: 15, cd: 1000, type: 'splash', splash: 80, slowDur: 1500, slowMult: 0.6 },
            { cost: 200, range: 180, dmg: 30, cd: 950, type: 'splash', splash: 90, slowDur: 2000, slowMult: 0.5 },
            { cost: 250, range: 220, dmg: 50, cd: 900, type: 'splash', splash: 100, slowDur: 2500, slowMult: 0.4 }
        ]
    },
    'SNIPER': { 
        name: '巨弩塔', color: '#f39c12', dmgType: 'physical', baseColor: '#5c4033', barrelColor: '#d35400',
        levels: [
            { cost: 180, range: 250, dmg: 100, cd: 2500, type: 'single' },
            { cost: 250, range: 300, dmg: 220, cd: 2300, type: 'single' },
            { cost: 380, range: 380, dmg: 450, cd: 2000, type: 'single' }
        ]
    },
    'POISON': { 
        name: '剧毒塔', color: '#27ae60', dmgType: 'magic', baseColor: '#1e824c', barrelColor: '#2ecc71',
        levels: [
            { cost: 140, range: 140, dmg: 10, cd: 1500, type: 'poison', splash: 70, poisonDmg: 5, poisonDur: 4000 },
            { cost: 200, range: 170, dmg: 20, cd: 1400, type: 'poison', splash: 80, poisonDmg: 12, poisonDur: 4000 },
            { cost: 280, range: 200, dmg: 35, cd: 1300, type: 'poison', splash: 90, poisonDmg: 25, poisonDur: 4000 }
        ]
    }
};"""
js = js.replace(old_tower_defs_end, new_tower_defs_end)

# Enemy poison property init
old_enemy_push = """                this.enemies.push({
                    def: eDef, wpIdx: targetIdx,
                    x: startX, y: startY,
                    maxHp: maxHp, hp: maxHp, slowTimer: 0,
                    spawnTimer: 0 // For boss spawning
                });"""
new_enemy_push = """                this.enemies.push({
                    def: eDef, wpIdx: targetIdx,
                    x: startX, y: startY,
                    maxHp: maxHp, hp: maxHp, slowTimer: 0,
                    spawnTimer: 0, poisonTimer: 0, poisonDps: 0
                });"""
js = js.replace(old_enemy_push, new_enemy_push)

old_boss_spawn = """                    this.enemies.push({
                        def: ENEMY_DEFS['GOBLIN'], wpIdx: e.wpIdx,
                        x: e.x + (Math.random()-0.5)*40, y: e.y + (Math.random()-0.5)*40,
                        maxHp: 150, hp: 150, slowTimer: 0, spawnTimer: 0
                    });"""
new_boss_spawn = """                    this.enemies.push({
                        def: ENEMY_DEFS['GOBLIN'], wpIdx: e.wpIdx,
                        x: e.x + (Math.random()-0.5)*40, y: e.y + (Math.random()-0.5)*40,
                        maxHp: 150, hp: 150, slowTimer: 0, spawnTimer: 0, poisonTimer: 0, poisonDps: 0
                    });"""
js = js.replace(old_boss_spawn, new_boss_spawn)


# Enemy poison tick
old_enemy_slow = """            if (e.slowTimer > 0) e.slowTimer -= dt;
            
            // Boss mechanics"""
new_enemy_slow = """            if (e.slowTimer > 0) e.slowTimer -= dt;
            if (e.poisonTimer > 0) {
                e.poisonTimer -= dt;
                e.hp -= e.poisonDps * (dt / 1000);
                if (Math.random() < 0.1) this.spawnParticles(e.x, e.y, '#2ecc71', 1, 0.5); // Poison drips
            }
            
            // Boss mechanics"""
js = js.replace(old_enemy_slow, new_enemy_slow)


# Projectile Hit Logic
old_hit = """                if (isSplash) {
                    this.spawnParticles(tx, ty, '#e74c3c', 30, 2);
                    Audio.playExplosion();
                    
                    this.enemies.forEach(e => {
                        if (e.def.flying) return; // Flying immune to splash
                        if (Math.hypot(e.x - tx, e.y - ty) <= p.def.splash) {
                            let actualDmg = this.calculateDamage(p.def.dmg, p.baseDef.dmgType, e.def.armor, e.def.mr);
                            e.hp -= actualDmg;
                            if (p.def.slowDur) e.slowTimer = p.def.slowDur;
                        }
                    });"""
new_hit = """                if (isSplash || p.def.type === 'poison') {
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
                    });"""
js = js.replace(old_hit, new_hit)


# Draw towers
old_draw_towers = """            } else if (t.type === 'ICE') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.moveTo(15, 0); this.ctx.lineTo(-10, 15); this.ctx.lineTo(-10, -15); this.ctx.fill(); // Ice shard
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath(); this.ctx.moveTo(10, 0); this.ctx.lineTo(-5, 8); this.ctx.lineTo(-5, -8); this.ctx.fill(); // Inner shard
            }
            
            this.ctx.restore();"""

new_draw_towers = """            } else if (t.type === 'ICE') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.moveTo(15, 0); this.ctx.lineTo(-10, 15); this.ctx.lineTo(-10, -15); this.ctx.fill(); // Ice shard
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath(); this.ctx.moveTo(10, 0); this.ctx.lineTo(-5, 8); this.ctx.lineTo(-5, -8); this.ctx.fill(); // Inner shard
            } else if (t.type === 'SNIPER') {
                this.ctx.fillStyle = '#e67e22'; // Big wood arms
                this.ctx.fillRect(0, -30, 8, 60);
                this.ctx.fillStyle = '#2c3e50'; // Metal track
                this.ctx.fillRect(-15, -4, 35, 8);
                this.ctx.fillStyle = '#bdc3c7'; // Huge bolt
                this.ctx.fillRect(-10, -2, 40, 4);
                this.ctx.fillStyle = '#c0392b'; // Bolt tip
                this.ctx.beginPath(); this.ctx.moveTo(30, -4); this.ctx.lineTo(40, 0); this.ctx.lineTo(30, 4); this.ctx.fill();
            } else if (t.type === 'POISON') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 16, 0, Math.PI*2); this.ctx.fill(); // Bulb
                this.ctx.fillStyle = '#1e824c';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill(); // Inner core
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(5, -4, 15, 8); // Spout
            }
            
            this.ctx.restore();"""
js = js.replace(old_draw_towers, new_draw_towers)

# Projectile drawing
old_proj_draw = """            if (p.def.type === 'splash') {
                this.ctx.fillStyle = '#c0392b';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.dmgType === 'magic') {"""

new_proj_draw = """            if (p.def.type === 'splash') {
                this.ctx.fillStyle = '#c0392b';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
            } else if (p.def.type === 'poison') {
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.dmgType === 'magic') {"""
js = js.replace(old_proj_draw, new_proj_draw)


# Stats UI Dps formula logic
# Since sniper and poison have different dps logic, we need to account for poison DoT
old_dps = """            // Build stats preview
            let dpsCur = Math.round(curDef.dmg / (curDef.cd / 1000));
            let dpsNext = Math.round(nextDef.dmg / (nextDef.cd / 1000));
            
            statsDiv.innerHTML = `"""
            
new_dps = """            // Build stats preview
            let dpsCur = Math.round(curDef.dmg / (curDef.cd / 1000)) + (curDef.poisonDmg || 0);
            let dpsNext = Math.round(nextDef.dmg / (nextDef.cd / 1000)) + (nextDef.poisonDmg || 0);
            
            statsDiv.innerHTML = `"""
js = js.replace(old_dps, new_dps)


with open('js/main.js', 'w') as f:
    f.write(js)
