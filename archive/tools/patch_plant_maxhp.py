import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Find the end of constructor
# we can just add this.maxHp = this.hp; at the end of constructor
old_end = """        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
            if (this.hasTrait('wintermelon')) {
                this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            }
        }
    }"""
new_end = """        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
            if (this.hasTrait('wintermelon')) {
                this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            }
        }
        this.maxHp = this.hp;
    }"""

content = content.replace(old_end, new_end)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
