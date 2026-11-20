import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Add growth timer to constructor
old_sunshroom_stat = """        } else if (type === 'sunshroom') {
            stat.hp = 300;
            stat.sunRate = 24.0;
            stat.sunTimer = 0;
            stat.src = 'assets/images/Plants/SunShroom/SunShroom.gif';"""

new_sunshroom_stat = """        } else if (type === 'sunshroom') {
            stat.hp = 300;
            stat.sunRate = 24.0;
            stat.sunTimer = 0;
            stat.src = 'assets/images/Plants/SunShroom/SunShroom.gif';
            stat.growthTimer = 0;
            stat.sunCountDrop = 1;"""

content = content.replace(old_sunshroom_stat, new_sunshroom_stat)

# Update sun logic
old_sun = """                if (this.hasTrait('twinsunflower')) {
                    // Spawn a second sun slightly offset
                    setTimeout(() => {
                        if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + 20, this.y - 20, targetY));
                    }, 500);
                }"""

new_sun = """                if (this.hasTrait('twinsunflower')) {
                    // Spawn a second sun slightly offset
                    setTimeout(() => {
                        if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + 20, this.y - 20, targetY));
                    }, 500);
                }
                
                if (this.hasTrait('sunshroom') && this.sunCountDrop > 1) {
                    for (let i = 1; i < this.sunCountDrop; i++) {
                        setTimeout(() => {
                            if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + (Math.random()*40-20), this.y - 20, targetY));
                        }, i * 300);
                    }
                }"""

content = content.replace(old_sun, new_sun)

# Add growth timer update logic
old_update = """        if ((this.hasTrait('sunflower') || this.hasTrait('twinsunflower') || this.hasTrait('sunshroom') || this.hasTrait('fusion_peaflower') || this.hasTrait('fusion_doomshroom_sunflower'))) {
            this.sunTimer += deltaTime;"""

new_update = """        if ((this.hasTrait('sunflower') || this.hasTrait('twinsunflower') || this.hasTrait('sunshroom') || this.hasTrait('fusion_peaflower') || this.hasTrait('fusion_doomshroom_sunflower'))) {
            if (this.hasTrait('sunshroom')) {
                this.growthTimer += deltaTime;
                if (this.growthTimer >= 10.0 && this.sunCountDrop < 4) {
                    this.growthTimer = 0;
                    this.sunCountDrop++;
                    // Maybe change image slightly? 
                    if (this.sunCountDrop === 2) this.element.src = 'assets/images/Plants/SunShroom/SunShroom2.gif';
                    if (this.sunCountDrop === 3) this.element.style.transform = 'scale(1.15)';
                    if (this.sunCountDrop === 4) this.element.style.transform = 'scale(1.3)';
                }
            }
            this.sunTimer += deltaTime;"""

content = content.replace(old_update, new_update)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

