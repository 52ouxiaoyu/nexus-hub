# v4.0.118-补：僵尸僵死锁兜底——既不位移也不啃食超过 5 秒 → 判定目标不可达，强制重选
import io

P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    assert s.count(old) == 1, (tag, s.count(old))
    s = s.replace(old, new)
    print('OK', tag)


# 循环开头：记下本帧起始位置
rep("""        for (const zb of [...this.zombies]) {
            if (zb.dead) continue;

            // 眩晕（眩晕菇/冰冻）：停住不动、不咬人""",
    """        for (const zb of [...this.zombies]) {
            if (zb.dead) continue;
            const _preX = zb.x, _preY = zb.y; // v4.0.118：僵死锁检测用（本帧起始位置）
            zb._didBite = false;

            // 眩晕（眩晕菇/冰冻）：停住不动、不咬人""",
    'pre pos')

# 啃食分支：标记"在干活"
rep("""                if (atkPlant && !atkPlant.def.ground && !zb.retreating && !(zb.garlicScareT > 0)) { // v4.0.33：被大蒜臭吓的僵尸径直走开不啃食
                    // 站定慢啃：每 2.4s 一口，一口一口咬""",
    """                if (atkPlant && !atkPlant.def.ground && !zb.retreating && !(zb.garlicScareT > 0)) { // v4.0.33：被大蒜臭吓的僵尸径直走开不啃食
                    zb._didBite = true; // v4.0.118：正在啃 = 没卡死
                    // 站定慢啃：每 2.4s 一口，一口一口咬""",
    'bite flag')

# 帧末：僵死锁检测
rep("""            if (zb.el1) { zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px'; }
        }
        this.zombies = this.zombies.filter(z => !z.dead || (z.el1 && z.el1.parentNode)); // 清理已完成动画的死尸""",
    """            // v4.0.118：僵死锁兜底——既不位移也不啃食（含回血/绕行）超过 5 秒，说明目标在物理上够不到，
            // 直接作废锁定换目标；否则僵尸会贴着墙角 detour 来回滑、永远不咬人也不走（用户实拍 bug）
            if (zb._didBite || Math.hypot(zb.x - _preX, zb.y - _preY) > 1) {
                zb.idleT = 0;
            } else if ((zb.idleT = (zb.idleT || 0) + dt) > 5) {
                zb.idleT = 0;
                zb.lockedTarget = null;
                zb.targetSwitched = true;
                zb.path = null;
                zb.side = -(zb.side || 1);
                zb.stuck = 0;
                if (zb.retreating) { zb.retreating = false; zb.targetEvalT = 9; } // 回城也走不到 → 放弃回血，继续进攻
            }
            if (zb.el1) { zb.el1.style.left = zb.x + 'px'; zb.el1.style.top = zb.y + 'px'; }
        }
        this.zombies = this.zombies.filter(z => !z.dead || (z.el1 && z.el1.parentNode)); // 清理已完成动画的死尸""",
    'idle lock')

io.open(P, 'w', encoding='utf-8').write(s)
print('写盘完成')
