import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_init = """    initFusionUI() {
        const gloveBtn = document.getElementById('glove-bank');
        this.isGloveActive = false;
        this.gloveSource = null;"""

new_init = """    initFusionUI() {
        const gloveBtn = document.getElementById('glove-bank');
        this.isGloveActive = false;
        this.gloveSource = null;
        if (this._fusionUIInit) return;
        this._fusionUIInit = true;"""

content = content.replace(old_init, new_init)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
