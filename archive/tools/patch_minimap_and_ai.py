import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Fix AI planting outside
old_ai_empty = """                const emptyTiles = [];
                for(let r = rm.y + 1; r < rm.y + rm.h - 1; r++) {
                    for(let c = rm.x + 1; c < rm.x + rm.w - 1; c++) {
                        if (!myPlants.some(p => p.c === c && p.r === r)) {
                            emptyTiles.push({c, r});
                        }
                    }
                }"""
new_ai_empty = """                const emptyTiles = [];
                for(let r = rm.y; r < rm.y + rm.h; r++) {
                    for(let c = rm.x; c < rm.x + rm.w; c++) {
                        // 确保只种在房间有效的地板区域内
                        if (rm.tpl.grid[r - rm.y][c - rm.x] === 1) {
                            if (!myPlants.some(p => p.c === c && p.r === r)) {
                                emptyTiles.push({c, r});
                            }
                        }
                    }
                }"""
content = content.replace(old_ai_empty, new_ai_empty)

# Make minimap bigger and show AIs & Red Slash
old_minimap = """    _updateMinimap() {
        const ctx = this.minimap;
        const W = 176, H = 132;
        const sx = W / this.worldWidth, sy = H / this.worldHeight;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(8,25,45,0.55)';
        ctx.fillRect(0, 0, W, H);
        // 房间外框（河道蓝）
        ctx.strokeStyle = 'rgba(90,160,220,0.9)';
        ctx.lineWidth = 1.5;
        for (const rm of this.rooms) {
            ctx.strokeRect(rm.x * this.gridSize * sx, rm.y * this.gridSize * sy, rm.w * this.gridSize * sx, rm.h * this.gridSize * sy);
        }
        // 阳光袋
        ctx.fillStyle = '#ffe14a';
        for (const s of this.suns) ctx.fillRect(s.x * sx - 1.5, s.y * sy - 1.5, 3, 3);
        // 僵尸
        ctx.fillStyle = '#ff5252';
        for (const zb of this.zombies) ctx.fillRect(zb.x * sx - 2, zb.y * sy - 2, 4, 4);
        // 玩家
        ctx.fillStyle = '#4da6ff';
        ctx.beginPath();
        ctx.arc(this.player.x * sx, this.player.y * sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }"""
new_minimap = """    _updateMinimap() {
        const ctx = this.minimap;
        const W = 320, H = 240; // 扩大版小地图
        const sx = W / this.worldWidth, sy = H / this.worldHeight;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(8,25,45,0.75)';
        ctx.fillRect(0, 0, W, H);
        // 房间外框（河道蓝）
        ctx.strokeStyle = 'rgba(90,160,220,0.9)';
        ctx.lineWidth = 1.5;
        for (const rm of this.rooms) {
            ctx.strokeRect(rm.x * this.gridSize * sx, rm.y * this.gridSize * sy, rm.w * this.gridSize * sx, rm.h * this.gridSize * sy);
            // 画个床位示意
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect((rm.x + rm.tpl.bed.c) * this.gridSize * sx, (rm.y + rm.tpl.bed.r) * this.gridSize * sy, this.gridSize * sx, this.gridSize * sy);
        }
        // 阳光袋
        ctx.fillStyle = '#ffe14a';
        for (const s of this.suns) ctx.fillRect(s.x * sx - 1.5, s.y * sy - 1.5, 3, 3);
        // 僵尸
        ctx.fillStyle = '#ff5252';
        for (const zb of this.zombies) ctx.fillRect(zb.x * sx - 3, zb.y * sy - 3, 6, 6);
        
        // 玩家与人机
        for (const p of this.allPlayers) {
            const isMe = p === this.player;
            // 颜色分配：你是绿色，人机取他们的颜色
            let color = isMe ? '#00ff00' : p.color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x * sx, p.y * sy, isMe ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 名字
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            if (p.dead) {
                ctx.fillStyle = '#888';
                ctx.fillText(isMe ? '你(阵亡)' : p.roleDef.name, p.x * sx, p.y * sy - 8);
                // 红色斜杠
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x * sx - 6, p.y * sy - 6);
                ctx.lineTo(p.x * sx + 6, p.y * sy + 6);
                ctx.stroke();
            } else {
                ctx.fillText(isMe ? '你' : p.roleDef.name, p.x * sx, p.y * sy - 8);
            }
        }
    }"""
content = content.replace(old_minimap, new_minimap)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)

