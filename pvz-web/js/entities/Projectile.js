class Projectile extends Entity {
    constructor(game, x, y, row, type = 'peashooter', targetZombie = null) {
        super(game, x, y);
        this.targetZombie = targetZombie;
        this.row = row;
        this.speed = 300; // pixels per second
        this.damage = 20;
        this.radius = 10;
        this.type = type;
        this.startX = x;
        this.hitZombies = new Set(); // For piercing projectiles
        
        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif';
        } else if (type === 'scaredyshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            this.damage = 40;
        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.5)';
            this.damage = 60;
        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon.gif';
            this.element.style.transform = 'scale(0.5)';
            this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            this.damage = 60;
        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 20;
            this.speed = 400;
        } else if (type === 'puffshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
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
        }
        
        if (this.type === 'fumeshroom' && Math.abs(this.x - this.startX) > 300) {
            this.isDead = true;
        }
        
        if (this.x > 950 || this.x < -50) {
            this.isDead = true;
        }
    }
}
