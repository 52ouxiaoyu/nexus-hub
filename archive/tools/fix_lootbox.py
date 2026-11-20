import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

lootbox_class = """
class LootBox {
    constructor(x, y) {
        this.x = x || Math.random() * (CANVAS_W - 100) + 50;
        this.y = y || Math.random() * (CANVAS_H - 100) + 50;
        this.size = 20;
        
        const rand = Math.random();
        if(rand < 0.25) this.type = 'nuke'; 
        else if(rand < 0.50) this.type = 'ult'; 
        else if(rand < 0.60) this.type = 'mech';
        else if(rand < 0.70) this.type = 'vehicle';
        else {
            const types = ['heal', 'shield', 'buff', 'weapon_box', 'trap', 'revive'];
            this.type = types[Math.floor(Math.random() * types.length)];
        }

        this.color = '#fff';
        if(this.type === 'heal') this.color = '#0f0';
        else if(this.type === 'shield') this.color = '#00f';
        else if(this.type === 'buff') this.color = '#0ff';
        else if(this.type === 'weapon_box') this.color = '#aa00ff';
        else if(this.type === 'mech') this.color = '#555';
        else if(this.type === 'vehicle') this.color = '#ffaa00';
        else if(this.type === 'nuke') this.color = '#ff0000';
        else if(this.type === 'trap') this.color = '#880000';
        else if(this.type === 'revive') this.color = '#ffffff';
        else if(this.type === 'ult') this.color = '#00ffff';
        
        this.active = true;
        this.life = 600;
    }
    
    update() {
        if(!this.active) return;
        this.life--;
        if(this.life <= 0) this.active = false;
        
        players.forEach(p => {
            if(p.hp > 0 && Math.hypot(p.x - this.x, p.y - this.y) < p.size + this.size) {
                this.active = false;
                if(this.type === 'heal') {
                    p.hp = Math.min(p.maxHp, p.hp + 1);
                    addFloatingText(p.x, p.y - 30, "⭐ 获得星星!", "#00ff00");
                    audio.levelUp();
                } else if(this.type === 'shield') {
                    p.shieldTime = 300;
                    addFloatingText(p.x, p.y - 30, "🛡️ 护盾!", "#0000ff");
                    audio.levelUp();
                } else if(this.type === 'buff') {
                    p.buffTime = 300;
                    addFloatingText(p.x, p.y - 30, "⚡ 攻速提升!", "#00ffff");
                    audio.levelUp();
                } else if(this.type === 'weapon_box') {
                    const idx = Math.floor(Math.random() * p.weapons.length);
                    p.weapon = p.weapons[idx];
                    document.getElementById('current-weapon').textContent = p.weapon.name;
                    addFloatingText(p.x, p.y - 30, `🔫 武器: ${p.weapon.name}`, "#aa00ff");
                    audio.levelUp();
                } else if(this.type === 'mech') {
                    p.mechTime = 600;
                    p.mechHp = 500;
                    addFloatingText(p.x, p.y - 30, "🤖 机甲降临!", "#555555");
                    audio.levelUp();
                } else if(this.type === 'vehicle') {
                    p.vehicleTime = 600;
                    addFloatingText(p.x, p.y - 30, "🏍️ 摩托车!", "#ffaa00");
                    audio.levelUp();
                } else if(this.type === 'nuke') {
                    zombies.forEach(z => { z.active = false; score += z.scoreVal; createParticles(z.x, z.y, z.color, 15); });
                    screenShake = 30;
                    audio.shootShotgun();
                    addFloatingText(CANVAS_W/2, CANVAS_H/2, "☢️ 核弹清屏!", "#ff0000");
                } else if(this.type === 'trap') {
                    p.hp -= 1;
                    addFloatingText(p.x, p.y - 30, "⚠️ 陷阱!", "#ff0000");
                    audio.playerHit();
                } else if(this.type === 'revive') {
                    let deadPlayer = players.find(pl => pl.hp <= 0);
                    if(deadPlayer) {
                        deadPlayer.hp = 3;
                        deadPlayer.isDowned = false;
                        deadPlayer.x = p.x; deadPlayer.y = p.y;
                        addFloatingText(p.x, p.y - 30, "👼 队友复活!", "#ffffff");
                        audio.levelUp();
                    } else {
                        p.hp = Math.min(p.maxHp, p.hp + 1);
                        addFloatingText(p.x, p.y - 30, "⭐ 星星+1", "#ff3333");
                        audio.levelUp();
                    }
                } else if(this.type === 'ult') {
                    p.hasUlt = true;
                    addFloatingText(p.x, p.y - 30, "⚡ 获得大招！按Q或右Shift释放！", "#00ffff");
                    audio.levelUp();
                }
            }
        });
    }
    
    draw(ctx) {
        if(!this.active) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        let text = '?';
        if(this.type === 'heal') text = '+';
        else if(this.type === 'shield') text = 'S';
        else if(this.type === 'buff') text = 'B';
        else if(this.type === 'weapon_box') text = 'W';
        else if(this.type === 'mech') text = 'M';
        else if(this.type === 'vehicle') text = 'V';
        else if(this.type === 'nuke') text = 'N';
        else if(this.type === 'trap') text = 'T';
        else if(this.type === 'revive') text = '👼';
        else if(this.type === 'ult') text = '⚡';
        ctx.fillText(text, this.x, this.y + 4);
    }
}
"""

if "class LootBox" not in code:
    code = code.replace("class Particle {", lootbox_class + "\nclass Particle {")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
