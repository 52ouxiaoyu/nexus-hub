import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# Replace Player.draw inner else block
player_draw_regex = r"ctx\.fillStyle = this\.color;\s*ctx\.beginPath\(\);\s*ctx\.arc\(this\.x, this\.y, this\.size, 0, Math\.PI\*2\);\s*ctx\.fill\(\);\s*ctx\.strokeStyle = '#fff';\s*ctx\.lineWidth = 2;\s*ctx\.stroke\(\);\s*// Visor\s*ctx\.fillStyle = '#111';\s*ctx\.beginPath\(\);\s*ctx\.arc\(this\.x \+ this\.facing\.x \* 10, this\.y \+ this\.facing\.y \* 10, 8, 0, Math\.PI\*2\);\s*ctx\.fill\(\);\s*// Gun\s*ctx\.strokeStyle = '#555';\s*ctx\.lineWidth = 6;\s*ctx\.beginPath\(\);\s*ctx\.moveTo\(this\.x, this\.y\);\s*ctx\.lineTo\(this\.x \+ this\.facing\.x \* 25, this\.y \+ this\.facing\.y \* 25\);\s*ctx\.stroke\(\);"
new_player_draw = """
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.facing.y, this.facing.x));
            
            // Shoulders/Torso
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size - 2, this.size, 0, 0, Math.PI*2);
            ctx.fill();

            // Backpack
            ctx.fillStyle = '#333';
            ctx.fillRect(-this.size-2, -8, 8, 16);

            // Left arm & Hand
            ctx.fillStyle = this.color;
            ctx.fillRect(0, -this.size+2, 18, 6);
            ctx.fillStyle = '#ffccaa'; // skin
            ctx.beginPath(); ctx.arc(18, -this.size+5, 4, 0, Math.PI*2); ctx.fill();

            // Right arm & Hand
            ctx.fillStyle = this.color;
            ctx.fillRect(0, this.size-8, 18, 6);
            ctx.fillStyle = '#ffccaa'; // skin
            ctx.beginPath(); ctx.arc(18, this.size-5, 4, 0, Math.PI*2); ctx.fill();

            // Gun
            ctx.fillStyle = '#222';
            ctx.fillRect(10, -3, 25, 6); // barrel
            
            // Helmet
            ctx.fillStyle = '#1a3300';
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            // Visor (Goggles)
            ctx.fillStyle = '#0ff';
            ctx.beginPath(); ctx.arc(2, 0, 8, -Math.PI/3, Math.PI/3); ctx.fill();

            ctx.restore();
"""
code = re.sub(player_draw_regex, new_player_draw, code)

# Process Zombie class safely
zombie_split = code.split("class Zombie {")
zombie_code = "class Zombie {" + zombie_split[1]

# Track facing
zombie_update_regex = r"this\.x \+= \(dx / minDist\) \* this\.speed;\s*this\.y \+= \(dy / minDist\) \* this\.speed;"
new_zombie_update = """this.x += (dx / minDist) * this.speed;
                this.y += (dy / minDist) * this.speed;
                this.facing = {x: dx/minDist, y: dy/minDist};"""
zombie_code = re.sub(zombie_update_regex, new_zombie_update, zombie_code)

# Initialize facing
zombie_constructor_regex = r"this\.scoreVal = isBoss \? 500 : 10;"
new_zombie_constructor = """this.scoreVal = isBoss ? 500 : 10;
        this.facing = {x: 1, y: 0};"""
zombie_code = re.sub(zombie_constructor_regex, new_zombie_constructor, zombie_code)

# Replace Zombie draw accurately
zombie_draw_regex = r"draw\(ctx\) \{[\s\S]*?(?=class Particle)"
new_zombie_draw = """draw(ctx) {
        if(!this.active) return;
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
    }
}
"""
zombie_code = re.sub(zombie_draw_regex, new_zombie_draw, zombie_code)

code = zombie_split[0] + zombie_code

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
