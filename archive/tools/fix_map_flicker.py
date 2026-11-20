import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Fix flickering map by making map generation deterministic
old_rand = "let rand = Math.random();"
new_rand = """let hash = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);
                let rand = hash - Math.floor(hash);"""
code = code.replace(old_rand, new_rand)

# 2. Fix bullet drifting (replace resolveBuildingCollision with destroy-on-hit)
old_bullet = """        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
        resolveBuildingCollision(this);"""
new_bullet = """        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
        
        // Destroy bullet if it hits a wall (instead of sliding along it)
        for(let b of buildings) {
            if(this.x > b.x && this.x < b.x + b.w && this.y > b.y && this.y < b.y + b.h) {
                this.active = false;
                createParticles(this.x, this.y, '#555', 5);
                break;
            }
        }"""
code = code.replace(old_bullet, new_bullet)

# 3. Fix shooting angle delay
old_keys = """            if(this.id === 1) {
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
            }"""
new_keys = """            let wantsToShoot = false;
            if(this.id === 1) {
                if(keys.KeyW) dy -= 1;
                if(keys.KeyS) dy += 1;
                if(keys.KeyA) dx -= 1;
                if(keys.KeyD) dx += 1;
                if(keys.Space) wantsToShoot = true;
            } else {
                if(keys.ArrowUp) dy -= 1;
                if(keys.ArrowDown) dy += 1;
                if(keys.ArrowLeft) dx -= 1;
                if(keys.ArrowRight) dx += 1;
                if(keys.Enter || keys.NumpadEnter) wantsToShoot = true;
            }

            if(dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len; dy /= len;
                this.facing = {x: dx, y: dy};
            }
            if(wantsToShoot) this.shoot();"""
code = code.replace(old_keys, new_keys)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
