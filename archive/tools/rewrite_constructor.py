import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# We need to extract all `else if (type === 'xxx') { ... }` blocks
# Let's find the start of the constructor
start_idx = content.find("if (type === 'peashooter') {")
end_idx = content.find("        // FUSION PLANTS")

if start_idx != -1 and end_idx != -1:
    block = content[start_idx:end_idx]
    
    # Let's replace `this.` with `stat.` and convert it to a dictionary builder
    dict_builder = """
        const getStats = (t) => {
            let stat = { hp: 300, yOffset: 0 };
            let type = t;
            """ + block.replace('this.', 'stat.') + """
            stat.src = stat.element ? stat.element.src : '';
            return stat;
        };
    """
    
    # Wait, `stat.element.src = ...` will crash if `stat.element` is undefined.
    # We should just regex replace `this.element.src = (.*);` with `stat.src = \1;`
    block = re.sub(r"this\.element\.src = (.*?);", r"stat.src = \1;", block)
    block = block.replace('this.', 'stat.')
    
    dict_builder = """
        const getStats = (t) => {
            let stat = { hp: 300, yOffset: 0 };
            let type = t;
            """ + block + """
            return stat;
        };
        
        if (type.startsWith('fusion_')) {
            const parts = type.split('_');
            const p1 = parts[1];
            const p2 = parts[2];
            this.traits = [p1, p2];
            
            const s1 = getStats(p1);
            const s2 = getStats(p2);
            
            this.hp = Math.max(s1.hp, s2.hp);
            this.yOffset = s1.yOffset;
            
            if (s1.fireRate || s2.fireRate) this.fireRate = Math.max(s1.fireRate || 0, s2.fireRate || 0);
            if (s1.fireRate && s2.fireRate) this.fireRate = (s1.fireRate + s2.fireRate) / 2; // average if both have it
            
            if (s1.sunRate || s2.sunRate) this.sunRate = Math.max(s1.sunRate || 0, s2.sunRate || 0);
            
            if (s1.explodeTimer || s2.explodeTimer) this.explodeTimer = (s1.explodeTimer || 0) + (s2.explodeTimer || 0);
            if (s1.armTimer || s2.armTimer) this.armTimer = (s1.armTimer || 0) + (s2.armTimer || 0);
            
            if (s1.state) this.state = s1.state;
            if (s2.state) this.state = s2.state; // p2 overrides
            
            this.element.src = s1.src;
            
            // Add secondary image
            this.fusionOverlay = document.createElement('img');
            this.fusionOverlay.src = s2.src;
            this.fusionOverlay.style.position = 'absolute';
            this.fusionOverlay.style.pointerEvents = 'none';
            this.fusionOverlay.style.transform = 'scale(0.6)';
            this.fusionOverlay.style.opacity = '0.85';
            this.fusionOverlay.style.zIndex = '1';
            this.fusionOverlay.style.left = '10px';
            this.fusionOverlay.style.top = '10px';
            this.element.appendChild(this.fusionOverlay); // Wait, img cannot have children! We must append to entityLayer in update.
            this.game.entityLayer.appendChild(this.fusionOverlay);
            
        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
        }
    """
    
    # Replace from start_idx to end_idx (inclusive of fusion blocks until update)
    update_idx = content.find("    hasTrait(trait) {")
    new_content = content[:start_idx] + dict_builder + content[update_idx:]
    
    with open('pvz-web/js/entities/Plant.js', 'w') as f:
        f.write(new_content)
        
