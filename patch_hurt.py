import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_hurt = """            // 接触玩家 → 持续掉血（判定在移动块之外，len=0 也生效）
            if (len < 48) {
                playerHurt += touchDps * dt;
            }"""

new_hurt = """            // 接触目标 → 持续掉血
            for (const p of this.allPlayers) {
                if (Math.hypot(p.x - zb.x, p.y - zb.y) < 48) {
                    if (p === this.player) playerHurt += touchDps * dt;
                    else p.hp -= touchDps * dt;
                }
            }"""

content = content.replace(old_hurt, new_hurt)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
