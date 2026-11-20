import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

replacement = """
        if (type.startsWith('fusion_')) {
            const parts = type.split('_');
            const p1 = parts[1];
            const p2 = parts[2];
            this.traits = [p1, p2];
            
            const s1 = getStats(p1);
            const s2 = getStats(p2);
            
            // Assign all s1 properties to initialize timers, etc.
            Object.assign(this, s1);
            
            // Assign all s2 properties that are not set or to combine them
            for (let key in s2) {
                if (key === 'hp') {
                    this.hp = Math.max(s1.hp, s2.hp); // Keep the stronger HP
                } else if (key === 'src' || key === 'yOffset' || key === 'state') {
                    // Do nothing, keep s1's visual/state as base
                } else if (key.includes('Timer')) {
                    // Sum timers if both exist
                    this[key] = (this[key] || 0) + (s2[key] || 0);
                } else if (key === 'fireRate' || key === 'sunRate') {
                    if (this[key] && s2[key]) this[key] = (this[key] + s2[key]) / 2; // Average rate
                    else if (s2[key]) this[key] = s2[key];
                } else {
                    this[key] = s2[key]; // Copy other traits (isArmed, isHiding, etc)
                }
            }
            
            this.element.src = s1.src;
            
            // Add secondary image
            this.fusionOverlay = document.createElement('img');
            this.fusionOverlay.src = s2.src;
            this.fusionOverlay.style.position = 'absolute';
            this.fusionOverlay.style.pointerEvents = 'none';
            this.fusionOverlay.style.transform = 'scale(0.6)';
            this.fusionOverlay.style.opacity = '0.85';
            this.fusionOverlay.style.zIndex = '1';
            this.game.entityLayer.appendChild(this.fusionOverlay);
            
        } else {
"""

# We need to replace the old if (type.startsWith('fusion_')) block
start_idx = content.find("        if (type.startsWith('fusion_')) {")
end_idx = content.find("        } else {", start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement.strip('\n') + "\n        } else {\n" + content[end_idx + 17:]
    
    with open('pvz-web/js/entities/Plant.js', 'w') as f:
        f.write(content)
