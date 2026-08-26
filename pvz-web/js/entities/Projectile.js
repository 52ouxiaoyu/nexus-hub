class Projectile extends Entity {
    constructor(game, x, y, row, type = 'peashooter') {
        super(game, x, y);
        this.row = row;
        this.speed = 300; // pixels per second
        this.damage = 20;
        this.radius = 10;
        this.type = type;
        
        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif'; // Snow pea image
        } else if (type === 'puffshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif'; // Puff-shroom spore
        } else {
            this.element.src = 'assets/images/Plants/PB00.gif'; // Normal pea
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.x += this.speed * deltaTime;
        
        // Off screen check (canvas width is 900)
        if (this.x > 900) {
            this.isDead = true;
        }
    }
}
