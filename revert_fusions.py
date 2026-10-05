import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Change getFusionResult
old_fusion = """    getFusionResult(plantA, plantB) {
        if (plantA === 'crater' || plantB === 'crater') return null;
        if (plantA === plantB) return null; // No fusing with itself
        
        // Sort alphabetically to ensure consistent fusion type name
        const arr = [plantA, plantB].sort();
        return `fusion_${arr[0]}_${arr[1]}`;
    }"""

new_fusion = """    getFusionResult(plantA, plantB) {
        const set = new Set([plantA, plantB]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';
        if (set.has('wallnut') && set.has('chomper')) return 'fusion_spikynut';
        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        return null;
    }"""

content = content.replace(old_fusion, new_fusion)
with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

# Now for Plant.js
with open('pvz-web/js/entities/Plant.js', 'r') as f:
    plant_content = f.read()

# Replace the Frankenstein CSS logic to conditionally use the image if available
old_frankenstein = """            // CSS Frankenstein Stitching
            this.element.style.clipPath = 'polygon(0 40%, 100% 40%, 100% 100%, 0 100%)'; // Base plant gets bottom 60%
            
            this.fusionOverlay = document.createElement('img');
            this.fusionOverlay.src = s2.src;
            this.fusionOverlay.style.position = 'absolute';
            this.fusionOverlay.style.pointerEvents = 'none';
            this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 40%, 0 40%)'; // Secondary plant gets top 40%
            this.fusionOverlay.style.zIndex = '1';
            // add a cool glowing filter to indicate fusion
            this.element.style.filter = 'drop-shadow(0px 0px 5px #ff00ff)';
            this.fusionOverlay.style.filter = 'drop-shadow(0px 0px 5px #ff00ff)';
            this.game.entityLayer.appendChild(this.fusionOverlay);"""

new_frankenstein = """            // Visuals
            const customImages = {
                'fusion_peaflower': 'assets/images/Plants/Fusions/peaflower.png',
                'fusion_nutshooter': 'assets/images/Plants/Fusions/nutshooter.png'
            };
            
            if (customImages[type]) {
                // Use custom single sprite!
                this.element.src = customImages[type];
                this.element.style.transform = 'scale(0.8)'; // AI images are a bit big
            } else {
                // CSS Frankenstein Stitching for others
                this.element.style.clipPath = 'polygon(0 40%, 100% 40%, 100% 100%, 0 100%)'; // Base plant gets bottom 60%
                
                this.fusionOverlay = document.createElement('img');
                this.fusionOverlay.src = s2.src;
                this.fusionOverlay.style.position = 'absolute';
                this.fusionOverlay.style.pointerEvents = 'none';
                this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 40%, 0 40%)'; // Secondary plant gets top 40%
                this.fusionOverlay.style.zIndex = '1';
                this.element.style.filter = 'drop-shadow(0px 0px 5px #ff00ff)';
                this.fusionOverlay.style.filter = 'drop-shadow(0px 0px 5px #ff00ff)';
                this.game.entityLayer.appendChild(this.fusionOverlay);
            }"""

plant_content = plant_content.replace(old_frankenstein, new_frankenstein)

# Need to fix traits logic for custom fusion names!
# If type is 'fusion_peaflower', parts[1] is 'peaflower', which is NOT 'peashooter' or 'sunflower'!
# We need to explicitly map the traits for these hardcoded types.
trait_mapping = """
        if (type.startsWith('fusion_')) {
            let p1, p2;
            if (type === 'fusion_peaflower') { p1 = 'peashooter'; p2 = 'sunflower'; }
            else if (type === 'fusion_nutshooter') { p1 = 'peashooter'; p2 = 'wallnut'; }
            else if (type === 'fusion_frostbomb') { p1 = 'snowpea'; p2 = 'cherrybomb'; }
            else if (type === 'fusion_sporemine') { p1 = 'puffshroom'; p2 = 'potatomine'; }
            else if (type === 'fusion_spikynut') { p1 = 'chomper'; p2 = 'wallnut'; }
            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }
            else {
                const parts = type.split('_');
                p1 = parts[1];
                p2 = parts[2];
            }
            this.traits = [p1, p2];
"""

old_traits_split = """        if (type.startsWith('fusion_')) {
            const parts = type.split('_');
            const p1 = parts[1];
            const p2 = parts[2];
            this.traits = [p1, p2];"""

plant_content = plant_content.replace(old_traits_split, trait_mapping)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(plant_content)
