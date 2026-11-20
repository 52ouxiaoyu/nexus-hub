import re

with open('pvz-web/js/HauntedDorm.js', 'r') as f:
    content = f.read()

# 1. Update player setup to use chosen role
old_player = """        const urlParams = new URLSearchParams(window.location.search);
        this.role = urlParams.get('role') || 'plant';
        
        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '【M键】10秒内阳光产出翻倍' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '【M键】15秒内全场植物攻击力翻倍' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '【M键】一局一次免费升级门' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '【M键】赶跑僵尸一次' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '【M键】半血以上砸掉僵尸一半血' }
        ];
        
        this.playerRoleDef = this.playerRoles[Math.floor(Math.random() * this.playerRoles.length)];

        this.player = {
            x: cx, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
            icon: this.role === 'zombie' ? 'assets/images/Zombies/Zombie/0.gif' : this.playerRoleDef.icon,
            roleDef: this.playerRoleDef,
            camX: 0, camY: 0, skillUsed: false, sunBuffT: 0, atkBuffT: 0
        };"""

new_player = """        const urlParams = new URLSearchParams(window.location.search);
        this.role = urlParams.get('role') || 'peashooter'; // Default to peashooter if missing
        
        this.playerRoles = [
            { id: 'sunflower', name: '向日葵', icon: 'assets/images/Plants/SunFlower/0.gif', skillDesc: '【M键】10秒内阳光产出翻倍' },
            { id: 'peashooter', name: '豌豆射手', icon: 'assets/images/Plants/Peashooter/0.gif', skillDesc: '【M键】15秒内全场植物攻击力翻倍' },
            { id: 'wallnut', name: '坚果', icon: 'assets/images/Plants/WallNut/0.gif', skillDesc: '【M键】一局一次免费升级门' },
            { id: 'chomper', name: '大嘴花', icon: 'assets/images/Plants/Chomper/0.gif', skillDesc: '【M键】赶跑僵尸一次' },
            { id: 'squash', name: '倭瓜', icon: 'assets/images/Plants/Squash/0.gif', skillDesc: '【M键】半血以上砸掉僵尸一半血' }
        ];
        
        this.playerRoleDef = this.playerRoles.find(r => r.id === this.role) || this.playerRoles[1];

        this.player = {
            x: cx, y: cy, sun: 0, spore: 0, hp: 100, maxHp: 100,
            icon: this.playerRoleDef.icon,
            roleDef: this.playerRoleDef,
            camX: 0, camY: 0, skillUsed: false, sunBuffT: 0, atkBuffT: 0
        };"""
content = content.replace(old_player, new_player)

# 2. Fix AI skin distribution (make sure AIs take the other skins)
old_ai_loop = """        // v3.93.0 安排 5 个人机，所有人都出生在地图正中央，然后走向各自房间
        let shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 5; i++) {
            if (i >= shuffledRooms.length) break;
            const rm = shuffledRooms[i];
            const roleDef = this.playerRoles[i]; // 一人一个
            const ai = {"""

new_ai_loop = """        // v3.93.0 安排 5 个人机，所有人都出生在地图正中央，然后走向各自房间
        let shuffledRooms = [...this.rooms].sort(() => Math.random() - 0.5);
        // 分配给人机的皮肤（不包含玩家当前选的那个，保证 1+5 刚好凑齐 6 个但不全部重复）
        // 或者直接给5个人机分配 5 个标准皮肤
        for (let i = 0; i < 5; i++) {
            if (i >= shuffledRooms.length) break;
            const rm = shuffledRooms[i];
            const roleDef = this.playerRoles[i]; // 5个人机刚好一人分一个固定皮肤，涵盖全部5种
            const ai = {"""
content = content.replace(old_ai_loop, new_ai_loop)

# 3. Zombie 1 Life & Fix "准备中" ghostSpawnAt
old_ghost_vars = """        // ===== 单僵尸导演系统 =====
        this.ghostSpawned = false;
        this.ghostSpawnAt = 20000;        // 开局 20s 出笼
        this.ghostLevel = 1;              // 当前等级 1..6
        this.ghostLvEvery = 45000;        // 每 45s 升一级
        this.ghostNextLvAt = 20000 + 45000;
        this.ghostRespawnAt = 0;          // >0 = 死亡等待重生"""

new_ghost_vars = """        // ===== 单僵尸导演系统 =====
        this.ghostSpawned = false;
        this.ghostSpawnAt = performance.now() + 20000; // 开局 20s 出笼，修复准备中 bug
        this.ghostLevel = 1;              // 当前等级 1..10
        this.ghostRespawnAt = 0;          // >0 = 死亡等待重生"""
content = content.replace(old_ghost_vars, new_ghost_vars)

old_update_ghost = """        if (!this.ghostSpawned) {
            chip.innerText = `👻 僵尸出笼还有 ${Math.max(0, Math.ceil((this.ghostSpawnAt - now) / 1000))}s`;
        } else if (this.ghostRespawnAt > 0) {
            chip.innerText = `👻 僵尸重生还有 ${Math.max(0, Math.ceil((this.ghostRespawnAt - now) / 1000))}s · 击杀 ${this.kills}`;
        } else {
            const cfg = HauntedDorm.GHOST_LEVELS[this.ghostLevel - 1];
            const lvTxt = this.ghostLevel >= HauntedDorm.GHOST_MAX_LV
                ? `Lv.${this.ghostLevel} ${cfg.name}（最终形态）`
                : `Lv.${this.ghostLevel} ${cfg.name} · 升级还有 ${Math.max(0, Math.ceil((this.ghostNextLvAt - now) / 1000))}s`;
            chip.innerText = `👻 ${lvTxt} · 击杀 ${this.kills}`;
        }"""

new_update_ghost = """        if (!this.ghostSpawned) {
            chip.innerText = `👻 僵尸出笼还有 ${Math.max(0, Math.ceil((this.ghostSpawnAt - now) / 1000))}s`;
        } else if (this.ghostRespawnAt > 0) {
            chip.innerText = `🏆 僵尸已被击杀，游戏胜利！`;
        } else {
            const cfg = HauntedDorm.GHOST_LEVELS[this.ghostLevel - 1];
            const lvTxt = this.ghostLevel >= HauntedDorm.GHOST_MAX_LV
                ? `Lv.${this.ghostLevel} ${cfg.name}（最终形态）`
                : `Lv.${this.ghostLevel} ${cfg.name}`;
            chip.innerText = `👻 ${lvTxt} · 击杀 ${this.kills}`;
        }"""
content = content.replace(old_update_ghost, new_update_ghost)

# 4. Remove zombie respawn logic and replace with Victory!
old_kill = """        if (zb.level >= HauntedDorm.GHOST_MAX_LV) {
            this.gameOver(true);
            return;
        }
        this.ghostRespawnAt = performance.now() + 8000;
        this._updateGhostChip();"""

new_kill = """        // 一命通关：僵尸死后游戏直接胜利
        this.ghostRespawnAt = 1; // 标记已死
        this._updateGhostChip();
        setTimeout(() => this.gameOver(true), 3000);"""
content = content.replace(old_kill, new_kill)

old_respawn = """        // 重生（打倒 8s 后同级再来）
        if (this.ghostRespawnAt > 0 && time >= this.ghostRespawnAt) {
            this.ghostRespawnAt = 0;
            this._spawnGhost();
            this._announce('👻 僵尸又来了！', 'evillaugh.mp3');
        }"""

new_respawn = """        // 一条命，不再重生"""
content = content.replace(old_respawn, new_respawn)

with open('pvz-web/js/HauntedDorm.js', 'w') as f:
    f.write(content)
