import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_constructor = """    constructor(game, x, y, row, type = 'peashooter', targetZombie = null) {
        super(game, x, y);
        this.targetZombie = targetZombie;
        this.row = row;"""
new_constructor = """    constructor(game, x, y, row, type = 'peashooter', targetZombie = null, vx = None, vy = None) {
        super(game, x, y);
        this.targetZombie = targetZombie;
        this.row = row;
        this.vx = vx;
        this.vy = vy;"""
content = content.replace(old_constructor, new_constructor)

old_update = """        } else {
            this.x += this.speed * deltaTime;
        }"""
new_update = """        } else if (this.vx !== undefined && this.vy !== undefined && this.vx !== null && this.vy !== null) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            
            // Gloom-shroom projectile collision
            if (this.type === 'gloom_puff') {
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                for (let z of zombies) {
                    let dx = z.x + 40 - this.x;
                    let dy = z.y + 50 - this.y;
                    if (Math.hypot(dx, dy) < 40) {
                        z.takeDamage(this.damage);
                        this.isDead = true;
                        break;
                    }
                }
                // Range limit (1.5 cells)
                if (Math.hypot(this.x - this.startX, this.y - this.startY) > 120) {
                    this.isDead = true;
                }
            }
        } else {
            this.x += this.speed * deltaTime;
        }"""
content = content.replace(old_update, new_update)

old_start = """        this.type = type;
        this.startX = x;"""
new_start = """        this.type = type;
        this.startX = x;
        this.startY = y;"""
content = content.replace(old_start, new_start)

# Add gloom_puff visual
old_puff = """        } else if (type === 'puffshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';"""
new_puff = """        } else if (type === 'puffshroom' || type === 'gloom_puff') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';"""
content = content.replace(old_puff, new_puff)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

