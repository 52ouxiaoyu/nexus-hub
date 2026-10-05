import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Replace the fusion overlay logic
old_overlay = """            // Add secondary image
            this.fusionOverlay = document.createElement('img');
            this.fusionOverlay.src = s2.src;
            this.fusionOverlay.style.position = 'absolute';
            this.fusionOverlay.style.pointerEvents = 'none';
            this.fusionOverlay.style.transform = 'scale(0.6)';
            this.fusionOverlay.style.opacity = '0.85';
            this.fusionOverlay.style.zIndex = '1';
            this.game.entityLayer.appendChild(this.fusionOverlay);"""

new_overlay = """            // CSS Frankenstein Stitching
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

content = content.replace(old_overlay, new_overlay)

# And in update, we need to match the size
# Currently:
#         if (this.fusionOverlay) {
#             this.fusionOverlay.style.left = `${this.x + 10}px`;
#             this.fusionOverlay.style.top = `${this.y + (this.yOffset || 0) + 10}px`;
#         }

old_update = """        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x + 10}px`;
            this.fusionOverlay.style.top = `${this.y + (this.yOffset || 0) + 10}px`;
        }"""

new_update = """        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x}px`;
            this.fusionOverlay.style.top = `${this.y + (this.yOffset || 0)}px`;
            // Match the width/height of the base image exactly so the clip-path aligns perfectly
            this.fusionOverlay.style.width = this.element.offsetWidth + 'px';
            this.fusionOverlay.style.height = this.element.offsetHeight + 'px';
        }"""
content = content.replace(old_update, new_update)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
