import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_potatomine = "this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';"
new_potatomine = """this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                    if (this.type === 'fusion_sporemine' && this.fusionOverlay) {
                        this.fusionOverlay.style.transform = 'translate(0px, -35px) scale(0.9)';
                    }"""

content = content.replace(old_potatomine, new_potatomine)

old_fire = """            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {"""

new_fire = """            if (this.traits.includes('potatomine') && !this.isArmed) return;
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {"""

content = content.replace(old_fire, new_fire)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
