import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Add to type parser
old_type = """            else if (type === 'fusion_spikynut') { p1 = 'spikeweed'; p2 = 'wallnut'; }
            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }"""
new_type = """            else if (type === 'fusion_spikynut') { p1 = 'spikeweed'; p2 = 'wallnut'; }
            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }
            else if (type === 'fusion_melon_cattail') { p1 = 'melonpult'; p2 = 'cattail'; }
            else if (type === 'fusion_wintermelon_cattail') { p1 = 'wintermelon'; p2 = 'cattail'; }"""
content = content.replace(old_type, new_type)

# Add to overlay logic
old_overlay = """                } else if (type === 'fusion_doomshroom_sunflower') {
                    this.element.src = s2.src; // sunflower
                    this.element.style.filter = 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)';
                    this.fusionOverlay.style.display = 'none';
                }"""
new_overlay = """                } else if (type === 'fusion_doomshroom_sunflower') {
                    this.element.src = s2.src; // sunflower
                    this.element.style.filter = 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_melon_cattail' || type === 'fusion_wintermelon_cattail') {
                    this.element.src = s2.src; // cattail
                    this.fusionOverlay.src = s1.src; // melon
                    this.fusionOverlay.style.clipPath = 'none';
                    this.fusionOverlay.style.transform = 'translate(-5px, -30px) scale(0.7)'; // put on top of cattail head
                    if (type === 'fusion_wintermelon_cattail') {
                        this.fusionOverlay.style.filter = 'sepia(1) hue-rotate(180deg) saturate(2) brightness(1.2)';
                    }
                }"""
content = content.replace(old_overlay, new_overlay)

# Add to fire logic
old_fire = """                    if (this.hasTrait('wintermelon') || this.hasTrait('cattail')) projType = 'wintermelon';
                    if (this.hasTrait('cattail')) projType = 'cattail';"""
new_fire = """                    if (this.hasTrait('wintermelon')) projType = 'wintermelon';
                    if (this.hasTrait('cattail')) {
                         if (this.hasTrait('wintermelon')) projType = 'cattail_wintermelon';
                         else if (this.hasTrait('melonpult')) projType = 'cattail_melon';
                         else projType = 'cattail';
                    }"""
content = content.replace(old_fire, new_fire)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
