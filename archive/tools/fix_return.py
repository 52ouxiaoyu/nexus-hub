import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Fix the early returns that broke armTimer!
content = content.replace("            if (this.hasTrait('potatomine') && !this.isArmed) return;", "")
content = content.replace("            if (this.traits.includes('potatomine') && !this.isArmed) return;", "            let canShoot = !(this.hasTrait('potatomine') && !this.isArmed);\\n            if (canShoot) {")

# Match the end of the shooting block to close the if (canShoot) { block
old_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
            }
        }"""
        
new_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
            }
        }"""

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

