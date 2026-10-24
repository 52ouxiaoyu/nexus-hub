# v4.0.105 补丁：人机/托管「钉床」——进屋后固定在自家阳光菇格上，不再进屋—碰床—出门乒乓
import io, sys
P = 'js/HauntedDorm.js'
src = io.open(P, encoding='utf-8').read()
n = 0

def rep(old, new):
    global src, n
    assert src.count(old) == 1, ('ASSERT_FAIL count=%d for %r' % (src.count(old), old[:80]))
    src = src.replace(old, new)
    n += 1

# ---------- 1. 新增 _pinToBed 辅助 + _claimRoom 入住即钉床 ----------
rep("""    _claimRoom(p, rm) {
        if (!rm || this._ownsRoom(p, rm)) return true;""",
"""    // v4.0.105（用户实报：人机一进房间、碰一下阳光菇就直接出来了）
    // 「钉床」：入住者就地固定在自家床位的阳光菇格上，之后所有种植/升级都在原地远程完成，不再来回走动。
    // 解除条件：门危逃亡 / 抢盲盒（这两个是主动出门，由上面逻辑先把 pinned 清掉或绕过判定）/ 归还控制权。
    _pinToBed(p, rm) {
        if (!p || !rm || !rm.tpl || !rm.tpl.beds) return;
        const bed = rm.tpl.beds[0];
        if (!bed) return;
        p.pinX = (rm.x + bed.c) * this.gridSize + 40;
        p.pinY = (rm.y + bed.r) * this.gridSize + 40;
        p.pinned = true;
        p.x = p.pinX; p.y = p.pinY;
        p.path = null;
        if (p.el1) { p.el1.style.left = p.x + 'px'; p.el1.style.top = p.y + 'px'; }
        if (p.vx) p.vx = 0;
        if (p.vy) p.vy = 0;
    }

    _claimRoom(p, rm) {
        if (!rm || this._ownsRoom(p, rm)) return true;""")

rep("""        // 首个占领者自动在门口放一块坚果门板
        if (rm.owners.length === 1 && !this.plants.some(x => x.c === rm.doorCol && x.r === rm.doorRow)) {
            this.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true);
            this.playSfx('plant.mp3', 0.5);
        }
        return true;""",
"""        // 首个占领者自动在门口放一块坚果门板
        if (rm.owners.length === 1 && !this.plants.some(x => x.c === rm.doorCol && x.r === rm.doorRow)) {
            this.spawnPlant(rm.doorCol, rm.doorRow, 'wallnut', true);
            this.playSfx('plant.mp3', 0.5);
        }
        // v4.0.105：人机 / 托管真人入住即钉在自家床位上（真人手动操作不钉，保持自由走位）
        if (p.isAi || p._afkHost) this._pinToBed(p, rm);
        return true;""")

# ---------- 2. 抵达床边的认领判定：自己的房 = 成功（旧判定 1<1 恒失败 → 换房跑路） ----------
rep("""                        if (ai.targetRoom.owners.length < ai.targetRoom.capacity && !rmBlockedByPlayer &&
                            !ai.targetRoom.owners.some(o => (o === this.player || o === this.player2) && o !== ai)) {
                            ai.targetRoom.owners.push(ai);
                            ai.room = ai.targetRoom;
                            ai.speed = 200;
                        } else if (isFleeing) {
                            ai.room = ai.targetRoom; // 躲进别人的房间，如果满了就不进owners，但认定为避难所
                            ai.speed = 200;
                        } else {""",
"""                        if ((ai.targetRoom.owners || []).includes(ai)) {
                            // v4.0.105 根因修复：旧判定只查 owners.length < capacity，对「自己已认领的房」恒为假
                            // （capacity=1、owners=[自己] → 1<1 失败）→ 一走到自家床边就被判成「这房有人」→ 立刻换房跑路，
                            // 表现就是「进屋碰一下阳光菇又出来」，来回乒乓永远住不下。自己的房直接归位钉床。
                            ai.room = ai.targetRoom;
                            ai.speed = 200;
                            this._pinToBed(ai, ai.targetRoom);
                        } else if (ai.targetRoom.owners.length < ai.targetRoom.capacity && !rmBlockedByPlayer &&
                            !ai.targetRoom.owners.some(o => (o === this.player || o === this.player2) && o !== ai)) {
                            ai.targetRoom.owners.push(ai);
                            ai.room = ai.targetRoom;
                            ai.speed = 200;
                            this._pinToBed(ai, ai.targetRoom);
                        } else if (isFleeing) {
                            ai.room = ai.targetRoom; // 躲进别人的房间，如果满了就不进owners，但认定为避难所
                            ai.speed = 200;
                            this._pinToBed(ai, ai.targetRoom);
                        } else {""")

# 换房分支：明确解除钉床（否则会被人钉回旧床边）
rep("""                            if (!foundNew) ai.path = [{x: ai.x, y: ai.y}]; 
                        }""",
"""                            ai.pinned = false; // v4.0.105：这次不是住下（满员/玩家的房）→ 解除钉床，正常换房
                            if (!foundNew) ai.path = [{x: ai.x, y: ai.y}]; 
                        }""")

# ---------- 3. 移动循环里加「钉床」短路：已入住就原地不动 ----------
rep("""            // v4.0.16：寻路失败重试——没路时原地等待，每 2 秒重试一次（绝不直线穿墙）""",
"""            // v4.0.105：钉床——已入住的人机/托管者固定在自家阳光菇格上，不参与任何随机走动
            //（抢盲盒/门危逃亡在上面已经优先处理，这里只兜住「没事乱走」）
            if (ai.pinned && ai.room && !ai.fleeing && !ai.targetDrop) {
                if (ai.pinX !== undefined && Math.hypot(ai.x - ai.pinX, ai.y - ai.pinY) > 2) {
                    ai.x = ai.pinX; ai.y = ai.pinY;
                    if (ai.el1) { ai.el1.style.left = ai.x + 'px'; ai.el1.style.top = ai.y + 'px'; }
                }
                ai.path = null;
                continue;
            }

            // v4.0.16：寻路失败重试——没路时原地等待，每 2 秒重试一次（绝不直线穿墙）""")

# ---------- 4. 门破逃亡：解除钉床；5%/帧 → 每 0.8s 评估一次 ----------
rep("""            if (ai.room && this.ghostSpawned) {
                const door = this.getPlantAt(ai.room.doorCol * 80, ai.room.doorRow * 80);
                if (!door && Math.random() < 0.05) { // 门破了，5%概率触发逃跑（防扎堆计算）
                    const oldRoom = ai.room;
                    ai.room.owners = ai.room.owners.filter(o => o !== ai);
                    ai.room = null;""",
"""            if (ai.room && this.ghostSpawned) {
                const door = this.getPlantAt(ai.room.doorCol * 80, ai.room.doorRow * 80);
                // v4.0.105：旧实现 5% 是「每帧」概率（60fps ≈ 每秒 3 次）→ 门一破人机瞬间弃房、连刚种的植物都不要了。
                // 改为每 0.8 秒评估一次 5%，保持原意（门破了才逃、且不同帧扎堆一起跑）
                ai.doorBrokenT = door ? 0 : (ai.doorBrokenT || 0) + (typeof dt === 'number' ? dt : 0.016);
                if (!door && ai.doorBrokenT > 0.8 && Math.random() < 0.05) { // 门破了，5%概率触发逃跑（防扎堆计算）
                    ai.doorBrokenT = 0;
                    const oldRoom = ai.room;
                    ai.room.owners = ai.room.owners.filter(o => o !== ai);
                    ai.room = null;
                    ai.pinned = false; // v4.0.105：弃房逃亡，解除钉床""")

# ---------- 5. 贴脸逃亡（无房 AI）：解除钉床 ----------
rep("""                    if (ai.fleeT <= 0 || !ai.fleeing) {
                        ai.fleeT = 2; ai.fleeing = true;""",
"""                    if (ai.fleeT <= 0 || !ai.fleeing) {
                        ai.fleeT = 2; ai.fleeing = true; ai.pinned = false; // v4.0.105：逃命优先，解除钉床""")

# ---------- 6. 归还控制权：清钉床 ----------
rep("""                p.targetRoom = null; p.targetDrop = null; // v4.0.103：清掉托管期间的寻路目标，归还即从脚下重新开始""",
"""                p.targetRoom = null; p.targetDrop = null; // v4.0.103：清掉托管期间的寻路目标，归还即从脚下重新开始
                p.pinned = false; p.pinX = undefined; p.pinY = undefined; // v4.0.105：解除钉床，真人自己走""")

# ---------- 7. 托管激活：人已在房里 → 立刻钉床 ----------
rep("""                    } else if (this._insideRoom(Math.floor(p.x / 80), Math.floor(p.y / 80)) !== p.room) {""",
"""                    } else if (this._insideRoom(Math.floor(p.x / 80), Math.floor(p.y / 80)) === p.room) {
                        this._pinToBed(p, p.room); // v4.0.105：人已在自家房里 → 直接钉到床上发育
                    } else if (this._insideRoom(Math.floor(p.x / 80), Math.floor(p.y / 80)) !== p.room) {""")

io.open(P, 'w', encoding='utf-8').write(src)
print('PATCH_OK segments=%d' % n)
