import io, sys
P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, '锚点命中 %d 次（应为 %d）:\n%s' % (c, n, old[:160])
    s = s.replace(old, new)

# ---------- ① 户外优先锁定：跳过我方僵尸玩家 ----------
rep("""                !pp.traitor &&
                !(pp === this.player && this.player.stealthT > 0) &&
                !this._insideRoom(Math.floor(pp.x / this.gridSize), Math.floor(pp.y / this.gridSize)) &&""",
    """                !pp.traitor &&
                !pp.isZombie && // v4.0.115：僵尸阵营里玩家本体是自己人——尸潮绝不把他当"跑出去的猎物"锁
                !(pp === this.player && this.player.stealthT > 0) &&
                !this._insideRoom(Math.floor(pp.x / this.gridSize), Math.floor(pp.y / this.gridSize)) &&""")

# ---------- ② 锁定的植物已经被啃掉 → 立刻作废 ----------
rep("""            zb.targetEvalT = (zb.targetEvalT || 0) + dt;
            let closestTarget = zb.lockedTarget;""",
    """            zb.targetEvalT = (zb.targetEvalT || 0) + dt;
            let closestTarget = zb.lockedTarget;
            // v4.0.115：锁的是"有植物房间里的某株植物"（虚拟猎物），植物被啃掉/被铲走 → 立刻作废重选
            if (closestTarget && closestTarget._isPlant &&
                (!closestTarget._plant || this.plants.indexOf(closestTarget._plant) < 0 || closestTarget._plant.hp <= 0)) {
                closestTarget = null; zb.lockedTarget = null; zb.targetSwitched = true;
            }""")

# ---------- ③ 综合作战评分：跳过我方僵尸玩家 ----------
rep("""                    if (p.traitor) continue; // v4.0.44/104：玩家内鬼=僵尸方
                    if (p === this.player && this.player.stealthT > 0) continue;""",
    """                    if (p.traitor) continue; // v4.0.44/104：玩家内鬼=僵尸方
                    if (p.isZombie) continue; // v4.0.115：僵尸阵营玩家（你/P2）与尸潮同阵营，不再是猎物
                    if (p === this.player && this.player.stealthT > 0) continue;""")

# ---------- ④ 兜底目标：不要回落玩家本体，改去有植物的房间啃坚果 ----------
rep("""            if (!closestTarget) closestTarget = this.player;""",
    """            if (!closestTarget) {
                // v4.0.115：一个活人都没有时不再回头咬玩家本体（同阵营），改去有植物的房间啃坚果
                closestTarget = this.isZombieFaction ? this._hordePlantPrey(zb) : this.player;
                if (closestTarget) zb.lockedTarget = closestTarget;
            }
            if (!closestTarget) continue; // 场上既没人也没植物 → 这帧原地待命""")

# ---------- ⑤ 新增 _hordePlantPrey ----------
rep("""    _defeatTraitor(killer) {""",
    """    // v4.0.115：僵尸阵营的尸潮猎物——就近在"有植物的房间"里随机挑一株植物（先啃门，再啃坚果）
    // 用途：玩家本体与尸潮同阵营，不能当目标；一个活人都没有时，尸潮就去屋里啃植物，不会原地发呆
    _hordePlantPrey(zb) {
        if (!zb || !this.plants || this.plants.length === 0) return null;
        const rooms = this.rooms.filter(rm => this.plants.some(pl =>
            pl.hp > 0 && !pl.def.ground &&
            pl.c >= rm.x && pl.c < rm.x + rm.w && pl.r >= rm.y && pl.r < rm.y + rm.h));
        if (rooms.length === 0) return null;
        // 就近随机：在最近 3 间有植物的房里挑一间，保留随机性（不会每只都挤同一扇门）
        rooms.sort((a, b) => Math.hypot(a.x * 80 - zb.x, a.y * 80 - zb.y) - Math.hypot(b.x * 80 - zb.x, b.y * 80 - zb.y));
        const pick = rooms[Math.floor(Math.random() * Math.min(3, rooms.length))];
        const inside = this.plants.filter(pl =>
            pl.hp > 0 && !pl.def.ground &&
            pl.c >= pick.x && pl.c < pick.x + pick.w && pl.r >= pick.y && pl.r < pick.y + pick.h);
        if (inside.length === 0) return null;
        const target = inside[Math.floor(Math.random() * inside.length)];
        return { x: target.c * 80 + 40, y: target.r * 80 + 40, hp: target.hp, maxHp: target.maxHp,
                 dead: false, _isPlant: true, _plant: target, roleDef: { name: '坚果' } };
    }

    _defeatTraitor(killer) {""")

# ---------- ⑥ 令旗候选：只留植物方（不含我方僵尸玩家） ----------
rep("""        const candidates = [...this.ais, ...(this.player2 ? [this.player2] : [])].filter(v => !v.dead);
        if (this.player && !this.player.dead) candidates.unshift(this.player);
        if (candidates.length === 0) return;
        let idx = candidates.indexOf(this.commandTarget);
        this.commandTarget = candidates[(idx + 1) % candidates.length];
        const nm = this.commandTarget === this.player ? (this.player2 ? 'P2' : '你(本体)')
            : (this.commandTarget.roleDef ? this.commandTarget.roleDef.name : '幸存者');""",
    """        // v4.0.115：候选只留植物方幸存者——你自己和 P2 在僵尸阵营里是尸潮的主人，不是猎物（原来候选里含本体，HUD 上写着「目标:你」）
        const candidates = [...this.ais, ...(this.player2 ? [this.player2] : [])].filter(v => !v.dead && !v.isZombie);
        if (this.player && !this.player.dead && !this.player.isZombie) candidates.unshift(this.player);
        if (candidates.length === 0) {
            this.commandTarget = null;
            this._updateGhostChip();
            this._flyText(this.player.x, this.player.y - 40, '场上没有活着的幸存者了', '#ff8a8a');
            return;
        }
        let idx = candidates.indexOf(this.commandTarget);
        this.commandTarget = candidates[(idx + 1) % candidates.length];
        const nm = this.commandTarget.roleDef ? this.commandTarget.roleDef.name : '幸存者';""")

# ---------- ⑦ HUD 目标文案：不再出现「你」 ----------
rep("""                const cmdTxt = this.commandTarget
                    ? (this.commandTarget === this.player ? (this.player2 ? 'P2' : '你') : (this.commandTarget.roleDef ? this.commandTarget.roleDef.name : '?'))
                    : '无';""",
    """                // v4.0.115：令旗目标只会是植物方幸存者，本体不再是候选（原来这里会显示「目标:你」）
                const cmdTxt = this.commandTarget && !this.commandTarget.dead
                    ? (this.commandTarget.roleDef ? this.commandTarget.roleDef.name : '幸存者')
                    : '无';""")

assert s != orig
io.open(P, 'w', encoding='utf-8').write(s)
print('OK 7 处补丁已写入')
