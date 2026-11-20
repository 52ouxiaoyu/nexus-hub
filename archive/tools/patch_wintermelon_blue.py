import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_filter = """            if (this.hasTrait('wintermelon')) {
                this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            }"""
new_filter = """            if (this.hasTrait('wintermelon')) {
                this.element.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
            }"""
content = content.replace(old_filter, new_filter)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
