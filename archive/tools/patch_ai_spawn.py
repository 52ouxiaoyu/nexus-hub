import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Modify AI spawn logic to spawn at center and move
old_ai_spawn = """        // v3.93.0 安排 5 个人机，拥有5种不同皮肤
        let shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 5; i++) {
            if (i >= shuffledRooms.length) break;
            const rm = shuffledRooms[i];
            const roleDef = this.playerRoles[i]; // 一人一个
            const ai = {
                x: (rm.x + rm.tpl.bed.c) * this.gridSize + 40,
                y: (rm.y + rm.tpl.bed.r) * this.gridSize + 40,
                sun: 50, hp: 100, maxHp: 100,
                isAi: true, room: rm, roleDef: roleDef,
                icon: roleDef.icon,
                el1: document.createElement('div')
            };"""

new_ai_spawn = """        // v3.93.0 安排 5 个人机，所有人都出生在地图正中央，然后走向各自房间
        let shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 5; i++) {
            if (i >= shuffledRooms.length) break;
            const rm = shuffledRooms[i];
            const roleDef = this.playerRoles[i]; // 一人一个
            const ai = {
                x: cx + (Math.random() * 40 - 20),
                y: cy + (Math.random() * 40 - 20),
                targetX: (rm.x + rm.tpl.bed.c) * this.gridSize + 40,
                targetY: (rm.y + rm.tpl.bed.r) * this.gridSize + 40,
                sun: 50, hp: 100, maxHp: 100,
                isAi: true, room: rm, roleDef: roleDef,
                icon: roleDef.icon,
                el1: document.createElement('div')
            };"""
content = content.replace(old_ai_spawn, new_ai_spawn)

# 2. Add AI movement in loop
old_player_move = """        let nx = this.player.x + vx1 * dt;
        let ny = this.player.y;
        if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) this.player.x = nx;

        nx = this.player.x;
        ny = this.player.y + vy1 * dt;
        if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) this.player.y = ny;"""

new_player_move = """        let nx = this.player.x + vx1 * dt;
        let ny = this.player.y;
        if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) this.player.x = nx;

        nx = this.player.x;
        ny = this.player.y + vy1 * dt;
        if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) this.player.y = ny;

        // 人机开局自动寻路（走向房间的床位）
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
content = content.replace(old_player_move, new_player_move)

# 3. Update room ownership check
old_inside_room = """    // v3.91.0：判定某格是否在某个房间内部（房间模板 grid=1 的地面）
    _insideRoom(col, row) {
        for (const rm of this.rooms) {
            if (col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h &&
                rm.tpl.grid[row - rm.y][col - rm.x] === 1) return true;
        }
        return false;
    }"""

new_inside_room = """    // v3.91.0：判定某格是否在某个房间内部，并返回该房间对象
    _insideRoom(col, row) {
        for (const rm of this.rooms) {
            if (col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h &&
                rm.tpl.grid[row - rm.y][col - rm.x] === 1) return rm;
        }
        return null;
    }"""
content = content.replace(old_inside_room, new_inside_room)


old_open_menu = """        // v3.91.0：植物只能种在房间里——房间外的草地不允许种植
        if (!this._insideRoom(col, row)) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '只能种在房间里', '#ff8a8a');
            return;
        }

        this.menuCol = col;"""

new_open_menu = """        // v3.91.0：植物只能种在房间里——房间外的草地不允许种植
        const targetRm = this._insideRoom(col, row);
        if (!targetRm) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '只能种在房间里', '#ff8a8a');
            return;
        }
        
        // v3.94.6: 检查房间归属
        if (this.ais.some(ai => ai.room === targetRm)) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '这是人机的房间！', '#ff8a8a');
            return;
        }
        if (this.player.room && this.player.room !== targetRm) {
            this._flyText(col * this.gridSize + 40, row * this.gridSize, '你已经有房间了！', '#ff8a8a');
            return;
        }

        this.menuCol = col;"""
content = content.replace(old_open_menu, new_open_menu)

# 4. Set player's room when they actually plant something
old_do_plant = """    doPlant(type) {
        this._closePlantMenu();

        const def = HauntedDorm.DEFS[type];"""

new_do_plant = """    doPlant(type) {
        this._closePlantMenu();
        
        const targetRm = this._insideRoom(this.menuCol, this.menuRow);
        if (targetRm && !this.player.room) {
            this.player.room = targetRm; // 绑定房间归属
        }

        const def = HauntedDorm.DEFS[type];"""
content = content.replace(old_do_plant, new_do_plant)


with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
