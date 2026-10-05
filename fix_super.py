import re
with open('pvz-web/js/entities/Projectile.js', 'r') as f:
    content = f.read()

content = content.replace("constructor(game, x, y, row, type = 'peashooter', targetZombie = null) {\n        this.targetZombie = targetZombie;\n        super(game, x, y);", "constructor(game, x, y, row, type = 'peashooter', targetZombie = null) {\n        super(game, x, y);\n        this.targetZombie = targetZombie;")

with open('pvz-web/js/entities/Projectile.js', 'w') as f:
    f.write(content)
