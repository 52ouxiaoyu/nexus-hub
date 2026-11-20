import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Add lastInputTime and isAI to Player constructor
player_constructor_regex = r"(this\.shieldTime = 0;)"
new_player_vars = """\\1
        this.lastInputTime = Date.now();
        this.isAI = false;"""
code = re.sub(player_constructor_regex, new_player_vars, code)

# Fix key listeners to reset lastInputTime
key_down_regex = r"if\(\(e\.code === 'Space' \|\| e\.code === 'Enter' \|\| e\.code === 'NumpadEnter'\) && gameState === 'PLAYING'\) \{"
new_key_down = """
    // Reset AI timer on any key press
    if(gameState === 'PLAYING') {
        players.forEach(p => {
            if(p.id === 1 && (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space')) {
                p.lastInputTime = Date.now();
                p.isAI = false;
            }
            if(p.id === 2 && (e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
                p.lastInputTime = Date.now();
                p.isAI = false;
            }
        });
    }
    if((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && gameState === 'PLAYING') {"""
code = code.replace("if((e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && gameState === 'PLAYING') {", new_key_down)

# Fix Player update for AI and auto-shoot
player_update_regex = r"let dx = 0; let dy = 0;\s*let currentSpeed = this\.buffTime > 0 \? this\.speed \* 1\.5 : this\.speed;\s*if\(this\.id === 1\) \{[\s\S]*?this\.facing = \{x: dx, y: dy\};\s*\}"

new_player_update = """let dx = 0; let dy = 0;
        let currentSpeed = this.buffTime > 0 ? this.speed * 1.5 : this.speed;
        
        if(Date.now() - this.lastInputTime > 5000) {
            this.isAI = true;
        }

        if(this.isAI) {
            // AI Logic
            let closestDist = Infinity;
            let target = null;
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < closestDist) { closestDist = d; target = z; }
            });
            
            if(target) {
                // Aim at target
                let tdx = target.x - this.x;
                let tdy = target.y - this.y;
                let tLen = Math.hypot(tdx, tdy);
                if(tLen > 0) {
                    this.facing = {x: tdx/tLen, y: tdy/tLen};
                }
                
                // Movement: Dodge if too close, approach if far
                if(closestDist < 150) {
                    // Flee
                    dx = -this.facing.x;
                    dy = -this.facing.y;
                } else if(closestDist > 250) {
                    // Approach
                    dx = this.facing.x;
                    dy = this.facing.y;
                } else {
                    // Circle around
                    dx = -this.facing.y;
                    dy = this.facing.x;
                }
                
                // Also dodge borders
                if(this.x < 100) dx = 1;
                if(this.x > CANVAS_W - 100) dx = -1;
                if(this.y < 100) dy = 1;
                if(this.y > CANVAS_H - 100) dy = -1;
                
                // Auto shoot
                this.shoot();
            }
        } else {
            // Player Logic
            if(this.id === 1) {
                if(keys.KeyW) dy -= 1;
                if(keys.KeyS) dy += 1;
                if(keys.KeyA) dx -= 1;
                if(keys.KeyD) dx += 1;
                if(keys.Space) this.shoot();
            } else {
                if(keys.ArrowUp) dy -= 1;
                if(keys.ArrowDown) dy += 1;
                if(keys.ArrowLeft) dx -= 1;
                if(keys.ArrowRight) dx += 1;
                if(keys.Enter || keys.NumpadEnter) this.shoot();
            }

            if(dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len; dy /= len;
                this.facing = {x: dx, y: dy};
            }
        }"""

code = re.sub(player_update_regex, new_player_update, code)

# Draw AI indicator
player_draw_id_regex = r"ctx\.fillText\('P' \+ this\.id, this\.x, this\.y - 25\);"
new_player_draw_id = """ctx.fillText(this.isAI ? 'P' + this.id + ' (AI托管)' : 'P' + this.id, this.x, this.y - 25);"""
code = re.sub(player_draw_id_regex, new_player_draw_id, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
