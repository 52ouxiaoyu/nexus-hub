import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_planting = """        let existingPlant = this.board.grid[row][col];
        let fusionType = null;
        if (this.fusionMode && existingPlant && existingPlant.type !== 'crater') {
            fusionType = this.getFusionResult(existingPlant.type, type);
        }

        if (this.board.canPlant(row, col) || fusionType) {
            let plantTypeToCreate = fusionType ? fusionType : type;
            let plant = new Plant(this, plantTypeToCreate);
            
            if (fusionType) {
                existingPlant.hp = 0;
                this.board.grid[row][col] = null; // force clear to allow addPlant
                if (this.audioManager) this.audioManager.play('btn'); // fusion sound
                this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
            }
            
            if (this.board.addPlant(plant, row, col)) {"""

new_planting = """        let existingPlant = this.board.grid[row][col];
        if (this.board.canPlant(row, col)) {
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, row, col)) {"""

content = content.replace(old_planting, new_planting)
with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
