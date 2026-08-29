class CollisionManager {
    constructor(game) {
        this.game = game;
    }
    
    update() {
        // Optimize: we only need to check collisions between Projectiles and Zombies
        // Plant/Zombie collision is handled by Zombie walking logic.
        
        const projectiles = this.game.entities.filter(e => e instanceof Projectile && !e.isDead);
        const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
        
        for (let p of projectiles) {
            for (let z of zombies) {
                if (p.row === z.row && p.type !== 'cattail' && p.type !== 'gloom_puff') {
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
                            
                            if (p.type === 'snowpea' || p.type === 'wintermelon') {
                                z.isSlowed = true;
                                z.slowTimer = 10.0;
                            } else if (p.type === 'firepea') {
                                z.isSlowed = false; // Fire thaws out zombies
                                z.slowTimer = 0;
                            }
                            
                            if (p.type === 'melon' || p.type === 'wintermelon') {
                                const allZombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                                for (let oz of allZombies) {
                                    if (oz !== z && Math.abs(oz.row - z.row) <= 1 && Math.abs(oz.x - z.x) < 150) {
                                        oz.takeDamage(p.damage / 2);
                                        if (p.type === 'wintermelon') {
                                            oz.isSlowed = true;
                                            oz.slowTimer = 10.0;
                                        }
                                    }
                                }
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
                            p.element.src = 'assets/images/Plants/PB10.gif';
                        }
                        break;
                    }
                }
            }
        }
    }
}
