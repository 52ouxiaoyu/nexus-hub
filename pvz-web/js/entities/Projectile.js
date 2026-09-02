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
            this.element.src = 'assets/images/Plants/MelonPult/Melon.png?v=1788355723';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.borderRadius = '50%';
            this.damage = 60;
        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/WinterMelon.png?v=1788355723';
            this.element.style.transform = 'scale(1.0)';
            this.element.style.borderRadius = '50%';
            this.damage = 60;
        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 20;
            this.speed = 400;
        } else if (type === 'cattail_melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon_small.png?v=1788355723';
            this.element.style.transform = 'scale(0.8)';
            this.element.style.borderRadius = '50%';
            this.damage = 60;
            this.speed = 400;
        } else if (type === 'cattail_wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/WinterMelon_small.png?v=1788355723';
            this.element.style.transform = 'scale(0.8)';
            this.element.style.borderRadius = '50%';
            this.damage = 60;
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
        if (this.type === 'cattail' || this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') {
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
