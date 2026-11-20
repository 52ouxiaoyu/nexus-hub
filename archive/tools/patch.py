import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# Add AI init
content = content.replace("this.peas = [];      // 各类弹道", "this.peas = [];\n        this.ais = [];\n        this.allPlayers = [this.player];")

# Spawn AI at the end of generateMap
spawn_ai_code = """
            // 生成床(阳光菇)
            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');
        }

        // v3.93.0 安排 6 个人机
        let shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 6; i++) {
            if (i >= shuffledRooms.length) break;
            const rm = shuffledRooms[i];
            const ai = {
                x: (rm.x + rm.tpl.bed.c) * this.gridSize + 40,
                y: (rm.y + rm.tpl.bed.r) * this.gridSize + 40,
                sun: 50, hp: 100, maxHp: 100,
                isAi: true, room: rm,
                icon: 'assets/images/interface/Dave.gif',
                el1: document.createElement('div')
            };
            ai.el1.className = 'entity avatar';
            ai.el1.innerHTML = `<img src="${ai.icon}">`;
            ai.el1.style.filter = `hue-rotate(${Math.random()*360}deg)`;
            this.world1.appendChild(ai.el1);
            this.ais.push(ai);
            this.allPlayers.push(ai);
        }
"""
content = content.replace("            // 生成床(阳光菇)\n            this.spawnPlant(rm.x + rm.tpl.bed.c, rm.y + rm.tpl.bed.r, 'sunshroom');\n        }", spawn_ai_code)

# Replace Zombie AI target selection
old_zombie_target = """            const targetX = this.player.x;
            const targetY = this.player.y;
            let dx = targetX - zb.x;
            let dy = targetY - zb.y;"""

new_zombie_target = """            // 找最近目标（玩家 + AI）
            let closestTarget = null;
            let minDist = Infinity;
            for (const p of this.allPlayers) {
                if (p.hp <= 0) continue;
                const d = Math.hypot(p.x - zb.x, p.y - zb.y);
                if (d < minDist) { minDist = d; closestTarget = p; }
            }
            if (!closestTarget) closestTarget = this.player;

            // 如果目标在房间里，优先攻击门的坐标
            let targetX = closestTarget.x;
            let targetY = closestTarget.y;
            
            // 简单判断目标是否在某个房间附近，且门存活
            for (const rm of this.rooms) {
                const doorC = rm.doorCol, doorR = rm.doorRow;
                // 判断房间范围
                const rxMin = rm.x * this.gridSize, rxMax = (rm.x + rm.w) * this.gridSize;
                const ryMin = rm.y * this.gridSize, ryMax = (rm.y + rm.h) * this.gridSize;
                if (closestTarget.x >= rxMin && closestTarget.x <= rxMax && closestTarget.y >= ryMin && closestTarget.y <= ryMax) {
                    // 目标在房间内，检查门是否存在
                    const doorPlant = this.getPlantAt(doorC * this.gridSize, doorR * this.gridSize);
                    if (doorPlant) {
                        targetX = doorC * this.gridSize + 40;
                        targetY = doorR * this.gridSize + 40;
                        // 为了避免贴着墙死磕，如果僵尸被墙卡死，它会尝试切换攻击对象（在下面detour逻辑里）
                    }
                    break;
                }
            }

            let dx = targetX - zb.x;
            let dy = targetY - zb.y;
            
            // 防卡墙：如果一直撞墙没有位移，切换目标或者大范围绕行
            if (zb.stuckTime > 3) {
                // 如果卡了太久，强制瞬移一点点或者往反方向走
                dx = (Math.random() - 0.5) * 100;
                dy = (Math.random() - 0.5) * 100;
                zb.stuckTime -= dt;
            }
"""
content = content.replace(old_zombie_target, new_zombie_target)

# Add stuckTime init
content = content.replace("detourT: 0, freezeT: 0", "detourT: 0, freezeT: 0, stuckTime: 0")

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
