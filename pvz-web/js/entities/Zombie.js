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
            this.hp = 200;
            this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'conehead') {
            this.hp = 560; 
            this.maxHp = 560;
            this.element.src = 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ConeheadZombie/ConeheadZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'buckethead') {
            this.hp = 1300; 
            this.maxHp = 1300;
            this.element.src = 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif';
            this.walkSrc = 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif';
            this.attackSrc = 'assets/images/Zombies/BucketheadZombie/BucketheadZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'football') {
            this.hp = 1600; 
            this.maxHp = 1600;
            this.speed = 40; // Football is fast
            this.element.src = 'assets/images/Zombies/FootballZombie/FootballZombie.gif';
            this.walkSrc = 'assets/images/Zombies/FootballZombie/FootballZombie.gif';
            this.attackSrc = 'assets/images/Zombies/FootballZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/FootballZombie/Die.gif';
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
                this.state = 'EATING';
                this.eatTarget = plant;
                this.element.src = this.attackSrc;
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
                    
                    this.game.uiLayer.appendChild(textBubble);
                    
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
