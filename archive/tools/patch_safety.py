import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_trigger = """        for (let pos of fusions) {
            if (pos.row >= 0 && pos.row < this.game.board.rows && pos.col >= 0 && pos.col < this.game.board.cols) {
                const targetPlant = this.game.board.grid[pos.row][pos.col];
                if (targetPlant && !targetPlant.isDead && targetPlant !== this) {
                    const fusionResult = this.game.getFusionResult(this.type, targetPlant.type);
                    if (fusionResult) {
                        targetPlant.hp = 0;
                        this.game.board.grid[pos.row][pos.col] = null;
                        let newPlant = new Plant(this.game, fusionResult);
                        this.game.board.addPlant(newPlant, pos.row, pos.col);
                        this.game.showAnnouncement(`爆炸融合成功：${this.game.getPlantName(fusionResult)}!`, '#ff00ff');
                    }
                }
            }
        }"""
new_trigger = """        for (let pos of fusions) {
            if (pos.row >= 0 && pos.row < this.game.board.rows && pos.col >= 0 && pos.col < this.game.board.cols) {
                const targetPlant = this.game.board.grid[pos.row][pos.col];
                if (targetPlant && !targetPlant.isDead && targetPlant !== this) {
                    try {
                        const fusionResult = this.game.getFusionResult(this.type, targetPlant.type);
                        if (fusionResult) {
                            targetPlant.hp = 0;
                            this.game.board.grid[pos.row][pos.col] = null;
                            let newPlant = new Plant(this.game, fusionResult);
                            this.game.board.addPlant(newPlant, pos.row, pos.col);
                            this.game.showAnnouncement(`爆炸融合成功：${this.game.getPlantName(fusionResult)}!`, '#ff00ff');
                        }
                    } catch (e) {
                        console.error("Fusion error", e);
                    }
                }
            }
        }"""
content = content.replace(old_trigger, new_trigger)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_tryPlant = """            const fusionType = this.getFusionResult(this.gloveSource.type, plant.type);
            if (fusionType) {
                this.gloveSource.element.style.display = 'block'; // Reset display before dying to ensure cleanup
                this.gloveSource.hp = 0; // kill source
                plant.hp = 0; // kill target
                
                this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                this.board.grid[row][col] = null;
                
                let newPlant = new Plant(this, fusionType);
                if (this.board.addPlant(newPlant, row, col)) {
                    if (this.audioManager) this.audioManager.play('btn');
                    this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
                }
            } else {"""
new_tryPlant = """            let fusionType = null;
            try { fusionType = this.getFusionResult(this.gloveSource.type, plant.type); } catch(e) { console.error(e); }
            if (fusionType) {
                this.gloveSource.element.style.display = 'block'; // Reset display before dying to ensure cleanup
                this.gloveSource.hp = 0; // kill source
                plant.hp = 0; // kill target
                
                this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                this.board.grid[row][col] = null;
                
                try {
                    let newPlant = new Plant(this, fusionType);
                    if (this.board.addPlant(newPlant, row, col)) {
                        if (this.audioManager) this.audioManager.play('btn');
                        this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
                    }
                } catch(e) { console.error(e); }
            } else {"""
content = content.replace(old_tryPlant, new_tryPlant)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
