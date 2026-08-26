class Projectile extends Entity {
    constructor(game, x, y, row, type = 'peashooter') {
        super(game, x, y);
        this.row = row;
        this.speed = 300; // pixels per second
        this.damage = 20;
        this.radius = 10;
        this.type = type;
        this.startX = x;
        this.hitZombies = new Set(); // For piercing projectiles
        
        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif';
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
        this.x += this.speed * deltaTime;
        
        if (this.type === 'fumeshroom' && Math.abs(this.x - this.startX) > 300) {
            this.isDead = true;
        }
        
        if (this.x > 950 || this.x < -50) {
            this.isDead = true;
        }
    }
}
