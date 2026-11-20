import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Add lootBoxes array to state
code = code.replace("let floatingTexts = [];", "let floatingTexts = [];\nlet lootBoxes = [];\nlet lootTimer = 0;")
code = code.replace("floatingTexts = [];", "floatingTexts = [];\n    lootBoxes = [];\n    lootTimer = 0;")
code = code.replace("floatingTexts.forEach(ft => ft.update());", "floatingTexts.forEach(ft => ft.update());\n        lootBoxes.forEach(lb => lb.update());\n        lootTimer++;\n        if(lootTimer > 600) { lootTimer = 0; if(Math.random()<0.5) lootBoxes.push(new LootBox()); }")
code = code.replace("floatingTexts.forEach(ft => {", "lootBoxes.forEach(lb => lb.draw(ctx));\n    floatingTexts.forEach(ft => {")

# Add LootBox class
loot_box_class = """
class LootBox {
    constructor() {
        this.x = 50 + Math.random() * (CANVAS_W - 100);
        this.y = 50 + Math.random() * (CANVAS_H - 100);
        this.size = 15;
        this.active = true;
        this.color = '#ffd700'; // gold
        // Determine type
        const r = Math.random();
        if(r < 0.3) this.type = 'medkit';      // 30% HP
        else if(r < 0.5) this.type = 'potion'; // 20% Max HP
        else if(r < 0.65) this.type = 'nuke';  // 15% Screen clear
        else if(r < 0.8) this.type = 'stim';   // 15% Speed/Rapid fire
        else if(r < 0.95) this.type = 'shield';// 15% Invincible
        else this.type = 'trap';               // 5% Fake/Trap
    }
    update() {
        // Check collision with players
        players.forEach(p => {
            if(!this.active || p.hp <= 0) return;
            const dist = Math.hypot(p.x - this.x, p.y - this.y);
            if(dist < this.size + p.size) {
                this.collect(p);
            }
        });
    }
    collect(p) {
        this.active = false;
        audio.levelUp(); // use level up sound
        createParticles(this.x, this.y, this.color, 20);
        
        switch(this.type) {
            case 'medkit':
                p.hp = Math.min(p.maxHp, p.hp + 50);
                addFloatingText(this.x, this.y, "急救包! HP +50", "#00ff00");
                break;
            case 'potion':
                p.maxHp += 20;
                p.hp = p.maxHp;
                addFloatingText(this.x, this.y, "神秘药剂! MAX HP 上升", "#ff00ff");
                break;
            case 'nuke':
                zombies.forEach(z => { z.active = false; createParticles(z.x, z.y, '#ffaa00', 10); score += z.scoreVal; killCount++; });
                addFloatingText(this.x, this.y, "核弹轰炸! 全屏秒杀", "#ffaa00");
                break;
            case 'stim':
                p.buffTime = 300; // 5 seconds
                addFloatingText(this.x, this.y, "兴奋剂! 极速射击", "#00ffff");
                break;
            case 'shield':
                p.shieldTime = 600; // 10 seconds
                addFloatingText(this.x, this.y, "无敌护盾!", "#ffff00");
                break;
            case 'trap':
                p.hp -= 30;
                audio.playerHit();
                addFloatingText(this.x, this.y, "陷阱箱! -30 HP", "#ff0000");
                if(p.hp <= 0 && players.every(pl => pl.hp <= 0)) gameOver();
                break;
        }
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
        // lock icon
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - 3, this.y - 2, 6, 6);
        
        // bounce animation
        const offset = Math.sin(frameCount * 0.1) * 3;
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px Arial';
        ctx.fillText('?', this.x - 5, this.y - 15 + offset);
    }
}
"""

code = code.replace("class Particle {", loot_box_class + "\nclass Particle {")

# Update player for buffs
code = code.replace("this.cooldown = 0;", "this.cooldown = 0;\n        this.buffTime = 0;\n        this.shieldTime = 0;")
code = code.replace("if(this.cooldown > 0) this.cooldown--;", "if(this.cooldown > 0 && this.buffTime <= 0) this.cooldown--;\n        if(this.buffTime > 0) this.buffTime--;\n        if(this.shieldTime > 0) this.shieldTime--;")
code = code.replace("let dx = 0; let dy = 0;", "let dx = 0; let dy = 0;\n        let currentSpeed = this.buffTime > 0 ? this.speed * 1.5 : this.speed;")
code = code.replace("this.x += dx * this.speed;", "this.x += dx * currentSpeed;")
code = code.replace("this.y += dy * this.speed;", "this.y += dy * currentSpeed;")

# Draw shields
player_draw_regex = r"// Player ID\n\s*ctx\.fillStyle = '#fff';\n\s*ctx\.font = '12px ZCOOL KuaiLe';\n\s*ctx\.textAlign = 'center';\n\s*ctx\.fillText\('P' \+ this\.id, this\.x, this\.y - 25\);"
new_player_draw = """// Player ID
        ctx.fillStyle = '#fff';
        ctx.font = '12px ZCOOL KuaiLe';
        ctx.textAlign = 'center';
        ctx.fillText('P' + this.id, this.x, this.y - 25);
        
        // Draw Shield
        if(this.shieldTime > 0) {
            ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + Math.sin(frameCount * 0.2)*0.3})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Draw Buff aura
        if(this.buffTime > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
"""
code = re.sub(player_draw_regex, new_player_draw, code)

# Zombie collision with shield
zombie_dmg_regex = r"if\(minDist < this\.size \+ target\.size\) \{\n\s*target\.hp -= this\.damage;\n\s*audio\.playerHit\(\);\n\s*this\.active = false;"
new_zombie_dmg = """if(minDist < this.size + target.size) {
                if(target.shieldTime <= 0) {
                    target.hp -= this.damage;
                    audio.playerHit();
                }
                this.active = false;"""
code = re.sub(zombie_dmg_regex, new_zombie_dmg, code)

# Clean up active lootboxes on gameOver logic 
# Actually just filtering out active=false
code = code.replace("floatingTexts = floatingTexts.filter(ft => ft.active);", "floatingTexts = floatingTexts.filter(ft => ft.active);\n        lootBoxes = lootBoxes.filter(lb => lb.active);")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
