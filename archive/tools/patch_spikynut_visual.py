import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_block = """                } else if (type === 'fusion_spikynut') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Chomper has a huge head/jaw, keep almost all of it
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 85%, 0 85%)'; 
                    this.fusionOverlay.style.transform = 'translate(0px, -25px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_snownut') {"""

new_block = """                } else if (type === 'fusion_spikynut') {
                    this.element.src = s2.src; // wallnut
                    this.fusionOverlay.src = s1.src; // spikeweed
                    this.fusionOverlay.style.clipPath = 'none'; // show full spikeweed
                    this.fusionOverlay.style.transform = 'translate(0px, 30px) scale(1.0)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_spikerock_tallnut') {
                    this.element.src = s2.src; // tallnut
                    this.fusionOverlay.src = s1.src; // spikerock
                    this.fusionOverlay.style.clipPath = 'none'; // show full spikerock
                    this.fusionOverlay.style.transform = 'translate(0px, 40px) scale(1.0)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_snownut') {"""

content = content.replace(old_block, new_block)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
