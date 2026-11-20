import re

with open("zombie-shooter/game.js", "r") as f:
    current_game = f.read()

with open("zombie-shooter/old_game.js", "r") as f:
    old_game = f.read()

# Extract Player and Bullet from old_game
player_start = old_game.find("class Player {")
bullet_start = old_game.find("class Bullet {")
zombie_start = old_game.find("class Zombie {")

old_player_bullet = old_game[player_start:zombie_start]

# Modify Player to support multiplayer and buffs
player_code = """class Player {
    constructor(id) {
        this.id = id;
        this.x = CANVAS_W / 2 + (id === 1 ? -50 : 50);
        this.y = CANVAS_H / 2;
        this.size = 20;
        this.speed = 5;
        this.color = id === 1 ? '#00bfff' : '#ff9900';
        this.facing = {x: 1, y: 0}; // default facing right
        this.hp = 100;
        this.maxHp = 100;
        this.weaponLevel = 0;
        this.cooldown = 0;
        this.buffTime = 0;
        this.shieldTime = 0;
        
        this.weapons = [
            { name: "双持手枪 Pistols", cd: 20, type: "pistol", req: 0 },
            { name: "重型霰弹枪 Shotgun", cd: 35, type: "shotgun", req: 20 },
            { name: "突击步枪 Rifle", cd: 8, type: "machinegun", req: 60 },
            { name: "等离子激光 Laser", cd: 2, type: "laser", req: 150 }
        ];
    }

    update() {
        if(this.cooldown > 0 && this.buffTime <= 0) this.cooldown--;
        if(this.buffTime > 0) this.buffTime--;
        if(this.shieldTime > 0) this.shieldTime--;

        let dx = 0; let dy = 0;
        let currentSpeed = this.buffTime > 0 ? this.speed * 1.5 : this.speed;
        if(this.id === 1) {
            if(keys.KeyW) dy -= 1;
            if(keys.KeyS) dy += 1;
            if(keys.KeyA) dx -= 1;
            if(keys.KeyD) dx += 1;
        } else {
            if(keys.ArrowUp) dy -= 1;
            if(keys.ArrowDown) dy += 1;
            if(keys.ArrowLeft) dx -= 1;
            if(keys.ArrowRight) dx += 1;
        }

        if(dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len; dy /= len;
            this.facing = {x: dx, y: dy};
        }

        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;

        this.x = Math.max(this.size, Math.min(CANVAS_W - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CANVAS_H - this.size, this.y));

        // Check weapon level up
        for(let i = this.weapons.length - 1; i >= 0; i--) {
            if(killCount >= this.weapons[i].req) {
                if(this.weaponLevel !== i) {
                    this.weaponLevel = i;
                    audio.levelUp();
                    addFloatingText(this.x, this.y - 30, "WEAPON UPGRADE!", "#ffff00");
                    if(this.id === 1) document.getElementById('current-weapon').textContent = this.weapons[i].name;
                }
                break;
            }
        }
    }

    shoot() {
        if(this.hp <= 0 || this.cooldown > 0) return;
        const w = this.weapons[this.weaponLevel];
        this.cooldown = w.cd;
        
        let fx = this.facing.x;
        let fy = this.facing.y;
        
        audio.shoot();
        
        if(w.type === "pistol") {
            bullets.push(new Bullet(this.x, this.y, fx, fy, 10, 20, '#fff'));
            bullets.push(new Bullet(this.x, this.y, -fx, -fy, 10, 20, '#fff'));
        } else if(w.type === "shotgun") {
            for(let i = -2; i <= 2; i++) {
                let angle = Math.atan2(fy, fx) + i * 0.2;
                bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 12, 15, '#ffaa00'));
            }
        } else if(w.type === "machinegun") {
            let angle = Math.atan2(fy, fx) + (Math.random() - 0.5) * 0.2;
            bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 15, 18, '#00ffff'));
        } else if(w.type === "laser") {
            bullets.push(new Bullet(this.x, this.y, fx, fy, 25, 30, '#ff00ff', true));
        }
    }

    draw(ctx) {
        if(this.hp <= 0) return;
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

        // Player ID
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

        // HP Bar
        if(this.hp < this.maxHp) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(this.x - 15, this.y + 25, 30, 4);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - 15, this.y + 25, 30 * (this.hp/this.maxHp), 4);
        }
    }
}

class Bullet {
    constructor(x, y, dx, dy, speed, damage, color, pierce=false) {
        this.x = x; this.y = y;
        this.dx = dx; this.dy = dy;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.pierce = pierce;
        this.size = pierce ? 4 : 3;
        this.active = true;
    }
    update() {
        let closestDist = 200;
        let target = null;
        zombies.forEach(z => {
            if (!z.active) return;
            let d = Math.hypot(z.x - this.x, z.y - this.y);
            if(d < closestDist) { closestDist = d; target = z; }
        });
        if(target) {
            const idealDx = (target.x - this.x) / closestDist;
            const idealDy = (target.y - this.y) / closestDist;
            this.dx = this.dx * 0.9 + idealDx * 0.1;
            this.dy = this.dy * 0.9 + idealDy * 0.1;
            const len = Math.hypot(this.dx, this.dy);
            this.dx /= len; this.dy /= len;
        }
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;
        if(this.x < 0 || this.x > CANVAS_W || this.y < 0 || this.y > CANVAS_H) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if(this.pierce) {
            ctx.arc(this.x, this.y, this.size+2, 0, Math.PI*2);
        } else {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        }
        ctx.fill();
    }
}
"""

cur_player_start = current_game.find("class Player {")
cur_zombie_start = current_game.find("class Zombie {")

new_game = current_game[:cur_player_start] + player_code + "\n" + current_game[cur_zombie_start:]

with open("zombie-shooter/game.js", "w") as f:
    f.write(new_game)
