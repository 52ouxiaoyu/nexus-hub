import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Fix Random Events text coordinates
code = code.replace('addFloatingText(CANVAS_W/2, CANVAS_H/2, "⚠️ 警告：侦测到大规模感染者群！ ⚠️", "#ff0000");', 'addFloatingText(camera.x, camera.y, "⚠️ 警告：侦测到大规模感染者群！ ⚠️", "#ff0000");')
code = code.replace('addFloatingText(CANVAS_W/2, CANVAS_H/2, "🌙 战地预警：目标进入狂暴状态！ 🌙", "#ff0000");', 'addFloatingText(camera.x, camera.y, "🌙 战地预警：目标进入狂暴状态！ 🌙", "#ff0000");')
code = code.replace('addFloatingText(CANVAS_W/2, CANVAS_H/2, "🚀 轨道打击火力覆盖中！ 🚀", "#00ffff");', 'addFloatingText(camera.x, camera.y, "🚀 轨道打击火力覆盖中！ 🚀", "#00ffff");')

# 2. Fix Swarm spawn
old_swarm = "for(let i=0; i<30; i++) zombies.push(new Zombie());"
new_swarm = """for(let i=0; i<30; i++) {
                let z = new Zombie();
                z.x = camera.x + (Math.random()-0.5)*CANVAS_W*1.5;
                z.y = camera.y + (Math.random()-0.5)*CANVAS_H*1.5;
                zombies.push(z);
            }"""
code = code.replace(old_swarm, new_swarm)

# 3. Fix Orbital drop
old_orbital = """            let bx = Math.random() * CANVAS_W;
            let by = Math.random() * CANVAS_H;"""
new_orbital = """            let bx = camera.x + (Math.random()-0.5)*CANVAS_W*1.5;
            let by = camera.y + (Math.random()-0.5)*CANVAS_H*1.5;"""
code = code.replace(old_orbital, new_orbital)

# 4. Filter Arrays (Garbage Collection) at the end of update()
gc_code = """
    // Garbage collection to prevent memory leaks in infinite world
    zombies = zombies.filter(z => z.active && Math.hypot(z.x - camera.x, z.y - camera.y) < CANVAS_W * 2);
    bullets = bullets.filter(b => b.active);
    particles = particles.filter(p => p.life > 0);
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    lootBoxes = lootBoxes.filter(lb => lb.active && Math.hypot(lb.x - camera.x, lb.y - camera.y) < CANVAS_W * 3);
    barrels = barrels.filter(b => b.active && Math.hypot(b.x - camera.x, b.y - camera.y) < CANVAS_W * 3);
    buildings = buildings.filter(b => Math.hypot(b.x - camera.x, b.y - camera.y) < CANVAS_W * 3);
"""

code = code.replace("    comboTimer--;", "    comboTimer--;\n" + gc_code)

# 5. Fix `active` boolean check loop issue.
# Instead of keeping them in arrays and looping forever, we filter them.

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
