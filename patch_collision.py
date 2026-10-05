import re

with open('pvz-web/js/managers/CollisionManager.js', 'r') as f:
    content = f.read()

old_collision = """                            if (p.type === 'snowpea') {
                                z.isSlowed = true;
                                z.slowTimer = 10.0;
                            } else if (p.type === 'firepea') {
                                z.isSlowed = false; // Fire thaws out zombies
                                z.slowTimer = 0;
                            }
                            
                            this.game.audioManager.play('splat');
                            break; """

new_collision = """                            if (p.type === 'snowpea' || p.type === 'wintermelon') {
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
                            break; """

content = content.replace(old_collision, new_collision)

with open('pvz-web/js/managers/CollisionManager.js', 'w') as f:
    f.write(content)
