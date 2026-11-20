import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

content = content.replace("!(e instanceof Zombie) || e.isDead", "!(e instanceof Zombie) || e.isDead || e.state === 'DYING'")
content = content.replace("e instanceof Zombie && !e.isDead)", "e instanceof Zombie && !e.isDead && e.state !== 'DYING')")
content = content.replace("e instanceof Zombie && e.row === this.row && !e.isDead", "e instanceof Zombie && e.row === this.row && !e.isDead && e.state !== 'DYING'")
content = content.replace("e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead", "e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead && e.state !== 'DYING'")

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
