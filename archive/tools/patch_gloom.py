import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_gloom = """        if (this.hasTrait('gloomshroom')) {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= 1.5) {
                const zombies = this.game.entities.filter(e => 
                    e instanceof Zombie && !e.isDead && Math.abs(e.row - this.row) <= 1 && Math.abs(e.x - this.x) <= 150
                );
                if (zombies.length > 0) {
                    this.fireTimer = 0;
                    this.game.audioManager.play('splat');
                    for (let z of zombies) {
                        z.takeDamage(40); // 2x fumeshroom damage
                    }
                }
            }"""

new_gloom = """        if (this.hasTrait('gloomshroom')) {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= 1.5) {
                const zombies = this.game.entities.filter(e => 
                    e instanceof Zombie && !e.isDead && Math.abs(e.row - this.row) <= 1 && Math.abs(e.x - this.x) <= 150
                );
                if (zombies.length > 0) {
                    this.fireTimer = 0;
                    this.game.audioManager.play('splat');
                    // Spawn 8 projectiles in all directions
                    const dirs = [
                        {vx: 1, vy: 0}, {vx: 1, vy: 1}, {vx: 0, vy: 1}, {vx: -1, vy: 1},
                        {vx: -1, vy: 0}, {vx: -1, vy: -1}, {vx: 0, vy: -1}, {vx: 1, vy: -1}
                    ];
                    for (let d of dirs) {
                        const len = Math.sqrt(d.vx*d.vx + d.vy*d.vy);
                        const p = new Projectile(this.game, this.x + 10, this.y - 15, this.row, 'gloom_puff', null, d.vx/len, d.vy/len);
                        p.maxDistance = 150;
                        this.game.entities.push(p);
                    }
                }
            }"""

content = content.replace(old_gloom, new_gloom)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
