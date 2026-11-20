import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Fix Player-Player collision out-of-bounds bug
old_pp_col = """            // Keep inside bounds
            p1.x = Math.max(p1.size, Math.min(CANVAS_W - p1.size, p1.x));
            p1.y = Math.max(p1.size, Math.min(CANVAS_H - p1.size, p1.y));
            p2.x = Math.max(p2.size, Math.min(CANVAS_W - p2.size, p2.x));
            p2.y = Math.max(p2.size, Math.min(CANVAS_H - p2.size, p2.y));"""

new_pp_col = """            // Keep inside camera bounds
            const margin = 50;
            p1.x = Math.max(camera.x - CANVAS_W/2 + margin, Math.min(camera.x + CANVAS_W/2 - margin, p1.x));
            p1.y = Math.max(camera.y - CANVAS_H/2 + margin, Math.min(camera.y + CANVAS_H/2 - margin, p1.y));
            p2.x = Math.max(camera.x - CANVAS_W/2 + margin, Math.min(camera.x + CANVAS_W/2 - margin, p2.x));
            p2.y = Math.max(camera.y - CANVAS_H/2 + margin, Math.min(camera.y + CANVAS_H/2 - margin, p2.y));"""

code = code.replace(old_pp_col, new_pp_col)

# 2. Fix procedural building sizes to avoid massive walls that block both players
old_b_size = """                    let w = 150 + Math.random() * 300;
                    let h = 150 + Math.random() * 300;"""

new_b_size = """                    let w = 80 + Math.random() * 120;
                    let h = 80 + Math.random() * 120;"""

code = code.replace(old_b_size, new_b_size)

# Also make buildings less dense, maybe 1-2 per chunk instead of 1-3
old_num_b = "let numB = Math.floor(Math.random()*3) + 1;"
new_num_b = "let numB = Math.floor(Math.random()*2) + 1;"
code = code.replace(old_num_b, new_num_b)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
