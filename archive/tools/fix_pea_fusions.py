import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_custom = """            const customImages = {
                'fusion_peaflower': 'assets/images/Plants/Fusions/peaflower.png',
                'fusion_nutshooter': 'assets/images/Plants/Fusions/nutshooter.png'
            };"""

new_custom = """            const customImages = {};"""

content = content.replace(old_custom, new_custom)

old_css = """                if (type === 'fusion_frostbomb') {"""

new_css = """                if (type === 'fusion_peaflower') {
                    // Sunflower body, Peashooter snout on the face
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Clip out just the Peashooter head/snout (roughly top 40%, right 60%)
                    this.fusionOverlay.style.clipPath = 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)';
                    this.fusionOverlay.style.transform = 'translate(-2px, -8px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_nutshooter') {
                    // Wallnut body, Peashooter snout on the face
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Same clip path for the snout
                    this.fusionOverlay.style.clipPath = 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)';
                    this.fusionOverlay.style.transform = 'translate(10px, 5px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_frostbomb') {"""

content = content.replace(old_css, new_css)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

