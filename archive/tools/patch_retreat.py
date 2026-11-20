import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_dx_dy = """            let dx = targetX - zb.x;
            let dy = targetY - zb.y;"""

new_dx_dy = """            // 残血回城逻辑
            if (zb.hp < zb.maxHp * 0.1) zb.retreating = true;
            if (zb.hp >= zb.maxHp) zb.retreating = false;
            
            if (zb.retreating) {
                targetX = this.worldWidth / 2;
                targetY = this.worldHeight / 2;
                if (Math.hypot(targetX - zb.x, targetY - zb.y) < 120) {
                    zb.hp = Math.min(zb.maxHp, zb.hp + zb.maxHp * 0.1 * dt);
                    if (zb.hpBg) {
                        zb.hpBg.style.display = 'block';
                        zb.hpFg.style.width = (zb.hp / zb.maxHp * 100) + '%';
                    }
                    zb.el1.style.filter = 'drop-shadow(0 0 10px #0f0)';
                } else {
                    zb.el1.style.filter = '';
                }
            } else {
                zb.el1.style.filter = '';
            }

            let dx = targetX - zb.x;
            let dy = targetY - zb.y;"""

content = content.replace(old_dx_dy, new_dx_dy)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
