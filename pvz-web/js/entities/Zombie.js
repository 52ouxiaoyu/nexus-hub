class Zombie extends Entity {
    constructor(game, row, type = 'normal') {
        const x = 950;
        const y = game.board.offsetY + row * game.board.cellHeight + game.board.cellHeight / 2 - 20;
        super(game, x, y);
        this.row = row;
        this.type = type;
        
        this.speed = 20; 
        this.damage = 50; 
        this.state = 'WALKING';
        this.eatTarget = null;
        this.yOffset = -30;
        
        this.isSlowed = false;
        this.slowTimer = 0;
        this.immuneSlow = false; // planthead snowpea zombies ignore freezing
        this.hasPlantHead = false;
        
        if (type === 'normal') {
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'flag') {
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/FlagZombie/FlagZombie.gif';
            this.walkSrc = 'assets/images/Zombies/FlagZombie/FlagZombie.gif';
            this.attackSrc = 'assets/images/Zombies/FlagZombie/FlagZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'peahead' || type === 'nuthead' || type === 'sunhead' || type === 'snowpeahead') {
            // === 植物头僵尸（仅融合进化模式刷出）===
            // 头顶的基础植物不是融合植物，而是像路障/铁桶一样的"装甲"：
            // 破甲（头被打掉）后植物头飞落，露出普通僵尸本体。
            // peahead=豌豆头(中甲) nuthead=坚果头(重甲慢) sunhead=向日葵头(死后掉阳光) snowpeahead=寒冰头(免疫减速)
            const headCfg = {
                peahead:     { hp: 560, speed: 20, headSrc: 'assets/images/Plants/Peashooter/Peashooter.gif', headSize: 56, breakHp: 200 },
                nuthead:     { hp: 1300, speed: 15, headSrc: 'assets/images/Plants/WallNut/WallNut.gif',      headSize: 64, breakHp: 200 },
                sunhead:     { hp: 320, speed: 20, headSrc: 'assets/images/Plants/SunFlower/SunFlower1.gif',  headSize: 62, breakHp: 150 },
                snowpeahead: { hp: 420, speed: 26, headSrc: 'assets/images/Plants/SnowPea/SnowPea.gif',       headSize: 58, breakHp: 150 }
            }[type];
            this.hp = headCfg.hp; this.maxHp = this.hp;
            this.speed = headCfg.speed;
            this.headBreakHp = headCfg.breakHp;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            if (type === 'snowpeahead') this.immuneSlow = true; // 寒冰射手头：不惧冰冻
            this.createPlantHead(headCfg.headSrc, headCfg.headSize); // 头上顶一颗基础植物
        } else if (type === 'conehead') {
            this.hp = 560; this.maxHp = 560;
            this.element.src = 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ConeheadZombie/ConeheadZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'buckethead') {
            this.hp = 1300; this.maxHp = 1300;
            this.element.src = 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif';
            this.walkSrc = 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif';
            this.attackSrc = 'assets/images/Zombies/BucketheadZombie/BucketheadZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'polevaulting') {
            this.hp = 500; this.maxHp = 500;
            this.speed = 45; // Fast initially
            this.hasVaulted = false;
            this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.walkSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.attackSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieDie.gif';
            this.yOffset = -50;
        } else if (type === 'newspaper') {
            this.hp = 300; this.maxHp = 300;
            this.element.src = 'assets/images/Zombies/NewspaperZombie/HeadWalk1.gif';
            this.walkSrc = 'assets/images/Zombies/NewspaperZombie/HeadWalk1.gif';
            this.attackSrc = 'assets/images/Zombies/NewspaperZombie/HeadAttack1.gif';
            this.dieSrc = 'assets/images/Zombies/NewspaperZombie/Die.gif';
            this.hasLostNewspaper = false;
        } else if (type === 'screendoor') {
            this.hp = 1300; this.maxHp = 1300;
            this.element.src = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'football') {
            this.hp = 1600; this.maxHp = 1600;
            this.speed = 40; 
            this.element.src = 'assets/images/Zombies/FootballZombie/FootballZombie.gif';
            this.walkSrc = 'assets/images/Zombies/FootballZombie/FootballZombie.gif';
            this.attackSrc = 'assets/images/Zombies/FootballZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/FootballZombie/Die.gif';
        } else if (type === 'dancing') {
            this.hp = 500; this.maxHp = 500;
            this.summonTimer = 5.0; // Summons backups periodically
            this.element.src = 'assets/images/Zombies/DancingZombie/DancingZombie.gif';
            this.walkSrc = 'assets/images/Zombies/DancingZombie/DancingZombie.gif';
            this.attackSrc = 'assets/images/Zombies/DancingZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/DancingZombie/Die.gif';
            this.yOffset = -40;
        } else if (type === 'backup') {
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/BackupDancer/BackupDancer.gif';
            this.walkSrc = 'assets/images/Zombies/BackupDancer/BackupDancer.gif';
            this.attackSrc = 'assets/images/Zombies/BackupDancer/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/BackupDancer/Die.gif';
            this.yOffset = -40;
        } else if (type === 'jackinthebox') {
            this.hp = 500; this.maxHp = 500;
            this.speed = 35; // fast
            this.explodeTimer = Math.random() * 5 + 5; 
            this.element.src = 'assets/images/Zombies/JackinTheBoxZombie/Walk.gif';
            this.walkSrc = 'assets/images/Zombies/JackinTheBoxZombie/Walk.gif';
            this.attackSrc = 'assets/images/Zombies/JackinTheBoxZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/JackinTheBoxZombie/Die.gif';
        } else if (type === 'ladder') {
            this.hp = 500; this.maxHp = 500;
            this.speed = 30; // fast
            this.hasLadder = true;
            this.element.src = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            this.element.style.filter = 'sepia(1) hue-rotate(20deg) saturate(2)'; // give a wooden tint
        } else if (type === 'pogo') {
            this.hp = 340; this.maxHp = 340;
            this.speed = 35; // fast
            this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.walkSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.attackSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieDie.gif';
            this.element.style.filter = 'hue-rotate(90deg)'; // green tint
            this.yOffset = -50;
        } else if (type === 'gargantuar') {
            this.hp = 4000; this.maxHp = 4000;
            this.speed = 10; // slow
            this.hasThrownImps = false;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            this.yOffset = -80;
            this.element.style.transform = 'scale(2.5)';
            this.element.style.transformOrigin = 'bottom center';
            this.element.style.filter = 'brightness(0.8) contrast(1.2)';
        } else if (type === 'imp') {
            this.hp = 100; this.maxHp = 100;
            this.speed = 35; // fast
            this.element.src = 'assets/images/Zombies/Imp/Zombie.gif'; 
            this.walkSrc = 'assets/images/Zombies/Imp/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Imp/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Imp/ZombieDie.gif';
            this.yOffset = -10;
        } else if (type === 'zomboni') {
            this.hp = 1300; this.maxHp = 1300;
            this.speed = 15;
            this.element.src = 'assets/images/Zombies/Zomboni/1.gif';
            this.walkSrc = 'assets/images/Zombies/Zomboni/1.gif';
            this.attackSrc = 'assets/images/Zombies/Zomboni/1.gif'; // crushes, doesn't attack
            this.dieSrc = 'assets/images/Zombies/Zomboni/BoomDie.gif';
        } else if (type === 'lgboss') {
            this.hp = 5000; this.maxHp = 5000;
            this.speed = 10;
            this.element.src = 'assets/images/Zombies/LGBOSS/1.gif';
            this.walkSrc = 'assets/images/Zombies/LGBOSS/1.gif';
            this.attackSrc = 'assets/images/Zombies/LGBOSS/2.gif'; // Assuming 2 is attack
            this.dieSrc = 'assets/images/Zombies/LGBOSS/BoomDie.gif'; // Or 5.gif? 0.gif is probably idle
            this.yOffset = -80; // Assuming it's huge
        }
    }
    
    // 植物头僵尸：把一颗基础植物顶在头上（独立 DOM 层，随僵尸同步移动）
    createPlantHead(src, headSize) {
        const img = document.createElement('img');
        img.src = src;
        img.style.position = 'absolute';
        img.style.pointerEvents = 'none';
        img.style.width = headSize + 'px';
        img.style.height = headSize + 'px';
        img.style.objectFit = 'contain';
        this.headEl = img;
        this.headSize = headSize;
        this.hasPlantHead = true;
        this.game.entityLayer.appendChild(img);
        this.syncPlantHead();
    }
    
    // 每帧把植物头锁定在僵尸头顶位置（身体图 144px 高、中心在 (x,y+yOffset)，头顶 ≈ -72px）
    syncPlantHead() {
        if (!this.headEl) return;
        this.headEl.style.left = (this.x - this.headSize / 2) + 'px';
        this.headEl.style.top = (this.y + this.yOffset - 72 + 6) + 'px'; // 从头顶往下 6px 开始扣住
        this.headEl.style.zIndex = String(Math.floor(this.y) + 1); // 略高于同一行的身体
        // 被冰冻时头顶植物一起结冰（寒冰头免疫减速，永不进入该分支）
        this.headEl.style.filter = this.isSlowed ? 'brightness(70%) sepia(100%) hue-rotate(190deg) saturate(500%)' : '';
    }
    
    // 破甲：植物头被打掉，翻滚飞落消失（路障/铁桶同款掉落机制）
    dropPlantHead() {
        if (!this.headEl) return;
        const h = this.headEl;
        this.headEl = null;
        this.hasPlantHead = false;
        h.style.transition = 'transform 0.5s ease-in, opacity 0.5s ease-in';
        h.style.transform = 'translateY(30px) rotate(40deg)';
        h.style.opacity = '0';
        setTimeout(() => { if (h.parentNode) h.parentNode.removeChild(h); }, 550);
    }
    
    // 减速统一入口：寒冰头（snowpeahead，头还在时）免疫任何冰冻
    setSlow(t = 10) {
        if (this.immuneSlow || this.isDead) return;
        this.isSlowed = true;
        this.slowTimer = t;
    }
    
    // 解冻（火爆辣椒/火球等）：同时清掉蓝色滤镜
    thaw() {
        this.isSlowed = false;
        this.slowTimer = 0;
        if (this.element) this.element.style.filter = '';
        if (this.headEl) this.headEl.style.filter = '';
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        this.syncPlantHead(); // 植物头跟随身体移动
        
        if (this.isSlowed) {
            this.slowTimer -= deltaTime;
            if (this.slowTimer <= 0) {
                this.isSlowed = false;
                this.element.style.filter = '';
            } else {
                this.element.style.filter = 'brightness(70%) sepia(100%) hue-rotate(190deg) saturate(500%)'; // strong blue tint
            }
        }
        
        const currentSpeed = this.isSlowed ? this.speed * 0.3 : this.speed; // 70% slow!
        const currentDamage = this.isSlowed ? this.damage * 0.3 : this.damage;
        
        // Handle cone falling off
        if (this.type === 'conehead' && this.hp <= 200 && this.state !== 'DYING') {
            this.type = 'normal';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }
        
        // Handle bucket falling off
        if (this.type === 'buckethead' && this.hp <= 200 && this.state !== 'DYING') {
            this.type = 'normal';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }
        
        // Handle plant head falling off (植物头僵尸破甲：头被打掉后变普通僵尸，寒冰免疫一并失效)
        if (this.hasPlantHead && this.hp <= this.headBreakHp && this.state !== 'DYING') {
            this.dropPlantHead();
            this.immuneSlow = false;
        }
        
        // Handle newspaper falling off
        if (this.type === 'newspaper' && this.hp <= 150 && !this.hasLostNewspaper && this.state !== 'DYING') {
            this.hasLostNewspaper = true;
            this.speed = 45; // Gets very angry and fast
            this.walkSrc = 'assets/images/Zombies/NewspaperZombie/HeadWalk0.gif';
            this.attackSrc = 'assets/images/Zombies/NewspaperZombie/HeadAttack0.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }

        // Handle screendoor falling off
        if (this.type === 'screendoor' && this.hp <= 200 && this.state !== 'DYING') {
            this.type = 'normal';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }

        // Handle jack-in-the-box explosion
        if (this.type === 'jackinthebox' && this.state !== 'DYING') {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {
                // Explode!
                this.hp = 0;
                this.element.src = 'assets/images/Zombies/JackinTheBoxZombie/Boom.gif';
                this.element.style.zIndex = 3000;
                this.element.style.transform = 'translate(-50%, -80%)'; // Move boom up a bit
                
                // Kill plants in 3x3 area
                const plants = this.game.entities.filter(e => e instanceof Plant && !e.isDead);
                for (let p of plants) {
                    if (Math.abs(p.row - this.row) <= 1 && Math.abs(p.x - this.x) < 150) {
                        p.hp = 0;
                    }
                }
                setTimeout(() => { this.isDead = true; }, 1000);
                return;
            }
        }

        // Handle Dancing Zombie summon
        if (this.type === 'dancing' && this.state !== 'DYING') {
            this.summonTimer -= deltaTime;
            if (this.summonTimer <= 0) {
                this.summonTimer = 10.0; // Summon every 10s
                
                // Spawn backups
                const positions = [
                    {r: this.row - 1, dx: 0},
                    {r: this.row + 1, dx: 0},
                    {r: this.row, dx: -80},
                    {r: this.row, dx: 80}
                ];
                
                for (let pos of positions) {
                    if (pos.r >= 0 && pos.r < this.game.board.rows) {
                        const zombieY = this.game.board.offsetY + pos.r * this.game.board.cellHeight + this.game.board.cellHeight / 2 - 20;
                        const backup = new Zombie(this.game, pos.r, 'backup');
                        backup.x = Math.max(40, this.x + pos.dx); // prevent spawning behind game over line
                        backup.y = zombieY;
                        this.game.entities.push(backup);
                    }
                }
            }
        }
        
        if (this.hp <= 0 && this.state !== 'DYING') {
            this.state = 'DYING';
            if (this.headEl) this.dropPlantHead(); // 植物头先翻滚掉落再倒地
            if (this.type === 'sunhead') {
                // 僵尸化的向日葵：死后把阳光"还"给玩家（掉落在它的位置）
                this.game.entities.push(new Sun(this.game, this.x, this.y + this.yOffset - 60, this.y + this.yOffset));
            }
            this.element.src = this.dieSrc;
            if (this.game.score !== undefined) {
                this.game.score += 10;
                this.game.updateScore();
            }
            setTimeout(() => { this.isDead = true; }, 2000); 
        }
        
        if (this.state === 'DYING') return;
        
        // Gargantuar throw imps logic
        if (this.type === 'gargantuar' && this.hp < 2000 && !this.hasThrownImps) {
            this.hasThrownImps = true;
            for (let i = 0; i < 2; i++) {
                let imp = new Zombie(this.game, this.row, 'imp');
                imp.x = Math.max(100, this.x - 150 - (i * 40));
                this.game.entities.push(imp);
            }
        }

        if (this.state === 'WALKING') {
            this.x -= currentSpeed * deltaTime;
            
            if (this.x < 40) { 
                this.game.gameOver();
            }
            
            const plant = this.game.entities.find(e => 
                e instanceof Plant && 
                (!e.hasTrait || !e.hasTrait('spikeweed')) &&
                e.row === this.row && 
                Math.abs(e.x - this.x) < 40 &&
                !e.isDead && e.type !== 'crater'
            );
            
            if (plant) {
                // Ignore plants with ladders (except gargantuar and zomboni who smash it)
                if (plant.hasLadder && this.type !== 'gargantuar' && this.type !== 'zomboni') {
                    // Just walk past it!
                } else if (this.type === 'pogo') {
                    // Pogo jumps over all plants directly!
                } else if (this.type === 'ladder' && this.hasLadder && (plant.hasTrait('wallnut') || plant.hasTrait('tallnut'))) {
                    // Place ladder
                    this.hasLadder = false;
                    plant.hasLadder = true;
                    this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
                    this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
                    this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
                    this.element.style.filter = '';
                    
                    // Create visual ladder on plant
                    let ladderImg = document.createElement('img');
                    ladderImg.src = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif'; // using screen door as mock ladder
                    ladderImg.style.position = 'absolute';
                    ladderImg.style.left = '0';
                    ladderImg.style.top = '0';
                    ladderImg.style.width = '100%';
                    ladderImg.style.height = '100%';
                    ladderImg.style.filter = 'sepia(1) hue-rotate(20deg) saturate(2)';
                    ladderImg.style.clipPath = 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'; // just show half of it as a ladder
                    plant.element.parentNode.appendChild(ladderImg);
                    plant.ladderOverlay = ladderImg; // keep reference to clean up on death
                    
                } else if (this.type === 'polevaulting' && !this.hasVaulted && (!plant.hasTrait || !plant.hasTrait('tallnut'))) {
                    // Jump over it!
                    this.hasVaulted = true;
                    this.state = 'JUMPING';
                    this.jumpTimer = 1.0; 
                    this.jumpDuration = 1.0;
                    this.jumpStartX = this.x;
                    this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieJump.gif';
                    this.jumpTargetX = Math.max(40, plant.x - 80); 
                } else if (this.type === 'zomboni' || this.type === 'gargantuar') {
                    // Crush it! (Gargantuar smashes instantly when entering eating, let's just make it stop and eat, but it instantly kills in EATING logic)
                    if (this.type === 'zomboni') {
                        plant.hp = 0;
                    } else {
                        this.state = 'EATING';
                        this.eatTarget = plant;
                        this.element.src = this.attackSrc;
                        this.smashTimer = 1.0; // Gargantuar takes 1 second to smash
                    }
                } else {
                    this.state = 'EATING';
                    this.eatTarget = plant;
                    this.element.src = this.attackSrc;
                }
            }
        } else if (this.state === 'JUMPING') {
            this.jumpTimer -= deltaTime;
            const progress = 1 - (this.jumpTimer / this.jumpDuration);
            this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * Math.min(1, Math.max(0, progress)); // smoothly move to target without overshooting
            
            if (this.jumpTimer <= 0) {
                this.state = 'WALKING';
                this.speed = 20; // walk slow after jump
                this.element.src = this.walkSrc;
            }
        }
        else if (this.state === 'EATING') {
            if (this.eatTarget && !this.eatTarget.isDead) {
                if (this.eatTarget.type === 'garlic') {
                    // Bite garlic and switch row!
                    this.eatTarget.hp -= 20; // single bite damage
                    this.game.audioManager.play('chomp'); // disgusted sound ideally
                    
                    // Show text bubble!
                    const textBubble = document.createElement('div');
                    textBubble.innerText = '可恶的区钥丁！';
                    textBubble.style.position = 'absolute';
                    textBubble.style.color = '#ff0000';
                    textBubble.style.fontWeight = 'bold';
                    textBubble.style.fontSize = '24px';
                    textBubble.style.textShadow = '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff';
                    textBubble.style.pointerEvents = 'none';
                    textBubble.style.zIndex = '4000';
                    textBubble.style.whiteSpace = 'nowrap';
                    textBubble.style.left = `${this.x - 30}px`;
                    textBubble.style.top = `${this.y - 60}px`;
                    textBubble.style.transition = 'top 2s ease-out, opacity 2s ease-out';
                    
                    this.game.container.appendChild(textBubble);
                    
                    setTimeout(() => {
                        textBubble.style.top = `${this.y - 120}px`;
                        textBubble.style.opacity = '0';
                    }, 50);
                    
                    setTimeout(() => {
                        if (textBubble.parentNode) textBubble.parentNode.removeChild(textBubble);
                    }, 2000);
                    
                    // Switch row up or down randomly (if possible)
                    const canGoUp = this.row > 0;
                    const canGoDown = this.row < this.game.board.rows - 1;
                    
                    if (canGoUp && canGoDown) {
                        this.row += Math.random() < 0.5 ? -1 : 1;
                    } else if (canGoUp) {
                        this.row -= 1;
                    } else if (canGoDown) {
                        this.row += 1;
                    }
                    
                    // Update visually
                    this.y = this.game.board.offsetY + this.row * this.game.board.cellHeight + this.game.board.cellHeight / 2 - 20;
                    
                    this.state = 'WALKING';
                    this.eatTarget = null;
                    this.element.src = this.walkSrc;
                } else {
                    if (this.type === 'gargantuar') {
                        if (!this.smashTimer) this.smashTimer = 1.0;
                        this.smashTimer -= deltaTime;
                        if (this.smashTimer <= 0) {
                            this.eatTarget.hp = 0; // instantly kill
                            this.game.audioManager.play('splat');
                            this.smashTimer = 1.0;
                        }
                    } else {
                        this.eatTarget.hp -= currentDamage * deltaTime;
                    }
                    
                    if (this.eatTarget.hasTrait && (this.eatTarget.hasTrait('spikeweed') || this.eatTarget.hasTrait('chomper'))) {
                        this.hp -= 20 * deltaTime; // reflect damage
                    }
                    if (this.eatTarget.hasTrait && this.eatTarget.hasTrait('snowpea') && !this.isSlowed) {
                        this.setSlow(10.0);
                    }
                    
                    if (!this.chompTimer) this.chompTimer = 0;
                    this.chompTimer -= deltaTime;
                    const chompInterval = this.isSlowed ? 3.0 : 1.0;
                    if (this.chompTimer <= 0) {
                        this.game.audioManager.play('chomp');
                        this.chompTimer = chompInterval; 
                    }
                }
            } else {
                this.state = 'WALKING';
                this.eatTarget = null;
                this.element.src = this.walkSrc;
            }
        }
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        // Optional: briefly change brightness or show hit effect
    }
}
