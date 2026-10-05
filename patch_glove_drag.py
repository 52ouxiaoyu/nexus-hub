import re

with open('pvz-web/js/InputManager.js', 'r') as f:
    content = f.read()

# Make dragGhost update on mousemove if game.isGloveDragging
old_move = """        document.addEventListener('mousemove', (e) => {
            if (this.selectedSeed || this.isShovelSelected) {"""

new_move = """        document.addEventListener('mousemove', (e) => {
            if (this.selectedSeed || this.isShovelSelected || this.game.isGloveDragging) {"""

content = content.replace(old_move, new_move)
with open('pvz-web/js/InputManager.js', 'w') as f:
    f.write(content)
