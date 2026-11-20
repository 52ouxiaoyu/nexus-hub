import re

with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

content = content.replace("!this.targetZombie.isDead", "!this.targetZombie.isDead && this.targetZombie.state !== 'DYING'")
content = content.replace("e instanceof Zombie && !e.isDead", "e instanceof Zombie && !e.isDead && e.state !== 'DYING'")

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
