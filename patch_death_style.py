import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Add dead-slash when AI or Player dies
old_ai_death = """            for (const p of this.allPlayers) {
                if (Math.hypot(p.x - zb.x, p.y - zb.y) < 48) {
                    if (p === this.player) playerHurt += touchDps * dt;
                    else p.hp -= touchDps * dt;
                }
            }"""
new_ai_death = """            for (const p of this.allPlayers) {
                if (p.dead) continue;
                if (Math.hypot(p.x - zb.x, p.y - zb.y) < 48) {
                    if (p === this.player) playerHurt += touchDps * dt;
                    else {
                        p.hp -= touchDps * dt;
                        if (p.hp <= 0 && !p.dead) {
                            p.dead = true;
                            p.el1.classList.add('dead-slash');
                            p.el1.style.filter = 'grayscale(1) ' + (p.color ? `drop-shadow(0 0 10px ${p.color})` : '');
                        }
                    }
                }
            }"""
content = content.replace(old_ai_death, new_ai_death)

old_player_death = """        if (playerHurt > 0) {
            this.player.hp -= playerHurt;
            this.setHp();
            this.flashDamage();
            if (this.player.hp <= 0) { this.gameOver(false); return; }
        }"""
new_player_death = """        if (playerHurt > 0 && !this.player.dead) {
            this.player.hp -= playerHurt;
            this.setHp();
            this.flashDamage();
            if (this.player.hp <= 0) { 
                this.player.dead = true;
                this.player.el1.classList.add('dead-slash');
                this.player.el1.style.filter = 'grayscale(1) drop-shadow(0 0 10px #00ff00)';
                this.gameOver(false); 
                return; 
            }
        }"""
content = content.replace(old_player_death, new_player_death)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)

