import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# I need to revert the massive replace.
bad_logic = """        resolveBuildingCollision(this);

        // Keep players within the current camera view (Co-op screen binding)
        const margin = 50;
        if(this.x < camera.x - CANVAS_W/2 + margin) this.x = camera.x - CANVAS_W/2 + margin;
        if(this.x > camera.x + CANVAS_W/2 - margin) this.x = camera.x + CANVAS_W/2 - margin;
        if(this.y < camera.y - CANVAS_H/2 + margin) this.y = camera.y - CANVAS_H/2 + margin;
        if(this.y > camera.y + CANVAS_H/2 - margin) this.y = camera.y + CANVAS_H/2 - margin;"""

# Replace all occurrences back to simple collision
code = code.replace(bad_logic, "        resolveBuildingCollision(this);")

# Now apply the bounds ONLY to Player!
# Where is Player.update? Let's find:
#         this.x += dx * currentSpeed;
#         this.y += dy * currentSpeed;
#         resolveBuildingCollision(this);
player_update_target = """        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;

        resolveBuildingCollision(this);"""

player_update_fixed = """        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;

        resolveBuildingCollision(this);

        // Keep players within the current camera view (Co-op screen binding)
        const margin = 50;
        // Use canvas.width/height dynamically instead of the old constants to fix resize bugs!
        let halfW = canvas.width / 2;
        let halfH = canvas.height / 2;
        if(this.x < camera.x - halfW + margin) this.x = camera.x - halfW + margin;
        if(this.x > camera.x + halfW - margin) this.x = camera.x + halfW - margin;
        if(this.y < camera.y - halfH + margin) this.y = camera.y - halfH + margin;
        if(this.y > camera.y + halfH - margin) this.y = camera.y + halfH - margin;"""

code = code.replace(player_update_target, player_update_fixed)

# Also fix the PP collision bounds:
pp_collision_old = """            // Keep inside camera bounds
            const margin = 50;
            p1.x = Math.max(camera.x - CANVAS_W/2 + margin, Math.min(camera.x + CANVAS_W/2 - margin, p1.x));
            p1.y = Math.max(camera.y - CANVAS_H/2 + margin, Math.min(camera.y + CANVAS_H/2 - margin, p1.y));
            p2.x = Math.max(camera.x - CANVAS_W/2 + margin, Math.min(camera.x + CANVAS_W/2 - margin, p2.x));
            p2.y = Math.max(camera.y - CANVAS_H/2 + margin, Math.min(camera.y + CANVAS_H/2 - margin, p2.y));"""

pp_collision_new = """            // Keep inside camera bounds
            const margin = 50;
            let halfW = canvas.width / 2;
            let halfH = canvas.height / 2;
            p1.x = Math.max(camera.x - halfW + margin, Math.min(camera.x + halfW - margin, p1.x));
            p1.y = Math.max(camera.y - halfH + margin, Math.min(camera.y + halfH - margin, p1.y));
            p2.x = Math.max(camera.x - halfW + margin, Math.min(camera.x + halfW - margin, p2.x));
            p2.y = Math.max(camera.y - halfH + margin, Math.min(camera.y + halfH - margin, p2.y));"""

code = code.replace(pp_collision_old, pp_collision_new)

# Let's also remove bullet drifting entirely. Bullets shouldn't drift towards zombies!
# Wait, the user specifically complained about bullet drifting trajectories being unphysical!
# The Bullet class has a homing missile logic:
#         if(target) {
#             const idealDx = (target.x - this.x) / closestDist;
#             const idealDy = (target.y - this.y) / closestDist;
#             this.dx = this.dx * 0.9 + idealDx * 0.1;
#             ...

homing_logic_old = """        if(target) {
            const idealDx = (target.x - this.x) / closestDist;
            const idealDy = (target.y - this.y) / closestDist;
            this.dx = this.dx * 0.9 + idealDx * 0.1;
            this.dy = this.dy * 0.9 + idealDy * 0.1;
            const len = Math.hypot(this.dx, this.dy);
            this.dx /= len; this.dy /= len;
        }"""
# Remove homing logic completely to make it physically correct straight line
code = code.replace(homing_logic_old, "")

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
