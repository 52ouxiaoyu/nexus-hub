# v4.0.108：出生点从「门内第一格」改为「房门外空地」（场外）——用户：出生点不要直接在自己家里
import io, sys

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(old, new, n=1, tag=''):
    global s
    c = s.count(old)
    assert c == n, f'[{tag}] 期望 {n} 处，实际 {c} 处'
    s = s.replace(old, new)

# ---------------------------------------------------------------- 1. _placeHomeSpawn 整段重写
START = '    // v4.0.107：植物方开局落点 = 最近空房门外一格。'
END = '    _announce(text, sfx, priority = false) {'
i0 = s.find(START)
i1 = s.find(END)
assert i0 > 0 and i1 > i0, '定位失败'
NEW_FN = '''    // v4.0.108：出生点 = 场外（房门外空地）——用户实报「出生点直接在自己家里」。
    // 落点规则：最近空房的房门 → 朝门外方向第 3 格（240px）的露天走道；
    // 硬约束：_insideRoom 必须为 null（绝不会落在任何房间内部）、非墙格、无碰撞、无植物。
    _placeHomeSpawn() {
        if (this.isZombieFaction || !this.rooms || this.rooms.length === 0) return;
        const OUT_STEPS = 3;   // 门外第 3 格 = 场外：一眼能看到房门，又不算进屋
        const okSpot = (c, r) => {
            if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return false;
            const x = c * this.gridSize + 40, y = r * this.gridSize + 40;
            if (x < 60 || y < 60 || x > this.worldWidth - 60 || y > this.worldHeight - 60) return false;
            if (this.walls.has(c + ',' + r)) return false;
            if (this._insideRoom(c, r)) return false;   // 铁律：出生点必须在房间外
            if (this.checkCollision(x, y, 14)) return false;
            if (this.getPlantAt && this.getPlantAt(x, y)) return false;
            return true;
        };
        const used = [];
        for (const p of this.allPlayers) {
            if (!p || p.dead) continue;
            let best = null, bestD = Infinity;
            for (const rm of this.rooms) {
                if (used.includes(rm)) continue;
                if (rm.owners && rm.owners.length >= (rm.capacity || 1)) continue;
                const d = Math.hypot(rm.frontX - p.x, rm.frontY - p.y);
                if (d < bestD) { bestD = d; best = rm; }
            }
            if (!best) continue;
            used.push(best);
            // 房门朝外的方向（门在房间上方 → 向上；下方 → 向下；左右同理）
            const dr = best.tpl.door;
            let ox = 0, oy = 0;
            if (dr.r === -1) oy = -1;
            else if (dr.r >= best.h) oy = 1;
            else if (dr.c === -1) ox = -1;
            else if (dr.c >= best.w) ox = 1;
            let spot = null;
            // 先按理想距离 3 格取，被挡就退到 2/4/1 格
            for (const step of [OUT_STEPS, 2, 4, 1]) {
                const c = best.doorCol + ox * step, r = best.doorRow + oy * step;
                if (okSpot(c, r)) { spot = { x: c * 80 + 40, y: r * 80 + 40 }; break; }
            }
            // 兜底：以门前格为圆心向四周环形找场外空地（走道被建筑夹死时）
            if (!spot) {
                outer:
                for (let rad = 1; rad <= 6; rad++) {
                    for (let a = 0; a < 16; a++) {
                        const ang = a / 16 * Math.PI * 2;
                        const c = Math.round(best.frontX / 80 + Math.cos(ang) * rad);
                        const r = Math.round(best.frontY / 80 + Math.sin(ang) * rad);
                        if (okSpot(c, r)) { spot = { x: c * 80 + 40, y: r * 80 + 40 }; break outer; }
                    }
                }
            }
            if (!spot) spot = { x: best.frontX + ox * 80, y: best.frontY + oy * 80 }; // 极端兜底：门外一格
            p.x = spot.x; p.y = spot.y;
            p._homeRoom = best;                                        // 仅用于开局引导；房间归属仍靠种下第一株植物
            p._homeDoor = { x: best.frontX, y: best.frontY };           // 房门坐标（引导文案/镜头朝向备用）
        }
    }

'''
s = s[:i0] + NEW_FN + s[i1:]

# ---------------------------------------------------------------- 2. 构造函数注释
rep(
    "        this._placeHomeSpawn();  // v4.0.107：植物方出生在最近空房门外一格（原出生在地图正中，最近房门 468px）",
    "        this._placeHomeSpawn();  // v4.0.108：植物方出生在最近空房的【门外空地】（场外），必须自己走进房间",
    1, 'ctor 注释')

# ---------------------------------------------------------------- 3. 开局引导文案：强调先走进房间
rep(
    """                tip.innerText = '🏠 点脚下地板种一株植物 → 开始产阳光';""",
    """                tip.innerText = '🏠 你在屋外 → 走进最近的空房，点地板种植物才有阳光';""",
    1, '引导文案')

# ---------------------------------------------------------------- 4. 跳板落点注释同步（逻辑不变）
rep(
    "    // 跳板落点：v4.0.74 改为玩家出生点（地图中心防墙校正后的坐标）——不再落到门口被僵尸堵抓",
    "    // 跳板落点：v4.0.74 改为玩家出生点——v4.0.108 起出生点本身就在屋外空地，跳板即为「逃出房门」",
    1, '跳板注释')

io.open(P, 'w', encoding='utf-8').write(s)
print('patched ok, delta lines =', s.count('\n') - orig.count('\n'))
