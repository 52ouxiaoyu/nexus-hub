import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

old_ai_logic = """            let closestLootDist = Infinity;
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
            }"""

new_ai_logic = """            let closestLootDist = Infinity;
            let targetLoot = null;
            lootBoxes.forEach(lb => {
                let d = Math.hypot(lb.x - this.x, lb.y - this.y);
                if(d < closestLootDist) { closestLootDist = d; targetLoot = lb; }
            });
            
            let closestBarrelDist = Infinity;
            let targetBarrel = null;
            barrels.forEach(b => {
                if(!b.active) return;
                let d = Math.hypot(b.x - this.x, b.y - this.y);
                if(d < closestBarrelDist) { closestBarrelDist = d; targetBarrel = b; }
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
                // Don't shoot if a barrel is right in front of us
                let safeToShoot = true;
                if(targetBarrel && closestBarrelDist < 200) {
                    // Check if barrel is roughly in the direction we are facing
                    let bdx = (targetBarrel.x - this.x) / closestBarrelDist;
                    let bdy = (targetBarrel.y - this.y) / closestBarrelDist;
                    let dotProd = (bdx * this.facing.x) + (bdy * this.facing.y);
                    if(dotProd > 0.8) safeToShoot = false; // Barrel is in line of fire!
                }
                if(safeToShoot) this.shoot();
            }
            
            // Priority 1: Dodge Barrels (Extremely dangerous)
            if(closestBarrelDist < 160 && targetBarrel) {
                dx = -(targetBarrel.x - this.x) / closestBarrelDist;
                dy = -(targetBarrel.y - this.y) / closestBarrelDist;
            }
            // Priority 2: Dodge Zombies
            else if(closestZDist < 120 && targetZ) {
                dx = -(targetZ.x - this.x) / closestZDist;
                dy = -(targetZ.y - this.y) / closestZDist;
            } 
            // Priority 3: Revive
            else if(downedTeammate) {
                let dist = Math.hypot(downedTeammate.x - this.x, downedTeammate.y - this.y);
                if(dist > 10) {
                    dx = (downedTeammate.x - this.x) / dist;
                    dy = (downedTeammate.y - this.y) / dist;
                }
            } 
            // Priority 4: Loot
            else if(targetLoot) {
                dx = (targetLoot.x - this.x) / closestLootDist;
                dy = (targetLoot.y - this.y) / closestLootDist;
            } 
            // Priority 5: Kite Zombies
            else if(targetZ) {
                if(closestZDist > 250) {
                    dx = (targetZ.x - this.x) / closestZDist;
                    dy = (targetZ.y - this.y) / closestZDist;
                } else {
                    dx = -this.facing.y;
                    dy = this.facing.x;
                }
            }"""

code = code.replace(old_ai_logic, new_ai_logic)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
