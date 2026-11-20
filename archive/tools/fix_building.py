import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Remove the buildings GC logic to prevent empty chunks on backtrack
code = code.replace("buildings = buildings.filter(b => Math.hypot(b.x - camera.x, b.y - camera.y) < CANVAS_W * 3);", "")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
