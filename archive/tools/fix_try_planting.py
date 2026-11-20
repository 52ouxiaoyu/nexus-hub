import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# Replace the bomb planting exception
old_code = r"// Bomb planting exception: allow planting cherrybomb on snowpea.*?let plant = new Plant\(this, type\);"
new_code = """// Bomb planting exception: allow planting bombs on plants
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && isBomb) {
            this.sunCount -= seed.cost;
            this.sunCountElement.innerText = this.sunCount;
            this.cooldowns[type] = seed.cooldown; // Start cooldown
            this.updateUI();
            this.audioManager.play('plant');
            
            let plant = new Plant(this, type);"""

content = re.sub(old_code, new_code, content, flags=re.DOTALL)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

