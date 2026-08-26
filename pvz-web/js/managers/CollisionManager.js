class CollisionManager {
    constructor(game) {
        this.game = game;
    }
    
    update() {
        // Optimize: we only need to check collisions between Projectiles and Zombies
        // Plant/Zombie collision is handled by Zombie walking logic.
        
        const projectiles = this.game.entities.filter(e => e instanceof Projectile && !e.isDead);
        const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
        
        for (let p of projectiles) {
            for (let z of zombies) {
                if (p.row === z.row) {
                    if (p.x + p.radius > z.x - 30 && p.x - p.radius < z.x + 30) {
                        if (p.type === 'fumeshroom') {
                            if (!p.hitZombies.has(z)) {
                                p.hitZombies.add(z);
                                z.takeDamage(p.damage);
                                this.game.audioManager.play('splat');
                            }
                        } else {
                            p.isDead = true; 
                            z.takeDamage(p.damage);
                            
                            if (p.type === 'snowpea') {
                                z.isSlowed = true;
                                z.slowTimer = 10.0;
                            } else if (p.type === 'firepea') {
                                z.isSlowed = false; // Fire thaws out zombies
                                z.slowTimer = 0;
                            }
                            
                            this.game.audioManager.play('splat');
                            break; 
                        }
                    }
                }
            }
        }
        
        // Torchwood interactions
        const plants = this.game.entities.filter(e => e instanceof Plant && !e.isDead);
        for (let p of projectiles) {
            if (p.type === 'peashooter' || p.type === 'snowpea' || p.type === 'backpea') {
                for (let pl of plants) {
                    if (pl.type === 'torchwood' && pl.row === p.row && Math.abs(pl.x - p.x) < 20) {
                        if (p.type === 'snowpea') {
                            p.type = 'peashooter'; // Thaws
                            p.element.src = 'assets/images/Plants/PB00.gif';
                        } else {
                            p.type = 'firepea';
                            p.damage = 40;
                            p.element.src = 'assets/images/Plants/PB01.gif';
                        }
                        break;
                    }
                }
            }
        }
    }
}
