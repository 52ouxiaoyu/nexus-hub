import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Remove the offsetWidth/offsetHeight overriding for fusionOverlay
old_update = """        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x}px`;
            this.fusionOverlay.style.top = `${this.y + (this.yOffset || 0)}px`;
            // Match the width/height of the base image exactly so the clip-path aligns perfectly
            this.fusionOverlay.style.width = this.element.offsetWidth + 'px';
            this.fusionOverlay.style.height = this.element.offsetHeight + 'px';
        }"""

new_update = """        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x}px`;
            this.fusionOverlay.style.top = `${this.y + (this.yOffset || 0)}px`;
        }"""

content = content.replace(old_update, new_update)

old_css = """                if (type === 'fusion_frostbomb') {
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

# Fix transforms to make them actually fit!
new_css = """                if (type === 'fusion_frostbomb') {
                    this.element.src = s2.src;
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_sporemine') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 50%, 0 50%)';
                    // Puffshroom cap placed exactly on top of Potato mine
                    this.fusionOverlay.style.transform = 'translate(0px, -25px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_spikynut') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 60%, 0 60%)'; 
                    // Chomper head worn as a large hat on Wallnut. Chomper is big, so scale down slightly and move up
                    this.fusionOverlay.style.transform = 'translate(0px, -30px) scale(0.85)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_snownut') {"""

content = content.replace(old_css, new_css)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

