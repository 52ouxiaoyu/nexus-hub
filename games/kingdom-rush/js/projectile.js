class Projectile {
    constructor(x, y, target, damage, speed, type, splash = 0, slowEffect = 0, slowDuration = 0) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.type = type;
        this.splash = splash;
        this.slowEffect = slowEffect;
        this.slowDuration = slowDuration;
        this.alive = true;
        this.angle = Utils.angle(x, y, target.x, target.y);
    }
    
    update(enemies) {
        if (!this.alive) return;
        
        if (!this.target || !this.target.alive) {
            this.alive = false;
            return;
        }
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.speed + 5) {
            this.hit(enemies);
            return;
        }
        
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        this.angle = Utils.angle(this.x, this.y, this.target.x, this.target.y);
    }
    
    hit(enemies) {
        this.alive = false;
        
        if (this.splash > 0) {
            Audio.playExplosion();
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
                if (dist <= this.splash) {
                    enemy.takeDamage(this.damage);
                    if (this.slowEffect > 0) {
                        enemy.applySlow(this.slowEffect, this.slowDuration);
                    }
                }
            }
        } else {
            if (this.target && this.target.alive) {
                this.target.takeDamage(this.damage);
                if (this.slowEffect > 0) {
                    this.target.applySlow(this.slowEffect, this.slowDuration);
                }
            }
        }
    }
    
    render(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        Sprites.drawProjectile(ctx, 0, 0, this.type);
        ctx.restore();
    }
}
