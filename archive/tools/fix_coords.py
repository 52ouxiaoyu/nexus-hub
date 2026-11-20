import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Fix addFloatingText in gameLoop error
code = code.replace('addFloatingText(CANVAS_W/2, 50, "⚠️ 战术头盔系统已自动重启", "#ff0000");', 'addFloatingText(camera.x, camera.y - CANVAS_H/2 + 50, "⚠️ 战术头盔系统已自动重启", "#ff0000");')

# 2. Fix addFloatingText in Wave System
code = code.replace('addFloatingText(CANVAS_W/2, CANVAS_H/2, `🚨 第 ${currentWave} 波 尸潮来袭! 🚨`, "#ff0000");', 'addFloatingText(camera.x, camera.y, `🚨 第 ${currentWave} 波 尸潮来袭! 🚨`, "#ff0000");')

# 3. Fix addFloatingText for Boss Kill
code = code.replace('addFloatingText(CANVAS_W/2, CANVAS_H/2, "🌟 斩杀目标! 🌟", "#ffff00");', 'addFloatingText(camera.x, camera.y, "🌟 斩杀目标! 🌟", "#ffff00");')

# 4. We should also make sure players start at the center of the first chunk
code = code.replace("players = [new Player(1), new Player(2)];", "players = [new Player(1), new Player(2)];\n    players[0].x = CANVAS_W/2 - 20;\n    players[1].x = CANVAS_W/2 + 20;\n    players[0].y = CANVAS_H/2;\n    players[1].y = CANVAS_H/2;")

# 5. Fix UI mouse coordinates for shooting
# Player 1 uses mouse. mouse is screen coordinate! We need to convert to world coordinate.
# Inside gameLoop event listener: 
# canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
# Player.update() uses mouse.x, mouse.y
# this.facing.x = mouse.x - this.x; 
# It must be: mouse.x + (camera.x - CANVAS_W/2) - this.x

code = code.replace("let mx = mouse.x - this.x;\n            let my = mouse.y - this.y;", "let mx = (mouse.x + camera.x - CANVAS_W/2) - this.x;\n            let my = (mouse.y + camera.y - CANVAS_H/2) - this.y;")


with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
