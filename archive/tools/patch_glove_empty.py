import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_empty = """        if (!plant) {
            // Clicked empty space, cancel glove
            this.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            this.gloveSource = null;
            return true;
        }"""

new_empty = """        if (!plant) {
            // Clicked empty space, cancel glove
            this.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.gloveSource) {
                this.gloveSource.element.style.filter = '';
            }
            this.gloveSource = null;
            return true;
        }"""

content = content.replace(old_empty, new_empty)
with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
