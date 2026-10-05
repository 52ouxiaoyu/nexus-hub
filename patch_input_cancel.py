import re

with open('pvz-web/js/InputManager.js', 'r') as f:
    content = f.read()

# When selecting a seed or shovel, cancel glove
old_seed = """                    this.selectedSeed = type;
                    this.isShovelSelected = false;"""
new_seed = """                    this.selectedSeed = type;
                    this.isShovelSelected = false;
                    this.game.isGloveActive = false;
                    if(document.getElementById('glove-bank')) document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                    if(this.game.gloveSource) { this.game.gloveSource.element.style.filter = ''; this.game.gloveSource = null; }
                    this.game.container.style.cursor = 'default';"""

content = content.replace(old_seed, new_seed)

old_shovel = """            this.isShovelSelected = true;
            this.selectedSeed = null;"""
new_shovel = """            this.isShovelSelected = true;
            this.selectedSeed = null;
            this.game.isGloveActive = false;
            if(document.getElementById('glove-bank')) document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            if(this.game.gloveSource) { this.game.gloveSource.element.style.filter = ''; this.game.gloveSource = null; }
            this.game.container.style.cursor = 'default';"""

content = content.replace(old_shovel, new_shovel)

with open('pvz-web/js/InputManager.js', 'w') as f:
    f.write(content)
