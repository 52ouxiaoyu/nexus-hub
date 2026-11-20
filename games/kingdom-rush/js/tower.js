class Tower {
    constructor(type, gridX, gridY) {
        this.config = CONFIG.TOWER_TYPES[type.toUpperCase()];
        this.type = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.level = 0;
        this.damage = this.config.damage;
        this.range = this.config.range;
        this.fireRate = this.config.fireRate;
        this.lastFireTime = 0;
        this.target = null;
        this.splash = this.config.splash || 0;
        this.slowEffect = this.config.slowEffect || 0;
        this.slowDuration = this.config.slowDuration || 0;
    }
    
    upgrade() {
        if (this.level >= this.config.upgrades.length) return false;
        
        const upgrade = this.config.upgrades[this.level];
        this.damage = upgrade.damage;
        this.range = upgrade.range;
        this.fireRate = upgrade.fireRate;
        if (upgrade.splash) this.splash = upgrade.splash;
        if (upgrade.slowEffect) this.slowEffect = upgrade.slowEffect;
        this.level++;
        
        return true;
    }
    
    getUpgradeCost() {
        if (this.level >= this.config.upgrades.length) return null;
        return this.config.upgrades[this.level].cost;
    }
    
    getSellValue() {
        let total = this.config.cost;
        for (let i = 0; i < this.level; i++) {
            total += this.config.upgrades[i].cost;
        }
        return Math.floor(total * 0.6);
    }
    
    findTarget(enemies) {
        let closest = null;
        let closestDist = Infinity;
        
        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            
            const dist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= this.range && dist < closestDist) {
                closest = enemy;
                closestDist = dist;
            }
        }
        
        this.target = closest;
        return closest;
    }
    
    update(currentTime, enemies) {
        if (currentTime - this.lastFireTime < this.fireRate) return null;
        
        const target = this.findTarget(enemies);
        if (!target) return null;
        
        this.lastFireTime = currentTime;
        Audio.playShoot(this.config.projectileType);
        
        return new Projectile(
            this.x,
            this.y,
            target,
            this.damage,
            this.config.projectileSpeed,
            this.config.projectileType,
            this.splash,
            this.slowEffect,
            this.slowDuration
        );
    }
    
    render(ctx) {
        Sprites.drawTower(ctx, this.gridX * CONFIG.TILE_SIZE, this.gridY * CONFIG.TILE_SIZE, this.type, this.level);
    }
    
    renderRange(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
