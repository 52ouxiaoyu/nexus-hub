import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_fusion_explode = """                    if (this.fusionTarget && !this.fusionTarget.isDead) {
                        let targetRow = this.fusionTarget.row;
                        let targetCol = this.fusionTarget.col;
                        this.fusionTarget.hp = 0; // kill base plant
                        
                        setTimeout(() => {
                            let newPlant = new Plant(this.game, 'fusion_frostbomb');
                            this.game.board.addPlant(newPlant, targetRow, targetCol);
                        }, 500);
                    }"""

new_fusion_explode = """                    if (this.fusionTarget && !this.fusionTarget.isDead) {
                        let targetRow = this.fusionTarget.row;
                        let targetCol = this.fusionTarget.col;
                        let fusionResult = null;
                        
                        if (this.type === 'cherrybomb' && this.fusionTarget.type === 'snowpea') fusionResult = 'fusion_frostbomb';
                        else if (this.type === 'cherrybomb' && this.fusionTarget.type === 'peashooter') fusionResult = 'fusion_cherry_peashooter';
                        else if (this.type === 'doomshroom' && this.fusionTarget.type === 'sunflower') fusionResult = 'fusion_doom_sunflower';
                        
                        this.fusionTarget.hp = 0; // kill base plant
                        
                        if (fusionResult) {
                            setTimeout(() => {
                                let newPlant = new Plant(this.game, fusionResult);
                                this.game.board.addPlant(newPlant, targetRow, targetCol);
                            }, 500);
                        }
                    }"""

content = content.replace(old_fusion_explode, new_fusion_explode)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

