import re

# 1. HTML / CSS UI fixes
with open('index.html', 'r') as f:
    html = f.read()

old_menu_style = """                <div id="build-menu" class="bottom-bar" style="display: none; flex-wrap: wrap; justify-content: center; max-width: 1000px; gap: 5px;">"""
new_menu_style = """                <div id="build-menu" class="bottom-bar build-menu-scroll" style="display: none; flex-wrap: nowrap; justify-content: flex-start; max-width: 90vw; gap: 10px; overflow-x: auto; padding-bottom: 10px;">"""
html = html.replace(old_menu_style, new_menu_style)

with open('index.html', 'w') as f:
    f.write(html)

with open('css/style.css', 'r') as f:
    css = f.read()

# Add hidden scrollbar styling for the build menu
css += """
.build-menu-scroll::-webkit-scrollbar {
    height: 8px;
}
.build-menu-scroll::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
}
.build-menu-scroll::-webkit-scrollbar-thumb {
    background: #d4af37;
    border-radius: 4px;
}
"""
with open('css/style.css', 'w') as f:
    f.write(css)


# 2. JS Logic (Monster density, Particle limit, Custom Projectiles)
with open('js/main.js', 'r') as f:
    js = f.read()

# Buff wave sizes significantly
old_wave = """        let type = types[Math.floor(Math.random() * types.length)];
        let count = 10 + this.wave * 3;
        let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.2, this.wave);"""

new_wave = """        let type = types[Math.floor(Math.random() * types.length)];
        // Massive swarm mode! Triple the enemies, but scale HP slightly slower
        let count = 20 + this.wave * 8; 
        let hp = ENEMY_DEFS[type].baseHp * Math.pow(1.15, this.wave);"""
js = js.replace(old_wave, new_wave)

# Cap Particles
old_spawn_particles = """    spawnParticles(x, y, color, count, speed) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 200 * speed,
                vy: (Math.random() - 0.5) * 200 * speed,
                life: 1.0, decay: Math.random() * 0.05 + 0.02,
                color: color
            });
        }
    }"""
new_spawn_particles = """    spawnParticles(x, y, color, count, speed) {
        // Prevent FPS drop during massive AOE
        if (this.particles.length > 500) this.particles.splice(0, count); 
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 200 * speed,
                vy: (Math.random() - 0.5) * 200 * speed,
                life: 1.0, decay: Math.random() * 0.05 + 0.02,
                color: color
            });
        }
    }"""
js = js.replace(old_spawn_particles, new_spawn_particles)

# Custom Projectiles
old_draw_proj = """            if (p.def.type === 'splash') {
                this.ctx.fillStyle = '#c0392b';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
            } else if (p.def.type === 'poison') {
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
            } else if (p.baseDef.dmgType === 'magic') {
                this.ctx.fillStyle = p.baseDef.color;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 5, 0, Math.PI*2); this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(-6, -2, 12, 4); // arrow
            }"""

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
            } else if (p.baseDef.dmgType === 'magic') {
                this.ctx.fillStyle = p.baseDef.color; this.ctx.beginPath(); this.ctx.arc(0, 0, 5, 0, Math.PI*2); this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#333'; this.ctx.fillRect(-6, -2, 12, 4); // standard arrow
            }"""
js = js.replace(old_draw_proj, new_draw_proj)

with open('js/main.js', 'w') as f:
    f.write(js)

