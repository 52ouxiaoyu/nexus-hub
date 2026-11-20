import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Add globals: camera, buildings, bloodStains
camera_code = """
let camera = {x: 0, y: 0};
let buildings = [];
let bloodStains = [];
let generatedChunks = new Set();
const CHUNK_SIZE = 800;

class Building {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    draw(ctx) {
        // Draw 3D-ish roof effect
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 10, this.y + 10, this.w - 20, this.h - 20);
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
}

class Blood {
    constructor(x, y, w, h, color) {
        this.x = x; this.y = y; this.w = w; this.h = h; this.color = color;
        this.life = 1.0;
    }
    draw(ctx) {
        if(this.life <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.globalAlpha = 1.0;
    }
}
"""
code = code.replace("let barrels = [];", "let barrels = [];\n" + camera_code)


# 2. Add building collision helper
helper_code = """
function resolveBuildingCollision(obj) {
    buildings.forEach(b => {
        let testX = obj.x;
        let testY = obj.y;
        if (obj.x < b.x) testX = b.x; else if (obj.x > b.x + b.w) testX = b.x + b.w;
        if (obj.y < b.y) testY = b.y; else if (obj.y > b.y + b.h) testY = b.y + b.h;
        let distX = obj.x - testX;
        let distY = obj.y - testY;
        let distance = Math.hypot(distX, distY);
        let s = obj.size || 15;
        if (distance < s) {
            let overlap = s - distance;
            if(distance === 0) { distX = 1; distY = 0; distance = 1; }
            obj.x += (distX / distance) * overlap;
            obj.y += (distY / distance) * overlap;
        }
    });
}
"""
code = code.replace("class Bullet {", helper_code + "\nclass Bullet {")


# 3. Modify startGame
start_mod = """    buildings = [];
    bloodStains = [];
    generatedChunks.clear();
    camera = {x: CANVAS_W/2, y: CANVAS_H/2};"""
code = code.replace("    barrels = [];", "    barrels = [];\n" + start_mod)


# 4. Remove player bounds, AI dodge borders, and add building collision
# Find: this.x = Math.max(this.size, Math.min(CANVAS_W - this.size, this.x));
# Replace with: resolveBuildingCollision(this);
code = re.sub(r"this\.x = Math\.max\(this\.size, Math\.min\(CANVAS_W - this\.size, this\.x\)\);\s*this\.y = Math\.max\(this\.size, Math\.min\(CANVAS_H - this\.size, this\.y\)\);", "resolveBuildingCollision(this);", code)

# Remove AI borders:
# if(this.x < 50) dx = 1;
# if(this.x > CANVAS_W - 50) dx = -1;
# if(this.y < 50) dy = 1;
# if(this.y > CANVAS_H - 50) dy = -1;
ai_borders_regex = r"if\(this\.x < 50\) dx = 1;\s*if\(this\.x > CANVAS_W - 50\) dx = -1;\s*if\(this\.y < 50\) dy = 1;\s*if\(this\.y > CANVAS_H - 50\) dy = -1;"
code = re.sub(ai_borders_regex, "", code)


# 5. Remove Zombie bounds and add building collision
# if(this.x < 0 || this.x > CANVAS_W || this.y < 0 || this.y > CANVAS_H) this.active = false;
zombie_bounds_regex = r"if\(this\.x < 0 \|\| this\.x > CANVAS_W \|\| this\.y < 0 \|\| this\.y > CANVAS_H\) this\.active = false;"
code = re.sub(zombie_bounds_regex, "resolveBuildingCollision(this);", code)


# 6. Bullet bounds
bullet_bounds_regex = r"if\(this\.x < 0 \|\| this\.x > CANVAS_W \|\| this\.y < 0 \|\| this\.y > CANVAS_H\) this\.active = false;"
new_bullet_bounds = """        if(Math.hypot(this.x - camera.x, this.y - camera.y) > 2000) this.active = false;
        buildings.forEach(b => {
            if(this.x > b.x && this.x < b.x + b.w && this.y > b.y && this.y < b.y + b.h) {
                this.active = false;
                createParticles(this.x, this.y, '#fff', 3);
            }
        });"""
code = re.sub(bullet_bounds_regex, new_bullet_bounds, code)


# 7. Update blood stains instead of bgCtx
bgCtx_regex = r"bgCtx\.fillStyle = '#800000';\s*for\(let b=0; b<5; b\+\+\) bgCtx\.fillRect\(z\.x \+ \(Math\.random\(\)-0\.5\)\*40, z\.y \+ \(Math\.random\(\)-0\.5\)\*40, Math\.random\(\)\*8\+4, Math\.random\(\)\*8\+4\);"
new_blood = """for(let b=0; b<5; b++) bloodStains.push(new Blood(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4, '#800000'));"""
code = re.sub(bgCtx_regex, new_blood, code)

# Also for exploder self damage
bgCtx_ex_regex = r"bgCtx\.fillStyle = '#800000';\s*for\(let b=0; b<5; b\+\+\) bgCtx\.fillRect\(z\.x \+ \(Math\.random\(\)-0\.5\)\*40, z\.y \+ \(Math\.random\(\)-0\.5\)\*40, Math\.random\(\)\*8\+4, Math\.random\(\)\*8\+4\);"
# Wait, let's just replace all instances of bgCtx usage.
bgCtx_usage = """                    bgCtx.fillStyle = '#800000';
                    for(let b=0; b<5; b++) bgCtx.fillRect(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4);"""
code = code.replace(bgCtx_usage, new_blood)
code = code.replace(bgCtx_usage, new_blood) # Just in case

# Vehicle ramming blood
vehicle_blood_old = """for(let b=0; b<5; b++) bgCtx.fillRect(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4);"""
vehicle_blood_new = """for(let b=0; b<5; b++) bloodStains.push(new Blood(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4, '#800000'));"""
code = code.replace(vehicle_blood_old, vehicle_blood_new)


# 8. Update gameLoop fading to fade bloodStains array
# Find: if (frameCount % 2 === 0) { bgCtx... }
fade_old = """    // Gradually fade out blood stains from the background canvas
    if (frameCount % 2 === 0) {
        bgCtx.globalCompositeOperation = 'destination-out';
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.01)';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.globalCompositeOperation = 'source-over';
    }"""
fade_new = """    // Update blood stains
    bloodStains.forEach(b => b.life -= 0.005);
    bloodStains = bloodStains.filter(b => b.life > 0);"""
code = code.replace(fade_old, fade_new)

# 9. In update(), calculate camera and spawn chunks
chunk_update = """
    // Camera Update
    let cx = 0, cy = 0, count = 0;
    players.forEach(p => { if(p.hp > 0) { cx += p.x; cy += p.y; count++; }});
    if(count > 0) {
        camera.x += (cx/count - camera.x) * 0.1;
        camera.y += (cy/count - camera.y) * 0.1;
    }
    
    // World Generation
    let cX = Math.floor(camera.x / CHUNK_SIZE);
    let cY = Math.floor(camera.y / CHUNK_SIZE);
    for(let i = cX - 1; i <= cX + 1; i++) {
        for(let j = cY - 1; j <= cY + 1; j++) {
            let key = `${i},${j}`;
            if(!generatedChunks.has(key)) {
                generatedChunks.add(key);
                // Create 1-3 buildings per chunk
                let numB = Math.floor(Math.random()*3) + 1;
                for(let k=0; k<numB; k++) {
                    let w = 150 + Math.random() * 300;
                    let h = 150 + Math.random() * 300;
                    let bx = i * CHUNK_SIZE + Math.random() * (CHUNK_SIZE - w);
                    let by = j * CHUNK_SIZE + Math.random() * (CHUNK_SIZE - h);
                    buildings.push(new Building(bx, by, w, h));
                }
            }
        }
    }
"""
code = code.replace("    // Wave System", chunk_update + "\n    // Wave System")

# 10. Zombie spawning logic uses camera
z_spawn_old = """        for(let i=0; i<Math.floor(currentWave/2)+1; i++) {
            zombies.push(new Zombie(true));
        }
        // Spawn new barrels
        for(let i=0; i<3; i++) barrels.push(new Barrel(Math.random()*(CANVAS_W-200)+100, Math.random()*(CANVAS_H-200)+100));"""
z_spawn_new = """        for(let i=0; i<Math.floor(currentWave/2)+1; i++) {
            let z = new Zombie(true);
            z.x = camera.x + (Math.random()-0.5)*CANVAS_W;
            z.y = camera.y + (Math.random()-0.5)*CANVAS_H;
            zombies.push(z);
        }
        for(let i=0; i<3; i++) barrels.push(new Barrel(camera.x + (Math.random()-0.5)*CANVAS_W, camera.y + (Math.random()-0.5)*CANVAS_H));"""
code = code.replace(z_spawn_old, z_spawn_new)

# Spawning logic inside update()
# if(frameCount % spawnRate === 0) { ... new Zombie() ... }
# Let's write a regex to replace the random spawn of zombie and boar
spawn_regex = r"if\(frameCount % spawnRate === 0\) \{\s*let z = new Zombie\(\);\s*zombies\.push\(z\);\s*\}"
new_spawn = """if(frameCount % spawnRate === 0) {
        let z = new Zombie();
        // Spawn around camera
        let angle = Math.random() * Math.PI * 2;
        let radius = Math.max(CANVAS_W, CANVAS_H) * 0.6;
        z.x = camera.x + Math.cos(angle) * radius;
        z.y = camera.y + Math.sin(angle) * radius;
        zombies.push(z);
    }"""
code = re.sub(spawn_regex, new_spawn, code)

# 11. draw() method
# We need to offset drawing by camera
draw_old = """function draw() {
    ctx.save();
    
    if(screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
        screenShake *= 0.9;
        if(screenShake < 1) screenShake = 0;
    }
    
    // Initial draw
    if(activeEvent === 'bloodmoon') {
        ctx.fillStyle = '#300';
    } else {
        ctx.fillStyle = '#111';
    }
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_W; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,CANVAS_H); ctx.stroke(); }
    for(let i=0; i<CANVAS_H; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(CANVAS_W,i); ctx.stroke(); }
    
    // Draw Blood Stains
    ctx.drawImage(bgCanvas, 0, 0);

    particles.forEach(p => p.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    zombies.forEach(z => z.draw(ctx));
    if(players) players.forEach(p => p.draw(ctx));

    barrels.forEach(b => b.draw(ctx));
    lootBoxes.forEach(lb => lb.draw(ctx));
    if(typeof boars !== 'undefined') boars.forEach(b => b.draw(ctx));
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px "ZCOOL KuaiLe"';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
    });"""

draw_new = """function draw() {
    ctx.save();
    
    if(activeEvent === 'bloodmoon') {
        ctx.fillStyle = '#300';
    } else {
        ctx.fillStyle = '#111';
    }
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    
    if(screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
        screenShake *= 0.9;
        if(screenShake < 1) screenShake = 0;
    }

    ctx.save();
    ctx.translate(CANVAS_W/2 - camera.x, CANVAS_H/2 - camera.y);

    // Draw Grid (Infinite)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    let offsetX = camera.x % 40;
    let offsetY = camera.y % 40;
    let startX = camera.x - CANVAS_W/2 - 40;
    let startY = camera.y - CANVAS_H/2 - 40;
    for(let i=startX - (startX%40); i<startX + CANVAS_W + 80; i+=40) { ctx.beginPath(); ctx.moveTo(i, startY); ctx.lineTo(i, startY + CANVAS_H + 80); ctx.stroke(); }
    for(let i=startY - (startY%40); i<startY + CANVAS_H + 80; i+=40) { ctx.beginPath(); ctx.moveTo(startX, i); ctx.lineTo(startX + CANVAS_W + 80, i); ctx.stroke(); }
    
    bloodStains.forEach(b => b.draw(ctx));
    buildings.forEach(b => b.draw(ctx));
    barrels.forEach(b => b.draw(ctx));
    lootBoxes.forEach(lb => lb.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    zombies.forEach(z => z.draw(ctx));
    if(players) players.forEach(p => p.draw(ctx));
    
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px "ZCOOL KuaiLe"';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
    });

    ctx.restore();"""

code = code.replace(draw_old, draw_new)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
