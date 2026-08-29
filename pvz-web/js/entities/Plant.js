class Plant extends Entity {
    constructor(game, type) {
        super(game, 0, 0); // Position will be set by Board
        this.type = type;
        this.col = -1; // Set by Board
        
        
        const getStats = (t) => {
            let stat = { hp: 300, yOffset: 0 };
            let type = t;
            if (type === 'peashooter') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Peashooter/Peashooter.gif';
            stat.yOffset = -20; // Offset for GIF centering
        } else if (type === 'sunflower') {
            stat.hp = 300;
            stat.sunRate = 24.0; // Native PVZ is 24 seconds
            stat.sunTimer = 0;
            stat.src = 'assets/images/Plants/SunFlower/SunFlower1.gif';
            stat.yOffset = -20;
        } else if (type === 'wallnut') {
            stat.hp = 4000;
            stat.src = 'assets/images/Plants/WallNut/WallNut.gif';
            stat.yOffset = -15;
        } else if (type === 'cherrybomb') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/CherryBomb/CherryBomb.gif';
            stat.yOffset = -15;
            stat.explodeTimer = 1.0; 
        } else if (type === 'snowpea') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/SnowPea/SnowPea.gif';
            stat.yOffset = -10;
        } else if (type === 'repeater') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Repeater/Repeater.gif';
            stat.yOffset = -10;
        } else if (type === 'squash') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Squash/Squash.gif';
            stat.yOffset = -75;
            stat.state = 'idle'; 
        } else if (type === 'jalapeno') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Jalapeno/Jalapeno.gif';
            stat.yOffset = -25;
            stat.explodeTimer = 1.0;
        } else if (type === 'potatomine') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/PotatoMine/PotatoMineNotReady.gif';
            stat.yOffset = 10;
            stat.armTimer = 15.0; // takes 15s to arm
            stat.isArmed = false;
        } else if (type === 'chomper') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Chomper/Chomper.gif';
            stat.yOffset = -25;
            stat.state = 'idle'; // idle, attacking, chewing
            stat.chewTimer = 0;
        } else if (type === 'tallnut') {
            stat.hp = 8000;
            stat.src = 'assets/images/Plants/TallNut/TallNut.gif';
            stat.yOffset = -20;
        } else if (type === 'puffshroom') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/PuffShroom/PuffShroom.gif';
            stat.yOffset = 0;
        } else if (type === 'spikeweed') {
            stat.hp = 300; // Can't be eaten by normal zombies usually, but for now 300
            stat.src = 'assets/images/Plants/Spikeweed/Spikeweed.gif';
            stat.yOffset = 25;
            stat.damageTimer = 0;
        } else if (type === 'threepeater') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Threepeater/Threepeater.gif';
            stat.yOffset = -15;
        } else if (type === 'garlic') {
            stat.hp = 400;
            stat.src = 'assets/images/Plants/Garlic/Garlic.gif';
            stat.yOffset = -10;
        } else if (type === 'fumeshroom') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/FumeShroom/FumeShroom.gif';
        } else if (type === 'sunshroom') {
            stat.hp = 300;
            stat.sunRate = 24.0;
            stat.sunTimer = 0;
            stat.src = 'assets/images/Plants/SunShroom/SunShroom.gif';
        } else if (type === 'scaredyshroom') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif';
            stat.isHiding = false;
        } else if (type === 'iceshroom') {
            stat.hp = 300;
            stat.explodeTimer = 1.0;
            stat.src = 'assets/images/Plants/IceShroom/IceShroom.gif';
        } else if (type === 'doomshroom') {
            stat.hp = 300;
            stat.explodeTimer = 1.0;
            stat.state = 'idle';
            stat.src = 'assets/images/Plants/DoomShroom/DoomShroom.gif';
        } else if (type === 'splitpea') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/SplitPea/SplitPea.gif';
        } else if (type === 'gatlingpea') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/GatlingPea/GatlingPea.gif';
        } else if (type === 'twinsunflower') {
            stat.hp = 300;
            stat.sunRate = 24.0;
            stat.sunTimer = 0;
            stat.src = 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif';
        } else if (type === 'torchwood') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
        }
        

            return stat;
        };
        

        if (type.startsWith('fusion_')) {
            let p1, p2;
            if (type === 'fusion_peaflower') { p1 = 'peashooter'; p2 = 'sunflower'; }
            else if (type === 'fusion_nutshooter') { p1 = 'peashooter'; p2 = 'wallnut'; }
            else if (type === 'fusion_frostbomb') { p1 = 'snowpea'; p2 = 'cherrybomb'; }
            else if (type === 'fusion_sporemine') { p1 = 'puffshroom'; p2 = 'potatomine'; }
            else if (type === 'fusion_spikynut') { p1 = 'chomper'; p2 = 'wallnut'; }
            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }
            else {
                const parts = type.split('_');
                p1 = parts[1];
                p2 = parts[2];
            }
            this.traits = [p1, p2];

            
            const s1 = getStats(p1);
            const s2 = getStats(p2);
            
            // Assign all s1 properties to initialize timers, etc.
            Object.assign(this, s1);
            
            // Assign all s2 properties that are not set or to combine them
            for (let key in s2) {
                if (key === 'hp') {
                    this.hp = Math.max(s1.hp, s2.hp); // Keep the stronger HP
                } else if (key === 'src' || key === 'yOffset' || key === 'state') {
                    // Do nothing, keep s1's visual/state as base
                } else if (key.includes('Timer')) {
                    // Sum timers if both exist
                    this[key] = (this[key] || 0) + (s2[key] || 0);
                } else if (key === 'fireRate' || key === 'sunRate') {
                    if (this[key] && s2[key]) this[key] = (this[key] + s2[key]) / 2; // Average rate
                    else if (s2[key]) this[key] = s2[key];
                } else {
                    this[key] = s2[key]; // Copy other traits (isArmed, isHiding, etc)
                }
            }
            
            this.element.src = s1.src;
            
            const customImages = {};
            
            if (customImages[type]) {
                // Use custom single sprite!
                this.element.src = customImages[type];
                this.element.style.width = '70px';
                this.element.style.height = '70px';
                this.element.style.objectFit = 'contain';
                this.element.style.transform = 'scale(1.2)';
            } else {
                // Bespoke CSS Assembly for Fusions without custom sprites
                this.fusionOverlay = document.createElement('img');
                this.fusionOverlay.src = s2.src;
                this.fusionOverlay.style.position = 'absolute';
                this.fusionOverlay.style.pointerEvents = 'none';
                this.fusionOverlay.style.zIndex = '1';
                
                if (type === 'fusion_peaflower') {
                    // Sunflower body, Peashooter snout on the face
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Clip out just the Peashooter head/snout (roughly top 40%, right 60%)
                    this.fusionOverlay.style.clipPath = 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)';
                    this.fusionOverlay.style.transform = 'translate(-2px, -8px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_nutshooter') {
                    // Wallnut body, Peashooter snout on the face
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Same clip path for the snout
                    this.fusionOverlay.style.clipPath = 'polygon(30% 0%, 100% 0%, 100% 45%, 30% 45%)';
                    this.fusionOverlay.style.transform = 'translate(10px, 5px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_frostbomb') {
                    this.element.src = s2.src;
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_sporemine') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 50%, 0 50%)';
                    // Puffshroom cap placed exactly on top of Potato mine
                    this.fusionOverlay.style.transform = 'translate(0px, -25px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_spikynut') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 60%, 0 60%)'; 
                    // Chomper head worn as a large hat on Wallnut. Chomper is big, so scale down slightly and move up
                    this.fusionOverlay.style.transform = 'translate(0px, -30px) scale(0.85)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_snownut') {
                    // Wallnut colored ice blue
                    this.element.src = s2.src; // wallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                }
                
                this.game.entityLayer.appendChild(this.fusionOverlay);
            }
            
        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
        }
    }

    hasTrait(trait) {
        if (this.type === trait) return true;
        if (this.traits && this.traits.includes(trait)) return true;
        return false;
    }
    
    update(deltaTime) {

        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        
        if (this.fusionOverlay) {
            this.fusionOverlay.style.left = `${this.x}px`;
            this.fusionOverlay.style.top = `${this.y + this.yOffset}px`;
        }
        
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            if (this.game.board.grid[this.row] && this.game.board.grid[this.row][this.col] === this) {
                this.game.board.grid[this.row][this.col] = null; // Clear from grid
            }
            if (this.fusionOverlay && this.fusionOverlay.parentNode) {
                this.fusionOverlay.parentNode.removeChild(this.fusionOverlay);
            }
            return;
        }
        
        if (this.isDead) return;
        
        if ((this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater') || this.hasTrait('puffshroom') || this.hasTrait('threepeater') || this.hasTrait('fumeshroom') || this.hasTrait('gatlingpea') || this.hasTrait('splitpea') || this.hasTrait('scaredyshroom'))) {
            
            // Handle Scaredy-shroom hiding
            if (this.hasTrait('scaredyshroom')) {
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
            
            if (this.hasTrait('potatomine') && !this.isArmed) return;
            
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {
                const maxRange = (this.hasTrait('puffshroom') || this.hasTrait('fumeshroom')) ? 300 : 9999;
                
                let hasZombieAhead = this.game.entities.some(e => {
                    if (!(e instanceof Zombie) || e.isDead) return false;
                    if (this.hasTrait('threepeater')) {
                        return Math.abs(e.row - this.row) <= 1 && e.x > this.x;
                    } else {
                        return e.row === this.row && e.x > this.x && e.x - this.x <= maxRange;
                    }
                });
                
                let hasZombieBehind = false;
                if (this.hasTrait('splitpea')) {
                    hasZombieBehind = this.game.entities.some(e => 
                        e instanceof Zombie && !e.isDead && e.row === this.row && e.x < this.x
                    );
                }
                
                if (hasZombieAhead || hasZombieBehind) {
                    this.fireTimer = 0;
                    
                    let projType = 'peashooter';
                    if (this.hasTrait('snowpea')) projType = 'snowpea';
                    if (this.hasTrait('puffshroom') || this.hasTrait('scaredyshroom')) projType = 'puffshroom';
                    if (this.hasTrait('fumeshroom')) projType = 'fumeshroom';
                    
                    if (this.hasTrait('threepeater') && hasZombieAhead) {
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
                            
                            const repeatCount = this.hasTrait('gatlingpea') ? 4 : (this.hasTrait('repeater') ? 2 : 1);
                            for (let i = 1; i < repeatCount; i++) {
                                setTimeout(() => {
                                    if (!this.isDead) {
                                        this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));
                                    }
                                }, 150 * i);
                            }
                        }
                        
                        // Backward shot
                        if (hasZombieBehind && this.hasTrait('splitpea')) {
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
        }
        
        if ((this.hasTrait('sunflower') || this.hasTrait('sunshroom') || this.hasTrait('twinsunflower'))) {
            this.sunTimer += deltaTime;
            if (this.sunTimer >= this.sunRate) {
                this.sunTimer = 0;
                const targetY = this.y + 20;
                
                // Hybrid makes small sun
let isHybridSun = this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater');
                let sunValue = isHybridSun ? 15 : 25;
                let sun = new Sun(this.game, this.x, this.y - 20, targetY);
                if (isHybridSun) {
                    sun.value = 15;
                    sun.element.style.transform = 'scale(0.6)';
                }
                this.game.entities.push(sun);
                
                if (this.hasTrait('twinsunflower')) {
                    // Spawn a second sun slightly offset
                    setTimeout(() => {
                        if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + 20, this.y - 20, targetY));
                    }, 500);
                }
            }
        } else if (this.hasTrait('cherrybomb') || this.hasTrait('jalapeno')) {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {
                this.game.audioManager.play('splat'); // Needs explosion sound
                
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                for (let z of zombies) {
                    if (this.hasTrait('cherrybomb') && this.hasTrait('snowpea')) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 100) {
                            z.takeDamage(900); // half damage
                            z.isSlowed = true;
                            z.slowTimer = 10.0;
                        }
                    } else if (this.hasTrait('cherrybomb')) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 150) {
                            z.takeDamage(1800);
                        }
                    } else if (this.hasTrait('jalapeno')) {
                        if (z.row === this.row) {
                            z.takeDamage(1800);
                        }
                    }
                }
                
                if (this.hasTrait('cherrybomb')) {
                    this.element.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                    this.element.style.transform = 'translate(-50%, -50%) scale(1.5)';
                } else {
                    this.element.src = 'assets/images/Plants/Jalapeno/JalapenoAttack.gif';
                    this.element.style.transform = 'translate(-50%, -50%) scaleX(3)';
                }
                
                this.hp = 0;
            }
        } else if (this.hasTrait('iceshroom')) {
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
        } else if (this.hasTrait('doomshroom')) {
            if (this.state === 'idle') {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.state = 'swelling';
                    this.element.src = 'assets/images/Plants/DoomShroom/BeginBoom.gif';
                    this.game.audioManager.play('plant'); // some sound
                    setTimeout(() => {
                        this.state = 'exploding';
                        this.game.audioManager.play('splat'); // ideally an explosion sound
                        this.element.src = 'assets/images/Plants/DoomShroom/Boom.png';
                        this.element.style.zIndex = 3000; // Put boom on top
                        this.element.style.transform = 'translate(-50%, -80%)'; // Move boom up a bit
                        
                        // Deal damage
                        const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead);
                        for (let z of zombies) {
                            z.takeDamage(9999); // Full screen nuke
                        }
                        
                        setTimeout(() => {
                            this.type = 'crater';
                            this.element.src = 'assets/images/Plants/DoomShroom/crater11.png';
                            this.element.style.zIndex = 10; // crater stays on bottom
                            this.element.style.transform = 'translate(-50%, -50%)'; // Reset transform
                            
                            // We can just leave the crater visual indefinitely, or kill it after a long time
                            setTimeout(() => { this.hp = 0; }, 30000); // 30 seconds crater
                        }, 1000); // Boom lasts 1 sec
                    }, 1000); // Swell lasts 1 sec
                }
            }
        } else if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {
            const maxHp = this.hasTrait('wallnut') ? 4000 : 8000;
            const path = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            const name = this.hasTrait('wallnut') ? 'Wallnut_cracked' : 'TallnutCracked';
            
            if (this.hp < maxHp * 0.33 && this.element.src.indexOf(name + '2') === -1) {
                this.element.src = `assets/images/Plants/${path}/${name}2.gif`;
            } else if (this.hp < maxHp * 0.66 && this.element.src.indexOf(name + '1') === -1 && this.hp >= maxHp * 0.33) {
                this.element.src = `assets/images/Plants/${path}/${name}1.gif`;
            }
        } else if (this.hasTrait('spikeweed')) {
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
        } else if (this.hasTrait('cherrybomb')) {
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
            }
        } else if (this.hasTrait('squash')) {
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
        } else if (this.hasTrait('potatomine')) {
            if (!this.isArmed) {
                this.armTimer -= deltaTime;
                if (this.armTimer <= 0) {
                    this.isArmed = true;
                    this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine.gif';
                }
            } else if (!this.hasExploded) {
                const zombieNear = this.game.entities.some(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 40 && !e.isDead
                );
                if (zombieNear) {
                    this.hasExploded = true; // Prevent multiple triggers
                    this.game.audioManager.play('splat'); // Needs potatomine sound
                    
                    // Damage all zombies in a small radius
                    const zombies = this.game.entities.filter(e => 
                        e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead
                    );
                    for (let z of zombies) {
                        z.takeDamage(1800);
                    }
                    
                    this.element.src = 'assets/images/Plants/PotatoMine/ExplosionSpudow.gif';
                    this.element.style.zIndex = 3000;
                    setTimeout(() => {
                        this.element.src = 'assets/images/Plants/PotatoMine/PotatoMine_mashed.gif';
                        this.element.style.zIndex = 10;
                    }, 500); // SPUDOW lasts half a second
                    setTimeout(() => { this.hp = 0; }, 2000); // Leave mashed sprite for a bit
                }
            }
        } else if (this.hasTrait('chomper')) {
            if (this.state === 'idle') {
                const zombieNear = this.game.entities.find(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 140 && !e.isDead && e.type !== 'crater'
                );
                if (zombieNear) {
                    this.state = 'biting';
                    this.chewTimer = 0.5; // half second bite animation
                    zombieNear.hp = 0; // instant kill
                    this.element.src = 'assets/images/Plants/Chomper/ChomperAttack.gif';
                    this.game.audioManager.play('chomp');
                }
            } else if (this.state === 'biting') {
                this.chewTimer -= deltaTime;
                if (this.chewTimer <= 0) {
                    this.state = 'chewing';
                    this.chewTimer = 40.0; // 40 seconds chew
                    this.element.src = 'assets/images/Plants/Chomper/ChomperDigest.gif';
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
