import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Fix Room overlapping center
old_room_check = "if (Math.abs(rx - this.cols/2) < 6 && Math.abs(ry - this.rows/2) < 6) continue;"
new_room_check = """
                // 确保房间不会覆盖中心回血区（以中心点为圆心，半径约 4 格的区域必须空出）
                const centerLeft = this.cols/2 - 4;
                const centerRight = this.cols/2 + 4;
                const centerTop = this.rows/2 - 4;
                const centerBottom = this.rows/2 + 4;
                if (!(rx + rw < centerLeft || rx > centerRight || ry + rh < centerTop || ry > centerBottom)) {
                    continue;
                }
"""
content = content.replace(old_room_check, new_room_check)

# 2. Fix Puff-shroom spore speed
old_puff = "spore: { n: 1, every: 12 }"
new_puff = "spore: { n: 1, every: 7 }"
content = content.replace(old_puff, new_puff)

old_scaredy = "spore: { n: 2, every: 12 }"
new_scaredy = "spore: { n: 2, every: 7 }"
content = content.replace(old_scaredy, new_scaredy)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
