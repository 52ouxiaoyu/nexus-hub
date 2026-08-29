class Projectile extends Entity {
    constructor(game, x, y, row, type = 'peashooter', targetZombie = null, vx = null, vy = null) {
        super(game, x, y);
        this.targetZombie = targetZombie;
        this.row = row;
        this.vx = vx;
        this.vy = vy;
        this.speed = 300; // pixels per second
        this.damage = 20;
        this.radius = 10;
        this.type = type;
        this.startX = x;
        this.startY = y;
        this.hitZombies = new Set(); // For piercing projectiles
        
        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif';
        } else if (type === 'scaredyshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            this.damage = 40;
        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.damage = 60;
        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            this.damage = 60;
        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 20;
            this.speed = 400;
        } else if (type === 'puffshroom' || type === 'gloom_puff') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            if (type === 'gloom_puff') this.damage = 40;
        } else if (type === 'fumeshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif'; // Fallback for sprite sheet
            this.speed = 400; // Moves faster but dies early
        } else if (type === 'firepea') {
            this.element.src = 'assets/images/Plants/PB10.gif';
            this.damage = 40; // Double damage
        } else if (type === 'backpea') {
            this.element.src = 'assets/images/Plants/PB00.gif';
            this.speed = -300; // Moves left
        } else {
            this.element.src = 'assets/images/Plants/PB00.gif';
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        if (this.type === 'cattail' && this.targetZombie && !this.targetZombie.isDead && this.targetZombie.state !== 'DYING') {
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
        } else if (this.vx !== undefined && this.vy !== undefined && this.vx !== null && this.vy !== null) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            
            // Gloom-shroom projectile collision
            if (this.type === 'gloom_puff') {
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
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
        }
        
        if (this.maxDistance) {
            const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
            if (dist >= this.maxDistance) this.isDead = true;
        }
        
        if (this.type === 'fumeshroom' && Math.abs(this.x - this.startX) > 300) {
            this.isDead = true;
        }
        
        if (this.x > 950 || this.x < -50) {
            this.isDead = true;
        }
    }
}
