import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

old_spawn = """    _ghostSpawnPoint() {
        for (let tries = 0; tries < 30; tries++) {
            const rm = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const d = rm.tpl.door;
            let dx = 0, dy = 0;
            if (d.r >= rm.h) dy = 1; else if (d.r < 0) dy = -1;
            else if (d.c >= rm.w) dx = 1; else dx = -1;
            const c = rm.x + d.c + dx * 2, r = rm.y + d.r + dy * 2;
            if (!this.walls.has(`${c},${r}`)) return { x: c * this.gridSize + 40, y: r * this.gridSize + 40 };
        }
        // 兜底：玩家 700px 外随机空地
        for (let tries = 0; tries < 60; tries++) {
            const x = 100 + Math.random() * (this.worldWidth - 200);
            const y = 100 + Math.random() * (this.worldHeight - 200);
            if (Math.hypot(x - this.player.x, y - this.player.y) < 700) continue;
            if (!this.checkCollision(x, y)) return { x, y };
        }
        return { x: this.worldWidth/2, y: this.worldHeight/2 };
    }"""

new_spawn = """    _isInsideAnyRoom(c, r) {
        for (const rm of this.rooms) {
            const dr = r - rm.y;
            const dc = c - rm.x;
            if (dr >= 0 && dr < rm.h && dc >= 0 && dc < rm.w) {
                if (rm.tpl.grid[dr][dc] === 1) return true;
            }
        }
        return false;
    }

    _ghostSpawnPoint() {
        for (let tries = 0; tries < 50; tries++) {
            const rm = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const d = rm.tpl.door;
            let dx = 0, dy = 0;
            if (d.r >= rm.h) dy = 1; else if (d.r < 0) dy = -1;
            else if (d.c >= rm.w) dx = 1; else dx = -1;
            const c = rm.x + d.c + dx * 3, r = rm.y + d.r + dy * 3;
            if (!this.walls.has(`${c},${r}`) && !this._isInsideAnyRoom(c, r)) {
                return { x: c * this.gridSize + 40, y: r * this.gridSize + 40 };
            }
        }
        // 兜底：玩家 700px 外随机空地，且不在任何房间内
        for (let tries = 0; tries < 100; tries++) {
            const c = Math.floor(2 + Math.random() * (this.cols - 4));
            const r = Math.floor(2 + Math.random() * (this.rows - 4));
            const x = c * this.gridSize + 40;
            const y = r * this.gridSize + 40;
            if (Math.hypot(x - this.player.x, y - this.player.y) < 700) continue;
            if (!this.walls.has(`${c},${r}`) && !this._isInsideAnyRoom(c, r)) return { x, y };
        }
        return { x: this.worldWidth/2, y: this.worldHeight/2 };
    }"""

content = content.replace(old_spawn, new_spawn)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
