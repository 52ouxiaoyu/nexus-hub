import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Replace the visual logic
old_visuals = r"""            // Visuals
            const customImages = \{[\s\S]*?this\.game\.entityLayer\.appendChild\(this\.fusionOverlay\);\n            \}"""

new_visuals = """            // Bespoke CSS Assembly for Fusions
            this.fusionOverlay = document.createElement('img');
            this.fusionOverlay.src = s2.src;
            this.fusionOverlay.style.position = 'absolute';
            this.fusionOverlay.style.pointerEvents = 'none';
            this.fusionOverlay.style.zIndex = '1';
            
            if (type === 'fusion_peaflower') {
                // Sunflower body, Peashooter face
                this.element.src = s2.src; // sunflower
                this.fusionOverlay.src = s1.src; // peashooter
                this.fusionOverlay.style.transform = 'translate(10px, -5px) scale(0.65)';
            } else if (type === 'fusion_nutshooter') {
                // Wallnut body, Peashooter snout
                this.element.src = s2.src; // wallnut
                this.fusionOverlay.src = s1.src; // peashooter
                this.fusionOverlay.style.transform = 'translate(18px, 15px) scale(0.55)';
            } else if (type === 'fusion_frostbomb') {
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
            } else if (type === 'fusion_snownut') {
                // Wallnut colored ice blue
                this.element.src = s2.src; // wallnut
                this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                this.fusionOverlay.style.display = 'none'; // hide overlay
            }
            
            this.game.entityLayer.appendChild(this.fusionOverlay);"""

content = re.sub(old_visuals, new_visuals, content)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
