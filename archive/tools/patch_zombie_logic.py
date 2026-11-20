import re

with open('pvz-web/js/entities/Zombie.js', 'r') as f:
    content = f.read()

# We need to replace the walking logic block.
# Let's find the block starting with `if (this.state === 'WALKING') {`
# and ending before `} else if (this.state === 'JUMPING') {`

old_walking = """        if (this.state === 'WALKING') {
            this.x -= currentSpeed * deltaTime;
            
            if (this.x < 40) { 
                this.game.gameOver();
            }
            
            const plant = this.game.entities.find(e => 
                e instanceof Plant && 
                (!e.hasTrait || !e.hasTrait('spikeweed')) &&
                e.row === this.row && 
                Math.abs(e.x - this.x) < 40 
            );
            
            if (plant && !plant.isDead && plant.type !== 'crater') {
                if (this.type === 'polevaulting' && !this.hasVaulted && (!plant.hasTrait || !plant.hasTrait('tallnut'))) {
                    // Jump over it!
                    this.hasVaulted = true;
                    this.state = 'JUMPING';
                    this.jumpTimer = 1.0; // 1 second jump
                    this.jumpDuration = 1.0;
                    this.jumpStartX = this.x;
                    this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieJump.gif';
                    this.jumpTargetX = Math.max(40, plant.x - 80); // land behind plant but not past game over line
                } else if (this.type === 'zomboni') {
                    // Crush it!
                    plant.hp = 0;
                } else {
                    this.state = 'EATING';
                    this.eatTarget = plant;
                    this.element.src = this.attackSrc;
                }
            }
        }"""

new_walking = """        // Gargantuar throw imps logic
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
        }"""

content = content.replace(old_walking, new_walking)

with open('pvz-web/js/entities/Zombie.js', 'w') as f:
    f.write(content)
