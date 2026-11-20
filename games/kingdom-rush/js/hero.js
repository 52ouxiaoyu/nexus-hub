class Hero {
    constructor(type, x, y) {
        this.config = CONFIG.HERO_TYPES[type.toUpperCase()];
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = this.config.hp;
        this.maxHp = this.config.hp;
        this.damage = this.config.damage;
        this.range = this.config.range;
        this.attackSpeed = this.config.attackSpeed;
        this.lastAttackTime = 0;
        this.target = null;
        this.facingRight = true;
        
        this.abilityCooldown = 0;
        this.abilityReady = true;
        this.abilityEffect = null;
        
        this.moving = false;
        this.targetX = x;
        this.targetY = y;
    }
    
    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.moving = true;
    }
    
    useAbility(enemies) {
        if (!this.abilityReady) return null;
        
        this.abilityReady = false;
        this.abilityCooldown = this.config.ability.cooldown;
        
        Audio.playExplosion();
        
        const affectedEnemies = [];
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= this.config.ability.range) {
                enemy.takeDamage(this.config.ability.damage);
                if (this.config.ability.slow) {
                    enemy.applySlow(this.config.ability.slow, 3000);
                }
                affectedEnemies.push(enemy);
            }
        }
        
        return {
            type: this.config.id === 'warrior' ? 'whirlwind' : 'blizzard',
            x: this.x,
            y: this.y,
            radius: this.config.ability.range,
            progress: 0
        };
    }
    
    update(currentTime, enemies) {
        if (this.moving) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 3) {
                this.moving = false;
            } else {
                const speed = 3;
                this.x += (dx / dist) * speed;
                this.y += (dy / dist) * speed;
                this.facingRight = dx > 0;
            }
        }
        
        if (!this.abilityReady) {
            this.abilityCooldown -= 16.67;
            if (this.abilityCooldown <= 0) {
                this.abilityReady = true;
                this.abilityCooldown = 0;
            }
        }
        
        if (currentTime - this.lastAttackTime < this.attackSpeed) return null;
        
        let closest = null;
        let closestDist = Infinity;
        
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= this.range && dist < closestDist) {
                closest = enemy;
                closestDist = dist;
            }
        }
        
        if (closest) {
            this.target = closest;
            this.lastAttackTime = currentTime;
            this.facingRight = closest.x > this.x;
            closest.takeDamage(this.damage);
            Audio.playHit();
        }
        
        return null;
    }
    
    render(ctx) {
        Sprites.drawHero(ctx, this.x, this.y, this.type, this.facingRight);
        
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - 10, this.y - this.config.size - 8, 20, 3);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x - 10, this.y - this.config.size - 8, 20 * (this.hp / this.maxHp), 3);
        
        if (!this.abilityReady) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - 10, this.y + this.config.size + 2, 20, 4);
            ctx.fillStyle = '#FFD700';
            const cooldownProgress = 1 - (this.abilityCooldown / this.config.ability.cooldown);
            ctx.fillRect(this.x - 10, this.y + this.config.size + 2, 20 * cooldownProgress, 4);
        }
    }
}
