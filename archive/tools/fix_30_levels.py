import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Replace weapons array
old_weapons = """        this.weapons = [
            { name: "双持手枪 Pistols", cd: 20, type: "pistol", req: 0 },
            { name: "重型霰弹枪 Shotgun", cd: 35, type: "shotgun", req: 20 },
            { name: "突击步枪 Rifle", cd: 8, type: "machinegun", req: 60 },
            { name: "等离子激光 Laser", cd: 2, type: "laser", req: 150 }
        ];"""

new_weapons = """this.weapons = [];
        for(let i=1; i<=30; i++) {
            let w = {name: `Lv.${i} 暴雨`, cd: 15, damage: 20, speed: 10, count: 1, spread: 0, pierce: false};
            
            w.damage = 15 + Math.floor(i / 2) * 5;
            w.speed = 10 + i * 0.3;
            
            if(i <= 5) {
                w.count = 1;
                w.cd = 16 - i * 2;
            } else if (i <= 10) {
                w.count = 2;
                w.spread = 0.2;
                w.cd = 14 - (i - 5) * 1.5;
            } else if (i <= 15) {
                w.count = 3;
                w.spread = 0.4;
                w.cd = 10 - (i - 10) * 1;
            } else if (i <= 20) {
                w.count = 4;
                w.spread = 0.6;
                w.cd = 8 - (i - 15) * 0.5;
                w.pierce = true;
            } else if (i <= 25) {
                w.count = 5;
                w.spread = 1.0;
                w.cd = 6 - (i - 20) * 0.4;
                w.pierce = true;
            } else if (i < 30) {
                w.count = 6 + (i - 26)*2;
                w.spread = Math.PI; 
                w.cd = 5;
                w.pierce = true;
            } else { 
                w.name = "🔥 毁灭者光轮 🔥";
                w.count = 16;
                w.spread = Math.PI * 2;
                w.cd = 3;
                w.pierce = true;
                w.damage = 150;
            }
            this.weapons.push(w);
        }
        this.weapon = this.weapons[this.weaponLevel];"""

code = code.replace(old_weapons, new_weapons)

# 2. Replace shoot
old_shoot_regex = r"shoot\(\) \{\s*if\(this\.hp <= 0 \|\| this\.isDowned \|\| this\.cooldown > 0\) return;\s*const w = this\.weapons\[this\.weaponLevel\];\s*this\.cooldown = w\.cd;\s*let fx = this\.facing\.x;\s*let fy = this\.facing\.y;\s*if\(this\.vehicleTime > 0\) return;.*?if\(w\.type === \"pistol\"\) \{.*?\} else if\(w\.type === \"laser\"\) \{.*?\}\s*\}"

new_shoot = """shoot() {
        if(this.hp <= 0 || this.isDowned || this.cooldown > 0 || this.vehicleTime > 0) return;
        const w = this.weapons[this.weaponLevel];
        this.cooldown = w.cd;
        
        if(this.mechTime > 0) {
            audio.shootLaser();
            for(let i=0; i<8; i++) {
                let angle = Math.PI/4 * i + (frameCount*0.1);
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 50, '#ff0000', true, this.id));
            }
            return;
        }

        let baseAngle = Math.atan2(this.facing.y, this.facing.x);
        let count = w.count;
        let spread = w.spread;
        
        let startAngle = count === 1 ? baseAngle : baseAngle - spread/2;
        let angleStep = count === 1 ? 0 : spread / (count - 1);
        
        for(let i = 0; i < count; i++) {
            let angle = startAngle + i * angleStep;
            let b = new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), w.speed, w.damage, '#fff', w.pierce, this.id);
            
            if(this.weaponLevel >= 29) b.color = '#ff00ff';
            else if(count >= 5) b.color = '#ffaa00';
            else if(w.pierce) b.color = '#00ffff';
            
            b.size = w.pierce ? 5 : 4;
            bullets.push(b);
        }
        audio.shootPistol();
    }"""
    
code = re.sub(old_shoot_regex, new_shoot, code, flags=re.DOTALL)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
