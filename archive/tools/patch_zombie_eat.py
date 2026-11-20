import re

with open('pvz-web/js/entities/Zombie.js', 'r') as f:
    content = f.read()

old_eat = """                } else {
                    this.eatTarget.hp -= currentDamage * deltaTime;"""

new_eat = """                } else {
                    if (this.type === 'gargantuar') {
                        if (!this.smashTimer) this.smashTimer = 1.0;
                        this.smashTimer -= deltaTime;
                        if (this.smashTimer <= 0) {
                            this.eatTarget.hp = 0; // instantly kill
                            this.game.audioManager.play('splat');
                            this.smashTimer = 1.0;
                        }
                    } else {
                        this.eatTarget.hp -= currentDamage * deltaTime;
                    }"""

content = content.replace(old_eat, new_eat)

with open('pvz-web/js/entities/Zombie.js', 'w') as f:
    f.write(content)
