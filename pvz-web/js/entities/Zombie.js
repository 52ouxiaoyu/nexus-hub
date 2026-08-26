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
    
    update(deltaTime) {
        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        
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
                        const backup = new Zombie(this.game, this.x + pos.dx, zombieY, pos.r, 'backup');
                        this.game.entities.push(backup);
                    }
                }
            }
        }
        
        if (this.hp <= 0 && this.state !== 'DYING') {
            this.state = 'DYING';
            this.element.src = this.dieSrc;
            if (this.game.score !== undefined) {
                this.game.score += 10;
                this.game.updateScore();
            }
            setTimeout(() => { this.isDead = true; }, 2000); 
        }
        
        if (this.state === 'DYING') return;
        
        if (this.state === 'WALKING') {
            this.x -= currentSpeed * deltaTime;
            
            if (this.x < 40) { 
                this.game.gameOver();
            }
            
            const plant = this.game.entities.find(e => 
                e instanceof Plant && 
                e.type !== 'spikeweed' &&
                e.row === this.row && 
                Math.abs(e.x - this.x) < 40 
            );
            
            if (plant && !plant.isDead && plant.type !== 'crater') {
                if (this.type === 'polevaulting' && !this.hasVaulted && plant.type !== 'tallnut') {
                    // Jump over it!
                    this.hasVaulted = true;
                    this.state = 'JUMPING';
                    this.jumpTimer = 1.0; // 1 second jump
                    this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieJump.gif';
                    this.jumpTargetX = plant.x - 80; // land behind plant
                } else if (this.type === 'zomboni') {
                    // Crush it!
                    plant.hp = 0;
                } else {
                    this.state = 'EATING';
                    this.eatTarget = plant;
                    this.element.src = this.attackSrc;
                }
            }
        } else if (this.state === 'JUMPING') {
            this.jumpTimer -= deltaTime;
            this.x += (this.jumpTargetX - this.x) * (deltaTime / this.jumpTimer); // smoothly move to target
            
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
                    this.eatTarget.hp -= currentDamage * deltaTime;
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
