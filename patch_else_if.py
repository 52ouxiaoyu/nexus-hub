import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Separate Spikeweed from the else if chain
old_spikeweed = """        } else if (this.hasTrait('spikeweed') || this.hasTrait('spikerock')) {"""
new_spikeweed = """        }
        
        if (this.hasTrait('spikeweed') || this.hasTrait('spikerock')) {"""
content = content.replace(old_spikeweed, new_spikeweed)

# Separate Gloomshroom
old_gloom = """        } else if (this.hasTrait('gloomshroom')) {"""
new_gloom = """        }
        
        if (this.hasTrait('gloomshroom')) {"""
content = content.replace(old_gloom, new_gloom)

# Separate Wallnut/Tallnut
old_wallnut = """        } else if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {"""
new_wallnut = """        }
        
        if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {"""
content = content.replace(old_wallnut, new_wallnut)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

