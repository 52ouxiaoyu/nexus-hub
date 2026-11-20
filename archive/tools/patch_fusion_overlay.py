import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_overlay = """            } else {
                // Bespoke CSS Assembly for Fusions without custom sprites
                this.fusionOverlay = document.createElement('img');
                this.fusionOverlay.src = s2.src;
                this.fusionOverlay.style.position = 'absolute';
                this.fusionOverlay.style.pointerEvents = 'none';
                this.fusionOverlay.style.zIndex = '1';"""

new_overlay = """            } else {
                // Bespoke CSS Assembly for Fusions without custom sprites
                if (s2.src) {
                    this.fusionOverlay = document.createElement('img');
                    this.fusionOverlay.src = s2.src;
                    this.fusionOverlay.style.position = 'absolute';
                    this.fusionOverlay.style.pointerEvents = 'none';
                    this.fusionOverlay.style.zIndex = '1';
                }"""

content = content.replace(old_overlay, new_overlay)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

