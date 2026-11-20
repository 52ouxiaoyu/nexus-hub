import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Add global vars for Hit Stop, Flash, Waves, Barrels
globals_add = """let hitStopFrames = 0;
let flashFrames = 0;
let currentWave = 1;
let waveTimer = 0;
let barrels = [];

class Barrel {
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
}
"""

code = code.replace("let activeEvent = null;", globals_add + "\nlet activeEvent = null;")

# 2. Modify startGame to reset vars and spawn barrels
start_game_mod = """    lootBoxes = [];
    barrels = [];
    for(let i=0; i<5; i++) barrels.push(new Barrel(Math.random()*(CANVAS_W-200)+100, Math.random()*(CANVAS_H-200)+100));
    currentWave = 1;
    waveTimer = 0;
    hitStopFrames = 0;
    flashFrames = 0;"""

code = code.replace("    lootBoxes = [];", start_game_mod)

# 3. Modify update() to handle Wave system
update_start = """function update() {
    if(gameState !== 'PLAYING') return;
    frameCount++;"""

update_wave = """function update() {
    if(gameState !== 'PLAYING') return;
    frameCount++;
    
    // Wave System
    waveTimer++;
    if(waveTimer > 3600) { // 60 seconds per wave
        currentWave++;
        waveTimer = 0;
        addFloatingText(CANVAS_W/2, CANVAS_H/2, `🚨 第 ${currentWave} 波 尸潮来袭! 🚨`, "#ff0000");
        screenShake = 20;
        audio.levelUp();
        // Spawn Wave Boss
        for(let i=0; i<Math.floor(currentWave/2)+1; i++) {
            zombies.push(new Zombie(true));
        }
        // Spawn new barrels
        for(let i=0; i<3; i++) barrels.push(new Barrel(Math.random()*(CANVAS_W-200)+100, Math.random()*(CANVAS_H-200)+100));
    }
"""

code = code.replace(update_start, update_wave)

# 4. Modify bullet collision to hit barrels
bullet_col_old = """    // Collisions
    for(let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if(!b.active) continue;
        for(let j = zombies.length - 1; j >= 0; j--) {"""

bullet_col_new = """    // Collisions
    for(let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if(!b.active) continue;
        
        // Check Barrels
        barrels.forEach(barrel => {
            if(barrel.active && Math.hypot(b.x - barrel.x, b.y - barrel.y) < barrel.size + b.size) {
                barrel.hp -= b.damage;
                if(!b.pierce) b.active = false;
                if(barrel.hp <= 0) {
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
                }
            }
        });

        for(let j = zombies.length - 1; j >= 0; j--) {"""

code = code.replace(bullet_col_old, bullet_col_new)

# 5. Modify Boss Death for hitstop and flash
boss_death_old = """                    // 怪物死亡掉落道具
                    if(z.isBoss) {
                        lootBoxes.push(new LootBox(z.x, z.y));
                        lootBoxes.push(new LootBox(z.x+30, z.y+30));
                        lootBoxes.push(new LootBox(z.x-30, z.y-30));
                    }"""

boss_death_new = """                    // 怪物死亡掉落道具
                    if(z.isBoss) {
                        lootBoxes.push(new LootBox(z.x, z.y));
                        lootBoxes.push(new LootBox(z.x+30, z.y+30));
                        lootBoxes.push(new LootBox(z.x-30, z.y-30));
                        hitStopFrames = 12; // 0.2s freeze
                        flashFrames = 15;
                        screenShake = 30;
                        addFloatingText(CANVAS_W/2, CANVAS_H/2, "🌟 斩杀目标! 🌟", "#ffff00");
                    }"""

code = code.replace(boss_death_old, boss_death_new)

# 6. Modify gameLoop to use hitStopFrames
game_loop_old = """function gameLoop(timestamp) {
    if(gameState !== 'PLAYING') return;
    
    try {
        update();
        draw();
    } catch(e) {"""

game_loop_new = """function gameLoop(timestamp) {
    if(gameState !== 'PLAYING') return;
    
    try {
        if(hitStopFrames > 0) {
            hitStopFrames--;
        } else {
            update();
        }
        draw();
        if(flashFrames > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flashFrames / 15})`;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            flashFrames--;
        }
    } catch(e) {"""

code = code.replace(game_loop_old, game_loop_new)

# 7. Draw Barrels
draw_old = """    lootBoxes.forEach(lb => lb.draw(ctx));"""
draw_new = """    barrels.forEach(b => b.draw(ctx));
    lootBoxes.forEach(lb => lb.draw(ctx));"""
code = code.replace(draw_old, draw_new)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
