import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_explode = """            if (this.explodeTimer > 0) {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.game.audioManager.play('splat'); 
                    this.element.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                    
                    const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                    for (let z of zombies) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 150) {
                            z.takeDamage(1800);
                        }
                    }
                    
                    setTimeout(() => {
                        this.hp = 0; 
                    }, 500); 
                }
            }"""

new_explode = """            if (this.explodeTimer > 0) {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.game.audioManager.play('splat'); 
                    this.element.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                    
                    const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                    for (let z of zombies) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 150) {
                            z.takeDamage(1800);
                        }
                    }
                    
                    if (this.fusionTarget && !this.fusionTarget.isDead) {
                        // Produce the fusion plant when the bomb explodes!
                        let targetRow = this.fusionTarget.row;
                        let targetCol = this.fusionTarget.col;
                        this.fusionTarget.hp = 0; // kill base plant
                        
                        // Wait for the boom visual to disappear before showing the new plant?
                        // Or show it immediately. Let's show it after a tiny delay so it feels like it emerged from the blast.
                        setTimeout(() => {
                            let newPlant = new Plant(this.game, 'fusion_frostbomb');
                            this.game.board.addPlant(newPlant, targetRow, targetCol);
                        }, 500);
                    }
                    
                    setTimeout(() => {
                        this.hp = 0; 
                    }, 500); 
                }
            }"""

content = content.replace(old_explode, new_explode)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

