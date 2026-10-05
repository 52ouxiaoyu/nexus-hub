import re

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Swarm Mode Buff
js = js.replace("let count = 10 + this.wave * 3;", "let count = 20 + this.wave * 8; // Massive Swarm")
js = js.replace("let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.2, this.wave);", "let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.15, this.wave);")

# 2. Particle Cap
js = js.replace("spawnParticles(x, y, color, count, speed) {", "spawnParticles(x, y, color, count, speed) {\n        if (this.particles.length > 500) this.particles.splice(0, count);")

# 3. Custom Projectiles
old_draw_proj = """            if (p.def.type === 'splash') {
                this.ctx.fillStyle = '#c0392b';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
            } else if (p.def.type === 'poison') {
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.dmgType === 'magic') {"""

new_draw_proj = """            if (p.def.type === 'nuke') {
                this.ctx.fillStyle = '#bdc3c7'; this.ctx.fillRect(-15, -5, 30, 10);
                this.ctx.fillStyle = '#e74c3c'; this.ctx.beginPath(); this.ctx.arc(15, 0, 5, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#f39c12'; this.ctx.beginPath(); this.ctx.arc(-15, 0, 6, 0, Math.PI*2); this.ctx.fill(); // Rocket flame
            } else if (p.def.type === 'money') {
                this.ctx.fillStyle = '#f1c40f'; this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#f39c12'; this.ctx.beginPath(); this.ctx.arc(0, 0, 5, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.name === '巨弩塔') {
                this.ctx.fillStyle = '#7f8c8d'; this.ctx.fillRect(-20, -2, 40, 4);
                this.ctx.fillStyle = '#c0392b'; this.ctx.beginPath(); this.ctx.moveTo(20, -4); this.ctx.lineTo(25, 0); this.ctx.lineTo(20, 4); this.ctx.fill();
            } else if (p.def.type === 'splash') {
                this.ctx.fillStyle = '#c0392b'; this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
            } else if (p.def.type === 'poison') {
                this.ctx.fillStyle = '#2ecc71'; this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.dmgType === 'magic') {"""
js = js.replace(old_draw_proj, new_draw_proj)

with open('js/main.js', 'w') as f:
    f.write(js)
