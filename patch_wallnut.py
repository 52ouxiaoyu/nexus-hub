import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_block = """        if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {
            const maxHp = this.hasTrait('wallnut') ? 4000 : 8000;
            const path = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            const name = this.hasTrait('wallnut') ? 'Wallnut_cracked' : 'TallnutCracked';
            
            if (this.hp < maxHp * 0.33 && this.element.src.indexOf(name + '2') === -1) {
                this.element.src = `assets/images/Plants/${path}/${name}2.gif`;
            } else if (this.hp < maxHp * 0.66 && this.element.src.indexOf(name + '1') === -1 && this.hp >= maxHp * 0.33) {
                this.element.src = `assets/images/Plants/${path}/${name}1.gif`;
            }
        }"""

new_block = """        if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {
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

content = content.replace(old_block, new_block)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
