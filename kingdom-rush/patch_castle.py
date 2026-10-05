import re

with open('js/main.js', 'r') as f:
    js = f.read()

old_castle = """                if (v === 3) {
                    // Castle Gate
                    this.ctx.fillStyle = '#2c3e50'; this.ctx.fillRect(px+10, py+20, 60, 60);
                    this.ctx.fillStyle = '#111'; this.ctx.beginPath(); this.ctx.arc(px+40, py+80, 20, Math.PI, 0); this.ctx.fill();
                    this.ctx.fillRect(px+20, py+80, 40, 10);
                }"""

new_castle = """                if (v === 3) {
                    // Epic Castle Base
                    this.ctx.fillStyle = '#95a5a6'; // Light stone
                    this.ctx.fillRect(px + 15, py + 30, 50, 45);
                    this.ctx.fillStyle = '#7f8c8d'; // Darker stone (shadow/side)
                    this.ctx.fillRect(px + 40, py + 30, 25, 45);
                    
                    // Side Towers
                    this.ctx.fillStyle = '#7f8c8d';
                    this.ctx.fillRect(px + 5, py + 15, 20, 60);
                    this.ctx.fillRect(px + 55, py + 15, 20, 60);
                    this.ctx.fillStyle = '#95a5a6';
                    this.ctx.fillRect(px + 5, py + 15, 10, 60);
                    this.ctx.fillRect(px + 55, py + 15, 10, 60);
                    
                    // Battlements (teeth) on side towers
                    this.ctx.fillStyle = '#bdc3c7';
                    for(let i=0; i<3; i++) {
                        this.ctx.fillRect(px + 5 + i*8, py + 10, 5, 5);
                        this.ctx.fillRect(px + 55 + i*8, py + 10, 5, 5);
                    }
                    
                    // Battlements on main body
                    for(let i=0; i<5; i++) {
                        this.ctx.fillRect(px + 18 + i*10, py + 25, 6, 5);
                    }
                    
                    // Gate/Arch
                    this.ctx.fillStyle = '#2c3e50'; // Dark inside
                    this.ctx.beginPath(); this.ctx.arc(px + 40, py + 60, 14, Math.PI, 0); this.ctx.fill();
                    this.ctx.fillRect(px + 26, py + 60, 28, 20);
                    
                    // Portcullis (Iron bars)
                    this.ctx.strokeStyle = '#111';
                    this.ctx.lineWidth = 2;
                    for(let i=0; i<4; i++) {
                        this.ctx.beginPath(); this.ctx.moveTo(px + 30 + i*6.5, py + 50); this.ctx.lineTo(px + 30 + i*6.5, py + 80); this.ctx.stroke();
                    }
                    this.ctx.beginPath(); this.ctx.moveTo(px + 26, py + 58); this.ctx.lineTo(px + 54, py + 58); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(px + 26, py + 68); this.ctx.lineTo(px + 54, py + 68); this.ctx.stroke();
                    
                    // Windows on side towers
                    this.ctx.fillStyle = '#2c3e50';
                    this.ctx.fillRect(px + 12, py + 30, 4, 12);
                    this.ctx.fillRect(px + 64, py + 30, 4, 12);
                    
                    // Flags on towers
                    this.ctx.strokeStyle = '#7f8c8d'; this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.moveTo(px + 15, py + 10); this.ctx.lineTo(px + 15, py - 12); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(px + 65, py + 10); this.ctx.lineTo(px + 65, py - 12); this.ctx.stroke();
                    this.ctx.fillStyle = '#e74c3c'; // Red flag
                    this.ctx.beginPath(); this.ctx.moveTo(px + 15, py - 12); this.ctx.lineTo(px + 32, py - 6); this.ctx.lineTo(px + 15, py); this.ctx.fill();
                    this.ctx.beginPath(); this.ctx.moveTo(px + 65, py - 12); this.ctx.lineTo(px + 82, py - 6); this.ctx.lineTo(px + 65, py); this.ctx.fill();
                }"""

js = js.replace(old_castle, new_castle)

with open('js/main.js', 'w') as f:
    f.write(js)
