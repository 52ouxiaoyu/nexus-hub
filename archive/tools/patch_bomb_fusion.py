import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Add triggerBombFusion method right after hasTrait
new_method = """    hasTrait(trait) {
        return this.traits.includes(trait) || this.type === trait;
    }
    
    triggerBombFusion() {
        if (!this.fusionTarget) return; // Only fuse if it was planted on a plant
        
        let is3x3 = this.hasTrait('cherrybomb') || this.hasTrait('iceshroom');
        let dRows = is3x3 ? [-1, 0, 1] : [0];
        let dCols = is3x3 ? [-1, 0, 1] : [0];
        
        for (let dr of dRows) {
            for (let dc of dCols) {
                let r = this.row + dr;
                let c = this.col + dc;
                if (r >= 0 && r < this.game.board.rows && c >= 0 && c < this.game.board.cols) {
                    let target = this.game.board.grid[r][c];
                    if (target && !target.isDead) {
                        let fusionResult = this.game.getFusionResult(this.type, target.type);
                        if (fusionResult) {
                            target.hp = 0; // kill target
                            this.game.board.grid[r][c] = null;
                            setTimeout(() => {
                                let newPlant = new Plant(this.game, fusionResult);
                                this.game.board.addPlant(newPlant, r, c);
                                if (this.game.audioManager) this.game.audioManager.play('btn');
                            }, 500);
                        }
                    }
                }
            }
        }
    }"""

content = re.sub(r'    hasTrait\(trait\) {\s*return this\.traits\.includes\(trait\);\s*}', new_method, content)

# Inject call into cherrybomb / jalapeno
old_cherry = """                this.hasExploded = true;
                this.game.audioManager.play('splat'); // Needs explosion sound"""
new_cherry = """                this.hasExploded = true;
                this.game.audioManager.play('splat');
                this.triggerBombFusion();"""
content = content.replace(old_cherry, new_cherry)

# Inject call into iceshroom
old_ice = """            if (this.explodeTimer <= 0) {
                this.game.audioManager.play('splat');
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);"""
new_ice = """            if (this.explodeTimer <= 0) {
                this.game.audioManager.play('splat');
                this.triggerBombFusion();
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);"""
content = content.replace(old_ice, new_ice)

# Inject call into doomshroom
old_doom = """                        this.state = 'exploding';
                        this.game.audioManager.play('splat'); // ideally an explosion sound"""
new_doom = """                        this.state = 'exploding';
                        this.game.audioManager.play('splat');
                        this.triggerBombFusion();"""
content = content.replace(old_doom, new_doom)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

