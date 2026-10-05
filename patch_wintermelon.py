import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_filter = """        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
        }"""
new_filter = """        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
            if (this.hasTrait('wintermelon')) {
                this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            }
        }"""
content = content.replace(old_filter, new_filter)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
