import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_glove_click = """        gloveBtn.addEventListener('click', () => {
            this.isGloveActive = !this.isGloveActive;
            if (this.isGloveActive) {
                if (this.inputManager) {
                    this.inputManager.selectedSeed = null;
                    this.inputManager.isShovelSelected = false;
                    this.inputManager.dragGhost.style.display = 'none';
                }
            }
            this.gloveSource = null;"""

new_glove_click = """        gloveBtn.addEventListener('click', () => {
            this.isGloveActive = !this.isGloveActive;
            this.isGloveDragging = false;
            if (this.isGloveActive) {
                if (this.inputManager) {
                    this.inputManager.selectedSeed = null;
                    this.inputManager.isShovelSelected = false;
                    this.inputManager.dragGhost.style.display = 'none';
                }
            } else {
                // Cancel dragging if active
                if (this.gloveSource) {
                    this.gloveSource.element.style.display = 'block';
                    if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                }
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            }
            this.gloveSource = null;"""

content = content.replace(old_glove_click, new_glove_click)

old_try_glove = """    tryGloveInteraction(row, col) {
        if (!this.isGloveActive) return false;
        
        const plant = this.board.grid[row][col];
        if (!plant) {
            // Clicked empty space, cancel glove
            this.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.gloveSource) {
                this.gloveSource.element.style.filter = '';
            }
            this.gloveSource = null;
            return true;
        }
        
        if (!this.gloveSource) {
            this.gloveSource = plant;
            plant.element.style.filter = 'brightness(1.5) drop-shadow(0 0 10px #0f0)';
        } else {
            if (this.gloveSource === plant) {
                // Cancel selection
                plant.element.style.filter = '';
                this.gloveSource = null;
                return true;
            }
            
            // Try to fuse
            const fusionType = this.getFusionResult(this.gloveSource.type, plant.type);
            if (fusionType) {
                this.gloveSource.element.style.filter = ''; // Reset filter before dying
                this.gloveSource.hp = 0; // kill source
                plant.hp = 0; // kill target
                
                this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                this.board.grid[row][col] = null;
                
                let newPlant = new Plant(this, fusionType);
                if (this.board.addPlant(newPlant, row, col)) {
                    if (this.audioManager) this.audioManager.play('btn');
                    this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
                }
            } else {
                this.gloveSource.element.style.filter = '';
                this.showAnnouncement('这两种植物无法融合', '#ff0000');
            }
            
            this.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            this.gloveSource = null;
        }
        return true;
    }"""

new_try_glove = """    tryGloveInteraction(row, col) {
        if (!this.isGloveActive) return false;
        
        const plant = this.board.grid[row][col];
        if (!plant) {
            // Clicked empty space, cancel drag but keep glove active maybe? Or cancel all.
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            if (this.gloveSource) {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
            }
            this.gloveSource = null;
            return true;
        }
        
        if (!this.gloveSource) {
            // Pick up the first plant
            this.gloveSource = plant;
            this.isGloveDragging = true;
            plant.element.style.display = 'none';
            if (plant.fusionOverlay) plant.fusionOverlay.style.display = 'none';
            
            // Set drag ghost image to this plant
            if (this.inputManager) {
                this.inputManager.dragGhost.style.display = 'block';
                this.inputManager.dragGhost.style.backgroundImage = `url('${plant.element.src}')`;
                // Manually trigger move to put ghost at cursor immediately
            }
        } else {
            if (this.gloveSource === plant) {
                // Cancel selection
                plant.element.style.display = 'block';
                if (plant.fusionOverlay) plant.fusionOverlay.style.display = 'block';
                this.gloveSource = null;
                this.isGloveDragging = false;
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                return true;
            }
            
            // Try to fuse
            const fusionType = this.getFusionResult(this.gloveSource.type, plant.type);
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
            } else {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                this.showAnnouncement('这两种植物无法融合', '#ff0000');
            }
            
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            this.gloveSource = null;
        }
        return true;
    }"""

content = content.replace(old_try_glove, new_try_glove)
with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
