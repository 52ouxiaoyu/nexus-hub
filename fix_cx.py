import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_ai = """            const ai = {
                x: cx + (Math.random() * 40 - 20),
                y: cy + (Math.random() * 40 - 20),"""

new_ai = """            const ai = {
                x: (this.worldWidth / 2) + (Math.random() * 40 - 20),
                y: (this.worldHeight / 2) + (Math.random() * 40 - 20),"""

content = content.replace(old_ai, new_ai)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
