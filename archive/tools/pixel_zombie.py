import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

pixel_zombie_consts = """const SPRITE_ZOMBIE = [
    "...........",
    "....ZZZ....",
    "...ZZZZZ...",
    "..ZZEEEZZ..",
    "..ZZEEEZZ..",
    "..NNZZZNN..",
    "..NZZZZZN..",
    "....ZZZ....",
    "...ZZZZZ...",
    "....ZZZ....",
    "..........."
];
"""

# Insert zombie sprite const right after SPRITE_VALKYRIE
code = code.replace("const SPRITE_BIKE = [", pixel_zombie_consts + "\nconst SPRITE_BIKE = [")

# Add colors
code = code.replace("'W': '#333333'  // Dark details", "'W': '#333333', // Dark details\n    'Z': '#33aa33', // Zombie Skin\n    'E': '#ff0000'  // Zombie Eye")

# Replace Zombie.draw completely
z_draw_old = """    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
        
        let s = this.size;
        let armSway = Math.sin(frameCount * 0.1) * 5;

        // Zombie Body (Pixel style)
        ctx.fillStyle = this.color; // Dark Green
        ctx.fillRect(-s+4, -s+4, s*2-8, s*2-8);
        
        // Shoulders
        ctx.fillStyle = '#1A3300'; // Darker green clothing
        ctx.fillRect(-s, -s, 10, s*2);

        // Arms (Reaching forward)
        ctx.fillStyle = '#2d5700'; // Arm skin
        ctx.fillRect(0, -s-2, s + 10 + armSway, 6); // Left Arm
        ctx.fillRect(0, s-4, s + 10 - armSway, 6); // Right Arm
        
        // Bloody Hands
        ctx.fillStyle = '#800000'; // Blood red
        ctx.fillRect(s + 10 + armSway, -s-2, 4, 6);
        ctx.fillRect(s + 10 - armSway, s-4, 4, 6);

        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, s*0.6, 0, Math.PI*2);
        ctx.fill();

        // Eyes (Red glowing pixels)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(s*0.2, -s*0.3, 4, 4);
        ctx.fillRect(s*0.2, s*0.3-4, 4, 4);

        if(this.isBoss) {
            // Boss Spikes
            ctx.fillStyle = '#555';
            ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(-s-10, -s-10); ctx.lineTo(-s+5, -s); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-s, s); ctx.lineTo(-s-10, s+10); ctx.lineTo(-s+5, s); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-s-5, 0); ctx.lineTo(-s-20, 0); ctx.lineTo(-s-5, 5); ctx.fill();
        }

        ctx.restore();
        
        // Boss HP Bar
        if(this.isBoss && this.hp < this.maxHp) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(this.x - 30, this.y + this.size + 10, 60, 6);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - 30, this.y + this.size + 10, 60 * (this.hp/this.maxHp), 6);
        }
    }"""

z_draw_new = """    draw(ctx) {
        if(!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
        
        let colorZ = '#33aa33';
        let colorE = '#ff0000';
        
        if(this.type === 'fast') { colorZ = '#88ff88'; colorE = '#0000ff'; }
        if(this.type === 'tank') { colorZ = '#225522'; colorE = '#ff00ff'; }
        if(this.type === 'exploder') { colorZ = '#ffaa00'; colorE = '#ffffff'; }
        if(this.type === 'boss') { colorZ = '#ff0000'; colorE = '#ffff00'; }
        
        let pxSize = this.size / 5;
        let w = SPRITE_ZOMBIE[0].length;
        let h = SPRITE_ZOMBIE.length;
        let ox = - (w * pxSize) / 2;
        let oy = - (h * pxSize) / 2;
        let sway = Math.sin(frameCount * 0.1) * (pxSize/2);
        
        for(let r=0; r<h; r++) {
            for(let c=0; c<w; c++) {
                let char = SPRITE_ZOMBIE[r][c];
                if(char !== '.') {
                    if(char === 'Z') ctx.fillStyle = colorZ;
                    else if(char === 'E') ctx.fillStyle = colorE;
                    else if(char === 'N') ctx.fillStyle = '#114411';
                    
                    let yOffset = 0;
                    if(char === 'N') yOffset = (r < 5) ? -sway : sway;
                    
                    ctx.fillRect(ox + c * pxSize, oy + r * pxSize + yOffset, pxSize, pxSize);
                }
            }
        }
        
        if(this.isBoss) {
            ctx.fillStyle = '#555';
            ctx.fillRect(ox-pxSize*2, oy, pxSize*2, pxSize*2);
            ctx.fillRect(ox-pxSize*2, oy+h*pxSize-pxSize*2, pxSize*2, pxSize*2);
        }

        ctx.restore();
        
        if(this.isBoss && this.hp < this.maxHp) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(this.x - 30, this.y + this.size + 10, 60, 6);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - 30, this.y + this.size + 10, 60 * (this.hp/this.maxHp), 6);
        }
    }"""

code = code.replace(z_draw_old, z_draw_new)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
