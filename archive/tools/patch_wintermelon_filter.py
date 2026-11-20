import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_constructor = """            this.element.style.position = 'absolute';
            this.element.style.transform = 'translate(-50%, -50%)';"""
new_constructor = """            this.element.style.position = 'absolute';
            this.element.style.transform = 'translate(-50%, -50%)';
            if (type === 'wintermelon' || (this.traits && this.traits.includes('snowpea') && this.traits.includes('cherrybomb'))) {
                this.element.style.filter = 'hue-rotate(200deg) saturate(1.5) brightness(1.2)';
            }"""
content = content.replace(old_constructor, new_constructor)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

