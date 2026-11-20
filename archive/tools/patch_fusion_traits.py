import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Add traits
old_traits = """            if (type.includes('snownut')) { this.traits.push('snowpea'); this.traits.push('wallnut'); }"""
new_traits = """            if (type.includes('snownut')) { this.traits.push('snowpea'); this.traits.push('wallnut'); }
            if (type === 'fusion_spikynut') { this.traits.push('spikeweed'); this.traits.push('wallnut'); }
            if (type === 'fusion_spikerock_tallnut') { this.traits.push('spikerock'); this.traits.push('tallnut'); }"""
content = content.replace(old_traits, new_traits)

# Adjust HP and visual
old_fusion_hp = """            } else if (this.hasTrait('wallnut')) {
                this.hp = 4000;
                this.maxHp = 4000;
                this.element.src = 'assets/images/Plants/WallNut/WallNut.gif';
                this.yOffset = -15;"""
new_fusion_hp = """            } else if (this.hasTrait('tallnut')) {
                this.hp = 8000;
                this.maxHp = 8000;
                this.element.src = 'assets/images/Plants/TallNut/TallNut.gif';
                this.yOffset = -20;
            } else if (this.hasTrait('wallnut')) {
                this.hp = 4000;
                this.maxHp = 4000;
                this.element.src = 'assets/images/Plants/WallNut/WallNut.gif';
                this.yOffset = -15;"""
content = content.replace(old_fusion_hp, new_fusion_hp)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

