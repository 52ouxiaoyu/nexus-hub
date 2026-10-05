import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Add getStats
old_stats = """        } else if (type === 'torchwood') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
            stat.yOffset = -5;
        }"""
new_stats = """        } else if (type === 'torchwood') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
            stat.yOffset = -5;
        } else if (type === 'melonpult') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Cactus/Cactus.gif';
        } else if (type === 'wintermelon') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Cactus/Cactus.gif';
        }"""
content = content.replace(old_stats, new_stats)

# Add visual for wintermelon
old_vis = """                } else if (type === 'fusion_doomshroom_sunflower') {
                    this.element.src = s2.src; // sunflower
                    this.element.style.filter = 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)';
                }"""
new_vis = """                } else if (type === 'fusion_doomshroom_sunflower') {
                    this.element.src = s2.src; // sunflower
                    this.element.style.filter = 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)';
                } else if (type === 'wintermelon') {
                    this.element.src = s1.src; // cactus
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                }"""
content = content.replace(old_vis, new_vis)

# Add shoot logic
old_shoot_if = "if ((this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater') || this.hasTrait('puffshroom') || this.hasTrait('threepeater') || this.hasTrait('fumeshroom') || this.hasTrait('gatlingpea') || this.hasTrait('splitpea') || this.hasTrait('scaredyshroom'))) {"

new_shoot_if = "if ((this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater') || this.hasTrait('puffshroom') || this.hasTrait('threepeater') || this.hasTrait('fumeshroom') || this.hasTrait('gatlingpea') || this.hasTrait('splitpea') || this.hasTrait('scaredyshroom') || this.hasTrait('melonpult') || this.hasTrait('wintermelon'))) {"

content = content.replace(old_shoot_if, new_shoot_if)

old_proj_type = """                    if (this.hasTrait('scaredyshroom')) projType = 'scaredyshroom';
                    if (this.hasTrait('fumeshroom')) projType = 'fumeshroom';"""
new_proj_type = """                    if (this.hasTrait('scaredyshroom')) projType = 'scaredyshroom';
                    if (this.hasTrait('fumeshroom')) projType = 'fumeshroom';
                    if (this.hasTrait('melonpult')) projType = 'melon';
                    if (this.hasTrait('wintermelon')) projType = 'wintermelon';"""
content = content.replace(old_proj_type, new_proj_type)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

