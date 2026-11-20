import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Update Squash style and role definitions
old_roles = """        this.playerRoles = [
            { name: '向日葵',   icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '10秒内产阳光翻倍' },
            { name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '15秒内植物攻击力翻倍' },
            { name: '坚果',     icon: 'assets/images/Plants/WallNut/0.gif',   skillDesc: '免费升一次门板' },
            { name: '大嘴花',   icon: 'assets/images/Plants/Chomper/0.gif',   skillDesc: '赶跑僵尸一次' },
            { name: '倭瓜',     icon: 'assets/images/Plants/Squash/0.gif',   skillDesc: '半血以上砸掉一半血' },
        ];"""
new_roles = """        this.playerRoles = [
            { name: '向日葵',   icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '10秒内产阳光翻倍' },
            { name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '15秒内植物攻击力翻倍', imgStyle: 'transform: scale(1.2)' },
            { name: '坚果',     icon: 'assets/images/Plants/WallNut/0.gif',   skillDesc: '免费升一次门板' },
            { name: '大嘴花',   icon: 'assets/images/Plants/Chomper/0.gif',   skillDesc: '赶跑僵尸一次', imgStyle: 'transform: scale(1.2)' },
            { name: '倭瓜',     icon: 'assets/images/Plants/Squash/0.gif',   skillDesc: '半血以上砸掉一半血', imgStyle: 'transform: scale(2.0)' },
        ];"""
content = content.replace(old_roles, new_roles)

# Apply imgStyle to player setup
old_player_el = """        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar player-me';
        this.player.el1.innerHTML = `<img src="${this.player.roleDef.icon}">`;"""
new_player_el = """        this.player.el1 = document.createElement('div');
        this.player.el1.className = 'entity avatar player-me';
        this.player.el1.innerHTML = `<img src="${this.player.roleDef.icon}" style="${this.player.roleDef.imgStyle || ''}">`;"""
content = content.replace(old_player_el, new_player_el)

old_ai_spawn = """            ai.el1.className = 'entity avatar';
            ai.el1.innerHTML = `<img src="${ai.icon}">`;"""
new_ai_spawn = """            ai.el1.className = 'entity avatar';
            ai.el1.innerHTML = `<img src="${ai.icon}" style="${ai.roleDef.imgStyle || ''}">`;"""
content = content.replace(old_ai_spawn, new_ai_spawn)

# 2. Add Pathing waypoint for AI
old_ai_target = """                targetX: (rm.x + rm.tpl.bed.c) * this.gridSize + 40,
                targetY: (rm.y + rm.tpl.bed.r) * this.gridSize + 40,"""
new_ai_target = """                path: [
                    { x: rm.frontX, y: rm.frontY }, // 先走到门外引导点
                    { x: (rm.x + rm.tpl.bed.c) * this.gridSize + 40, y: (rm.y + rm.tpl.bed.r) * this.gridSize + 40 } // 再走进去
                ],"""
content = content.replace(old_ai_target, new_ai_target)

# Update AI movement logic to use path
old_ai_move = """        // 人机开局自动寻路（走向房间的床位）
        for (const ai of this.ais) {
            if (ai.targetX && ai.targetY) {
                const dx = ai.targetX - ai.x;
                const dy = ai.targetY - ai.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    ai.x += (dx / dist) * 200 * dt; // speed 200
                    ai.y += (dy / dist) * 200 * dt;
                } else {
                    ai.targetX = null;
                    ai.targetY = null;
                }
                ai.el1.style.left = ai.x + 'px';
                ai.el1.style.top = ai.y + 'px';
            }
        }"""
new_ai_move = """        // 人机开局自动寻路（按路点走到床位，避免穿模穿墙）
        for (const ai of this.ais) {
            if (ai.path && ai.path.length > 0) {
                const target = ai.path[0];
                const dx = target.x - ai.x;
                const dy = target.y - ai.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    ai.x += (dx / dist) * 200 * dt; // speed 200
                    ai.y += (dy / dist) * 200 * dt;
                } else {
                    ai.path.shift(); // 抵达当前路点，切下一个
                }
                ai.el1.style.left = ai.x + 'px';
                ai.el1.style.top = ai.y + 'px';
            }
        }"""
content = content.replace(old_ai_move, new_ai_move)

# Fix ai brain check for "still walking"
old_ai_brain_check = """                if (Math.hypot(ai.x - ai.targetX, ai.y - ai.targetY) > 10) continue; // 还在赶路"""
new_ai_brain_check = """                if (ai.path && ai.path.length > 0) continue; // 还在赶路，等到了床边再开始发育"""
content = content.replace(old_ai_brain_check, new_ai_brain_check)


with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
