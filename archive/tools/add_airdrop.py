import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Add new global arrays
code = code.replace("let lootBoxes = [];", "let lootBoxes = [];\nlet boars = [];")
code = code.replace("let lootTimer = 0;", "let lootTimer = 0;\nlet boars = []; // double safe")

# Modify Player to support Mech and Vehicle
player_constructor_regex = r"(this\.shieldTime = 0;)"
new_player_vars = """\\1
        this.mechTime = 0;
        this.mechHp = 0;
        this.vehicleTime = 0;"""
code = re.sub(player_constructor_regex, new_player_vars, code)

# Player Update to handle buffs and vehicle ramming
player_update_regex = r"let dx = 0; let dy = 0;\s*let currentSpeed = this\.buffTime > 0 \? this\.speed \* 1\.5 : this\.speed;"
new_player_update = """
        if(this.mechTime > 0) this.mechTime--;
        if(this.vehicleTime > 0) {
            this.vehicleTime--;
            // Vehicle ramming
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < this.size + z.size + 10) {
                    z.active = false;
                    score += z.scoreVal;
                    killCount++;
                    createParticles(z.x, z.y, '#ff0000', 15);
                    audio.zombieDie();
                    addFloatingText(z.x, z.y, "车祸现场!", "#ffcc00");
                }
            });
        }
        let dx = 0; let dy = 0;
        let currentSpeed = this.speed;
        if(this.buffTime > 0) currentSpeed *= 1.5;
        if(this.mechTime > 0) currentSpeed *= 0.6; // Mech is slow
        if(this.vehicleTime > 0) currentSpeed *= 3.0; // Vehicle is fast
"""
code = re.sub(player_update_regex, new_player_update, code)

# Player shoot to handle Mech
player_shoot_regex = r"audio\.shoot\(\);\s*if\(w\.type === \"pistol\"\)"
new_player_shoot = """
        if(this.vehicleTime > 0) return; // Cannot shoot while driving
        
        audio.shoot();
        if(this.mechTime > 0) {
            // Mech shoots 360 degree lasers and huge missiles
            for(let i=0; i<8; i++) {
                let angle = Math.PI/4 * i + (frameCount*0.1);
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 50, '#ff0000', true));
            }
            return;
        }

        if(w.type === "pistol")"""
code = re.sub(player_shoot_regex, new_player_shoot, code)

# Player draw to handle Mech and Vehicle
player_draw_regex = r"ctx\.fillStyle = this\.color;\s*ctx\.beginPath\(\);\s*ctx\.arc\(this\.x, this\.y, this\.size, 0, Math\.PI\*2\);\s*ctx\.fill\(\);\s*ctx\.strokeStyle = '#fff';\s*ctx\.lineWidth = 2;\s*ctx\.stroke\(\);\s*// Visor\s*ctx\.fillStyle = '#111';\s*ctx\.beginPath\(\);\s*ctx\.arc\(this\.x \+ this\.facing\.x \* 10, this\.y \+ this\.facing\.y \* 10, 8, 0, Math\.PI\*2\);\s*ctx\.fill\(\);\s*// Gun\s*ctx\.strokeStyle = '#555';\s*ctx\.lineWidth = 6;\s*ctx\.beginPath\(\);\s*ctx\.moveTo\(this\.x, this\.y\);\s*ctx\.lineTo\(this\.x \+ this\.facing\.x \* 25, this\.y \+ this\.facing\.y \* 25\);\s*ctx\.stroke\(\);"
new_player_draw = """
        if(this.mechTime > 0) {
            // Draw Mech
            ctx.fillStyle = '#444';
            ctx.fillRect(this.x - 30, this.y - 30, 60, 60);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x + this.facing.x*20 - 5, this.y + this.facing.y*20 - 5, 10, 10);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.facing.x*40, this.y + this.facing.y*40); ctx.stroke();
        } else if(this.vehicleTime > 0) {
            // Draw Motorcycle
            ctx.fillStyle = '#ff3300';
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
            ctx.fillRect(-20, -10, 40, 20);
            ctx.fillStyle = '#222'; // wheels
            ctx.fillRect(-15, -15, 10, 5); ctx.fillRect(-15, 10, 10, 5);
            ctx.fillRect(15, -15, 10, 5); ctx.fillRect(15, 10, 10, 5);
            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Visor
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(this.x + this.facing.x * 10, this.y + this.facing.y * 10, 8, 0, Math.PI*2);
            ctx.fill();

            // Gun
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.facing.x * 25, this.y + this.facing.y * 25);
            ctx.stroke();
        }
"""
code = re.sub(player_draw_regex, new_player_draw, code)

# Player damage handling for Mech
zombie_dmg_regex = r"if\(target\.shieldTime <= 0\) \{\s*target\.hp -= this\.damage;\s*audio\.playerHit\(\);\s*\}"
new_zombie_dmg = """if(target.shieldTime <= 0) {
                    if(target.mechTime > 0) {
                        target.mechHp -= this.damage;
                        if(target.mechHp <= 0) target.mechTime = 0; // mech destroyed
                        audio.playerHit();
                    } else if(target.vehicleTime <= 0) {
                        target.hp -= this.damage;
                        audio.playerHit();
                    }
                }"""
code = re.sub(zombie_dmg_regex, new_zombie_dmg, code)

# Replace LootBox with Airdrop logic
lootbox_class_regex = r"class LootBox \{[\s\S]*?(?=class Particle)"
airdrop_class = """
class WildBoar {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = 25;
        this.dx = (Math.random() - 0.5) * 20;
        this.dy = (Math.random() - 0.5) * 20;
        this.active = true;
        this.life = 600; // 10 seconds
    }
    update() {
        this.life--;
        if(this.life <= 0) this.active = false;
        this.x += this.dx;
        this.y += this.dy;
        if(this.x < 0 || this.x > CANVAS_W) this.dx *= -1;
        if(this.y < 0 || this.y > CANVAS_H) this.dy *= -1;
        
        // Kill zombies
        zombies.forEach(z => {
            if(!z.active) return;
            if(Math.hypot(z.x - this.x, z.y - this.y) < this.size + z.size) {
                z.active = false; score += z.scoreVal; killCount++;
                createParticles(z.x, z.y, '#ff0000', 10);
                addFloatingText(z.x, z.y, "野猪冲撞!", "#ff9900");
            }
        });
    }
    draw(ctx) {
        ctx.fillStyle = '#8B4513';
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.dy, this.dx));
        // Boar body
        ctx.fillRect(-15, -10, 30, 20);
        // Tusks
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(15, -8); ctx.lineTo(25, -12); ctx.lineTo(15, -4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(25, 12); ctx.lineTo(15, 4); ctx.fill();
        ctx.restore();
    }
}

class LootBox {
    constructor() {
        this.x = 100 + Math.random() * (CANVAS_W - 200);
        this.y = 100 + Math.random() * (CANVAS_H - 200);
        this.z = 500; // Height for airdrop
        this.size = 20;
        this.active = true;
        this.color = '#ffd700'; // gold
        
        const r = Math.random();
        if(r < 0.1) this.type = 'mech';       // 10% Mech
        else if(r < 0.2) this.type = 'vehicle';// 10% Motorcycle
        else if(r < 0.3) this.type = 'boar';   // 10% Wild Boar
        else if(r < 0.4) this.type = 'nuke';   // 10% Nuke
        else if(r < 0.6) this.type = 'medkit'; // 20% Medkit
        else if(r < 0.8) this.type = 'stim';   // 20% Stimpack
        else this.type = 'trap';               // 20% Trap
    }
    update() {
        if(this.z > 0) {
            this.z -= 3; // Fall speed
            if(this.z <= 0) {
                this.z = 0;
                createParticles(this.x, this.y, '#fff', 20); // Landing dust
                audio.levelUp();
                
                // If it's a boar, it spawns immediately upon landing
                if(this.type === 'boar') {
                    this.active = false;
                    boars.push(new WildBoar(this.x, this.y));
                    addFloatingText(this.x, this.y, "🐗 疯狂野猪出笼!!", "#ff5500");
                }
            }
            return; // Can't collect while falling
        }

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
        audio.levelUp();
        createParticles(this.x, this.y, this.color, 30);
        
        switch(this.type) {
            case 'mech':
                p.mechTime = 900; // 15 seconds
                p.mechHp = 500;
                addFloatingText(this.x, this.y, "🤖 终极机甲降临!!", "#ff00ff");
                break;
            case 'vehicle':
                p.vehicleTime = 600; // 10 seconds
                addFloatingText(this.x, this.y, "🏍️ 暴走摩托!!", "#ff3300");
                break;
            case 'medkit':
                p.hp = Math.min(p.maxHp, p.hp + 50);
                addFloatingText(this.x, this.y, "急救包! HP +50", "#00ff00");
                break;
            case 'nuke':
                zombies.forEach(z => { z.active = false; createParticles(z.x, z.y, '#ffaa00', 10); score += z.scoreVal; killCount++; });
                addFloatingText(this.x, this.y, "☢️ 核弹轰炸! 全屏秒杀", "#ffaa00");
                break;
            case 'stim':
                p.buffTime = 300;
                addFloatingText(this.x, this.y, "⚡ 兴奋剂! 极速射击", "#00ffff");
                break;
            case 'trap':
                p.hp -= 30;
                audio.playerHit();
                addFloatingText(this.x, this.y, "💣 炸弹陷阱! -30 HP", "#ff0000");
                if(p.hp <= 0 && players.every(pl => pl.hp <= 0)) gameOver();
                break;
        }
    }
    draw(ctx) {
        if(!this.active) return;
        
        if(this.z > 0) {
            // Draw shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 - this.z/500), 0, Math.PI*2);
            ctx.fill();
            
            // Draw parachute
            let py = this.y - this.z;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, py - 30, 40, Math.PI, 0);
            ctx.fill();
            // Strings
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(this.x - 40, py - 30); ctx.lineTo(this.x - 10, py); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(this.x + 40, py - 30); ctx.lineTo(this.x + 10, py); ctx.stroke();
            
            // Draw Box
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - 15, py - 15, 30, 30);
            ctx.fillStyle = '#000'; ctx.font = '20px Arial'; ctx.fillText('🎁', this.x, py + 5);
        } else {
            // Landed box
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
            
            const offset = Math.sin(frameCount * 0.1) * 3;
            ctx.fillStyle = '#000';
            ctx.font = '24px Arial';
            ctx.fillText('🎁', this.x, this.y + 8 + offset);
        }
    }
}
"""
code = re.sub(lootbox_class_regex, airdrop_class, code)

# Update game loop
game_loop_update_regex = r"floatingTexts\.forEach\(ft => \{ ft\.y -= 1; ft\.life -= 0\.02; \}\);"
new_game_loop_update = """floatingTexts.forEach(ft => { ft.y -= 1; ft.life -= 0.02; });
    if(typeof boars !== 'undefined') boars.forEach(b => b.update());"""
code = re.sub(game_loop_update_regex, new_game_loop_update, code)

game_loop_draw_regex = r"lootBoxes\.forEach\(lb => lb\.draw\(ctx\)\);"
new_game_loop_draw = """lootBoxes.forEach(lb => lb.draw(ctx));
    if(typeof boars !== 'undefined') boars.forEach(b => b.draw(ctx));"""
code = re.sub(game_loop_draw_regex, new_game_loop_draw, code)

game_loop_clean_regex = r"lootBoxes = lootBoxes\.filter\(lb => lb\.active\);"
new_game_loop_clean = """lootBoxes = lootBoxes.filter(lb => lb.active);
    if(typeof boars !== 'undefined') boars = boars.filter(b => b.active);"""
code = re.sub(game_loop_clean_regex, new_game_loop_clean, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)

