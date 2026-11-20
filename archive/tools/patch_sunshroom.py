import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_sun = """        if ((this.hasTrait('sunflower') || this.hasTrait('sunshroom') || this.hasTrait('twinsunflower'))) {"""
new_sun = """        if (this.hasTrait('sunshroom')) {
            this.growthTimer += deltaTime;
            if (this.growthTimer >= 10.0 && this.sunCountDrop < 4) {
                this.sunCountDrop++;
                this.growthTimer = 0;
            }
        }
        if ((this.hasTrait('sunflower') || this.hasTrait('sunshroom') || this.hasTrait('twinsunflower'))) {"""

content = content.replace(old_sun, new_sun)

old_sun_val = """                let sunValue = isHybridSun ? 15 : 25;
                let sun = new Sun(this.game, this.x, this.y - 20, targetY);
                if (isHybridSun) {
                    sun.value = 15;
                    sun.element.style.transform = 'scale(0.6)';
                }"""
new_sun_val = """                let sunValue = isHybridSun ? 15 : 25;
                let sun = new Sun(this.game, this.x, this.y - 20, targetY);
                sun.value = sunValue;
                if (isHybridSun) {
                    sun.element.style.transform = 'scale(0.6)';
                }"""
content = content.replace(old_sun_val, new_sun_val)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
