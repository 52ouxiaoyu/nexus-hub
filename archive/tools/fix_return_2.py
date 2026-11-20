import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# I want to make sure the fireTimer logic is inside the `canShoot` block.
old_fire = """            let canShoot = !(this.hasTrait('potatomine') && !this.isArmed);
            if (canShoot) {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {"""

new_fire = """            let canShoot = !(this.hasTrait('potatomine') && !this.isArmed);
            if (canShoot) {
                this.fireTimer += deltaTime;
                if (this.fireTimer >= this.fireRate) {"""

content = content.replace(old_fire, new_fire)

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

content = content.replace(old_end, new_end)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

