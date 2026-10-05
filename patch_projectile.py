import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

# Add to constructor
old_type = """        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 20;
            this.speed = 400;"""
new_type = """        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 20;
            this.speed = 400;
        } else if (type === 'cattail_melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 60;
            this.speed = 400;
        } else if (type === 'cattail_wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.8)';
            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            this.damage = 60;
            this.speed = 400;"""
content = content.replace(old_type, new_type)

# Add to update logic
old_update = """        if (this.type === 'cattail' && this.targetZombie && !this.targetZombie.isDead && this.targetZombie.state !== 'DYING') {
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
            }"""
new_update = """        if ((this.type === 'cattail' || this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') && this.targetZombie && !this.targetZombie.isDead && this.targetZombie.state !== 'DYING') {
            let dx = this.targetZombie.x + 40 - this.x;
            let dy = this.targetZombie.y + 50 - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.x += (dx / dist) * this.speed * deltaTime;
                this.y += (dy / dist) * this.speed * deltaTime;
            }
            if (dist < 30) {
                 this.targetZombie.takeDamage(this.damage);
                 if (this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') {
                     // Splash damage in 3x3 area
                     const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                     for (let z of zombies) {
                         if (z !== this.targetZombie && Math.abs(z.row - this.targetZombie.row) <= 1 && Math.abs(z.x - this.targetZombie.x) < 150) {
                             z.takeDamage(this.damage / 2); // splash damage is half
                             if (this.type === 'cattail_wintermelon') {
                                 z.isSlowed = true;
                                 z.slowTimer = 10.0;
                             }
                         }
                     }
                     if (this.type === 'cattail_wintermelon') {
                         this.targetZombie.isSlowed = true;
                         this.targetZombie.slowTimer = 10.0;
                     }
                     this.game.audioManager.play('splat');
                 }
                 this.isDead = true;
                 return;
            }"""
content = content.replace(old_update, new_update)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
