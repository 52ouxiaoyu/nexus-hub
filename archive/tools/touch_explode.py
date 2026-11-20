import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_barrel = """class Barrel {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = 20;
        this.hp = 50;
        this.active = true;
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 15, this.y - 20, 30, 40);
        ctx.fillStyle = '#111';
        ctx.fillRect(this.x - 15, this.y - 10, 30, 5);
        ctx.fillRect(this.x - 15, this.y + 5, 30, 5);
        ctx.fillStyle = '#ffaa00';
        ctx.font = '16px Arial';
        ctx.fillText('☢️', this.x, this.y+5);
    }
}"""

new_barrel = """class Barrel {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = 20;
        this.hp = 50;
        this.active = true;
        this.dropY = -500; // For drop animation
    }
    update() {
        if(!this.active) return;
        if(this.dropY < 0) {
            this.dropY += 15;
            if(this.dropY >= 0) {
                this.dropY = 0;
                screenShake = 5;
            }
            return; // Don't explode while dropping
        }
        
        let shouldExplode = false;
        zombies.forEach(z => {
            if(z.active && Math.hypot(z.x - this.x, z.y - this.y) < this.size + z.size) shouldExplode = true;
        });
        players.forEach(p => {
            if(p.hp > 0 && Math.hypot(p.x - this.x, p.y - this.y) < this.size + p.size) shouldExplode = true;
        });
        
        if(shouldExplode || this.hp <= 0) {
            this.explode();
        }
    }
    explode() {
        if(!this.active) return;
        this.active = false;
        createParticles(this.x, this.y, '#ffaa00', 50);
        audio.shootShotgun();
        screenShake = 20;
        zombies.forEach(z => {
            if(z.active && Math.hypot(z.x - this.x, z.y - this.y) < 150) z.hp -= 500;
        });
        players.forEach(p => {
            if(p.hp > 0 && Math.hypot(p.x - this.x, p.y - this.y) < 100) {
                p.hp -= 5;
                audio.playerHit();
            }
        });
        addFloatingText(this.x, this.y, "💥 轰隆!", "#ff5500");
    }
    draw(ctx) {
        if(!this.active) return;
        let drawY = this.y + this.dropY;
        
        // Draw warning shadow if dropping
        if(this.dropY < 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 20 + this.dropY/10, 10 + this.dropY/20, 0, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 15, drawY - 20, 30, 40);
        ctx.fillStyle = '#111';
        ctx.fillRect(this.x - 15, drawY - 10, 30, 5);
        ctx.fillRect(this.x - 15, drawY + 5, 30, 5);
        ctx.fillStyle = '#ffaa00';
        ctx.font = '16px Arial';
        ctx.fillText('☢️', this.x, drawY+5);
    }
}"""

code = code.replace(old_barrel, new_barrel)

# Now remove the old explode logic from Bullet loop
old_bullet_barrel = """                if(barrel.hp <= 0) {
                    barrel.active = false;
                    createParticles(barrel.x, barrel.y, '#ffaa00', 50);
                    audio.shootShotgun();
                    screenShake = 20;
                    // Explosion damage
                    zombies.forEach(z => {
                        if(z.active && Math.hypot(z.x - barrel.x, z.y - barrel.y) < 150) {
                            z.hp -= 500;
                        }
                    });
                    players.forEach(p => {
                        if(p.hp > 0 && Math.hypot(p.x - barrel.x, p.y - barrel.y) < 100) {
                            p.hp -= 5;
                            audio.playerHit();
                        }
                    });
                    addFloatingText(barrel.x, barrel.y, "💥 轰隆!", "#ff5500");
                }"""
new_bullet_barrel = "                if(barrel.hp <= 0) barrel.explode();"
code = code.replace(old_bullet_barrel, new_bullet_barrel)

# Add periodic barrel drops
barrel_drop_logic = """
    // Periodic Barrel Drops from sky
    if(frameCount % 400 === 0) {
        let bx = camera.x + (Math.random()-0.5)*CANVAS_W*0.8;
        let by = camera.y + (Math.random()-0.5)*CANVAS_H*0.8;
        barrels.push(new Barrel(bx, by));
        addFloatingText(bx, by, "🛬 空投炸弹!", "#ff5500");
    }
"""

code = code.replace("    if(frameCount % Math.max(5, spawnRate) === 0) {", barrel_drop_logic + "\n    if(frameCount % Math.max(5, spawnRate) === 0) {")

# Also add barrels.forEach(b => b.update()) in update() loop
code = code.replace("    lootBoxes.forEach(lb => lb.update());", "    barrels.forEach(b => b.update());\n    lootBoxes.forEach(lb => lb.update());")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
