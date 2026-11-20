import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Add globals for Juice (screenShake, combo, bgCanvas)
globals_regex = r"let frameCount = 0;"
new_globals = """let frameCount = 0;
let screenShake = 0;
let comboCount = 0;
let comboTimer = 0;
let bgCanvas = document.createElement('canvas');
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;
let bgCtx = bgCanvas.getContext('2d');"""
code = re.sub(globals_regex, new_globals, code)

# Update resize logic for bgCanvas
resize_regex = r"window\.addEventListener\('resize', \(\) => \{(.*?)\}\);"
def resize_repl(m):
    return f"window.addEventListener('resize', () => {{{m.group(1)}\n    bgCanvas.width = CANVAS_W;\n    bgCanvas.height = CANVAS_H;\n}});"
code = re.sub(resize_regex, resize_repl, code, flags=re.DOTALL)

# 2. Add screen shake to update
update_regex = r"if\(gameState !== 'PLAYING'\) return;\s*frameCount\+\+;"
new_update = """if(gameState !== 'PLAYING') return;
    frameCount++;
    if(screenShake > 0) screenShake--;
    if(comboTimer > 0) {
        comboTimer--;
        if(comboTimer <= 0) {
            if(comboCount >= 10) addFloatingText(CANVAS_W/2, 150, `🔥 ${comboCount} 连杀终结!`, '#ffaa00');
            comboCount = 0;
        }
    }"""
code = re.sub(update_regex, new_update, code)

# 3. Add blood splatter and combo on zombie die
# We have multiple places where zombie dies: Player ramming, Boar ramming, Bullet hitting.
# Let's replace createParticles(z.x, z.y, z.color, 15) with blood logic.
# To be robust, let's create a global function for zombie death.
# Wait, just doing it inline via a simple replace on `createParticles(z.x, z.y, z.color, 15);` and `#ff0000` is safer.

die_regex1 = r"killCount\+\+;\s*createParticles\(z\.x, z\.y, '#ff0000', 15\);" # For vehicle ramming
new_die1 = """killCount++;
                    createParticles(z.x, z.y, '#ff0000', 15);
                    screenShake = Math.max(screenShake, 5);
                    for(let b=0; b<5; b++) bgCtx.fillRect(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4);
                    comboCount++; comboTimer = 180;
                    if(comboCount % 10 === 0) { screenShake = 10; addFloatingText(CANVAS_W/2, 100, `${comboCount} COMBO!`, '#ffaa00'); audio.levelUp(); }"""
code = re.sub(die_regex1, new_die1, code)

die_regex2 = r"score \+= z\.scoreVal;\s*audio\.zombieDie\(\);\s*addFloatingText\(z\.x, z\.y, \"野猪冲撞!\", \"#ffcc00\"\);" # For boar
new_die2 = """score += z.scoreVal;
                    audio.zombieDie();
                    addFloatingText(z.x, z.y, "野猪冲撞!", "#ffcc00");
                    screenShake = Math.max(screenShake, 5);
                    for(let b=0; b<5; b++) bgCtx.fillRect(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4);
                    comboCount++; comboTimer = 180;
                    if(comboCount % 10 === 0) { screenShake = 10; addFloatingText(CANVAS_W/2, 100, `${comboCount} COMBO!`, '#ffaa00'); audio.levelUp(); }"""
code = re.sub(die_regex2, new_die2, code)

die_regex3 = r"killCount\+\+;\s*document\.getElementById\('score'\)\.textContent = score;\s*createParticles\(z\.x, z\.y, z\.color, 15\);" # For bullets
new_die3 = """killCount++;
                    document.getElementById('score').textContent = score;
                    createParticles(z.x, z.y, z.color, 15);
                    bgCtx.fillStyle = '#800000';
                    for(let b=0; b<5; b++) bgCtx.fillRect(z.x + (Math.random()-0.5)*40, z.y + (Math.random()-0.5)*40, Math.random()*8+4, Math.random()*8+4);
                    comboCount++; comboTimer = 180;
                    if(comboCount % 10 === 0) { screenShake = 10; addFloatingText(CANVAS_W/2, 100, `🔥 ${comboCount} COMBO!`, '#ffaa00'); audio.levelUp(); }"""
code = re.sub(die_regex3, new_die3, code)

# 4. Draw logic: Apply screen shake and draw blood canvas
draw_regex = r"function draw\(\) \{\s*// Clear background\s*ctx\.fillStyle = '#111';\s*ctx\.fillRect\(0, 0, CANVAS_W, CANVAS_H\);\s*// Draw Grid\s*ctx\.strokeStyle = '#222';\s*ctx\.lineWidth = 1;\s*for\(let i=0; i<CANVAS_W; i\+=40\) \{ ctx\.beginPath\(\); ctx\.moveTo\(i,0\); ctx\.lineTo\(i,CANVAS_H\); ctx\.stroke\(\); \}\s*for\(let i=0; i<CANVAS_H; i\+=40\) \{ ctx\.beginPath\(\); ctx\.moveTo\(0,i\); ctx\.lineTo\(CANVAS_W,i\); ctx\.stroke\(\); \}"
new_draw = """function draw() {
    ctx.save();
    if(screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
    }

    // Clear background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw Grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<CANVAS_W; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,CANVAS_H); ctx.stroke(); }
    for(let i=0; i<CANVAS_H; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(CANVAS_W,i); ctx.stroke(); }
    
    // Draw Blood Stains
    ctx.drawImage(bgCanvas, 0, 0);"""
code = re.sub(draw_regex, new_draw, code)

draw_end_regex = r"ctx\.globalAlpha = 1\.0;\s*\}\);\s*\}"
new_draw_end = """ctx.globalAlpha = 1.0;
    });
    
    // Draw Combo HUD
    if(comboCount > 1) {
        ctx.fillStyle = `rgba(255, 170, 0, ${comboTimer/180})`;
        ctx.font = 'bold 30px "ZCOOL KuaiLe"';
        ctx.textAlign = 'right';
        ctx.fillText(`${comboCount} 连杀!`, CANVAS_W - 20, 40);
        ctx.fillStyle = '#555';
        ctx.fillRect(CANVAS_W - 120, 50, 100, 5);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(CANVAS_W - 120, 50, 100 * (comboTimer/180), 5);
    }
    
    ctx.restore();
}"""
code = re.sub(draw_end_regex, new_draw_end, code)


# 5. Add screen shake to player taking damage and Boss Spawning
hit_regex = r"target\.hp -= this\.damage;\s*audio\.playerHit\(\);"
new_hit = """target.hp -= this.damage;
                        screenShake = 15;
                        audio.playerHit();"""
code = re.sub(hit_regex, new_hit, code)

boss_spawn_regex = r"addFloatingText\(CANVAS_W/2, CANVAS_H/2, \"⚠️ BOSS 出现 ⚠️\", \"#ff00ff\"\);"
new_boss_spawn = """addFloatingText(CANVAS_W/2, CANVAS_H/2, "⚠️ BOSS 出现 ⚠️", "#ff00ff");
        screenShake = 20;"""
code = re.sub(boss_spawn_regex, new_boss_spawn, code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
