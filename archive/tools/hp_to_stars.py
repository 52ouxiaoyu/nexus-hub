import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Update Zombie Damage
zombie_dmg_regex = r"if\(this\.type === 'boss'\) \{\s*this\.size = 35; this\.speed = 1\.5; this\.hp = 1000 \+ survivalTime\*10; this\.color = '#ff00ff'; this\.damage = 30; this\.scoreVal = 500;\s*\} else if\(this\.type === 'fast'\) \{\s*this\.size = 12 \+ Math\.random\(\)\*3; this\.speed = 2\.5 \+ Math\.random\(\) \+ \(survivalTime/60\); this\.hp = 10 \+ survivalTime/2; this\.color = '#ffff00'; this\.damage = 5; this\.scoreVal = 15;\s*\} else if\(this\.type === 'tank'\) \{\s*this\.size = 25 \+ Math\.random\(\)\*5; this\.speed = 0\.5 \+ Math\.random\(\)\*0\.5 \+ \(survivalTime/120\); this\.hp = 100 \+ survivalTime\*3; this\.color = '#4444ff'; this\.damage = 20; this\.scoreVal = 30;\s*\} else if\(this\.type === 'exploder'\) \{\s*this\.size = 18 \+ Math\.random\(\)\*4; this\.speed = 1\.2 \+ Math\.random\(\) \+ \(survivalTime/60\); this\.hp = 15 \+ survivalTime; this\.color = '#ff5500'; this\.damage = 10; this\.scoreVal = 20;\s*\} else \{ // normal\s*this\.size = 15 \+ Math\.random\(\)\*5; this\.speed = 1 \+ Math\.random\(\)\*1\.5 \+ \(survivalTime/60\); this\.hp = 20 \+ survivalTime; this\.color = '#00ff00'; this\.damage = 10; this\.scoreVal = 10;\s*\}"
new_zombie_dmg = """if(this.type === 'boss') {
            this.size = 35; this.speed = 1.5; this.hp = 1000 + survivalTime*10; this.color = '#ff00ff'; this.damage = 2; this.scoreVal = 500;
        } else if(this.type === 'fast') {
            this.size = 12 + Math.random()*3; this.speed = 2.5 + Math.random() + (survivalTime/60); this.hp = 10 + survivalTime/2; this.color = '#ffff00'; this.damage = 1; this.scoreVal = 15;
        } else if(this.type === 'tank') {
            this.size = 25 + Math.random()*5; this.speed = 0.5 + Math.random()*0.5 + (survivalTime/120); this.hp = 100 + survivalTime*3; this.color = '#4444ff'; this.damage = 2; this.scoreVal = 30;
        } else if(this.type === 'exploder') {
            this.size = 18 + Math.random()*4; this.speed = 1.2 + Math.random() + (survivalTime/60); this.hp = 15 + survivalTime; this.color = '#ff5500'; this.damage = 1; this.scoreVal = 20;
        } else { // normal
            this.size = 15 + Math.random()*5; this.speed = 1 + Math.random()*1.5 + (survivalTime/60); this.hp = 20 + survivalTime; this.color = '#00ff00'; this.damage = 1; this.scoreVal = 10;
        }"""
code = re.sub(zombie_dmg_regex, new_zombie_dmg, code)

# 2. Exploder explosion damage to player
exploder_hit_regex = r"p\.hp -= 40;"
code = re.sub(exploder_hit_regex, "p.hp -= 2;", code)

# 3. Player constructor HP setup
player_init_regex = r"this\.hp = 100;\s*this\.maxHp = 100;\s*this\.lives = 3;"
new_player_init = """this.hp = 3;
        this.maxHp = 10;"""
code = re.sub(player_init_regex, new_player_init, code)

# 4. Player draw HP bar -> Draw Stars
player_draw_hp_regex = r"// HP Bar\s*if\(this\.hp < this\.maxHp\) \{\s*ctx\.fillStyle = '#f00';\s*ctx\.fillRect\(this\.x - 15, this\.y \+ 25, 30, 4\);\s*ctx\.fillStyle = '#0f0';\s*ctx\.fillRect\(this\.x - 15, this\.y \+ 25, 30 \* \(this\.hp/this\.maxHp\), 4\);\s*\}"
new_player_draw_hp = """// Stars
        if(this.hp > 0 && !this.isDowned) {
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            let stars = '⭐'.repeat(this.hp);
            ctx.fillText(stars, this.x, this.y - 25);
        }"""
code = re.sub(player_draw_hp_regex, new_player_draw_hp, code)

# 5. Zombie Hit Player - Mech/Vehicle damage fix
mech_hit_regex = r"target\.mechHp -= this\.damage;"
code = re.sub(mech_hit_regex, "target.mechHp -= this.damage * 20;", code)

# 6. LootBox updates
# Trap damage
trap_dmg_regex = r"p\.hp -= 30;"
code = re.sub(trap_dmg_regex, "p.hp -= 1;", code)

# Heal
heal_logic_regex = r"p\.hp = Math\.min\(p\.maxHp, p\.hp \+ 50\);\s*addFloatingText\(p\.x, p\.y - 30, \"\+50 HP\", \"#00ff00\"\);"
new_heal_logic = """p.hp = Math.min(p.maxHp, p.hp + 1);
                    addFloatingText(p.x, p.y - 30, "⭐ 获得星星!", "#00ff00");"""
code = re.sub(heal_logic_regex, new_heal_logic, code)

# Revive items
revive_lives_regex = r"if\(deadPlayer\.lives <= 0\) deadPlayer\.lives = 1;"
code = re.sub(revive_lives_regex, "if(deadPlayer.hp <= 0) deadPlayer.hp = 3;", code)

revive_extra_life_regex = r"// Give extra life if no one is dead\s*p\.lives\+\+;\s*addFloatingText\(p\.x, p\.y - 30, \"💖 生命\+1\", \"#ff3333\"\);"
new_revive_extra_life = """// Give extra life if no one is dead
                        p.hp = Math.min(p.maxHp, p.hp + 1);
                        addFloatingText(p.x, p.y - 30, "⭐ 星星+1", "#ff3333");"""
code = re.sub(revive_extra_life_regex, new_revive_extra_life, code)

# 7. GameOver condition update (remove lives check)
game_over_regex = r"p\.hp <= 0 && p\.lives <= 0"
code = re.sub(game_over_regex, "p.hp <= 0 && !p.isDowned", code)

game_over_regex2 = r"if\(players\.every\(p => \(p\.hp <= 0 && !p\.isDowned\) \|\| \(p\.hp <= 0 && p\.isDowned && !players\.some\(pl => pl\.hp > 0\)\)\)\) \{"
new_game_over2 = """if(players.every(p => (p.hp <= 0))) {"""
code = re.sub(game_over_regex2, new_game_over2, code)

# Wait, the previous game over was:
# if(players.every(p => (p.hp <= 0 && p.lives <= 0) || (p.hp <= 0 && p.isDowned && !players.some(pl => pl.hp > 0)))) {
# If both are downed, it's game over. So `players.every(p => p.hp <= 0)` handles it perfectly!
game_over_full_regex = r"if\(players\.every\(p => \(p\.hp <= 0 && p\.lives <= 0\) \|\| \(p\.hp <= 0 && p\.isDowned && !players\.some\(pl => pl\.hp > 0\)\)\)\) \{"
code = re.sub(game_over_full_regex, "if(players.every(p => p.hp <= 0)) {", code)

# 8. HUD Update (remove HP and Lives, just use one row for Stars)
# Wait, I also need to update the HUD HTML via index.html, but I can also just hide it or update the DOM via game.js
hud_update_regex = r"document\.getElementById\(`p\$\{p\.id\}-hp`\)\.style\.width = `\$\{Math\.max\(0, \(p\.hp/p\.maxHp\)\*100\)\}%`;\s*document\.getElementById\(`p\$\{p\.id\}-lives`\)\.textContent = p\.lives;"
new_hud_update = """let hpBar = document.getElementById(`p${p.id}-hp`);
        if(hpBar) {
            hpBar.parentElement.style.display = 'none'; // hide the old hp bar background
        }
        let livesSpan = document.getElementById(`p${p.id}-lives`);
        if(livesSpan) {
            livesSpan.parentElement.innerHTML = `生命 Stars: <span style="color:#ffaa00;font-size:20px;">${'⭐'.repeat(p.hp)}</span>`;
        }"""
code = re.sub(hud_update_regex, new_hud_update, code)


with open("zombie-shooter/game.js", "w") as f:
    f.write(code)

