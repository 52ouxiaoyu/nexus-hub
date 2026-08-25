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
                    // Zombie visually faces left. The front is roughly z.x - 30
                    if (p.x + p.radius > z.x - 30 && p.x - p.radius < z.x + 30) {
                        p.isDead = true; 
                        z.takeDamage(p.damage);
                        
                        if (p.type === 'snowpea') {
                            z.isSlowed = true;
                            z.slowTimer = 10.0;
                        }
                        
                        this.game.audioManager.play('splat');
                        break; 
                    }
                }
            }
        }
    }
}
