import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_block = """                } else if (type === 'fusion_spikynut') {
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
                }"""

new_block = """                } else if (type === 'fusion_spikynut') {
                    this.yOffset = s2.yOffset; // use wallnut's offset for the main body
                    this.element.src = s2.src; // wallnut
                    this.fusionOverlay.src = s1.src; // spikeweed
                    this.fusionOverlay.style.clipPath = 'none'; // show full spikeweed
                    // Spikeweed needs to be placed at the bottom of the wallnut
                    // Wallnut is at -15, Spikeweed normally at 25. Difference is 40.
                    this.fusionOverlay.style.transform = 'translate(0px, 40px)';
                } else if (type === 'fusion_spikerock_tallnut') {
                    this.yOffset = s2.yOffset; // use tallnut's offset
                    this.element.src = s2.src; // tallnut
                    this.fusionOverlay.src = s1.src; // spikerock
                    this.fusionOverlay.style.clipPath = 'none'; // show full spikerock
                    // Tallnut is at -20, Spikerock normally at 20. Difference is 40.
                    this.fusionOverlay.style.transform = 'translate(0px, 40px)';
                }"""

content = content.replace(old_block, new_block)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
