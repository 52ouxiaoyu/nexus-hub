import re

with open('pvz-web/js/managers/CollisionManager.js', 'r') as f:
    content = f.read()

content = content.replace("e instanceof Zombie && !e.isDead", "e instanceof Zombie && !e.isDead && e.state !== 'DYING'")

with open('pvz-web/js/managers/CollisionManager.js', 'w') as f:
    f.write(content)
