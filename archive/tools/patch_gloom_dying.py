import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_filter = """                    e instanceof Zombie && !e.isDead && Math.abs(e.row - this.row) <= 1 && Math.abs(e.x - this.x) <= 150"""
new_filter = """                    e instanceof Zombie && !e.isDead && e.state !== 'DYING' && Math.abs(e.row - this.row) <= 1 && Math.abs(e.x - this.x) <= 150"""
content = content.replace(old_filter, new_filter)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
