import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
        }
        
        if ((this.hasTrait('sunflower') || this.hasTrait('sunshroom') || this.hasTrait('twinsunflower'))) {"""

new_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
            } // close !skipShooting block
        }
        
        if ((this.hasTrait('sunflower') || this.hasTrait('sunshroom') || this.hasTrait('twinsunflower'))) {"""

content = content.replace(old_end, new_end)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

