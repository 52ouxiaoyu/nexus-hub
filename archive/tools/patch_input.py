import re

with open('pvz-web/js/InputManager.js', 'r') as f:
    content = f.read()

# Instead of patching inside mouseup, we can just patch it easily
old_click = """        this.container.addEventListener('mouseup', (e) => {
            if (this.selectedSeed || this.isShovelSelected) {"""

new_click = """        this.container.addEventListener('mouseup', (e) => {
            if (this.game.isGloveActive) {
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const mouseX = (e.clientX - rect.left) / scale;
                const mouseY = (e.clientY - rect.top) / scale;
                const gridPos = this.game.board.getGridPos(mouseX, mouseY);
                if (gridPos) {
                    this.game.tryGloveInteraction(gridPos.row, gridPos.col);
                }
                return;
            }
            if (this.selectedSeed || this.isShovelSelected) {"""

content = content.replace(old_click, new_click)
with open('pvz-web/js/InputManager.js', 'w') as f:
    f.write(content)

