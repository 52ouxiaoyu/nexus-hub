import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Update Player weapons array
player_weapons_regex = r"this\.weapons = \[\s*\{name: 'Pistol', cooldown: 15, damage: 20, speed: 10, type: 'single'\},\s*\{name: 'Shotgun', cooldown: 30, damage: 15, speed: 12, type: 'spread'\},\s*\{name: 'Machine Gun', cooldown: 5, damage: 15, speed: 15, type: 'single'\},\s*\{name: 'Laser', cooldown: 2, damage: 10, speed: 20, type: 'pierce'\},\s*\{name: 'Rocket', cooldown: 40, damage: 50, speed: 8, type: 'explosive'\}\s*\];"

new_weapons = """this.weapons = [];
        for(let i=1; i<=30; i++) {
            let w = {name: `Lv.${i} 暴雨`, cooldown: 15, damage: 20, speed: 10, count: 1, spread: 0, pierce: false};
            
            w.damage = 15 + Math.floor(i / 2) * 5;
            w.speed = 10 + i * 0.3;
            
            if(i <= 5) {
                w.count = 1;
                w.cooldown = 16 - i * 2;
            } else if (i <= 10) {
                w.count = 2;
                w.spread = 0.2;
                w.cooldown = 14 - (i - 5) * 1.5;
            } else if (i <= 15) {
                w.count = 3;
                w.spread = 0.4;
                w.cooldown = 10 - (i - 10) * 1;
            } else if (i <= 20) {
                w.count = 4;
                w.spread = 0.6;
                w.cooldown = 8 - (i - 15) * 0.5;
                w.pierce = true;
            } else if (i <= 25) {
                w.count = 5;
                w.spread = 1.0;
                w.cooldown = 6 - (i - 20) * 0.4;
                w.pierce = true;
            } else if (i < 30) {
                w.count = 6 + (i - 26)*2;
                w.spread = Math.PI; 
                w.cooldown = 5;
                w.pierce = true;
            } else { 
                w.name = "🔥 毁灭者光轮 🔥";
                w.count = 16;
                w.spread = Math.PI * 2;
                w.cooldown = 3;
                w.pierce = true;
                w.damage = 150;
            }
            this.weapons.push(w);
        }"""
code = re.sub(player_weapons_regex, new_weapons, code)

# 2. Update Player shoot method
shoot_regex = r"shoot\(\) \{\s*if\(this\.cooldown <= 0\) \{.*?audio\.shootPistol\(\);\s*\}\s*\}"
new_shoot = """shoot() {
        if(this.cooldown <= 0) {
            let baseAngle = Math.atan2(this.facing.y, this.facing.x);
            let count = this.weapon.count;
            let spread = this.weapon.spread;
            
            let startAngle = count === 1 ? baseAngle : baseAngle - spread/2;
            let angleStep = count === 1 ? 0 : spread / (count - 1);
            
            for(let i = 0; i < count; i++) {
                let angle = startAngle + i * angleStep;
                let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), this.weapon.speed, this.weapon.damage, '#fff', this.weapon.pierce);
                
                if(this.weaponLevel >= 29) b.color = '#ff00ff';
                else if(count >= 5) b.color = '#ffaa00';
                else if(this.weapon.pierce) b.color = '#00ffff';
                
                b.size = this.weapon.pierce ? 5 : 4;
                bullets.push(b);
            }
            this.cooldown = this.buffTime > 0 ? this.weapon.cooldown / 2 : this.weapon.cooldown;
            audio.shootPistol();
        }
    }"""
code = re.sub(shoot_regex, new_shoot, code, flags=re.DOTALL)

# 3. Update LootBox weapon_box logic
weapon_box_regex = r"else if\(this\.type === 'weapon_box'\) \{\s*const idx = Math\.floor\(Math\.random\(\) \* p\.weapons\.length\);\s*p\.weapon = p\.weapons\[idx\];\s*document\.getElementById\('current-weapon'\)\.textContent = p\.weapon\.name;\s*addFloatingText\(p\.x, p\.y - 30, `🔫 武器: \$\{p\.weapon\.name\}`, \"#aa00ff\"\);\s*audio\.levelUp\(\);\s*\}"
new_weapon_box = """else if(this.type === 'weapon_box') {
                    if(p.weaponLevel < 29) p.weaponLevel++;
                    p.weapon = p.weapons[p.weaponLevel];
                    document.getElementById('current-weapon').textContent = p.weapon.name;
                    addFloatingText(p.x, p.y - 30, `🔫 火力升级! ${p.weapon.name}`, "#aa00ff");
                    audio.levelUp();
                }"""
code = re.sub(weapon_box_regex, new_weapon_box, code)

# Fix bullet constructor calls in other places
# AI ultimate
ai_ult_regex = r"let b = new Bullet\(this\.x, this\.y, \{x: Math\.cos\(angle\), y: Math\.sin\(angle\)\}, this\.weapon\);\s*b\.damage = 100;\s*b\.pierce = true;\s*b\.size = 10;\s*bullets\.push\(b\);"
new_ai_ult = """let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 20, 150, '#00ffff', true);
                        b.size = 10;
                        bullets.push(b);"""
code = re.sub(ai_ult_regex, new_ai_ult, code)

# Player input ultimate
input_ult_regex = r"let b = new Bullet\(p\.x, p\.y, \{x: Math\.cos\(angle\), y: Math\.sin\(angle\)\}, p\.weapon\);\s*b\.damage = 100;\s*b\.pierce = true;\s*b\.size = 10;\s*bullets\.push\(b\);"
new_input_ult = """let b = new Bullet(p.x, p.y, Math.cos(angle), Math.sin(angle), 20, 150, '#00ffff', true);
                    b.size = 10;
                    bullets.push(b);"""
code = re.sub(input_ult_regex, new_input_ult, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
