# -*- coding: utf-8 -*-
"""v4.0.119：玉米加农炮恢复原版范围伤害 + 原版发射动作 + 原版落点痕迹(BlastMark)
① CollisionManager 不再把 cob 炮弹当普通子弹单点命中（这就是"只能砸死一只铁"的根因：
   炮弹在飞行末段撞到第一只僵尸就被 p.isDead=true + 1800 伤害吃掉，_cobExplode 永远不执行）
② _cobExplode 恢复原版规格：以落点为圆心、半径 1.5 格的圆（≈3×3）内全部 1800 炸弹伤害
③ 落点痕迹换成原版 BlastMark.png（黑色圆斑 + 四边放射尖刺），取代原来 4×4 的黑色方块
④ 发射动作：炮身抬起 → 后坐 → 回弹 + 炮口白烟；玉米炮弹空中翻滚
"""
import io

def rep(s, old, new, tag):
    assert s.count(old) == 1, '锚点不唯一/缺失 [%s] count=%d' % (tag, s.count(old))
    return s.replace(old, new)

# ==================== ① CollisionManager ====================
P = 'js/managers/CollisionManager.js'
s = io.open(P, encoding='utf-8').read()
s = rep(s,
"""                if (p.row === z.row && p.type !== 'cattail' && p.type !== 'cattail_snow' && p.type !== 'gloom_puff' && p.type !== 'gloom_snow' && p.type !== 'zpea') {""",
"""                // v4.0.119：玉米加农炮的炮弹不走普通单点命中——它是"落地爆"弹，由
                // Projectile._cobExplode() 在落点做 3×3 圆形范围伤害。放进来会变成
                // "撞到第一只僵尸就 1800 单杀 + 炮弹消失"，范围与落点痕迹全部丢失。
                if (p.type === 'cob' || p.cobBomb) continue;
                if (p.row === z.row && p.type !== 'cattail' && p.type !== 'cattail_snow' && p.type !== 'gloom_puff' && p.type !== 'gloom_snow' && p.type !== 'zpea') {""",
'CollisionManager skip cob')
io.open(P, 'w', encoding='utf-8').write(s)
print('OK ① CollisionManager 跳过 cob 弹')

# ==================== ② Projectile._cobExplode ====================
P = 'js/entities/Projectile.js'
s = io.open(P, encoding='utf-8').read()

old_explode = """    // v3.24.0 玉米加农炮炮弹落地爆炸
    // v3.65.0：范围 3×3→4×4（以落点格为中央的 4 行 × 4 列）；圈内僵尸无视种类/血量直接秒杀；
    // 地面留下 4×4 的黑色焦块（普通爆炸烧痕，非毁灭菇陨石坑），15 秒后淡出
    _cobExplode() {
        const g = this.game;
        const b = g.board;
        const boom = document.createElement('img');
        boom.src = 'assets/images/Plants/CherryBomb/Boom.gif';
        boom.style.cssText = 'position:absolute;width:320px;height:320px;object-fit:contain;pointer-events:none;transform:translate(-50%,-50%);z-index:500;';
        boom.style.left = this.x + 'px';
        boom.style.top = this.y + 'px';
        g.entityLayer.appendChild(boom);
        setTimeout(() => boom.remove(), 900);
        // 落点所在格 (R,C)：4×4 = 行 R-1..R+2 / 列 C-2..C+1（落点居块中央），越界裁剪
        const R = Math.floor((this.y - b.offsetY) / b.cellHeight);
        const C = Math.floor((this.x - b.offsetX) / b.cellWidth);
        const rowLo = Math.max(0, R - 1), rowHi = Math.min(b.rows - 1, R + 2);
        const colLo = Math.max(0, C - 2), colHi = Math.min(b.cols - 1, C + 1);
        const zombies = g.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
        for (const z of zombies) {
            if (z.row >= rowLo && z.row <= rowHi &&
                z.x >= b.offsetX + colLo * b.cellWidth && z.x <= b.offsetX + (colHi + 1) * b.cellWidth) {
                z.takeDamage(9999, { bomb: true, oneshot: true, obliterate: true });
            }
        }
        // 地面焦块：覆盖 4×4 每格一块半透明黑斑（垫在实体层最底下，与冰道同一层位）
        for (let r = rowLo; r <= rowHi; r++) {
            for (let c = colLo; c <= colHi; c++) {
                const sc = document.createElement('div');
                sc.className = 'cob-scorch';
                sc.style.left = (b.offsetX + c * b.cellWidth) + 'px';
                sc.style.top = (b.offsetY + r * b.cellHeight) + 'px';
                sc.style.width = b.cellWidth + 'px';
                sc.style.height = b.cellHeight + 'px';
                if (g.entityLayer.firstChild) g.entityLayer.insertBefore(sc, g.entityLayer.firstChild);
                else g.entityLayer.appendChild(sc);
                setTimeout(() => {
                    if (!sc.parentNode) return;
                    sc.style.transition = 'opacity 3s ease-out';
                    sc.style.opacity = '0';
                    setTimeout(() => { if (sc.parentNode) sc.remove(); }, 3100);
                }, 12000);
            }
        }
        if (g.audioManager && g.audioManager.playFx) g.audioManager.playFx('crash');
        this.isDead = true;
    }"""

new_explode = """    // ===== v4.0.119 玉米加农炮炮弹落地爆炸（恢复 PVZ1 原版规格）=====
    // 原版：以落点为圆心、半径 1.5 格的圆（≈3×3 格）内全部 1800 炸弹伤害，
    //       地面留下 BlastMark（黑圆斑 + 四边放射尖刺）。
    // 历史坑：v3.65.0 曾改成 4×4 秒杀 + 逐格黑方块；随后 CollisionManager 把这个弹
    //        当普通子弹单点命中，炮弹撞到第一只僵尸就消失 → 范围伤害与痕迹双双消失。
    //        现由 CollisionManager 显式跳过 cob 弹（见该文件），只在落点爆炸。
    _cobExplode() {
        const g = this.game;
        const b = g.board;
        const px = this.x;
        const py = this.baseY !== undefined ? this.baseY : this.y;

        // —— 爆炸特效（原版樱桃炸弹 Boom 缩小一档，玉米炮的爆炸比樱桃更"闷"）
        const boom = document.createElement('img');
        boom.src = 'assets/images/Plants/CherryBomb/Boom.gif';
        boom.style.cssText = 'position:absolute;width:300px;height:300px;object-fit:contain;pointer-events:none;transform:translate(-50%,-50%);z-index:500;';
        boom.style.left = px + 'px';
        boom.style.top = py + 'px';
        g.entityLayer.appendChild(boom);
        setTimeout(() => boom.remove(), 900);

        // —— 范围判定：归一化成"格"单位后的椭圆距离（格子 80×100 不等比，按各自半轴缩放）
        const R_GIRD = 1.5;                                  // 原版爆炸半径 1.5 格
        const cy = (py - b.offsetY) / b.cellHeight;          // 落点的连续行坐标（行 r 中心 = r+0.5）
        const zombies = g.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING');
        let hitCount = 0;
        for (const z of zombies) {
            const dx = (z.x - px) / b.cellWidth;             // 横向差（格）
            const dy = (z.row + 0.5) - cy;                   // 纵向差（格）
            if (Math.sqrt(dx * dx + dy * dy) <= R_GIRD) {
                // 1800 炸弹伤害：无视护甲直接落本体（原版玉米炮可秒铁桶/铁门，巨人要两发）
                z.takeDamage(1800, { bomb: true, oneshot: true });
                hitCount++;
            }
        }
        this._cobHitCount = hitCount;

        // —— 落点痕迹：原版 BlastMark.png（黑圆斑 + 四边放射尖刺），垫在地面层
        const mark = document.createElement('img');
        mark.src = 'assets/images/Plants/CobCannon/BlastMark.png?v=' + (g.assetStamp ? g.assetStamp() : '1792751289');
        mark.className = 'cob-blastmark';
        mark.style.cssText = 'position:absolute;width:250px;height:250px;object-fit:contain;pointer-events:none;'
            + 'transform:translate(-50%,-50%);z-index:1;opacity:.94;';
        mark.style.left = px + 'px';
        mark.style.top = (py + 26) + 'px';                   // 略微下移：痕迹贴在他脚下的草地
        if (g.entityLayer.firstChild) g.entityLayer.insertBefore(mark, g.entityLayer.firstChild);
        else g.entityLayer.appendChild(mark);
        setTimeout(() => {
            if (!mark.parentNode) return;
            mark.style.transition = 'opacity 4s ease-out';
            mark.style.opacity = '0';
            setTimeout(() => { if (mark.parentNode) mark.remove(); }, 4200);
        }, 14000);

        if (g.audioManager && g.audioManager.playFx) g.audioManager.playFx('crash');
        this.isDead = true;
    }"""
s = rep(s, old_explode, new_explode, 'cobExplode')

# —— 飞行中翻滚
old_fly = """        } else if (this.lobbed) {
            // 抛物线飞行：水平匀速 + 竖直匀加速（重力）
            this.flightT += deltaTime;"""
new_fly = """        } else if (this.lobbed) {
            // v4.0.119 玉米炮弹空中翻滚（原版玉米炮的炮弹是转着飞出去的）
            if (this.type === 'cob' && this.element) {
                this._spinDeg = ((this._spinDeg || 0) + deltaTime * 300) % 360;
                this.setTransform('rotate(' + this._spinDeg.toFixed(1) + 'deg)');
            }
            // 抛物线飞行：水平匀速 + 竖直匀加速（重力）
            this.flightT += deltaTime;"""
s = rep(s, old_fly, new_fly, 'cob spin')
io.open(P, 'w', encoding='utf-8').write(s)
print('OK ② Projectile._cobExplode 恢复原版 3×3/1800 + BlastMark + 空中翻滚')

# ==================== ③ Plant.fireCob 发射动作 ====================
P = 'js/entities/Plant.js'
s = io.open(P, encoding='utf-8').read()

old_fire = """    // ===== v3.24.0 玉米加农炮发射：朝准星位置抛出玉米炮弹，落地 3×3 爆炸 =====
    fireCob(tx, ty) {
        this.chargeReady = false;
        this.chargeTimer = this.chargeTime;
        this._showCobShell(false);
        const proj = new Projectile(this.game, this.x + 36, this.y + this.yOffset - 16, this.row, 'cob', null);
        proj.setupLobToPoint(tx, ty);
        this.game.entities.push(proj);
    }"""
new_fire = """    // ===== v3.24.0 玉米加农炮发射：朝准星位置抛出玉米炮弹，落地爆炸 =====
    // v4.0.119：补上原版发射动作——炮口先抬起，随后整车后坐、回弹，炮口喷白烟
    fireCob(tx, ty) {
        this.chargeReady = false;
        this.chargeTimer = this.chargeTime;
        this._showCobShell(false);
        this._playCobFireAnim();
        const proj = new Projectile(this.game, this.x + 36, this.y + this.yOffset - 16, this.row, 'cob', null);
        proj.setupLobToPoint(tx, ty);
        this.game.entities.push(proj);
    }

    // v4.0.119 原版发射动作：抬起炮口（rotate -7°）→ 后坐（整车后退 8px）→ 回弹过冲
    // 走 CSS keyframes（动画声明优先级高于内联 transform，所以不会顶掉 translate(-50%,-50%) 居中基准）
    _playCobFireAnim() {
        const el = this.element;
        if (!el) return;
        el.classList.remove('cob-firing');
        void el.offsetWidth;              // 强制 reflow：连续两发也能重放
        el.classList.add('cob-firing');
        clearTimeout(this._cobAnimTimer);
        this._cobAnimTimer = setTimeout(() => el.classList.remove('cob-firing'), 700);
        // 炮口白烟：3 团错开 60ms 向后上方飘散
        const g = this.game;
        if (!g || !g.entityLayer) return;
        const mx = this.x + 42, my = this.y + this.yOffset - 14;
        for (let i = 0; i < 3; i++) {
            const puff = document.createElement('div');
            puff.className = 'cob-muzzle-puff';
            puff.style.left = (mx + i * 4) + 'px';
            puff.style.top = (my - i * 3) + 'px';
            puff.style.zIndex = String(Math.floor(this.y) + 4);
            puff.style.animationDelay = (i * 60) + 'ms';
            g.entityLayer.appendChild(puff);
            setTimeout(() => { if (puff.parentNode) puff.remove(); }, 1000 + i * 60);
        }
    }"""
s = rep(s, old_fire, new_fire, 'fireCob')
io.open(P, 'w', encoding='utf-8').write(s)
print('OK ③ Plant.fireCob 加发射动作 + 炮口白烟')

# ==================== ④ style.css 关键帧 ====================
P = 'css/style.css'
s = io.open(P, encoding='utf-8').read()
add = """

/* ===== v4.0.119 玉米加农炮：原版发射动作（抬炮口 → 后坐 → 回弹） =====
   注意：所有帧都必须带上 translate(-50%,-50%) 与 translateX(-8px) 基准，
   否则会把 .entity 的居中基准顶掉（本项目多次踩坑）。
   transform-origin 偏到左下轮心，让旋转看起来是"炮口抬起"而不是整车打转。 */
.cob-firing {
    transform-origin: 32% 82%;
    animation: cobCannonFire .66s cubic-bezier(.34, .68, .36, 1);
}
@keyframes cobCannonFire {
    0%   { transform: translate(-50%, -50%) translateX(-8px) rotate(0deg); }
    14%  { transform: translate(-50%, -50%) translateX(-7px) translateY(-6px) rotate(-8deg); }
    26%  { transform: translate(-50%, -50%) translateX(-9px) translateY(-3px) rotate(-6deg); }
    38%  { transform: translate(-50%, -50%) translateX(-19px) translateY(2px) rotate(-1.5deg); }
    58%  { transform: translate(-50%, -50%) translateX(-3px) translateY(0) rotate(1.6deg); }
    78%  { transform: translate(-50%, -50%) translateX(-11px) rotate(-.6deg); }
    100% { transform: translate(-50%, -50%) translateX(-8px) rotate(0deg); }
}
.cob-muzzle-puff {
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle at 45% 45%, rgba(255,255,255,.95) 0%, rgba(240,232,205,.75) 42%, rgba(210,200,170,0) 72%);
    animation: cobMuzzlePuff .9s ease-out forwards;
}
@keyframes cobMuzzlePuff {
    0%   { opacity: .95; transform: translate(-50%, -50%) scale(.35); }
    55%  { opacity: .55; transform: translate(-50%, -50%) translate(22px, -12px) scale(1.5); }
    100% { opacity: 0;    transform: translate(-50%, -50%) translate(46px, -26px) scale(2.5); }
}
"""
assert s.count('cobCannonFire') == 0, 'CSS 已存在，勿重复追加'
s = s.rstrip() + add
io.open(P, 'w', encoding='utf-8').write(s)
print('OK ④ style.css 关键帧')
