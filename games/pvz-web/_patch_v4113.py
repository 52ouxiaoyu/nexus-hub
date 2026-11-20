#!/usr/bin/env python3
# v4.0.113 补丁：守屋人机「走路时穿墙」根治
#  1) 新增 _pathToBed：一次 BFS 直达床位（原来「到门口 + 直线补一步」那一步会横穿房内墙体）
#  2) 全部 11 处 push(床位) 组合替换为 _pathToBed
#  3) 人机移动前「路点相邻性自检」+ 墙内救援 + 单帧步长上限（任何瞬移/搬移都不会再沿过期路径穿墙）
#  4) _placeHomeSpawn 搬完人后重算人机路径（根因：v4.0.108 把人机也搬到屋外，但路径仍是「从地图中心出发」）
import io, sys

P = 'js/HauntedDorm.js'
src = io.open(P, encoding='utf-8').read()
orig = src
reps = []

# ---------- 1) 新增 _pathToBed ----------
reps.append(("""        return path;
    }

    // v4.0.72：跳板传送""",
"""        return path;
    }

    // v4.0.113：一次 BFS 直达床位——旧写法是「先寻路到门口，再 push 一个床位点」，
    // 门口格与床位格往往隔 4~6 格且中间有房内墙体，最后那一步直线插值就是从墙里穿进去的。
    // 现在整条路径全程 4 连通（每步 1 格），人机不可能再沿路点穿墙。
    _pathToBed(x, y, rm, bedIdx = 0) {
        if (!rm || !rm.tpl || !rm.tpl.beds || rm.tpl.beds.length === 0) return null;
        const bed = rm.tpl.beds[Math.min(bedIdx, rm.tpl.beds.length - 1)] || rm.tpl.beds[0];
        const bx = (rm.x + bed.c) * this.gridSize + 40;
        const by = (rm.y + bed.r) * this.gridSize + 40;
        const direct = this._findPath(x, y, bx, by);
        if (direct && direct.length > 0) return direct;
        // 兜底：床位格被植物/墙围死时，至少走到门口；只有床位与最后一点相邻才补这一步（相邻=不穿墙）
        const p = this._findPath(x, y, rm.frontX, rm.frontY);
        if (!p || p.length === 0) return null;
        const last = p[p.length - 1];
        if (Math.abs(last.x - bx) + Math.abs(last.y - by) <= this.gridSize + 1) p.push({ x: bx, y: by });
        return p;
    }

    // v4.0.72：跳板传送"""))

# ---------- 2) 11 处 push(床位) → _pathToBed ----------

# 2.1 AI 构造（地图中心出发 → 专属床位）
reps.append(("""            const p = this._findPath(sx, sy, rm.frontX, rm.frontY);
            if (p) p.push({ x: (rm.x + bedChoice.bedCoords.c) * this.gridSize + 40, y: (rm.y + bedChoice.bedCoords.r) * this.gridSize + 40 }); // 走到专属床位（v4.0.16：寻路失败为 null，靠 update 里的重试兜底）""",
"""            // v4.0.113：一次 BFS 直达专属床位（旧「到门口 + 直线补床位」那一步会横穿房内墙体）
            const p = this._pathToBed(sx, sy, rm, bedChoice.bedIdx);"""))

# 2.2 托管激活：无房 → 去最近可认领房
reps.append(("""                            p.targetRoom = cand[0];
                            const path = this._findPath(p.x, p.y, p.targetRoom.frontX, p.targetRoom.frontY);
                            if (path) {
                                path.push({ x: (p.targetRoom.x + p.targetRoom.tpl.beds[0].c) * 80 + 40, y: (p.targetRoom.y + p.targetRoom.tpl.beds[0].r) * 80 + 40 });
                                p.path = path;
                            }""",
"""                            p.targetRoom = cand[0];
                            const path = this._pathToBed(p.x, p.y, p.targetRoom);
                            if (path) p.path = path;"""))

# 2.3 托管激活：有房但在屋外 → 回自家床边
reps.append(("""                        const path = this._findPath(p.x, p.y, p.room.frontX, p.room.frontY);
                        if (path) {
                            path.push({ x: (p.room.x + p.room.tpl.beds[0].c) * 80 + 40, y: (p.room.y + p.room.tpl.beds[0].r) * 80 + 40 });
                            p.path = path;
                        }""",
"""                        const path = this._pathToBed(p.x, p.y, p.room);
                        if (path) p.path = path;"""))

# 2.4 门危逃亡：换新房
reps.append(("""                            const p0 = this._findPath(ai.x, ai.y, ai.newRoom.frontX, ai.newRoom.frontY);
                            if (p0) p0.push({ x: (ai.newRoom.x + ai.newRoom.tpl.beds[0].c) * 80 + 40, y: (ai.newRoom.y + ai.newRoom.tpl.beds[0].r) * 80 + 40 });
                            ai.path = p0 || [];""",
"""                            const p0 = this._pathToBed(ai.x, ai.y, ai.newRoom);
                            ai.path = p0 || [];"""))

# 2.5 贴脸僵尸逃进避难房
reps.append(("""                            const p2 = this._findPath(ai.x, ai.y, refuge.frontX, refuge.frontY);
                            if (p2 && p2.length > 0) {
                                p2.push({ x: (refuge.x + refuge.tpl.beds[0].c) * this.gridSize + 40, y: (refuge.y + refuge.tpl.beds[0].r) * this.gridSize + 40 });
                                ai.path = p2; ai.speed = 300;
                            }""",
"""                            const p2 = this._pathToBed(ai.x, ai.y, refuge);
                            if (p2 && p2.length > 0) { ai.path = p2; ai.speed = 300; }"""))

# 2.6 盲盒被抢/僵尸靠近 → 回自家
reps.append(("""                            const p = this._findPath(ai.x, ai.y, ai.room.frontX, ai.room.frontY);
                            if (p) {
                                p.push({ x: (ai.room.x + ai.room.tpl.beds[0].c) * 80 + 40, y: (ai.room.y + ai.room.tpl.beds[0].r) * 80 + 40 });
                                ai.path = p;
                            }""",
"""                            const p = this._pathToBed(ai.x, ai.y, ai.room);
                            if (p) ai.path = p;"""))

# 2.7 门破弃房逃亡
reps.append(("""                        const p = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                        ai.speed = 300; // 极速逃生
                        if (p) {
                            p.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                            ai.path = p;
                        }""",
"""                        const p = this._pathToBed(ai.x, ai.y, ai.targetRoom);
                        ai.speed = 300; // 极速逃生
                        if (p) ai.path = p;"""))

# 2.8 无路重试（每 2 秒）
reps.append(("""                    const rp = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                    if (rp) {
                        rp.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.path = rp;
                    }""",
"""                    const rp = this._pathToBed(ai.x, ai.y, ai.targetRoom);
                    if (rp) ai.path = rp;"""))

# 2.9 托管兜底：指派最近可认领房
reps.append(("""                    const p0 = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                    if (p0) {
                        p0.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.path = p0;
                    }""",
"""                    const p0 = this._pathToBed(ai.x, ai.y, ai.targetRoom);
                    if (p0) ai.path = p0;"""))

# 2.10 走到床边发现房间被占 → 换房
reps.append(("""                        const p = this._findPath(ai.x, ai.y, ai.targetRoom.frontX, ai.targetRoom.frontY);
                        // v4.0.49：寻路失败返回 null 时跳过（原代码 null.push 直接抛错中断整帧 AI 更新——
                        // 新多样化布局下门朝向更多，AI 临时换房路径偶发不可达的几率上升，必须有保护）
                        if (!p) continue;
                        p.push({ x: (ai.targetRoom.x + ai.targetRoom.tpl.beds[0].c) * this.gridSize + 40, y: (ai.targetRoom.y + ai.targetRoom.tpl.beds[0].r) * this.gridSize + 40 });
                        ai.path = p;
                        continue;""",
"""                        const p = this._pathToBed(ai.x, ai.y, ai.targetRoom);
                        // v4.0.49：寻路失败返回 null 时跳过（原代码 null.push 直接抛错中断整帧 AI 更新——
                        // 新多样化布局下门朝向更多，AI 临时换房路径偶发不可达的几率上升，必须有保护）
                        if (!p) continue;
                        ai.path = p;
                        continue;"""))

# 2.11 到床边发现满员 → 逐个试空房
reps.append(("""                                    const p = this._findPath(ai.x, ai.y, rm.frontX, rm.frontY);
                                    if (!p) continue; // v4.0.68：寻路失败跳过换房（多样化布局下门朝多向，偶发不可达会 null.push 崩溃整帧）
                                    p.push({ x: (rm.x + rm.tpl.beds[0].c) * this.gridSize + 40, y: (rm.y + rm.tpl.beds[0].r) * this.gridSize + 40 });
                                    ai.path = p;""",
"""                                    const p = this._pathToBed(ai.x, ai.y, rm);
                                    if (!p) continue; // v4.0.68：寻路失败跳过换房（多样化布局下门朝多向，偶发不可达会 null.push 崩溃整帧）
                                    ai.path = p;"""))

# ---------- 3) 人机移动前自检（路点相邻 + 墙内救援）----------
reps.append(("""            if (ai.path && ai.path.length > 0) {
                // 获取玩家当前物理所在的房间""",
"""            if (ai.path && ai.path.length > 0) {
                // v4.0.113：路径自检——下一个路点必须就在脚边（曼哈顿 ≤1.5 格）。
                // 超出说明这份路径不是从当前位置算出来的（v4.0.108 把人机出生点搬到屋外、跳板瞬移、换房重算），
                // 继续沿它直线插值就会「一边赶路一边穿墙」（用户实报：人机走路的时间段能穿墙出来）→ 立刻按当前位置重算。
                {
                    const t0 = ai.path[0];
                    if (t0 && Math.abs(t0.x - ai.x) + Math.abs(t0.y - ai.y) > this.gridSize * 1.5) {
                        const fixed = this._pathToBed(ai.x, ai.y, ai.targetRoom || ai.room);
                        if (fixed && fixed.length > 0) ai.path = fixed;
                        else { ai.path = null; ai.repathT = 999; }
                    }
                }
                // v4.0.113：万一人已经站在墙格里（历史穿墙/被新砌的墙包住）——先把人请到最近的空地，
                // 否则它会从墙体内部踩着墙走出去，视觉上依然是「穿墙」。
                {
                    const wc = Math.floor(ai.x / this.gridSize), wr = Math.floor(ai.y / this.gridSize);
                    if (this.walls.has(wc + ',' + wr)) {
                        let bestSpot = null, bestD = Infinity;
                        for (let rad = 1; rad <= 4 && !bestSpot; rad++) {
                            for (let dx = -rad; dx <= rad; dx++) {
                                for (let dy = -rad; dy <= rad; dy++) {
                                    if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
                                    const nc = wc + dx, nr = wr + dy;
                                    if (nc < 1 || nr < 1 || nc >= this.cols - 1 || nr >= this.rows - 1) continue;
                                    if (this.walls.has(nc + ',' + nr)) continue;
                                    const px = nc * this.gridSize + 40, py = nr * this.gridSize + 40;
                                    const d = Math.hypot(px - ai.x, py - ai.y);
                                    if (d < bestD) { bestD = d; bestSpot = { x: px, y: py }; }
                                }
                            }
                        }
                        if (bestSpot) {
                            ai.x = bestSpot.x; ai.y = bestSpot.y;
                            const fixP = this._pathToBed(ai.x, ai.y, ai.targetRoom || ai.room);
                            ai.path = (fixP && fixP.length > 0) ? fixP : null;
                        }
                    }
                }
                if (!ai.path || ai.path.length === 0) continue;
                // 获取玩家当前物理所在的房间"""))

# ---------- 3b) 单帧步长上限（防大 dt 一步跨过墙）----------
reps.append(("""                } else if (dist > 5) {
                    const spd = ai.speed || 200; // v4.0.34：速度字段真正生效（原硬编码 200，「极速逃生」从未加速）
                    ai.x += (dx / dist) * spd * dt;
                    ai.y += (dy / dist) * spd * dt;""",
"""                } else if (dist > 5) {
                    const spd = ai.speed || 200; // v4.0.34：速度字段真正生效（原硬编码 200，「极速逃生」从未加速）
                    // v4.0.113：单帧位移封顶 0.9 格——掉帧时 dt 变大，原写法一帧能挪 1~2 格，直接从墙角跨过去
                    const step = Math.min(spd * dt, this.gridSize * 0.9);
                    ai.x += (dx / dist) * step;
                    ai.y += (dy / dist) * step;"""))

# ---------- 4) _placeHomeSpawn 后重算人机路径 ----------
reps.append(("""        // v4.0.108：玩家还没进门之前，这几间房先给玩家留着（AI 45 秒内不认领）
        this._homeReservedUntil = 45000;
    }""",
"""        // v4.0.108：玩家还没进门之前，这几间房先给玩家留着（AI 45 秒内不认领）
        this._homeReservedUntil = 45000;
        // v4.0.113：人机也在这轮搬移里被挪到了屋外，但它们手里那份路径还是「从地图正中心出发」算的——
        // 不重算，人机就会朝地图中心直线狂奔、一路穿墙而出（用户实报「人机走路的时间段可以出来」）。
        for (const a of this.ais) {
            if (!a || a.dead) continue;
            const np = this._pathToBed(a.x, a.y, a.targetRoom);
            a.path = (np && np.length > 0) ? np : null;
            a.repathT = 0;
        }
    }"""))

for old, new in reps:
    n = src.count(old)
    if n != 1:
        print('FAIL anchor count=%d: %s' % (n, old[:110].replace('\n', '\\n')))
        sys.exit(1)
    src = src.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK 已写入，替换 %d 处，文件 %d → %d 字节' % (len(reps), len(orig), len(src)))
