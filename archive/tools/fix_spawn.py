import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Fix Player.update() co-op screen binding to prevent single player stuttering
old_player_bind = """        // Keep players within the current camera view (Co-op screen binding)
        const margin = 50;
        // Use canvas.width/height dynamically instead of the old constants to fix resize bugs!
        let halfW = canvas.width / 2;
        let halfH = canvas.height / 2;
        if(this.x < camera.x - halfW + margin) this.x = camera.x - halfW + margin;
        if(this.x > camera.x + halfW - margin) this.x = camera.x + halfW - margin;
        if(this.y < camera.y - halfH + margin) this.y = camera.y - halfH + margin;
        if(this.y > camera.y + halfH - margin) this.y = camera.y + halfH - margin;"""

new_player_bind = """        // Co-op Screen Binding: Restrict movement relative to teammates to prevent camera easing stutter
        let aliveTeammates = players.filter(p => p !== this && p.hp > 0);
        if (aliveTeammates.length > 0) {
            let margin = 50;
            let other = aliveTeammates[0];
            let maxDx = canvas.width - 2*margin;
            let maxDy = canvas.height - 2*margin;
            if (this.x < other.x - maxDx) this.x = other.x - maxDx;
            if (this.x > other.x + maxDx) this.x = other.x + maxDx;
            if (this.y < other.y - maxDy) this.y = other.y - maxDy;
            if (this.y > other.y + maxDy) this.y = other.y + maxDy;
        }"""
code = code.replace(old_player_bind, new_player_bind)

# 2. Fix Player-Player collision camera bounds (remove them, they are redundant and bad)
old_pp_col = """            // Keep inside camera bounds
            const margin = 50;
            let halfW = canvas.width / 2;
            let halfH = canvas.height / 2;
            p1.x = Math.max(camera.x - halfW + margin, Math.min(camera.x + halfW - margin, p1.x));
            p1.y = Math.max(camera.y - halfH + margin, Math.min(camera.y + halfH - margin, p1.y));
            p2.x = Math.max(camera.x - halfW + margin, Math.min(camera.x + halfW - margin, p2.x));
            p2.y = Math.max(camera.y - halfH + margin, Math.min(camera.y + halfH - margin, p2.y));"""

code = code.replace(old_pp_col, "")

# 3. Fix Zombie Spawning to use camera position instead of absolute 0
old_zombie_spawn = """        // Spawn at edges
        const edge = Math.floor(Math.random() * 4);
        if(edge === 0) { this.x = Math.random() * CANVAS_W; this.y = -30; }
        else if(edge === 1) { this.x = CANVAS_W + 30; this.y = Math.random() * CANVAS_H; }
        else if(edge === 2) { this.x = Math.random() * CANVAS_W; this.y = CANVAS_H + 30; }
        else { this.x = -30; this.y = Math.random() * CANVAS_H; }"""

new_zombie_spawn = """        // Spawn at edges relative to camera
        const edge = Math.floor(Math.random() * 4);
        let cw = canvas.width || window.innerWidth;
        let ch = canvas.height || window.innerHeight;
        let cx = camera.x - cw/2;
        let cy = camera.y - ch/2;
        if(edge === 0) { this.x = cx + Math.random() * cw; this.y = cy - 30; }
        else if(edge === 1) { this.x = cx + cw + 30; this.y = cy + Math.random() * ch; }
        else if(edge === 2) { this.x = cx + Math.random() * cw; this.y = cy + ch + 30; }
        else { this.x = cx - 30; this.y = cy + Math.random() * ch; }"""

code = code.replace(old_zombie_spawn, new_zombie_spawn)

# 4. Fix Zombie Garbage Collection to use canvas width
code = code.replace("z.active && Math.hypot(z.x - camera.x, z.y - camera.y) < CANVAS_W * 2", 
                    "z.active && Math.hypot(z.x - camera.x, z.y - camera.y) < (canvas.width || window.innerWidth) * 2")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
