import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_logic = """        // Bomb planting exception: allow planting bombs on plants
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && isBomb) {"""

new_logic = """        // Wallnut First Aid
        if (existingPlant) {
            if ((type === 'wallnut' && existingPlant.hasTrait('wallnut')) ||
                (type === 'tallnut' && existingPlant.hasTrait('tallnut'))) {
                if (existingPlant.hp < existingPlant.maxHp) {
                    existingPlant.hp = existingPlant.maxHp;
                    // Reset appearance if they have visual damage states (cracked nut)
                    if (existingPlant.updateAppearance) {
                        existingPlant.updateAppearance();
                    }
                    // Reset visual filter if applicable (ice blue)
                    // But actually wait, updateAppearance will handle basic images.
                    // Let's just deduct sun and return.
                    this.sunCount -= seed.cost;
                    this.sunCountElement.innerText = this.sunCount;
                    this.cooldowns[type] = seed.cooldown;
                    this.updateUI();
                    this.audioManager.play('plant');
                    return;
                }
            }
        }
        
        // Bomb planting exception: allow planting bombs on plants
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && isBomb) {"""

content = content.replace(old_logic, new_logic)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
