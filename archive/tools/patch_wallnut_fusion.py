import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_block = """        if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {
            // maxHp is taken from this.maxHp since we set it, or default
            const maxHp = this.maxHp || (this.hasTrait('wallnut') ? 4000 : 8000);
            const path = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            const name = this.hasTrait('wallnut') ? 'Wallnut_cracked' : 'TallnutCracked';
            const baseName = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            
            if (this.hp < maxHp * 0.33) {
                if (this.element.src.indexOf(name + '2') === -1) {
                    this.element.src = `assets/images/Plants/${path}/${name}2.gif`;
                }
            } else if (this.hp < maxHp * 0.66) {
                if (this.element.src.indexOf(name + '1') === -1) {
                    this.element.src = `assets/images/Plants/${path}/${name}1.gif`;
                }
            } else {
                if (this.element.src.indexOf(name) !== -1) { // if it is currently cracked
                    this.element.src = `assets/images/Plants/${path}/${baseName}.gif`;
                }
            }
        }"""

new_block = """        if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {
            const maxHp = this.maxHp || (this.hasTrait('wallnut') ? 4000 : 8000);
            const path = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            const name = this.hasTrait('wallnut') ? 'Wallnut_cracked' : 'TallnutCracked';
            const baseName = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            
            // Determine which image element represents the nut (main element or overlay)
            let targetImg = this.element;
            if (this.fusionOverlay && (this.fusionOverlay.src.indexOf('WallNut') !== -1 || this.fusionOverlay.src.indexOf('TallNut') !== -1 || this.fusionOverlay.src.indexOf('cracked') !== -1)) {
                targetImg = this.fusionOverlay;
            } else if (this.element.src.indexOf('WallNut') === -1 && this.element.src.indexOf('TallNut') === -1 && this.element.src.indexOf('cracked') === -1) {
                // In some fusions, neither might be a nut natively (rare), but fallback to element
                targetImg = this.element;
            }
            
            if (this.hp < maxHp * 0.33) {
                if (targetImg.src.indexOf(name + '2') === -1) {
                    targetImg.src = `assets/images/Plants/${path}/${name}2.gif`;
                }
            } else if (this.hp < maxHp * 0.66) {
                if (targetImg.src.indexOf(name + '1') === -1) {
                    targetImg.src = `assets/images/Plants/${path}/${name}1.gif`;
                }
            } else {
                if (targetImg.src.indexOf(name) !== -1) { 
                    targetImg.src = `assets/images/Plants/${path}/${baseName}.gif`;
                }
            }
        }"""

content = content.replace(old_block, new_block)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
