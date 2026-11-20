class Enemy {
    constructor(type, pathPixels, waveMultiplier = 1) {
        this.config = CONFIG.ENEMY_TYPES[type.toUpperCase()];
        this.type = type;
        this.maxHp = Math.floor(this.config.hp * waveMultiplier);
        this.hp = this.maxHp;
        this.speed = this.config.speed;
        this.baseSpeed = this.config.speed;
        this.reward = this.config.reward;
        this.armor = this.config.armor || 0;
        this.flying = this.config.flying || false;
        
        this.pathPixels = pathPixels;
        this.pathIndex = 0;
        this.x = pathPixels[0].x;
        this.y = pathPixels[0].y;
        this.alive = true;
        this.reachedEnd = false;
        
        this.slowUntil = 0;
    }
    
    takeDamage(damage) {
        const actualDamage = damage * (1 - this.armor);
        this.hp -= actualDamage;
        Audio.playHit();
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }
    
    applySlow(effect, duration) {
        this.speed = this.baseSpeed * effect;
        this.slowUntil = Date.now() + duration;
    }
    
    update(currentTime) {
        if (!this.alive) return;
        
        if (currentTime > this.slowUntil) {
            this.speed = this.baseSpeed;
        }
        
        if (this.pathIndex >= this.pathPixels.length - 1) {
            this.reachedEnd = true;
            this.alive = false;
            return;
        }
        
        const target = this.pathPixels[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.speed) {
            this.pathIndex++;
            this.x = target.x;
            this.y = target.y;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }
    
    render(ctx) {
        if (!this.alive) return;
        
        if (this.speed < this.baseSpeed) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ADD8E6';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.config.size + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        Sprites.drawEnemy(ctx, this.x, this.y, this.type, this.hp, this.maxHp);
    }
}
