import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_css = """                if (type === 'fusion_frostbomb') {
                    // Cherrybomb colored blue
                    this.element.src = s2.src; // cherrybomb
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                } else if (type === 'fusion_sporemine') {
                    // Potatomine with puffshroom top
                    this.element.src = s2.src; // potatomine
                    this.fusionOverlay.src = s1.src; // puffshroom
                    this.fusionOverlay.style.transform = 'translate(0px, -15px) scale(0.7)';
                } else if (type === 'fusion_spikynut') {
                    // Wallnut with chomper hat
                    this.element.src = s2.src; // wallnut
                    this.fusionOverlay.src = s1.src; // chomper
                    this.fusionOverlay.style.transform = 'translate(-5px, -25px) scale(0.6)';
                } else if (type === 'fusion_snownut') {"""

new_css = """                if (type === 'fusion_frostbomb') {
                    // Cherrybomb colored blue
                    this.element.src = s2.src; // cherrybomb
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                } else if (type === 'fusion_sporemine') {
                    // Potatomine with puffshroom top
                    this.element.src = s2.src; // potatomine
                    this.fusionOverlay.src = s1.src; // puffshroom
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 65%, 0 65%)'; // Just the cap
                    this.fusionOverlay.style.transform = 'translate(-2px, -18px) scale(1.1)'; // Fit exactly on potato mine
                } else if (type === 'fusion_spikynut') {
                    // Wallnut with chomper hat
                    this.element.src = s2.src; // wallnut
                    this.fusionOverlay.src = s1.src; // chomper
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 70%, 0 70%)'; // Just the chomper head
                    this.fusionOverlay.style.transform = 'translate(-5px, -22px) scale(1.0)'; // Fit the width of wallnut
                } else if (type === 'fusion_snownut') {"""

content = content.replace(old_css, new_css)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

