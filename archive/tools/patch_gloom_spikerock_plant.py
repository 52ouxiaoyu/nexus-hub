import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# getStats
old_stats = """        } else if (type === 'sunshroom') {"""
new_stats = """        } else if (type === 'gloomshroom') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/GloomShroom/GloomShroom.gif';
            stat.yOffset = -10;
        } else if (type === 'spikerock') {
            stat.hp = 1200;
            stat.src = 'assets/images/Plants/Spikerock/Spikerock.gif';
            stat.yOffset = 20;
        } else if (type === 'sunshroom') {"""
content = content.replace(old_stats, new_stats)

# triggerBombFusion
old_update = """    update(deltaTime) {"""
new_update = """    triggerBombFusion() {
        const fusions = [ {row: this.row, col: this.col} ];
        
        if (this.hasTrait('cherrybomb') || this.hasTrait('iceshroom')) {
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    if (r === 0 && c === 0) continue;
                    fusions.push({ row: this.row + r, col: this.col + c });
                }
            }
        }
        
        for (let pos of fusions) {
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
        }
    }
    
    update(deltaTime) {"""
content = content.replace(old_update, new_update)

# Gloomshroom attack logic and Spikerock attack logic
old_spikeweed = """        } else if (this.hasTrait('spikeweed')) {
            this.damageTimer += deltaTime;
            if (this.damageTimer >= 1.0) { // Deal damage every 1s
                this.damageTimer = 0;
                const zombies = this.game.entities.filter(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 40 && !e.isDead
                );
                if (zombies.length > 0) {
                    this.game.audioManager.play('splat'); // Or a spikeweed sound
                    for (let z of zombies) {
                        z.takeDamage(40); // small damage over time
                    }
                }
            }"""
new_spikeweed = """        } else if (this.hasTrait('spikeweed') || this.hasTrait('spikerock')) {
            this.damageTimer += deltaTime;
            if (this.damageTimer >= 1.0) { // Deal damage every 1s
                this.damageTimer = 0;
                const zombies = this.game.entities.filter(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 40 && !e.isDead
                );
                if (zombies.length > 0) {
                    this.game.audioManager.play('splat'); // Or a spikeweed sound
                    for (let z of zombies) {
                        const dmg = this.hasTrait('spikerock') ? 160 : 40;
                        z.takeDamage(dmg); 
                    }
                }
            }
        } else if (this.hasTrait('gloomshroom')) {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= 1.5) {
                const zombies = this.game.entities.filter(e => 
                    e instanceof Zombie && !e.isDead && Math.abs(e.row - this.row) <= 1 && Math.abs(e.x - this.x) <= 150
                );
                if (zombies.length > 0) {
                    this.fireTimer = 0;
                    this.game.audioManager.play('splat');
                    for (let z of zombies) {
                        z.takeDamage(40); // 2x fumeshroom damage
                    }
                }
            }"""
content = content.replace(old_spikeweed, new_spikeweed)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

