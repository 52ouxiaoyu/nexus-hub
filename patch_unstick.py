import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

unstick = """        // P1
        let vx1 = 0, vy1 = 0;
        if (this.keys['a'] || this.keys['arrowleft']) vx1 -= speed;
        if (this.keys['d'] || this.keys['arrowright']) vx1 += speed;
        if (this.keys['w'] || this.keys['arrowup']) vy1 -= speed;
        if (this.keys['s'] || this.keys['arrowdown']) vy1 += speed;

        let nx = this.player.x + vx1 * dt;
        let ny = this.player.y;
        if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) this.player.x = nx;
        
        nx = this.player.x;
        ny = this.player.y + vy1 * dt;
        if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) this.player.y = ny;
        
        // 防卡墙自救
        if (this.checkCollision(this.player.x, this.player.y)) {
            // 被卡在墙内了，尝试推出去
            const r = 10;
            if (!this.checkCollision(this.player.x + r, this.player.y)) this.player.x += r;
            else if (!this.checkCollision(this.player.x - r, this.player.y)) this.player.x -= r;
            else if (!this.checkCollision(this.player.x, this.player.y + r)) this.player.y += r;
            else if (!this.checkCollision(this.player.x, this.player.y - r)) this.player.y -= r;
        }"""

content = content.replace("        // P1\n        let vx1 = 0, vy1 = 0;", unstick.replace("        // P1\n        let vx1 = 0, vy1 = 0;", "        // P1\n        let vx1 = 0, vy1 = 0;").split("// 防卡墙自救")[0] + "// 防卡墙自救\n" + unstick.split("// 防卡墙自救")[1])

# The above replace might be messy. Let's do regex.
content = re.sub(r'if \(ny > 30 && ny < this\.worldHeight - 10 && !this\.checkCollision\(nx, ny\)\) this\.player\.y = ny;', 
"""if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) this.player.y = ny;

        // 防卡墙自救
        if (this.checkCollision(this.player.x, this.player.y)) {
            // 被卡在墙内了，尝试推出去
            const r = 20;
            if (!this.checkCollision(this.player.x + r, this.player.y)) this.player.x += r;
            else if (!this.checkCollision(this.player.x - r, this.player.y)) this.player.x -= r;
            else if (!this.checkCollision(this.player.x, this.player.y + r)) this.player.y += r;
            else if (!this.checkCollision(this.player.x, this.player.y - r)) this.player.y -= r;
        }""", content)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
