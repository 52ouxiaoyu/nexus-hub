import re

with open('pvz-web/js/InputManager.js', 'r') as f:
    content = f.read()

old_cancel = "if(this.game.gloveSource) { this.game.gloveSource.element.style.filter = ''; this.game.gloveSource = null; }"
new_cancel = "if(this.game.gloveSource) { this.game.gloveSource.element.style.display = 'block'; if (this.game.gloveSource.fusionOverlay) this.game.gloveSource.fusionOverlay.style.display = 'block'; this.game.isGloveDragging = false; this.game.gloveSource = null; }"

content = content.replace(old_cancel, new_cancel)
with open('pvz-web/js/InputManager.js', 'w') as f:
    f.write(content)
