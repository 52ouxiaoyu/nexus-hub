import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# getStats
old_stats = """        } else if (type === 'torchwood') {"""
new_stats = """        } else if (type === 'cattail') {
            stat.hp = 300;
            stat.fireRate = 0.5;
            stat.fireTimer = 0;
            stat.src = 'assets/images/Plants/Cattail/Cattail.gif';
            stat.yOffset = -20;
        } else if (type === 'torchwood') {"""
content = content.replace(old_stats, new_stats)

# hasZombieAhead logic for cattail
old_shoot_check = """                if (hasZombieAhead || hasZombieBehind) {"""
new_shoot_check = """                let cattailTarget = null;
                if (this.hasTrait('cattail')) {
                    cattailTarget = this.game.entities.find(e => e instanceof Zombie && !e.isDead);
                }
                
                if (hasZombieAhead || hasZombieBehind || cattailTarget) {"""
content = content.replace(old_shoot_check, new_shoot_check)

# projType setting
old_projType = """                    if (this.hasTrait('wintermelon')) projType = 'wintermelon';"""
new_projType = """                    if (this.hasTrait('wintermelon')) projType = 'wintermelon';
                    if (this.hasTrait('cattail')) projType = 'cattail';"""
content = content.replace(old_projType, new_projType)

# actual shooting
old_forward_shot = """                        if (hasZombieAhead) {
                            this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));"""
new_forward_shot = """                        if (hasZombieAhead || cattailTarget) {
                            let target = this.hasTrait('cattail') ? cattailTarget : null;
                            this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType, target));"""
content = content.replace(old_forward_shot, new_forward_shot)

# gatlingpea/repeater/cattail repeater shot
old_repeat_count = """                            const repeatCount = this.hasTrait('gatlingpea') ? 4 : (this.hasTrait('repeater') ? 2 : 1);
                            for (let i = 1; i < repeatCount; i++) {
                                setTimeout(() => {
                                    if (!this.isDead) {
                                        this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType));
                                    }
                                }, 150 * i);
                            }"""
new_repeat_count = """                            const repeatCount = this.hasTrait('gatlingpea') ? 4 : ((this.hasTrait('repeater') || this.hasTrait('cattail')) ? 2 : 1);
                            for (let i = 1; i < repeatCount; i++) {
                                setTimeout(() => {
                                    if (!this.isDead) {
                                        this.game.entities.push(new Projectile(this.game, this.x + 30, this.y - 15, this.row, projType, target));
                                    }
                                }, 150 * i);
                            }"""
content = content.replace(old_repeat_count, new_repeat_count)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)

