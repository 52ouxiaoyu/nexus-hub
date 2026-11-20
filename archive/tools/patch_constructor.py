import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# We need to add hasTrait method:
has_trait_code = """
    hasTrait(trait) {
        if (this.type === trait) return true;
        if (this.traits && this.traits.includes(trait)) return true;
        return false;
    }
    
    update(deltaTime) {
"""

content = content.replace("    update(deltaTime) {", has_trait_code)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
