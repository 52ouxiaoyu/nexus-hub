import re

with open('pvz-web/js/entities/Zombie.js', 'r') as f:
    content = f.read()

# Add to constructor
old_imp = """        } else if (type === 'imp') {"""
new_zombies = """        } else if (type === 'ladder') {
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
        } else if (type === 'imp') {"""
content = content.replace(old_imp, new_zombies)

with open('pvz-web/js/entities/Zombie.js', 'w') as f:
    f.write(content)
