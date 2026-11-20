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
                    // Shoot 8 projectiles in all directions
                    const speed = 300;
                    const dirs = [
                        [1, 0], [-1, 0], [0, 1], [0, -1],
                        [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]
                    ];
                    for (let [dx, dy] of dirs) {
                        let vx = dx * speed;
                        let vy = dy * speed;
                        let proj = new Projectile(this.game, this.x, this.y, this.row, 'gloom_puff', null, vx, vy);
                        this.game.entities.push(proj);
                    }
                }
            }
        }"""
content = content.replace(old_gloom, new_gloom)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
