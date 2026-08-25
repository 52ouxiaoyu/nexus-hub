class Plant extends Entity {
    constructor(game, type) {
        super(game, 0, 0); // Position will be set by Board
        this.type = type;
        this.col = -1; // Set by Board
        
        if (type === 'peashooter') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/Peashooter/Peashooter.gif';
            this.yOffset = -20; // Offset for GIF centering
        } else if (type === 'sunflower') {
            this.hp = 300;
            this.sunRate = 24.0; // Native PVZ is 24 seconds
            this.sunTimer = 0;
            this.element.src = 'assets/images/Plants/SunFlower/SunFlower1.gif';
            this.yOffset = -20;
        } else if (type === 'wallnut') {
            this.hp = 4000;
            this.element.src = 'assets/images/Plants/WallNut/WallNut.gif';
            this.yOffset = -15;
        } else if (type === 'cherrybomb') {
            this.hp = 300;
            this.element.src = 'assets/images/Plants/CherryBomb/CherryBomb.gif';
            this.yOffset = -15;
            this.explodeTimer = 1.0; 
        } else if (type === 'snowpea') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/SnowPea/SnowPea.gif';
            this.yOffset = -10;
        } else if (type === 'repeater') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/Repeater/Repeater.gif';
            this.yOffset = -10;
        } else if (type === 'squash') {
            this.hp = 300;
            this.element.src = 'assets/images/Plants/Squash/Squash.gif';
            this.yOffset = -25;
            this.state = 'idle'; 
        } else if (type === 'jalapeno') {
            this.hp = 300;
            this.element.src = 'assets/images/Plants/Jalapeno/Jalapeno.gif';
            this.yOffset = -25;
            this.explodeTimer = 1.0;
        } else if (type === 'potatomine') {
            this.hp = 300;
            this.element.src = 'assets/images/Plants/PotatoMine/PotatoMineNotReady.gif';
            this.yOffset = 10;
            this.armTimer = 15.0; // takes 15s to arm
            this.isArmed = false;
        } else if (type === 'chomper') {
            this.hp = 300;
            this.element.src = 'assets/images/Plants/Chomper/Chomper.gif';
            this.yOffset = -25;
            this.state = 'idle'; // idle, attacking, chewing
            this.chewTimer = 0;
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            this.game.board.grid[this.row][this.col] = null; // Clear from grid
            return;
        }
        
        if (this.isDead) return;
        
        if (this.type === 'peashooter' || this.type === 'snowpea' || this.type === 'repeater') {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {
                const hasZombieAhead = this.game.entities.some(e => 
                    e instanceof Zombie && 
                    e.row === this.row && 
                    e.x > this.x && 
                    !e.isDead
                );
                
                if (hasZombieAhead) {
                    this.fireTimer = 0;
                    const projType = this.type === 'snowpea' ? 'snowpea' : 'peashooter';
                    this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));
                    
                    if (this.type === 'repeater') {
                        // Fire second pea with a slight delay
                        setTimeout(() => {
                            if (!this.isDead) {
                                this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));
                            }
                        }, 150);
                    }
                }
            }
        } else if (this.type === 'sunflower') {
            this.sunTimer += deltaTime;
            if (this.sunTimer >= this.sunRate) {
                this.sunTimer = 0;
                const targetY = this.y + 20;
                this.game.entities.push(new Sun(this.game, this.x, this.y - 20, targetY));
            }
        } else if (this.type === 'wallnut') {
            if (this.hp < 1333 && this.element.src.indexOf('Wallnut_cracked2') === -1) {
                // Not perfectly smooth without proper preloading, but works
                // this.element.src = 'assets/images/Plants/WallNut/Wallnut_cracked2.gif';
            } else if (this.hp < 2666 && this.element.src.indexOf('Wallnut_cracked1') === -1 && this.hp >= 1333) {
                // this.element.src = 'assets/images/Plants/WallNut/Wallnut_cracked1.gif';
            }
        } else if (this.type === 'cherrybomb') {
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
                    
                    setTimeout(() => {
                        this.hp = 0; 
                    }, 500); 
                }
            }
        } else if (this.type === 'jalapeno') {
            if (this.explodeTimer > 0) {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.game.audioManager.play('splat');
                    this.element.src = 'assets/images/Plants/Jalapeno/JalapenoAttack.gif'; // Or a fire row image
                    
                    const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                    for (let z of zombies) {
                        if (z.row === this.row) {
                            z.takeDamage(1800);
                        }
                    }
                    
                    setTimeout(() => { this.hp = 0; }, 500);
                }
            }
        } else if (this.type === 'squash') {
            if (this.state === 'idle') {
                const zombie = this.game.entities.find(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead
                );
                if (zombie) {
                    this.state = 'attacking';
                    this.element.src = 'assets/images/Plants/Squash/SquashAttack.gif';
                    this.game.audioManager.play('splat');
                    zombie.takeDamage(1800);
                    setTimeout(() => { this.hp = 0; }, 500);
                }
            }
        } else if (this.type === 'potatomine') {
            if (!this.isArmed) {
                this.armTimer -= deltaTime;
                if (this.armTimer <= 0) {
                    this.isArmed = true;
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                }
            } else {
                const zombie = this.game.entities.find(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 40 && !e.isDead
                );
                if (zombie) {
                    this.game.audioManager.play('splat');
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine_mashed.gif';
                    zombie.takeDamage(1800);
                    setTimeout(() => { this.hp = 0; }, 500);
                }
            }
        } else if (this.type === 'chomper') {
            if (this.state === 'idle') {
                const zombie = this.game.entities.find(e => 
                    e instanceof Zombie && e.row === this.row && e.x > this.x && e.x - this.x < 80 && !e.isDead
                );
                if (zombie) {
                    zombie.takeDamage(1800);
                    this.state = 'chewing';
                    this.chewTimer = 40.0;
                    this.element.src = 'assets/images/Plants/Chomper/ChomperDigest.gif';
                    this.game.audioManager.play('chomp');
                }
            } else if (this.state === 'chewing') {
                this.chewTimer -= deltaTime;
                if (this.chewTimer <= 0) {
                    this.state = 'idle';
                    this.element.src = 'assets/images/Plants/Chomper/Chomper.gif';
                }
            }
        }
    }
}
