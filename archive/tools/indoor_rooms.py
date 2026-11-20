import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Replace world generation logic
old_gen = """                // Create 1-3 buildings per chunk
                let numB = Math.floor(Math.random()*2) + 1;
                for(let k=0; k<numB; k++) {
                    let w = 80 + Math.random() * 120;
                    let h = 80 + Math.random() * 120;
                    let bx = i * CHUNK_SIZE + Math.random() * (CHUNK_SIZE - w);
                    let by = j * CHUNK_SIZE + Math.random() * (CHUNK_SIZE - h);
                    buildings.push(new Building(bx, by, w, h));
                }"""

new_gen = """                // Indoor Corridor & Room generation
                let doorSize = 250;
                let wallThick = 60;
                let halfC = CHUNK_SIZE / 2;
                let wallLen = (CHUNK_SIZE - doorSize) / 2;
                
                // Top Wall (with door)
                buildings.push(new Building(i * CHUNK_SIZE, j * CHUNK_SIZE, wallLen, wallThick));
                buildings.push(new Building(i * CHUNK_SIZE + wallLen + doorSize, j * CHUNK_SIZE, wallLen, wallThick));
                
                // Left Wall (with door)
                buildings.push(new Building(i * CHUNK_SIZE, j * CHUNK_SIZE, wallThick, wallLen));
                buildings.push(new Building(i * CHUNK_SIZE, j * CHUNK_SIZE + wallLen + doorSize, wallThick, wallLen));
                
                // Random center obstacles (pillars or covers)
                let rand = Math.random();
                if(rand < 0.3) {
                    // Big center pillar
                    buildings.push(new Building(i * CHUNK_SIZE + halfC - 100, j * CHUNK_SIZE + halfC - 100, 200, 200));
                } else if(rand < 0.6) {
                    // Horizontal cover
                    buildings.push(new Building(i * CHUNK_SIZE + halfC - 200, j * CHUNK_SIZE + halfC - 30, 400, 60));
                } else if(rand < 0.8) {
                    // Vertical cover
                    buildings.push(new Building(i * CHUNK_SIZE + halfC - 30, j * CHUNK_SIZE + halfC - 200, 60, 400));
                }"""

code = code.replace(old_gen, new_gen)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
