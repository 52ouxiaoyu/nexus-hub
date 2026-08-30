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
        } else if (type === 'gloomshroom') {
            stat.hp = 300;
            stat.fireRate = 1.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/GloomShroom/GloomShroom.gif';
            stat.yOffset = -10;
        } else if (type === 'spikerock') {
            stat.hp = 1200;
            stat.src = 'assets/images/Plants/Spikerock/Spikerock.gif';
            stat.yOffset = 20;
        } else if (type === 'sunshroom') {
            stat.hp = 300;
            stat.sunRate = 24.0;
            stat.sunTimer = 0;
            stat.src = 'assets/images/Plants/SunShroom/SunShroom.gif';
            stat.growthTimer = 0;
            stat.sunCountDrop = 1;
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
        } else if (type === 'cattail') {
            stat.hp = 300;
            stat.fireRate = 0.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Cattail/Cattail.gif';
            stat.yOffset = -20;
        } else if (type === 'torchwood') {
            stat.hp = 300;
            stat.src = 'assets/images/Plants/Torchwood/Torchwood.gif';
        } else if (type === 'melonpult') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/MelonPult/MelonPult.gif?v=1788042000';
        } else if (type === 'wintermelon') {
            stat.hp = 300;
            stat.fireRate = 1.0;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/WinterMelon/WinterMelon.gif?v=1788042000';
        }
        

            return stat;
        };
        

        if (type.startsWith('fusion_')) {
            let p1, p2;
            if (type === 'fusion_peaflower') { p1 = 'peashooter'; p2 = 'sunflower'; }
            else if (type === 'fusion_nutshooter') { p1 = 'peashooter'; p2 = 'wallnut'; }
            else if (type === 'fusion_frostbomb') { p1 = 'snowpea'; p2 = 'cherrybomb'; }
            else if (type === 'fusion_sporemine') { p1 = 'puffshroom'; p2 = 'potatomine'; }
            else if (type === 'fusion_spikynut') { p1 = 'spikeweed'; p2 = 'wallnut'; }
            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }
            else if (type === 'fusion_melon_cattail') { p1 = 'melonpult'; p2 = 'cattail'; }
            else if (type === 'fusion_wintermelon_cattail') { p1 = 'wintermelon'; p2 = 'cattail'; }
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
                if (s2.src) {
                    this.fusionOverlay = document.createElement('img');
                    this.fusionOverlay.src = s2.src;
                    this.fusionOverlay.style.position = 'absolute';
                    this.fusionOverlay.style.pointerEvents = 'none';
                    this.fusionOverlay.style.zIndex = '1';
                }
                
                if (type === 'fusion_peaflower') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Keep the entire Peashooter head (remove just the stem)
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 65%, 0 65%)';
                    this.fusionOverlay.style.transform = 'translate(0px, -20px) scale(1.0)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_nutshooter') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    // Keep the entire Peashooter head
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 65%, 0 65%)';
                    this.fusionOverlay.style.transform = 'translate(5px, -15px) scale(1.0)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_frostbomb') {
                    this.element.src = s2.src;
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_sporemine') {
                    this.element.src = s2.src;
                    this.fusionOverlay.src = s1.src;
                    this.fusionOverlay.style.clipPath = 'polygon(0 0, 100% 0, 100% 85%, 0 85%)'; // Show the face!
                    this.fusionOverlay.style.transform = 'translate(0px, -30px) scale(0.9)';
                    this.fusionOverlay.style.transformOrigin = 'center center';
                } else if (type === 'fusion_spikynut') {
                    this.yOffset = s2.yOffset; // use wallnut's offset for the main body
                    this.element.src = s2.src; // wallnut
                    this.fusionOverlay.src = s1.src; // spikeweed
                    this.fusionOverlay.style.clipPath = 'none'; // show full spikeweed
                    // Spikeweed needs to be placed at the bottom of the wallnut
                    // Wallnut is at -15, Spikeweed normally at 25. Difference is 40.
                    this.fusionOverlay.style.transform = 'translate(0px, 40px)';
                } else if (type === 'fusion_spikerock_tallnut') {
                    this.yOffset = s2.yOffset; // use tallnut's offset
                    this.element.src = s2.src; // tallnut
                    this.fusionOverlay.src = s1.src; // spikerock
                    this.fusionOverlay.style.clipPath = 'none'; // show full spikerock
                    // Tallnut is at -20, Spikerock normally at 20. Difference is 40.
                    this.fusionOverlay.style.transform = 'translate(0px, 40px)';
                } else if (type === 'fusion_snownut') {
                    // Wallnut colored ice blue
                    this.element.src = s2.src; // wallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                } else if (type === 'fusion_cherrybomb_peashooter') {
                    this.element.src = s2.src; // peashooter
                    this.element.style.filter = 'hue-rotate(-45deg) saturate(2.0)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_doomshroom_sunflower') {
                    this.element.src = s2.src; // sunflower
                    this.element.style.filter = 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)';
                    this.fusionOverlay.style.display = 'none';
                } else if (type === 'fusion_melon_cattail' || type === 'fusion_wintermelon_cattail') {
                    this.element.src = s2.src; // cattail
                    this.fusionOverlay.src = s1.src; // melon
                    this.fusionOverlay.style.clipPath = 'none';
                    this.fusionOverlay.style.transform = 'translate(-5px, -30px) scale(0.7)'; // put on top of cattail head
                }
                
                this.game.entityLayer.appendChild(this.fusionOverlay);
            }
            
        } else {
            this.traits = [type];
            const s = getStats(type);
            Object.assign(this, s);
            this.element.src = s.src;
        }
        this.maxHp = this.hp;
    }

    hasTrait(trait) {
        if (this.type === trait) return true;
        if (this.traits && this.traits.includes(trait)) return true;
        return false;
    }
    
    triggerBombFusion() {
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
                    try {
                        const fusionResult = this.game.getFusionResult(this.type, targetPlant.type);
                        if (fusionResult) {
                            targetPlant.hp = 0;
                            this.game.board.grid[pos.row][pos.col] = null;
                            let newPlant = new Plant(this.game, fusionResult);
                            this.game.board.addPlant(newPlant, pos.row, pos.col);
                            this.game.showAnnouncement(`爆炸融合成功：${this.game.getPlantName(fusionResult)}!`, '#ff00ff');
                        }
                    } catch (e) {
                        console.error("Fusion error", e);
                    }
                }
            }
        }
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
            
            if (this.type === 'fusion_cherrybomb_peashooter' || this.type === 'fusion_doomshroom_sunflower') {
                let boom = document.createElement('img');
                boom.src = 'assets/images/Plants/CherryBomb/Boom.gif';
                if (this.type === 'fusion_doomshroom_sunflower') {
                    boom.style.filter = 'hue-rotate(270deg) invert(1)';
                    for (let zombie of this.game.zombies) {
                        if (Math.abs(zombie.col - this.col) <= 2 && Math.abs(zombie.row - this.row) <= 2) {
                            zombie.takeDamage(1800);
                        }
                    }
                } else {
                    for (let zombie of this.game.zombies) {
                        if (Math.abs(zombie.col - this.col) <= 1 && Math.abs(zombie.row - this.row) <= 1) {
                            zombie.takeDamage(1800);
                        }
                    }
                }
                boom.style.position = 'absolute';
                boom.style.left = (this.element.offsetLeft - 80) + 'px';
                boom.style.top = (this.element.offsetTop - 80) + 'px';
                boom.style.zIndex = '100';
                this.game.container.appendChild(boom);
                setTimeout(() => boom.remove(), 1000);
            }
            
            if (this.game.board.grid[this.row] && this.game.board.grid[this.row][this.col] === this) {
                this.game.board.grid[this.row][this.col] = null; // Clear from grid
            }
            if (this.fusionOverlay && this.fusionOverlay.parentNode) {
                this.fusionOverlay.parentNode.removeChild(this.fusionOverlay);
            }
            if (this.ladderOverlay && this.ladderOverlay.parentNode) {
                this.ladderOverlay.parentNode.removeChild(this.ladderOverlay);
            }
            return;
        }
        
        if (this.isDead) return;
        
        if ((this.hasTrait('peashooter') || this.hasTrait('snowpea') || this.hasTrait('repeater') || this.hasTrait('puffshroom') || this.hasTrait('threepeater') || this.hasTrait('fumeshroom') || this.hasTrait('gatlingpea') || this.hasTrait('splitpea') || this.hasTrait('scaredyshroom') || this.hasTrait('melonpult') || this.hasTrait('wintermelon') || this.hasTrait('cattail'))) {
            
            // Handle Scaredy-shroom hiding
            if (this.hasTrait('scaredyshroom')) {
                const zombieNear = this.game.entities.some(e => 
                    e instanceof Zombie && e.row === this.row && !e.isDead && e.state !== 'DYING' && e.x - this.x > -40 && e.x - this.x < 120
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
            }
            
            let skipShooting = false;
            if (this.hasTrait('scaredyshroom') && this.isHiding) skipShooting = true;
            if (this.hasTrait('potatomine') && !this.isArmed) skipShooting = true;
            
            if (!skipShooting) {
                this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireRate) {
                const maxRange = (this.hasTrait('puffshroom') || this.hasTrait('fumeshroom')) ? 300 : 9999;
                
                let hasZombieAhead = this.game.entities.some(e => {
                    if (!(e instanceof Zombie) || e.isDead || e.state === 'DYING') return false;
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
                
                let cattailTarget = null;
                if (this.hasTrait('cattail')) {
                    cattailTarget = this.game.entities.find(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
                }
                
                if (hasZombieAhead || hasZombieBehind || cattailTarget) {
                    this.fireTimer = 0;
                    
                    let projType = 'peashooter';
                    if (this.hasTrait('snowpea')) projType = 'snowpea';
                    if (this.hasTrait('puffshroom')) projType = 'puffshroom';
                    if (this.hasTrait('scaredyshroom')) projType = 'scaredyshroom';
                    if (this.hasTrait('fumeshroom')) projType = 'fumeshroom';
                    if (this.hasTrait('melonpult')) projType = 'melon';
                    if (this.hasTrait('wintermelon')) projType = 'wintermelon';
                    if (this.hasTrait('cattail')) {
                         if (this.hasTrait('wintermelon')) projType = 'cattail_wintermelon';
                         else if (this.hasTrait('melonpult')) projType = 'cattail_melon';
                         else projType = 'cattail';
                    }
                    
                    if (this.hasTrait('threepeater') && hasZombieAhead) {
                        for (let dRow = -1; dRow <= 1; dRow++) {
                            const tRow = this.row + dRow;
                            if (tRow >= 0 && tRow < this.game.board.rows) {
                                this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15 + dRow * this.game.board.cellHeight, tRow, projType));
                            }
                        }
                    } else {
                        // Forward shot
                        if (hasZombieAhead || cattailTarget) {
                            let target = this.hasTrait('cattail') ? cattailTarget : null;
                            this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType, target));
                            
                            const repeatCount = this.hasTrait('gatlingpea') ? 4 : ((this.hasTrait('repeater') || this.hasTrait('cattail')) ? 2 : 1);
                            for (let i = 1; i < repeatCount; i++) {
                                setTimeout(() => {
                                    if (!this.isDead) {
                                        this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType, target));
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
            }
        
        if (this.hasTrait('sunshroom')) {
            this.growthTimer += deltaTime;
            if (this.growthTimer >= 10.0 && this.sunCountDrop < 4) {
                this.sunCountDrop++;
                this.growthTimer = 0;
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
                sun.value = sunValue;
                if (isHybridSun) {
                    sun.element.style.transform = 'scale(0.6)';
                }
                this.game.entities.push(sun);
                
                if (this.hasTrait('twinsunflower')) {
                    // Spawn a second sun slightly offset
                    setTimeout(() => {
                        if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + 20, this.y - 20, targetY));
                    }, 500);
                }
                
                if (this.hasTrait('sunshroom') && this.sunCountDrop > 1) {
                    for (let i = 1; i < this.sunCountDrop; i++) {
                        setTimeout(() => {
                            if (!this.isDead) this.game.entities.push(new Sun(this.game, this.x + (Math.random()*40-20), this.y - 20, targetY));
                        }, i * 300);
                    }
                }
            }
        } else if (this.hasTrait('cherrybomb') || this.hasTrait('jalapeno')) {
            if (!this.hasExploded) {
                this.explodeTimer -= deltaTime;
                if (this.explodeTimer <= 0) {
                    this.hasExploded = true;
                this.game.audioManager.play('splat');
                this.triggerBombFusion();
                
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
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
                
                setTimeout(() => { this.hp = 0; }, 500);
                }
            }
        } else if (this.hasTrait('iceshroom')) {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {
                this.game.audioManager.play('splat');
                this.triggerBombFusion();
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
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
                        this.game.audioManager.play('splat');
                        this.triggerBombFusion();
                        this.element.src = 'assets/images/Plants/DoomShroom/Boom.png';
                        this.element.style.zIndex = 3000; // Put boom on top
                        this.element.style.transform = 'translate(-50%, -80%)'; // Move boom up a bit
                        
                        // Deal damage
                        const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
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
        }
        
        if (this.hasTrait('wallnut') || this.hasTrait('tallnut')) {
            const maxHp = this.maxHp || (this.hasTrait('wallnut') ? 4000 : 8000);
            const path = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            const name = this.hasTrait('wallnut') ? 'Wallnut_cracked' : 'TallnutCracked';
            const baseName = this.hasTrait('wallnut') ? 'WallNut' : 'TallNut';
            
            // Determine which image element represents the nut (main element or overlay)
            let targetImg = this.element;
            if (this.fusionOverlay && (this.fusionOverlay.src.indexOf('WallNut') !== -1 || this.fusionOverlay.src.indexOf('TallNut') !== -1 || this.fusionOverlay.src.indexOf('cracked') !== -1)) {
                targetImg = this.fusionOverlay;
            } else if (this.element.src.indexOf('WallNut') === -1 && this.element.src.indexOf('TallNut') === -1 && this.element.src.indexOf('cracked') === -1) {
                // In some fusions, neither might be a nut natively (rare), but fallback to element
                targetImg = this.element;
            }
            
            if (this.hp < maxHp * 0.33) {
                if (targetImg.src.indexOf(name + '2') === -1) {
                    targetImg.src = `assets/images/Plants/${path}/${name}2.gif`;
                }
            } else if (this.hp < maxHp * 0.66) {
                if (targetImg.src.indexOf(name + '1') === -1) {
                    targetImg.src = `assets/images/Plants/${path}/${name}1.gif`;
                }
            } else {
                if (targetImg.src.indexOf(name) !== -1) { 
                    targetImg.src = `assets/images/Plants/${path}/${baseName}.gif`;
                }
            }
        }
        
        if (this.hasTrait('spikeweed') || this.hasTrait('spikerock')) {
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
        }
        
        if (this.hasTrait('gloomshroom')) {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= 1.5) {
                const zombies = this.game.entities.filter(e => 
                    e instanceof Zombie && !e.isDead && e.state !== 'DYING' && Math.abs(e.row - this.row) <= 1 && Math.abs(e.x - this.x) <= 150
                );
                if (zombies.length > 0) {
                    this.fireTimer = 0;
                    this.game.audioManager.play('splat');
                    // Spawn 8 projectiles in all directions
                    const dirs = [
                        {vx: 1, vy: 0}, {vx: 1, vy: 1}, {vx: 0, vy: 1}, {vx: -1, vy: 1},
                        {vx: -1, vy: 0}, {vx: -1, vy: -1}, {vx: 0, vy: -1}, {vx: 1, vy: -1}
                    ];
                    for (let d of dirs) {
                        const len = Math.sqrt(d.vx*d.vx + d.vy*d.vy);
                        const p = new Projectile(this.game, this.x + 10, this.y - 15, this.row, 'gloom_puff', null, d.vx/len, d.vy/len);
                        p.maxDistance = 150;
                        this.game.entities.push(p);
                    }
                }
            }

        } else if (this.hasTrait('squash')) {
            if (this.state === 'idle') {
                const zombie = this.game.entities.find(e => 
                    e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead && e.state !== 'DYING'
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
                        e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead && e.state !== 'DYING'
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
                    if (this.type === 'fusion_sporemine' && this.fusionOverlay) {
                        this.fusionOverlay.style.transform = 'translate(0px, -45px) scale(0.9)';
                    }
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
                        e instanceof Zombie && e.row === this.row && Math.abs(e.x - this.x) < 60 && !e.isDead && e.state !== 'DYING'
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
