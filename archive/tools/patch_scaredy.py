import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Change projectile type
old_proj = """                    if (this.hasTrait('puffshroom') || this.hasTrait('scaredyshroom')) projType = 'puffshroom';
                    if (this.hasTrait('fumeshroom')) projType = 'fumeshroom';"""
new_proj = """                    if (this.hasTrait('puffshroom')) projType = 'puffshroom';
                    if (this.hasTrait('scaredyshroom')) projType = 'scaredyshroom';
                    if (this.hasTrait('fumeshroom')) projType = 'fumeshroom';"""

content = content.replace(old_proj, new_proj)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content2 = f.read()

old_proj_file = """        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif';
        } else if (type === 'puffshroom') {"""
new_proj_file = """        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif';
        } else if (type === 'scaredyshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            this.damage = 40;
        } else if (type === 'puffshroom') {"""

content2 = content2.replace(old_proj_file, new_proj_file)

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content2)

