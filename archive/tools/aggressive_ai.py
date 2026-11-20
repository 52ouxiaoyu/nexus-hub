import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_ai = """        if(this.isAI) {
            // AI Logic
            let closestDist = Infinity;
            let target = null;
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < closestDist) { closestDist = d; target = z; }
            });
            
            if(target) {
                // Aim at target
                let tdx = target.x - this.x;
                let tdy = target.y - this.y;
                let tLen = Math.hypot(tdx, tdy);
                if(tLen > 0) {
                    this.facing = {x: tdx/tLen, y: tdy/tLen};
                }
                
                // Movement: Dodge if too close, approach if far
                if(closestDist < 150) {
                    // Flee
                    dx = -this.facing.x;
                    dy = -this.facing.y;
                } else if(closestDist > 250) {
                    // Approach
                    dx = this.facing.x;
                    dy = this.facing.y;
                } else {
                    // Circle around
                    dx = -this.facing.y;
                    dy = this.facing.x;
                }
                
                // Also dodge borders
                if(this.x < 100) dx = 1;
                if(this.x > CANVAS_W - 100) dx = -1;
                if(this.y < 100) dy = 1;
                if(this.y > CANVAS_H - 100) dy = -1;
                
                // Auto shoot
                this.shoot();
            }
        }"""

new_ai = """        if(this.isAI) {
            let closestZDist = Infinity;
            let targetZ = null;
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < closestZDist) { closestZDist = d; targetZ = z; }
            });

            let closestLootDist = Infinity;
            let targetLoot = null;
            lootBoxes.forEach(lb => {
                let d = Math.hypot(lb.x - this.x, lb.y - this.y);
                if(d < closestLootDist) { closestLootDist = d; targetLoot = lb; }
            });
            
            let downedTeammate = null;
            players.forEach(p => {
                if(p !== this && p.isDowned) downedTeammate = p;
            });

            if(targetZ) {
                let tdx = targetZ.x - this.x;
                let tdy = targetZ.y - this.y;
                let tLen = Math.hypot(tdx, tdy);
                if(tLen > 0) this.facing = {x: tdx/tLen, y: tdy/tLen};
                this.shoot();
            }
            
            if(closestZDist < 120 && targetZ) {
                dx = -(targetZ.x - this.x) / closestZDist;
                dy = -(targetZ.y - this.y) / closestZDist;
            } else if(downedTeammate) {
                let dist = Math.hypot(downedTeammate.x - this.x, downedTeammate.y - this.y);
                if(dist > 10) {
                    dx = (downedTeammate.x - this.x) / dist;
                    dy = (downedTeammate.y - this.y) / dist;
                }
            } else if(targetLoot) {
                dx = (targetLoot.x - this.x) / closestLootDist;
                dy = (targetLoot.y - this.y) / closestLootDist;
            } else if(targetZ) {
                if(closestZDist > 250) {
                    dx = (targetZ.x - this.x) / closestZDist;
                    dy = (targetZ.y - this.y) / closestZDist;
                } else {
                    dx = -this.facing.y;
                    dy = this.facing.x;
                }
            }

            if(this.x < 50) dx = 1;
            if(this.x > CANVAS_W - 50) dx = -1;
            if(this.y < 50) dy = 1;
            if(this.y > CANVAS_H - 50) dy = -1;
        }"""

code = code.replace(old_ai, new_ai)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
