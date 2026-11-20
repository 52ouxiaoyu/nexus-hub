import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_explode = """        } else if (this.hasTrait('cherrybomb') || this.hasTrait('jalapeno')) {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {"""

new_explode = """        } else if (this.hasTrait('cherrybomb') || this.hasTrait('jalapeno')) {
            if (!this.hasExploded) {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.hasExploded = true;"""

content = content.replace(old_explode, new_explode)

old_end = """                if (this.fusionTarget && !this.fusionTarget.isDead) {
                    let targetRow = this.fusionTarget.row;
                    let targetCol = this.fusionTarget.col;
                    this.fusionTarget.hp = 0; // kill base plant
                    
                    // Spawn Frost Bomb immediately so it starts its timer
                    let newPlant = new Plant(this.game, 'fusion_frostbomb');
                    this.game.board.addPlant(newPlant, targetRow, targetCol);
                }
                
                this.hp = 0;
            }
        } else if (this.hasTrait('iceshroom')) {"""

new_end = """                if (this.fusionTarget && !this.fusionTarget.isDead) {
                    let targetRow = this.fusionTarget.row;
                    let targetCol = this.fusionTarget.col;
                    this.fusionTarget.hp = 0; // kill base plant
                    
                    setTimeout(() => {
                        let newPlant = new Plant(this.game, 'fusion_frostbomb');
                        this.game.board.addPlant(newPlant, targetRow, targetCol);
                    }, 500);
                }
                
                setTimeout(() => { this.hp = 0; }, 500);
                }
            }
        } else if (this.hasTrait('iceshroom')) {"""

content = content.replace(old_end, new_end)
with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

