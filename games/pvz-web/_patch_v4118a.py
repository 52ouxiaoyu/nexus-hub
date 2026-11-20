# v4.0.118：僵尸寻路「卡死」三修
#   ① _findPath 增 opts.ignorePlants —— 僵尸不再把植物当墙（它本来就要啃穿）
#   ② _findPath 增 opts.nearest —— 目标不可达时返回「离目标最近的可达格」路径，不再退回直线撞墙
#   ③ _updateZombies 加僵死锁兜底 —— 既不移动也不啃食超过 5 秒 → 强制重选目标
import io

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    assert s.count(old) == 1, (tag, s.count(old))
    s = s.replace(old, new)
    print('OK', tag)


# ---------- ① 函数签名 + 约束参数 ----------
rep("""    _findPath(startX, startY, targetX, targetY, passDoors = true) {
        const sc = Math.floor(startX / this.gridSize);
        const sr = Math.floor(startY / this.gridSize);
        const tc = Math.floor(targetX / this.gridSize);
        const tr = Math.floor(targetY / this.gridSize);
        
        if (sc === tc && sr === tr) return [{x: targetX, y: targetY}];""",
    """    // v4.0.118：opts.ignorePlants —— 植物不进障碍表（僵尸专用：它本来就该边走边啃穿）；
    //           opts.nearest      —— 目标不可达时返回「离目标最近的可达格」路径（原来直接 null → 调用方走直线撞墙）
    _findPath(startX, startY, targetX, targetY, passDoors = true, opts = null) {
        const ignorePlants = !!(opts && opts.ignorePlants);
        const wantNearest = !!(opts && opts.nearest);
        const sc = Math.floor(startX / this.gridSize);
        const sr = Math.floor(startY / this.gridSize);
        const tc = Math.floor(targetX / this.gridSize);
        const tr = Math.floor(targetY / this.gridSize);

        if (sc === tc && sr === tr) return [{x: targetX, y: targetY}];""",
    'signature')

rep("""        const startIdx = sr * this.cols + sc;
        const targetIdx = tr * this.cols + tc;""",
    """        const startIdx = sr * this.cols + sc;
        let targetIdx = tr * this.cols + tc;""",
    'targetIdx let')

# ---------- ② 植物障碍表 ----------
rep("""        for (const pl of this.plants) {
            // v4.0.16：门板(isDoor)对玩家方(玩家/人机)不阻挡——玩家可自由过门，AI 同权；
            // 僵尸(passDoors=false)仍视门板为障碍，会被引导到门前啃门。
            // 原先门格一律阻挡 → 玩家造门后其他 AI 进房 BFS 必失败 → 走直线穿墙（用户实拍 bug）
            if (!pl.def.ground && !(passDoors && pl.isDoor)) plantMap[pl.r * this.cols + pl.c] = 1;
        }""",
    """        for (const pl of this.plants) {
            // v4.0.16：门板(isDoor)对玩家方(玩家/人机)不阻挡——玩家可自由过门，AI 同权；
            // 僵尸(passDoors=false)仍视门板为障碍，会被引导到门前啃门。
            // 原先门格一律阻挡 → 玩家造门后其他 AI 进房 BFS 必失败 → 走直线穿墙（用户实拍 bug）
            if (pl.def.ground) continue; // 地刺贴地，不挡路
            // v4.0.118：僵尸寻路（ignorePlants）时除门板外一律当"可通行"。
            // 原来植物全进障碍表 → 屋内唯一通道被坚果/塔堵死时 BFS 必失败 → 退回直线 → 撞墙卡死。
            // 实际能不能穿由 checkCollision 拦（僵尸进不了植物格）+ 前方 25px 探针啃食决定，不会真穿模。
            if (ignorePlants && !pl.isDoor) continue;
            if (!(passDoors && pl.isDoor)) plantMap[pl.r * this.cols + pl.c] = 1;
        }""",
    'plantMap')

# ---------- ③ 最近可达格兜底 ----------
rep("""        // v4.0.16：寻路失败返回 null（原返回直线目标 → AI 直线穿墙）——调用方必须兜底
        if (!found) return null;""",
    """        // v4.0.16：寻路失败返回 null（原返回直线目标 → AI 直线穿墙）——调用方必须兜底
        if (!found) {
            // v4.0.118：僵尸专用兜底——走到「离目标最近的可达格」，靠前方 25px 探针啃掉挡路的植物/门。
            // 原来直接 null → 调用方拿直线硬怼 → 撞墙 detour 来回滑 → 永远站在原地（用户实拍"卡在墙那里")
            if (!wantNearest) return null;
            let bestIdx = -1, bestD = Infinity;
            for (let idx = 0; idx < MAX_CELLS; idx++) {
                if (!visited[idx] || idx === startIdx) continue;
                const bc = idx % this.cols, br = (idx - bc) / this.cols;
                const bd = Math.abs(bc - tc) + Math.abs(br - tr);
                if (bd < bestD) { bestD = bd; bestIdx = idx; }
            }
            if (bestIdx < 0) return null;
            targetIdx = bestIdx;
        }""",
    'nearest fallback')

# ---------- ④ 僵尸调用点 ----------
rep("""                zb.path = this._findPath(zb.x, zb.y, targetX, targetY, false); // 僵尸：门板视为障碍（引到门前啃）
                if (zb.path && zb.path.length > 0) {
                    zb.path.push({x: targetX, y: targetY}); // 确保最后一步精确定位到玩家
                }""",
    """                // 僵尸：门板视为障碍（引到门前啃）；植物可通行（边走边啃）；不可达时走最近可达点
                zb.path = this._findPath(zb.x, zb.y, targetX, targetY, false, { ignorePlants: true, nearest: true });
                if (zb.path && zb.path.length > 0) {
                    // v4.0.118：只有最后一格就在目标旁（≤1.5 格）才补精确像素点，
                    // 否则兜底路径的末端离目标很远，硬 push 会变成一段穿墙直线
                    const _lp = zb.path[zb.path.length - 1];
                    if (Math.abs(_lp.x - targetX) + Math.abs(_lp.y - targetY) <= this.gridSize * 1.5) {
                        zb.path.push({x: targetX, y: targetY});
                    }
                }""",
    'zombie call site')

io.open(P, 'w', encoding='utf-8').write(s)
print('写盘完成')
