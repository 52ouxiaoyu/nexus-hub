# -*- coding: utf-8 -*-
"""v4.0.119b：玉米加农炮观感调整
① 爆炸特效不再用樱桃炸弹的「嘭!」漫画贴图（那是樱桃的专属），改成原版玉米炮的样子：
   暖黄烟团 + 飞散的玉米粒（玉米粒用原版 Kernel.png，不是自绘）
② 炮口抬起幅度 8°→13°，白烟加大加亮（原来只有 26px 一个小白点）
③ 落点痕迹加大到 270px 并下移到僵尸脚下
"""
import io

def rep(s, old, new, tag):
    assert s.count(old) == 1, '锚点不唯一/缺失 [%s] count=%d' % (tag, s.count(old))
    return s.replace(old, new)

# ==================== ① Projectile：爆炸特效换原版风格 ====================
P = 'js/entities/Projectile.js'
s = io.open(P, encoding='utf-8').read()

old_boom = """        // —— 爆炸特效（原版樱桃炸弹 Boom 缩小一档，玉米炮的爆炸比樱桃更"闷"）
        const boom = document.createElement('img');
        boom.src = 'assets/images/Plants/CherryBomb/Boom.gif';
        boom.style.cssText = 'position:absolute;width:300px;height:300px;object-fit:contain;pointer-events:none;transform:translate(-50%,-50%);z-index:500;';
        boom.style.left = px + 'px';
        boom.style.top = py + 'px';
        g.entityLayer.appendChild(boom);
        setTimeout(() => boom.remove(), 900);
"""
new_boom = """        // —— 爆炸特效：原版玉米炮不是樱桃炸弹那种「嘭!」漫画爆炸，
        //     而是暖黄烟团炸开 + 玉米粒四散（玉米粒直接复用原版 Kernel.png）
        this._cobBoomFx(px, py);
"""
s = rep(s, old_boom, new_boom, 'boom fx')

# 追加特效函数（放在 _cobExplode 之后、canHitNow 之前）
old_hook = """    // 是否到了"可以命中"的时机（非抛物线子弹恒为 true）
    canHitNow() {"""
new_hook = """    // v4.0.119：玉米炮落地特效——暖黄烟团 + 玉米粒四散（全部复用原版贴图/CSS，无手绘）
    _cobBoomFx(px, py) {
        const g = this.game;
        if (!g || !g.entityLayer) return;
        for (let i = 0; i < 3; i++) {
            const puff = document.createElement('div');
            puff.className = 'cob-boom-puff';
            puff.style.left = px + 'px';
            puff.style.top = py + 'px';
            puff.style.zIndex = '499';
            puff.style.animationDelay = (i * 80) + 'ms';
            g.entityLayer.appendChild(puff);
            setTimeout(() => { if (puff.parentNode) puff.remove(); }, 900 + i * 80);
        }
        const stamp = g.assetStamp ? g.assetStamp() : '1792751289';
        for (let i = 0; i < 9; i++) {
            const k = document.createElement('img');
            k.src = 'assets/images/Plants/KernelPult/Kernel.png?v=' + stamp;
            k.style.cssText = 'position:absolute;width:15px;height:16px;object-fit:contain;pointer-events:none;'
                + 'transform:translate(-50%,-50%);z-index:502;';
            k.style.left = px + 'px';
            k.style.top = py + 'px';
            g.entityLayer.appendChild(k);
            const ang = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
            const dist = 70 + Math.random() * 70;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist * 0.66 - 34;   // 整体略向上抛
            const rot = Math.random() * 720 - 360;
            requestAnimationFrame(() => {
                k.style.transition = 'transform .6s cubic-bezier(.2,.6,.4,1), opacity .6s ease-out';
                k.style.transform = 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + dy.toFixed(0) + 'px)) rotate(' + rot.toFixed(0) + 'deg)';
                k.style.opacity = '0';
            });
            setTimeout(() => { if (k.parentNode) k.remove(); }, 760);
        }
    }

    // 是否到了"可以命中"的时机（非抛物线子弹恒为 true）
    canHitNow() {"""
s = rep(s, old_hook, new_hook, 'cobBoomFx')

# 痕迹加大 + 贴近脚下
s = rep(s,
"""        mark.style.cssText = 'position:absolute;width:250px;height:250px;object-fit:contain;pointer-events:none;'
            + 'transform:translate(-50%,-50%);z-index:1;opacity:.94;';
        mark.style.left = px + 'px';
        mark.style.top = (py + 26) + 'px';                   // 略微下移：痕迹贴在他脚下的草地""",
"""        mark.style.cssText = 'position:absolute;width:270px;height:270px;object-fit:contain;pointer-events:none;'
            + 'transform:translate(-50%,-50%);z-index:1;opacity:.94;';
        mark.style.left = px + 'px';
        mark.style.top = (py + 34) + 'px';                   // 下移：痕迹贴在他脚下的草地""",
'trace size')

# 去掉 oneshot（原版 1800 炸弹伤害即可，避免把巨人以外的秒杀语义扩散）
s = rep(s,
"""                z.takeDamage(1800, { bomb: true, oneshot: true });""",
"""                z.takeDamage(1800, { bomb: true });""",
'no oneshot')
io.open(P, 'w', encoding='utf-8').write(s)
print('OK ① 爆炸特效换原版风格 + 痕迹加大')

# ==================== ② style.css：抬炮幅度 + 烟团 ====================
P = 'css/style.css'
s = io.open(P, encoding='utf-8').read()

s = rep(s, """    0%   { transform: translate(-50%, -50%) translateX(-8px) rotate(0deg); }
    14%  { transform: translate(-50%, -50%) translateX(-7px) translateY(-6px) rotate(-8deg); }
    26%  { transform: translate(-50%, -50%) translateX(-9px) translateY(-3px) rotate(-6deg); }
    38%  { transform: translate(-50%, -50%) translateX(-19px) translateY(2px) rotate(-1.5deg); }
    58%  { transform: translate(-50%, -50%) translateX(-3px) translateY(0) rotate(1.6deg); }
    78%  { transform: translate(-50%, -50%) translateX(-11px) rotate(-.6deg); }
    100% { transform: translate(-50%, -50%) translateX(-8px) rotate(0deg); }""",
"""    0%   { transform: translate(-50%, -50%) translateX(-8px) rotate(0deg); }
    13%  { transform: translate(-50%, -50%) translateX(-6px) translateY(-11px) rotate(-13deg); }
    24%  { transform: translate(-50%, -50%) translateX(-8px) translateY(-7px) rotate(-10deg); }
    37%  { transform: translate(-50%, -50%) translateX(-22px) translateY(2px) rotate(-2deg); }
    57%  { transform: translate(-50%, -50%) translateX(-2px) translateY(0) rotate(2.5deg); }
    78%  { transform: translate(-50%, -50%) translateX(-12px) rotate(-1deg); }
    100% { transform: translate(-50%, -50%) translateX(-8px) rotate(0deg); }""",
'keyframe lift')

s = rep(s, """.cob-muzzle-puff {
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
}""",
""".cob-muzzle-puff {
    position: absolute;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle at 46% 44%, rgba(255,255,255,1) 0%, rgba(252,246,220,.9) 38%, rgba(226,212,176,.35) 66%, rgba(210,200,170,0) 76%);
    animation: cobMuzzlePuff .95s ease-out forwards;
}
@keyframes cobMuzzlePuff {
    0%   { opacity: 1;   transform: translate(-50%, -50%) scale(.3); }
    40%  { opacity: .8;  transform: translate(-50%, -50%) translate(20px, -14px) scale(1.35); }
    100% { opacity: 0;   transform: translate(-50%, -50%) translate(52px, -34px) scale(2.7); }
}
/* 玉米炮落地：暖黄烟团（原版玉米炮是烟团+玉米粒，不是樱桃的「嘭!」） */
.cob-boom-puff {
    position: absolute;
    width: 168px;
    height: 168px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle at 50% 50%,
        rgba(255,253,232,.98) 0%, rgba(255,222,120,.94) 30%,
        rgba(236,158,46,.62) 58%, rgba(176,104,24,0) 76%);
    transform: translate(-50%, -50%) scale(.32);
    animation: cobBoomPuff .76s ease-out forwards;
}
@keyframes cobBoomPuff {
    0%   { opacity: .96; transform: translate(-50%, -50%) scale(.32); }
    42%  { opacity: .88; transform: translate(-50%, -50%) scale(1.06); }
    100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.95); }
}""",
'puff css')
io.open(P, 'w', encoding='utf-8').write(s)
print('OK ② CSS 抬炮 13° + 白烟 38px + 烟团')
