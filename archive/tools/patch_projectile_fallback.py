import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_logic = """        if ((this.type === 'cattail' || this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') && this.targetZombie && !this.targetZombie.isDead && this.targetZombie.state !== 'DYING') {
            let dx = this.targetZombie.x + 40 - this.x;
            let dy = this.targetZombie.y + 50 - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * deltaTime;
                this.y += (dy / dist) * this.speed * deltaTime;
            }"""

new_logic = """        if (this.type === 'cattail' || this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') {
            if (this.targetZombie && !this.targetZombie.isDead && this.targetZombie.state !== 'DYING') {
                let dx = this.targetZombie.x + 40 - this.x;
                let dy = this.targetZombie.y + 50 - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    this.vx = (dx / dist) * this.speed;
                    this.vy = (dy / dist) * this.speed;
                    this.x += this.vx * deltaTime;
                    this.y += this.vy * deltaTime;
                }
            } else {
                // Target is dead or missing, keep flying in last known direction or forward
                if (!this.vx) this.vx = this.speed;
                if (!this.vy) this.vy = 0;
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                
                // Also check if it randomly hits another zombie while flying blindly
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                for (let z of zombies) {
                    let dx = z.x + 40 - this.x;
                    let dy = z.y + 50 - this.y;
                    if (Math.hypot(dx, dy) < 40) {
                        this.targetZombie = z; // found a new target!
                        break;
                    }
                }
            }
            
            let dx = this.targetZombie ? this.targetZombie.x + 40 - this.x : 1000;
            let dy = this.targetZombie ? this.targetZombie.y + 50 - this.y : 1000;
            let dist = Math.hypot(dx, dy);
            """

content = content.replace(old_logic, new_logic)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
