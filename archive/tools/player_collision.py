import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Insert player collision resolution after players update
old_update = "players.forEach(p => p.update());"
new_update = """players.forEach(p => p.update());

    // Resolve Player-Player collision
    if(players.length === 2 && players[0].hp > 0 && players[1].hp > 0) {
        let p1 = players[0];
        let p2 = players[1];
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        let dist = Math.hypot(dx, dy);
        let minDist = p1.size + p2.size;
        
        if(dist < minDist && dist > 0) {
            let overlap = minDist - dist;
            let nx = dx / dist;
            let ny = dy / dist;
            
            p1.x -= nx * (overlap / 2);
            p1.y -= ny * (overlap / 2);
            p2.x += nx * (overlap / 2);
            p2.y += ny * (overlap / 2);
            
            // Keep inside bounds
            p1.x = Math.max(p1.size, Math.min(CANVAS_W - p1.size, p1.x));
            p1.y = Math.max(p1.size, Math.min(CANVAS_H - p1.size, p1.y));
            p2.x = Math.max(p2.size, Math.min(CANVAS_W - p2.size, p2.x));
            p2.y = Math.max(p2.size, Math.min(CANVAS_H - p2.size, p2.y));
        }
    }"""

code = code.replace(old_update, new_update)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
