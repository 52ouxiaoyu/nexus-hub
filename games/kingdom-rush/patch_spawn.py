import re

with open('js/main.js', 'r') as f:
    js = f.read()

old_spawn = """                if (v === 2) {
                    this.ctx.fillStyle = '#1a0f0a';
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+40, 35, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#000';
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+40, 25, 0, Math.PI*2); this.ctx.fill();
                }"""

new_spawn = """                if (v === 2) {
                    // Epic Monster Cave
                    this.ctx.fillStyle = '#4a4a4a'; // Outer rock
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+40, 38, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#2c2c2c'; // Inner rock
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+45, 30, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#000'; // Pure dark entrance
                    this.ctx.beginPath(); this.ctx.arc(px+40, py+50, 22, 0, Math.PI*2); this.ctx.fill();
                    
                    // Creepy glowing eyes inside the cave
                    this.ctx.fillStyle = '#e74c3c';
                    this.ctx.beginPath(); this.ctx.arc(px+32, py+52, 3, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.beginPath(); this.ctx.arc(px+48, py+52, 3, 0, Math.PI*2); this.ctx.fill();
                    
                    // Rock debris around
                    this.ctx.fillStyle = '#555';
                    this.ctx.fillRect(px+10, py+60, 15, 10);
                    this.ctx.fillRect(px+60, py+55, 12, 12);
                }"""

js = js.replace(old_spawn, new_spawn)

with open('js/main.js', 'w') as f:
    f.write(js)
