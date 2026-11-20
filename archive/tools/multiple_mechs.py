import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Add this.mechType to constructor
code = code.replace("this.mechTime = 0;", "this.mechTime = 0;\n        this.mechType = 0;")

# 2. Update speed modifier
old_speed = "if(this.mechTime > 0) currentSpeed *= 0.6; // Mech is slow"
new_speed = """if(this.mechTime > 0) {
            if(this.mechType === 1) currentSpeed *= 0.4;
            else if(this.mechType === 2) currentSpeed *= 0.6;
            else if(this.mechType === 3) currentSpeed *= 1.3;
        }"""
code = code.replace(old_speed, new_speed)

# 3. Update shoot logic
old_shoot_regex = r"if\(this\.mechTime > 0\) \{\s*audio\.shootLaser\(\);\s*for\(let i=0; i<8; i\+\+\) \{\s*let angle = Math\.PI/4 \* i \+ \(frameCount\*0\.1\);\s*bullets\.push\(new Bullet\(this\.x, this\.y, Math\.cos\(angle\), Math\.sin\(angle\), 15, 50, '#ff0000', true, this\.id\)\);\s*\}\s*return;\s*\}"

new_shoot = """if(this.mechTime > 0) {
            if(this.mechType === 1) { 
                if(frameCount % 20 === 0) {
                    audio.shootLaser();
                    let b = new Bullet(this.x, this.y, this.facing.x, this.facing.y, 10, 300, '#ff5500', true, this.id);
                    b.size = 15;
                    bullets.push(b);
                }
            } else if(this.mechType === 2) { 
                audio.shootLaser();
                for(let i=0; i<8; i++) {
                    let angle = Math.PI/4 * i + (frameCount*0.1);
                    bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 50, '#ff0000', true, this.id));
                }
            } else if(this.mechType === 3) { 
                audio.shootMachine();
                let angle = Math.atan2(this.facing.y, this.facing.x) + (Math.random()-0.5)*0.15;
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 25, 30, '#00ffff', true, this.id));
            }
            return;
        }"""
code = re.sub(old_shoot_regex, new_shoot, code)

# 4. Update draw logic
old_draw_regex = r"if\(this\.mechTime > 0\) \{\s*ctx\.fillStyle = '#aaa';\s*ctx\.fillRect\(-s\*1\.5, -s\*1\.5, s\*3, s\*3\);\s*ctx\.fillStyle = '#555';\s*ctx\.fillRect\(s\*1\.5, -8, s\*2, 16\);\s*ctx\.restore\(\);\s*return;\s*\}"

new_draw = """if(this.mechTime > 0) {
            if(this.mechType === 1) { // Goliath
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(-s*1.8, -s*1.8, s*3.6, s*3.6);
                ctx.fillStyle = '#cc5500';
                ctx.fillRect(s*1.5, -s, s*2.5, s*2); 
            } else if(this.mechType === 2) { // Titan
                ctx.fillStyle = '#888';
                ctx.fillRect(-s*1.5, -s*1.5, s*3, s*3);
                ctx.fillStyle = '#f00';
                ctx.fillRect(-s*0.5, -s*0.5, s, s);
                ctx.fillStyle = '#555';
                ctx.fillRect(s*1.5, -8, s*2, 16);
            } else if(this.mechType === 3) { // Valkyrie
                ctx.fillStyle = '#00aaff';
                ctx.beginPath();
                ctx.moveTo(s*2.5, 0);
                ctx.lineTo(-s*1.5, s*1.8);
                ctx.lineTo(-s*1.5, -s*1.8);
                ctx.fill();
            }
            ctx.restore();
            return;
        }"""
code = re.sub(old_draw_regex, new_draw, code)

# 5. Update lootbox collection
old_loot_regex = r"p\.mechTime = 600;\s*p\.mechHp = 500;\s*addFloatingText\(p\.x, p\.y - 30, \"🤖 战术机甲部署!\", \"#555555\"\);\s*audio\.powerup\(\);"

new_loot = """p.mechType = Math.floor(Math.random() * 3) + 1;
                    let mName = ["", "重装堡垒", "强袭雷神", "幽灵突击者"][p.mechType];
                    p.mechTime = 900;
                    p.mechHp = p.mechType === 1 ? 1000 : (p.mechType === 2 ? 600 : 300);
                    addFloatingText(p.x, p.y - 30, `🤖 机甲部署: ${mName}!`, "#ffcc00");
                    audio.powerup();"""
code = re.sub(old_loot_regex, new_loot, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
