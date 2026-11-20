import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Update Plant.js initial spawn
old_sporemine_init = """                } else if (type === 'fusion_sporemine') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 50%, 0 50%)';
                    // Puffshroom cap placed exactly on top of Potato mine
                    this.fusionOverlay.style.transform = 'translate(0px, -25px) scale(0.9)';"""

new_sporemine_init = """                } else if (type === 'fusion_sporemine') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 85%, 0 85%)'; // Show the face!
                    this.fusionOverlay.style.transform = 'translate(0px, -30px) scale(0.9)';"""

content = content.replace(old_sporemine_init, new_sporemine_init)

# Update Plant.js arming
old_arm = """                    if (this.type === 'fusion_sporemine' && this.fusionOverlay) {
                        this.fusionOverlay.style.transform = 'translate(0px, -35px) scale(0.9)';
                    }"""

new_arm = """                    if (this.type === 'fusion_sporemine' && this.fusionOverlay) {
                        this.fusionOverlay.style.transform = 'translate(0px, -45px) scale(0.9)';
                    }"""

content = content.replace(old_arm, new_arm)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content2 = f.read()

old_recipe = """{ a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)', overTransform: 'translate(0px, -25px) scale(0.9)' }"""
new_recipe = """{ a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' }"""

content2 = content2.replace(old_recipe, new_recipe)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content2)

