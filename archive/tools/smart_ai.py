import re

with open("zombie-shooter/game.js", "r") as f:
    code = f.read()

# 1. Update aiUpdate
ai_update_regex = r"aiUpdate\(\) \{\s*if\(frameCount % 15 !== 0\) return;.*?// Keep in bounds\s*this\.x = Math\.max\(this\.size, Math\.min\(CANVAS_W - this\.size, this\.x\)\);\s*this\.y = Math\.max\(this\.size, Math\.min\(CANVAS_H - this\.size, this\.y\)\);\s*\}"

new_ai_update = """aiUpdate() {
        if(!this.aiMoveX) { this.aiMoveX = 0; this.aiMoveY = 0; }
        
        // Update decisions every 10 frames
        if(frameCount % 10 === 0) {
            let closestZ = null;
            let minZDist = Infinity;
            zombies.forEach(z => {
                if(!z.active) return;
                let d = Math.hypot(z.x - this.x, z.y - this.y);
                if(d < minZDist) { minZDist = d; closestZ = z; }
            });

            let closestLoot = null;
            let minLootDist = Infinity;
            lootBoxes.forEach(lb => {
                if(!lb.active || lb.type === 'trap') return;
                let d = Math.hypot(lb.x - this.x, lb.y - this.y);
                if(d < minLootDist) { minLootDist = d; closestLoot = lb; }
            });

            let moveX = 0; let moveY = 0;
            
            if(closestZ) {
                // Shoot at closest zombie
                this.facing = {x: (closestZ.x - this.x)/minZDist, y: (closestZ.y - this.y)/minZDist};
                this.shoot();
                
                // If has ultimate and zombies are close, use it!
                if(this.hasUlt && minZDist < 150) {
                    this.hasUlt = false;
                    audio.levelUp();
                    screenShake = 30;
                    addFloatingText(this.x, this.y - 50, "⚡ 万剑归宗 ⚡", "#00ffff");
                    for(let angle=0; angle<Math.PI*2; angle+=Math.PI/16) {
                        let b = new Bullet(this.x, this.y, {x: Math.cos(angle), y: Math.sin(angle)}, this.weapon);
                        b.damage = 100;
                        b.pierce = true;
                        b.size = 10;
                        bullets.push(b);
                    }
                }

                // If zombie is very close, prioritize dodging
                if(minZDist < 120) {
                    moveX = -this.facing.x;
                    moveY = -this.facing.y;
                } 
                // If safe and loot is nearby, go for loot
                else if(closestLoot && minLootDist < 400) {
                    moveX = (closestLoot.x - this.x) / minLootDist;
                    moveY = (closestLoot.y - this.y) / minLootDist;
                }
                // Otherwise move towards zombie if it's far
                else if(minZDist > 250) {
                    moveX = this.facing.x;
                    moveY = this.facing.y;
                }
            } else if(closestLoot) {
                // No zombies, just get loot
                moveX = (closestLoot.x - this.x) / minLootDist;
                moveY = (closestLoot.y - this.y) / minLootDist;
            }
            
            this.aiMoveX = moveX;
            this.aiMoveY = moveY;
        }
        
        // Apply continuous movement every frame
        if(this.aiMoveX !== 0 || this.aiMoveY !== 0) {
            let mLen = Math.hypot(this.aiMoveX, this.aiMoveY);
            this.x += (this.aiMoveX / mLen) * this.speed;
            this.y += (this.aiMoveY / mLen) * this.speed;
        }
        
        // Keep in bounds
        this.x = Math.max(this.size, Math.min(CANVAS_W - this.size, this.x));
        this.y = Math.max(this.size, Math.min(CANVAS_H - this.size, this.y));
    }"""
    
# Using re.DOTALL to match across newlines
code = re.sub(ai_update_regex, new_ai_update, code, flags=re.DOTALL)

with open("zombie-shooter/game.js", "w") as f:
    f.write(code)
