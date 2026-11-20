import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Instead of `return;`, let's just make it set fireTimer to 0 or something so it doesn't shoot.
# Wait, if it sets fireTimer to 0, the rest of the block still executes but it won't fire!
# The fire condition is `if (this.fireTimer >= this.fireRate)`.
# So if we do `this.fireTimer = -999;` it won't shoot!

old_scaredy_return = "if (this.isHiding) return;"
new_scaredy_return = "if (this.isHiding) { this.fireTimer = 0; }" # But wait, we need to skip the rest of the shooter block, NOT return from update!
# Actually we can just do:
# if (this.isHiding) { /* do nothing */ } else if (this.hasTrait('potatomine') && !this.isArmed) { /* do nothing */ } else { ... fire logic ... }

# Let's replace the whole top part of the shooter block.
old_shooter = """            // Handle Scaredy-shroom hiding
            if (this.hasTrait('scaredyshroom')) {
                const zombieNear = this.game.entities.some(e => 
                    e instanceof Zombie && e.row === this.row && !e.isDead && e.x - this.x > -40 && e.x - this.x < 120
                );
                if (zombieNear && !this.isHiding) {
                    this.isHiding = true;
                    this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroomSleep.gif';
                    this.yOffset = 15;
                } else if (!zombieNear && this.isHiding) {
                    this.isHiding = false;
                    this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif';
                    this.yOffset = 0;
                }
                if (this.isHiding) return;
            }
            
            if (this.hasTrait('potatomine') && !this.isArmed) return;
            
            this.fireTimer += deltaTime;"""

new_shooter = """            // Handle Scaredy-shroom hiding
            if (this.hasTrait('scaredyshroom')) {
                const zombieNear = this.game.entities.some(e => 
                    e instanceof Zombie && e.row === this.row && !e.isDead && e.x - this.x > -40 && e.x - this.x < 120
                );
                if (zombieNear && !this.isHiding) {
                    this.isHiding = true;
                    this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroomSleep.gif';
                    this.yOffset = 15;
                } else if (!zombieNear && this.isHiding) {
                    this.isHiding = false;
                    this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif';
                    this.yOffset = 0;
                }
            }
            
            let skipShooting = false;
            if (this.hasTrait('scaredyshroom') && this.isHiding) skipShooting = true;
            if (this.hasTrait('potatomine') && !this.isArmed) skipShooting = true;
            
            if (!skipShooting) {
                this.fireTimer += deltaTime;"""

content = content.replace(old_shooter, new_shooter)

# And now close the block at the end of the shooter section!
# Where does the shooter section end?
old_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
        }
        
        let isHybridSun = this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater');"""

new_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
            } // close !skipShooting
        }
        
        let isHybridSun = this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater');"""

content = content.replace(old_end, new_end)

# Also fix PotatoMine rising up visually for Sporemine
old_arm = """                if (this.armTimer <= 0) {
                    this.isArmed = true;
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                }
            } else if (!this.hasExploded) {"""

new_arm = """                if (this.armTimer <= 0) {
                    this.isArmed = true;
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                    if (this.type === 'fusion_sporemine' && this.fusionOverlay) {
                        this.fusionOverlay.style.transform = 'translate(0px, -35px) scale(0.9)';
                    }
                }
            } else if (!this.hasExploded) {"""

content = content.replace(old_arm, new_arm)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

