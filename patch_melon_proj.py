import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_proj = """        } else if (type === 'scaredyshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            this.damage = 40;
        } else if (type === 'puffshroom') {"""

new_proj = """        } else if (type === 'scaredyshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            this.damage = 40;
        } else if (type === 'melon') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(1.5)';
            this.damage = 60;
        } else if (type === 'wintermelon') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(1.5)';
            this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
            this.damage = 60;
        } else if (type === 'puffshroom') {"""

content = content.replace(old_proj, new_proj)

old_damage = """                        zombie.takeDamage(this.damage);
                        if (this.type === 'snowpea') {
                            zombie.isSlowed = true;
                            zombie.slowTimer = 10.0;
                        }"""

new_damage = """                        zombie.takeDamage(this.damage);
                        if (this.type === 'snowpea' || this.type === 'wintermelon') {
                            zombie.isSlowed = true;
                            zombie.slowTimer = 10.0;
                        }"""
content = content.replace(old_damage, new_damage)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)

