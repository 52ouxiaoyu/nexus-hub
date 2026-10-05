import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_glove_click = """        gloveBtn.addEventListener('click', () => {
            this.isGloveActive = !this.isGloveActive;
            this.isShovelActive = false;
            this.gloveSource = null;"""

new_glove_click = """        gloveBtn.addEventListener('click', () => {
            this.isGloveActive = !this.isGloveActive;
            if (this.isGloveActive) {
                if (this.inputManager) {
                    this.inputManager.selectedSeed = null;
                    this.inputManager.isShovelSelected = false;
                    this.inputManager.dragGhost.style.display = 'none';
                }
            }
            this.gloveSource = null;"""

content = content.replace(old_glove_click, new_glove_click)

# Also fix drag ghost display none - input manager updates it continuously, but if selectedSeed and isShovelSelected are false, it just stops moving it. We should hide it.
# It doesn't matter if it stops moving, it might be visible.
# Wait, inputManager updateDragGhost sets display:
# If type is null, maybe it throws error?
# Let's check updateDragGhost in InputManager.js

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

