import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# I want to modify tryPlanting to accept cherrybomb on snowpea
old_try = """    tryPlanting(type, row, col) {
        if (this.cooldowns[type] > 0) return; // Still cooling down
        
        const seed = this.seeds.find(s => s.type === type);
        if (!seed) return;
        if (this.sunCount < seed.cost) return;

        let existingPlant = this.board.grid[row][col];
        if (this.board.canPlant(row, col)) {"""

new_try = """    tryPlanting(type, row, col) {
        if (this.cooldowns[type] > 0) return; // Still cooling down
        
        const seed = this.seeds.find(s => s.type === type);
        if (!seed) return;
        if (this.sunCount < seed.cost) return;

        let existingPlant = this.board.grid[row][col];
        
        // Bomb planting exception: allow planting cherrybomb on snowpea
        if (existingPlant && type === 'cherrybomb' && existingPlant.type === 'snowpea') {
            this.sunCount -= seed.cost;
            this.sunCountElement.innerText = this.sunCount;
            this.cooldowns[type] = seed.cooldown; // Start cooldown
            this.updateUI();
            this.audioManager.play('plant');
            
            let plant = new Plant(this, type);
            plant.row = row;
            plant.col = col;
            plant.x = 250 + col * 80 + 40;
            plant.y = 100 + row * 100 + 50;
            plant.fusionTarget = existingPlant; // Mark it!
            this.entities.push(plant); // Add to entities but NOT to board grid!
            return;
        }

        if (this.board.canPlant(row, col)) {"""

content = content.replace(old_try, new_try)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

