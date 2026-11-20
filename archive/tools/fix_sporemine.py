import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_potatomine = """        if (this.type === 'potatomine' || this.traits.includes('potatomine')) {
            if (!this.isArmed) {
                this.armTimer -= deltaTime;
                if (this.armTimer <= 0) {
                    this.isArmed = true;
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                }
            } else if (!this.hasExploded) {"""

new_potatomine = """        if (this.type === 'potatomine' || this.traits.includes('potatomine')) {
            if (!this.isArmed) {
                this.armTimer -= deltaTime;
                if (this.armTimer <= 0) {
                    this.isArmed = true;
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                    if (this.type === 'fusion_sporemine' && this.fusionOverlay) {
                        // Move the cap up when the potato rises!
                        this.fusionOverlay.style.transform = 'translate(0px, -35px) scale(0.9)';
                    }
                }
            } else if (!this.hasExploded) {"""

content = content.replace(old_potatomine, new_potatomine)

old_fire = """        if (this.fireRate > 0) {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {"""

new_fire = """        if (this.fireRate > 0) {
            if (this.traits.includes('potatomine') && !this.isArmed) {
                // Do not shoot if it's a sporemine that hasn't armed yet
            } else {
                this.fireTimer += deltaTime;
                if (this.fireTimer >= this.fireRate) {"""

old_fire_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
        }"""

new_fire_end = """                        if (hasZombieBehind && this.hasTrait('splitpea')) {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, projType, -1));
                        }
                    }
                }
            }
            }
        }"""

content = content.replace(old_fire, new_fire)
content = content.replace(old_fire_end, new_fire_end)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
