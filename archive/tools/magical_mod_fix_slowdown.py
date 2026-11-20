import os

file_path = "/Users/clawbox/game-portal/kingdom-rush/js/main.js"

with open(file_path, 'r') as f:
    content = f.read()

# Make particle movement time-dependent
content = content.replace(
    "pt.x += pt.vx; pt.y += pt.vy;",
    "let ts = deltaTime / 16;\n            pt.x += pt.vx * ts; pt.y += pt.vy * ts;"
)

# Make floating text movement time-dependent
content = content.replace(
    "ft.y += ft.vy;",
    "ft.y += ft.vy * (deltaTime / 16);"
)

# Make projectiles time-dependent
content = content.replace(
    """        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;""",
    """        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            let ts = deltaTime / 16;
            p.x += p.vx * ts;
            p.y += p.vy * ts;"""
)

# Make enemies time-dependent
content = content.replace(
    "else e.y += e.type.speed * (0.8 + this.waveMultiplier*0.2);",
    "else e.y += e.type.speed * (0.8 + this.waveMultiplier*0.2) * (deltaTime / 16);"
)

# Make items time-dependent
content = content.replace(
    "item.y += item.vy;",
    "item.y += item.vy * (deltaTime / 16);"
)

# Remove ctx.filter for frozen enemies to fix the massive performance drop
# and replace with an icy block overlay
content = content.replace(
    """            if (e.frozenTimer > 0) {
                ctx.filter = 'hue-rotate(180deg) brightness(150%)';
            }
            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            ctx.restore();""",
    """            if (e.hitTimer > 0) {
                ctx.filter = 'brightness(200%)';
            }
            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            ctx.restore();
            
            if (e.frozenTimer > 0) {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
                ctx.fillRect(e.x - e.type.size, e.y - e.type.size, e.type.size*2, e.type.size*2);
            }"""
)

content = content.replace(
    """            if (e.hitTimer > 0) {
                ctx.globalAlpha = 0.5;
                ctx.filter = 'brightness(200%)';
            }
            if (e.frozenTimer > 0) {
                ctx.filter = 'hue-rotate(180deg) brightness(150%)';
            }
            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            ctx.restore();""",
    """            if (e.hitTimer > 0) {
                ctx.globalAlpha = 0.5;
                ctx.filter = 'brightness(200%)';
            }
            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);
            ctx.restore();
            
            if (e.frozenTimer > 0) {
                // Draw icy block over frozen enemy instead of using expensive ctx.filter
                ctx.fillStyle = 'rgba(173, 216, 230, 0.6)';
                ctx.fillRect(e.x - e.type.size, e.y - e.type.size, e.type.size*2, e.type.size*2);
            }"""
)

with open(file_path, 'w') as f:
    f.write(content)

print("Bug fixed! Replaced slow ctx.filter with rect overlay and added delta time scaling to movement.")
