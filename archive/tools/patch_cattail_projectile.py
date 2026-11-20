import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

# Modify constructor
old_constructor = "constructor(game, x, y, row, type = 'peashooter') {"
new_constructor = "constructor(game, x, y, row, type = 'peashooter', targetZombie = null) {\n        this.targetZombie = targetZombie;"
content = content.replace(old_constructor, new_constructor)

# Modify update to add homing
old_update = """    update(deltaTime) {
        super.update(deltaTime);
        this.x += this.speed * deltaTime;"""
new_update = """    update(deltaTime) {
        super.update(deltaTime);
        if (this.type === 'cattail' && this.targetZombie && !this.targetZombie.isDead) {
            let dx = this.targetZombie.x + 40 - this.x;
            let dy = this.targetZombie.y + 50 - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * deltaTime;
                this.y += (dy / dist) * this.speed * deltaTime;
            }
            if (dist < 30) {
                 this.targetZombie.takeDamage(this.damage);
                 this.isDead = true;
                 return;
            }
        } else {
            this.x += this.speed * deltaTime;
        }"""
content = content.replace(old_update, new_update)

# Add cattail bullet image
old_img = """        } else if (type === 'puffshroom') {"""
new_img = """        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8) rotate(45deg)';
            this.damage = 20;
            this.speed = 400;
        } else if (type === 'puffshroom') {"""
content = content.replace(old_img, new_img)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

