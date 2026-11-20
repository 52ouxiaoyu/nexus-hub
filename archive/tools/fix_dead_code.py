import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Delete the dead block completely
dead_block = """        } else if (this.hasTrait('cherrybomb')) {
            if (this.explodeTimer > 0) {
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
            }
        } else if (this.hasTrait('jalapeno')) {
            if (this.explodeTimer > 0) {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.game.audioManager.play('splat');
                    this.element.src = 'assets/images/Plants/Jalapeno/JalapenoAttack.gif'; 
                    this.x = 450; // Center the fire on the board
                    this.element.style.left = '450px';
                    
                    const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                    for (let z of zombies) {
                        if (z.row === this.row) {
                            z.takeDamage(1800);
                        }
                    }
                    
                    setTimeout(() => { this.hp = 0; }, 500);
                }
            }"""

content = content.replace(dead_block, "")

# Now inject the fusion target logic into the real cherrybomb block
real_block = """                if (this.hasTrait('cherrybomb')) {
                    this.element.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                    this.element.style.transform = 'translate(-50%, -50%) scale(1.5)';
                } else {
                    this.element.src = 'assets/images/Plants/Jalapeno/JalapenoAttack.gif';
                    this.element.style.transform = 'translate(-50%, -50%) scaleX(3)';
                }
                
                this.hp = 0;"""

new_real_block = """                if (this.hasTrait('cherrybomb')) {
                    this.element.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                    this.element.style.transform = 'translate(-50%, -50%) scale(1.5)';
                } else {
                    this.element.src = 'assets/images/Plants/Jalapeno/JalapenoAttack.gif';
                    this.element.style.transform = 'translate(-50%, -50%) scaleX(3)';
                }
                
                if (this.fusionTarget && !this.fusionTarget.isDead) {
                    let targetRow = this.fusionTarget.row;
                    let targetCol = this.fusionTarget.col;
                    this.fusionTarget.hp = 0; // kill base plant
                    
                    // Spawn Frost Bomb immediately so it starts its timer
                    let newPlant = new Plant(this.game, 'fusion_frostbomb');
                    this.game.board.addPlant(newPlant, targetRow, targetCol);
                }
                
                this.hp = 0;"""

content = content.replace(real_block, new_real_block)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

