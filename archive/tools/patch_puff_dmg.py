import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

old_puff = """        } else if (type === 'puffshroom' || type === 'gloom_puff') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
        }"""
new_puff = """        } else if (type === 'puffshroom' || type === 'gloom_puff') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            if (type === 'gloom_puff') this.damage = 40;
        }"""
content = content.replace(old_puff, new_puff)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
