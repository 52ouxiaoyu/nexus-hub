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
        } else if (type === 'tallnut') {
            this.hp = 8000;
            this.element.src = 'assets/images/Plants/TallNut/TallNut.gif';
            this.yOffset = -20;
        } else if (type === 'puffshroom') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/PuffShroom/PuffShroom.gif';
            this.yOffset = 0;
        } else if (type === 'spikeweed') {
            this.hp = 300; // Can't be eaten by normal zombies usually, but for now 300
            this.element.src = 'assets/images/Plants/Spikeweed/Spikeweed.gif';
            this.yOffset = 25;
            this.damageTimer = 0;
        } else if (type === 'threepeater') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/Threepeater/Threepeater.gif';
            this.yOffset = -15;
        } else if (type === 'garlic') {
            this.hp = 400;
            this.element.src = 'assets/images/Plants/Garlic/Garlic.gif';
            this.yOffset = -10;
        } else if (type === 'fumeshroom') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/FumeShroom/FumeShroom.gif';
        } else if (type === 'sunshroom') {
            this.hp = 300;
            this.sunRate = 24.0;
            this.sunTimer = 0;
            this.element.src = 'assets/images/Plants/SunShroom/SunShroom.gif';
        } else if (type === 'scaredyshroom') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif';
            this.isHiding = false;
        } else if (type === 'iceshroom') {
            this.hp = 300;
            this.explodeTimer = 1.0;
            this.element.src = 'assets/images/Plants/IceShroom/IceShroom.gif';
        } else if (type === 'doomshroom') {
            this.hp = 300;
            this.explodeTimer = 1.0;
            this.element.src = 'assets/images/Plants/DoomShroom/DoomShroom.gif';
        } else if (type === 'splitpea') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/SplitPea/SplitPea.gif';
        } else if (type === 'gatlingpea') {
            this.hp = 300;
            this.fireRate = 1.5;
            this.fireTimer = 0;
            this.element.src = 'assets/images/Plants/GatlingPea/GatlingPea.gif';
        } else if (type === 'twinsunflower') {
            this.hp = 300;
            this.sunRate = 24.0;
            this.sunTimer = 0;
            this.element.src = 'assets/images/Plants/TwinSunflower/TwinSunflower.gif';
        } else if (type === 'torchwood') {
            this.hp = 300;
            this.element.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
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
        
        if (['peashooter', 'snowpea', 'repeater', 'puffshroom', 'threepeater', 'fumeshroom', 'gatlingpea', 'splitpea', 'scaredyshroom'].includes(this.type)) {
            
            // Handle Scaredy-shroom hiding
            if (this.type === 'scaredyshroom') {
                const zombieNear = this.game.entities.some(e => 
                    e instanceof Zombie && e.row === this.row && !e.isDead && e.x - this.x > -40 && e.x - this.x < 120
                );
                if (zombieNear && !this.isHiding) {
                    this.isHiding = true;
                    this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroomSleep.gif';
                    this.yOffset = 15;
                } else if (!zombieNear && this.isHiding) {
                    this.isHiding = false;
                    this.element.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif';
                    this.yOffset = 0;
                }
                if (this.isHiding) return;
            }
            
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {
                const maxRange = this.type === 'puffshroom' || this.type === 'fumeshroom' ? 300 : 9999;
                
                let hasZombieAhead = this.game.entities.some(e => {
                    if (!(e instanceof Zombie) || e.isDead) return false;
                    if (this.type === 'threepeater') {
                        return Math.abs(e.row - this.row) <= 1 && e.x > this.x;
                    } else {
                        return e.row === this.row && e.x > this.x && e.x - this.x <= maxRange;
                    }
                });
                
                let hasZombieBehind = false;
                if (this.type === 'splitpea') {
                    hasZombieBehind = this.game.entities.some(e => 
                        e instanceof Zombie && !e.isDead && e.row === this.row && e.x < this.x
                    );
                }
                
                if (hasZombieAhead || hasZombieBehind) {
                    this.fireTimer = 0;
                    
                    let projType = 'peashooter';
                    if (this.type === 'snowpea') projType = 'snowpea';
                    if (this.type === 'puffshroom') projType = 'puffshroom';
                    if (this.type === 'fumeshroom') projType = 'fumeshroom';
                    
                    if (this.type === 'threepeater' && hasZombieAhead) {
                        for (let dRow = -1; dRow <= 1; dRow++) {
                            const tRow = this.row + dRow;
                            if (tRow >= 0 && tRow < this.game.board.rows) {
                                this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15 + dRow * this.game.board.cellHeight, tRow, projType));
                            }
                        }
                    } else {
                        // Forward shot
                        if (hasZombieAhead) {
                            this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));
                            
                            const repeatCount = this.type === 'gatlingpea' ? 4 : (this.type === 'repeater' ? 2 : 1);
                            for (let i = 1; i < repeatCount; i++) {
                                setTimeout(() => {
                                    if (!this.isDead) {
                                        this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));
                                    }
                                }, 150 * i);
                            }
                        }
                        
                        // Backward shot
                        if (hasZombieBehind && this.type === 'splitpea') {
                            this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, 'backpea'));
                            setTimeout(() => {
                                if (!this.isDead) {
                                    this.game.entities.push(new Projectile(this.game, this.x - 30, this.y - 15, this.row, 'backpea'));
                                }
                            }, 150);
                        }
                    }
                }
            }
        } else if (this.type === 'sunflower' || this.type === 'sunshroom' || this.type === 'twinsunflower') {
            this.sunTimer += deltaTime;
            if (this.sunTimer >= this.sunRate) {
                this.sunTimer = 0;
                const targetY = this.y + 20;
                this.game.entities.push(new Sun(this.game, this.x, this.y - 20, targetY));
                
                if (this.type === 'twinsunflower') {
                    // Spawn a second sun slightly offset
                    setTimeout(() => {
                        if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + 20, this.y - 20, targetY));
                    }, 500);
                }
            }
        } else if (this.type === 'iceshroom') {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {
                this.game.audioManager.play('splat');
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                for (let z of zombies) {
                    z.isSlowed = true;
                    z.slowTimer = 10.0;
                    z.takeDamage(20); // slight damage
                }
                this.hp = 0;
            }
        } else if (this.type === 'doomshroom') {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {
                this.game.audioManager.play('splat');
                this.element.src = 'assets/images/Plants/DoomShroom/Boom.gif'; // Assuming boom exists or just flash
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                for (let z of zombies) {
                    if (Math.abs(z.row - this.row) <= 2 && Math.abs(z.x - this.x) < 300) {
                        z.takeDamage(1800);
                    }
                }
                setTimeout(() => { this.hp = 0; }, 500);
            }
        } else if (this.type === 'wallnut' || this.type === 'tallnut') {
            const maxHp = this.type === 'wallnut' ? 4000 : 8000;
            const path = this.type === 'wallnut' ? 'WallNut' : 'TallNut';
            const name = this.type === 'wallnut' ? 'Wallnut_cracked' : 'TallnutCracked';
            
            if (this.hp < maxHp * 0.33 && this.element.src.indexOf(name + '2') === -1) {
                // this.element.src = `assets/images/Plants/${path}/${name}2.gif`;
            } else if (this.hp < maxHp * 0.66 && this.element.src.indexOf(name + '1') === -1 && this.hp >= maxHp * 0.33) {
                // this.element.src = `assets/images/Plants/${path}/${name}1.gif`;
            }
        } else if (this.type === 'spikeweed') {
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
                    this.state = 'jumping';
                    this.jumpTimer = 0;
                    this.targetZombie = zombie;
                    this.startX = this.x;
                }
            } else if (this.state === 'jumping') {
                this.jumpTimer += deltaTime;
                const jumpDuration = 0.4; // 0.4 seconds jump
                
                if (this.jumpTimer < jumpDuration) {
                    // Parabola jump
                    const progress = this.jumpTimer / jumpDuration; 
                    const jumpY = Math.sin(progress * Math.PI) * 50; // 50px height (reduced so it doesn't visually cross rows)
                    this.yOffset = -25 - jumpY;
                    
                    // Move towards the zombie's X
                    if (this.targetZombie && !this.targetZombie.isDead) {
                        this.x = this.startX + (this.targetZombie.x - this.startX) * progress;
                    }
                    this.element.src = 'assets/images/Plants/Squash/SquashAttack.gif'; 
                } else {
                    this.state = 'crushing';
                    this.yOffset = -25;
                    this.element.style.top = `${this.y + this.yOffset}px`; // Force immediate update
                    this.game.audioManager.play('splat');
                    
                    // Deal damage
                    const zombies = this.game.entities.filter(e => 
                        e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead
                    );
                    for (let z of zombies) {
                        z.takeDamage(1800);
                    }
                    
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
                    e instanceof Zombie && e.row === this.row && e.x > this.x && e.x - this.x < 140 && !e.isDead
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
