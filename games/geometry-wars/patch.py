import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Update Canvas Size
code = code.replace("const CANVAS_W = 800;", "const CANVAS_W = 1000;")
code = code.replace("const CANVAS_H = 600;", "const CANVAS_H = 800;")

# 2. Add Enter to keys
code = code.replace("Space: false", "Space: false, Enter: false")
code = code.replace("e.code === 'Space' && gameState === 'PLAYING'", "(e.code === 'Space' || e.code === 'Enter') && gameState === 'PLAYING'")
code = code.replace("player.shoot();", "players.forEach(p => { if((e.code==='Space'&&p.id===1) || (e.code==='Enter'&&p.id===2)) p.shoot(); });")

# 3. Change let player to players
code = code.replace("let player;", "let players = [];")
code = code.replace("player = new Player();", "players = [new Player(1), new Player(2)];")

# 4. Update Game Loop
code = code.replace("player.update();", "players.forEach(p => p.update());")
code = code.replace("player.draw(ctx);", "players.forEach(p => p.draw(ctx));")

# 5. Zombie collision logic (needs replacement)
zombie_update_regex = r"const dx = player\.x - this\.x;[\s\S]*?if\(player\.hp <= 0\) \{\s*gameOver\(\);\s*\}\s*\}"
new_zombie_update = """let target = null;
        let minDist = Infinity;
        players.forEach(p => {
            if(p.hp > 0) {
                let d = Math.hypot(p.x - this.x, p.y - this.y);
                if(d < minDist) { minDist = d; target = p; }
            }
        });
        if(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            if(minDist > 0) {
                this.x += (dx / minDist) * this.speed;
                this.y += (dy / minDist) * this.speed;
            }
            if(minDist < this.size + target.size) {
                target.hp -= this.damage;
                audio.playerHit();
                this.active = false;
                createParticles(this.x, this.y, '#ff0000', 10);
                if(players.every(p => p.hp <= 0)) {
                    gameOver();
                }
            }
        }"""
code = re.sub(zombie_update_regex, new_zombie_update, code)

# 6. Zombie Drawing
zombie_draw_regex = r"ctx\.beginPath\(\);\s*ctx\.rect\(this\.x - this\.size, this\.y - this\.size, this\.size\*2, this\.size\*2\);\s*ctx\.fill\(\);"
new_zombie_draw = """ctx.beginPath();
        // pixel style zombie
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
        ctx.fillStyle = '#ff0000'; // red eyes
        ctx.fillRect(this.x - this.size + 4, this.y - this.size + 4, 4, 4);
        ctx.fillRect(this.x + this.size - 8, this.y - this.size + 4, 4, 4);
        ctx.fillStyle = '#336600'; // dark green arms
        ctx.fillRect(this.x - this.size - 4, this.y, 4, 10);
        ctx.fillRect(this.x + this.size, this.y, 4, 10);"""
code = re.sub(zombie_draw_regex, new_zombie_draw, code)

# 7. Player Class Rewrite
player_class_regex = r"class Player \{[\s\S]*?shoot\(\) \{[\s\S]*?ctx\.fillRect\(this\.x - 20, this\.y \+ 25, 40 \* \(this\.hp / this\.maxHp\), 5\);\s*\}"
new_player_class = """class Player {
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
        
        this.weapons = [
            { name: "双持手枪 Pistols", cd: 20, type: "pistol", req: 0 },
            { name: "重型霰弹枪 Shotgun", cd: 35, type: "shotgun", req: 20 },
            { name: "突击步枪 Rifle", cd: 8, type: "machinegun", req: 60 },
            { name: "等离子激光 Laser", cd: 2, type: "laser", req: 150 }
        ];
    }

    update() {
        if(this.hp <= 0) return;
        // Movement
        let dx = 0; let dy = 0;
        if(this.id === 1) {
            if(keys.KeyA) dx -= 1;
            if(keys.KeyD) dx += 1;
            if(keys.KeyW) dy -= 1;
            if(keys.KeyS) dy += 1;
            if(keys.Space) this.shoot();
        } else {
            if(keys.ArrowLeft) dx -= 1;
            if(keys.ArrowRight) dx += 1;
            if(keys.ArrowUp) dy -= 1;
            if(keys.ArrowDown) dy += 1;
            if(keys.Enter) this.shoot();
        }

        if(dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len; dy /= len;
            this.x += dx * this.speed;
            this.y += dy * this.speed;
            this.facing = {x: dx, y: dy};
        }

        this.x = Math.max(this.size, Math.min(CANVAS_W - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CANVAS_H - this.size, this.y));

        if(this.cooldown > 0) this.cooldown--;

        let nextWep = this.weaponLevel + 1;
        if(nextWep < this.weapons.length && killCount >= this.weapons[nextWep].req) {
            this.weaponLevel = nextWep;
            audio.levelUp();
            if(this.id === 1) document.getElementById('current-weapon').textContent = this.weapons[this.weaponLevel].name;
            addFloatingText(this.x, this.y - 30, "武器升级! UPGRADE!", "#00ff66");
            createParticles(this.x, this.y, '#00ff66', 30);
        }
    }

    shoot() {
        if(this.cooldown > 0 || this.hp <= 0) return;
        const wep = this.weapons[this.weaponLevel];
        this.cooldown = wep.cd;
        const bx = this.x + this.facing.x * this.size;
        const by = this.y + this.facing.y * this.size;
        const angle = Math.atan2(this.facing.y, this.facing.x);

        if(wep.type === 'pistol') {
            audio.shootPistol();
            const pX = Math.cos(angle + Math.PI/2) * 5;
            const pY = Math.sin(angle + Math.PI/2) * 5;
            bullets.push(new Bullet(bx + pX, by + pY, this.facing.x, this.facing.y, 10, 20, '#fff'));
            bullets.push(new Bullet(bx - pX, by - pY, this.facing.x, this.facing.y, 10, 20, '#fff'));
        } else if(wep.type === 'shotgun') {
            audio.shootShotgun();
            for(let i = -2; i <= 2; i++) {
                const a = angle + i * 0.2;
                bullets.push(new Bullet(bx, by, Math.cos(a), Math.sin(a), 12, 25, '#ffaa00'));
            }
            this.x -= this.facing.x * 5;
            this.y -= this.facing.y * 5;
        } else if(wep.type === 'machinegun') {
            audio.shootMachine();
            const a = angle + (Math.random() - 0.5) * 0.15;
            bullets.push(new Bullet(bx, by, Math.cos(a), Math.sin(a), 15, 15, '#ffff00'));
        } else if(wep.type === 'laser') {
            audio.shootLaser();
            bullets.push(new Bullet(bx, by, this.facing.x, this.facing.y, 25, 10, '#00ffff', true));
        }
    }

    draw(ctx) {
        if(this.hp <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Body (nice circle with border)
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Helmet/Visor
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(this.size * 0.3, 0, this.size * 0.6, -1.2, 1.2);
        ctx.fill();

        // Gun
        ctx.fillStyle = '#aaa';
        ctx.fillRect(10, -5, 20, 10);
        ctx.fillStyle = '#444';
        ctx.fillRect(10, -2, 25, 4);
        
        ctx.restore();

        // HP Bar
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - 20, this.y + 25, 40, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 20, this.y + 25, 40 * (this.hp / this.maxHp), 5);
        
        // Player ID
        ctx.fillStyle = '#fff';
        ctx.font = '12px ZCOOL KuaiLe';
        ctx.textAlign = 'center';
        ctx.fillText('P' + this.id, this.x, this.y - 25);
    }"""
code = re.sub(player_class_regex, new_player_class, code)

# 8. Bullet Update (Homing)
bullet_update_regex = r"update\(\) \{[\s\S]*?this\.active = false;\s*\}"
new_bullet_update = """update() {
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
    }"""
code = re.sub(bullet_update_regex, new_bullet_update, code)

# 9. Fix weapon update text to use player 1's or player 2's?
# Added in the class above.

# 10. Update floating text in game reset
code = code.replace("document.getElementById('current-weapon').textContent = player.weapons[0].name;", "document.getElementById('current-weapon').textContent = players[0].weapons[0].name;")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
