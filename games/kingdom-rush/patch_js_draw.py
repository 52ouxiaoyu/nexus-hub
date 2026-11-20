import re

with open('js/main.js', 'r') as f:
    js = f.read()

# Update Drawing
old_draw = """            } else if (t.type === 'POISON') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 16, 0, Math.PI*2); this.ctx.fill(); // Bulb
                this.ctx.fillStyle = '#1e824c';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill(); // Inner core
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(5, -4, 15, 8); // Spout
            }
            
            this.ctx.restore();"""

new_draw = """            } else if (t.type === 'POISON') {
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 16, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#1e824c';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#27ae60';
                this.ctx.fillRect(5, -4, 15, 8);
            } else {
                // Generic look for others
                this.ctx.fillStyle = baseDef.barrelColor;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 15, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(5, -4, 15, 8);
                
                // Special touches
                if (t.type === 'LASER') { this.ctx.fillStyle='#f1c40f'; this.ctx.beginPath(); this.ctx.arc(15, 0, 6, 0, Math.PI*2); this.ctx.fill(); }
                if (t.type === 'BOMBER') { this.ctx.fillStyle='#c0392b'; this.ctx.fillRect(5, -8, 15, 16); }
                if (t.type === 'GOLD') { this.ctx.fillStyle='#f39c12'; this.ctx.fillRect(-10, -10, 20, 20); }
                if (t.type === 'NUKE') { this.ctx.fillStyle='#bdc3c7'; this.ctx.beginPath(); this.ctx.moveTo(5, -10); this.ctx.lineTo(25, 0); this.ctx.lineTo(5, 10); this.ctx.fill(); }
                if (t.type === 'BLACKHOLE') { this.ctx.fillStyle='#2c3e50'; this.ctx.beginPath(); this.ctx.arc(0, 0, 20, 0, Math.PI*2); this.ctx.fill(); this.ctx.fillStyle='#000'; this.ctx.beginPath(); this.ctx.arc(0, 0, 10, 0, Math.PI*2); this.ctx.fill(); }
                if (t.type === 'AURA') { this.ctx.fillStyle='#e74c3c'; this.ctx.beginPath(); this.ctx.arc(0, 0, 18, 0, Math.PI*2); this.ctx.fill(); this.ctx.fillStyle='#fff'; this.ctx.beginPath(); this.ctx.arc(0, 0, 12, 0, Math.PI*2); this.ctx.fill(); }
            }
            
            // Draw buff visual if buffed
            if (t.buffTimer > 0) {
                this.ctx.strokeStyle = '#e74c3c'; this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 25, 0, Math.PI*2); this.ctx.stroke();
            }
            
            this.ctx.restore();"""
js = js.replace(old_draw, new_draw)

with open('js/main.js', 'w') as f:
    f.write(js)
