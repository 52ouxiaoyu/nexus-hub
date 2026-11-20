import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_code = """    if(comboTimer > 0) {
        comboTimer--;

    // Garbage collection to prevent memory leaks in infinite world
    zombies = zombies.filter(z => z.active && Math.hypot(z.x - camera.x, z.y - camera.y) < (canvas.width || window.innerWidth) * 2);
    bullets = bullets.filter(b => b.active);
    particles = particles.filter(p => p.life > 0);
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    lootBoxes = lootBoxes.filter(lb => lb.active && Math.hypot(lb.x - camera.x, lb.y - camera.y) < CANVAS_W * 3);
    barrels = barrels.filter(b => b.active && Math.hypot(b.x - camera.x, b.y - camera.y) < CANVAS_W * 3);

    // Check Game Over condition safely
    if(players.every(p => (p.hp <= 0))) {
        gameOver();
    }

    

        if(comboTimer <= 0) {
            if(comboCount >= 10) addFloatingText(CANVAS_W/2, 150, `🔥 ${comboCount} 连杀终结!`, '#ffaa00');
            comboCount = 0;
        }
    }"""

new_code = """    if(comboTimer > 0) {
        comboTimer--;
        if(comboTimer <= 0) {
            if(comboCount >= 10) addFloatingText(CANVAS_W/2, 150, `🔥 ${comboCount} 连杀终结!`, '#ffaa00');
            comboCount = 0;
        }
    }

    // Garbage collection to prevent memory leaks in infinite world
    zombies = zombies.filter(z => z.active && Math.hypot(z.x - camera.x, z.y - camera.y) < (canvas.width || window.innerWidth) * 2);
    bullets = bullets.filter(b => b.active);
    particles = particles.filter(p => p.life > 0);
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    lootBoxes = lootBoxes.filter(lb => lb.active && Math.hypot(lb.x - camera.x, lb.y - camera.y) < CANVAS_W * 3);
    barrels = barrels.filter(b => b.active && Math.hypot(b.x - camera.x, b.y - camera.y) < CANVAS_W * 3);

    // Check Game Over condition safely
    if(players.every(p => (p.hp <= 0))) {
        gameOver();
    }"""

code = code.replace(old_code, new_code)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
