#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v4.0.112：守屋大作战封面插画重做
- 去 emoji（🌿×2 / ☀️）：与像素手绘风冲突，是最"贴纸感"的来源
- 三只植物改为「远小近大」三段景深：向日葵(42px, 左后) → 高坚果(88px, 中前) → 豌豆(64px, 右中)
- 补原版 plantshadow32.png 贴地投影（三只各一）＋草地台阶＋顶部暖光＋暗角收边
- ☀️ 换原版 interface/Sun.gif（26px，缓慢浮动）
"""
import io, sys

P = 'index.html'
src = io.open(P, encoding='utf-8').read()

def rep(old, new, tag):
    global src
    n = src.count(old)
    assert n == 1, f'[{tag}] 命中 {n} 次，期望 1'
    src = src.replace(old, new)
    print(f'  ✓ {tag}')

# ---------- 1. CSS 块整体替换 ----------
OLD_CSS = """/* ===== v4.0.28 守屋卡片「守护大自然」插图：明亮草地上植物守护小队 ===== */
            #btn-dorm .pkt-art.dorm { gap: 0; }
            #btn-dorm .pkt-art.dorm .dorm-hero {
                height: 100px; z-index: 2;
                filter: drop-shadow(0 5px 5px rgba(30, 60, 10, 0.4));
            }
            #btn-dorm .pkt-art.dorm .dorm-side { height: 62px; z-index: 1; }
            #btn-dorm .pkt-art.dorm .dorm-side-l { transform: translate(10px, 10px); }
            #btn-dorm .pkt-art.dorm .dorm-side-r { transform: translate(-10px, 10px); }
            #btn-dorm .pkt-art.dorm .dorm-leaf {
                position: absolute; font-size: 20px; z-index: 3; opacity: 0.9;
                filter: drop-shadow(1px 2px 2px rgba(20, 50, 10, 0.45));
            }
            #btn-dorm .pkt-art.dorm .dorm-leaf-l { left: 6px; top: 4px; transform: rotate(-24deg); }
            #btn-dorm .pkt-art.dorm .dorm-leaf-r { right: 6px; top: 4px; transform: rotate(24deg) scaleX(-1); }
            #btn-dorm .pkt-art.dorm .dorm-sun {
                position: absolute; right: 10px; bottom: 6px; font-size: 17px; z-index: 3; opacity: 0.95;
                filter: drop-shadow(0 0 5px rgba(255, 220, 80, 0.85));
                animation: dorm-sun-glow 2.4s ease-in-out infinite;
            }
            @keyframes dorm-sun-glow {
                0%, 100% { transform: scale(1); opacity: 0.85; }
                50% { transform: scale(1.14); opacity: 1; }
            }
            """

NEW_CSS = """/* ===== v4.0.112 守屋卡片封面重做：远小近大三段景深 + 原版投影/阳光 =====
               改前：三只植物 flex 横排、尺寸 100/62/62 → 总宽 193px 挤在 158px 画布里，
               互相遮挡（豌豆的嘴被高坚果压住一半），外加 🌿☀️ emoji 与像素手绘风格打架。
               改后：绝对定位三段纵深（向日葵 42px 远/左 → 高坚果 88px 近/中 → 豌豆 64px 中/右），
               脚下各垫一枚原版 plantshadow32 投影，底部一条草地台阶当地平线，
               顶部一抹暖光 + 四角暗角收边；☀️ 换成原版 interface/Sun.gif 缓慢浮动。 */
            #btn-dorm .pkt-art.dorm {
                display: block;
                padding: 0;
                background:
                    radial-gradient(76% 64% at 80% 0%, #fdffec 0%, rgba(253,255,236,0) 56%),
                    radial-gradient(120% 104% at 50% 46%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 46%, rgba(28,58,10,0.16) 100%),
                    linear-gradient(180deg, #d8f5b5 0%, #b4e58b 54%, #9cd374 100%);
            }
            /* 草地台阶：给三只植物一条共同的「地平线」，不再是漂浮的贴纸 */
            #btn-dorm .pkt-art.dorm::after {
                content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 16px;
                background: linear-gradient(180deg, #97d06f 0%, #7eb657 55%, #6aa346 100%);
                border-top: 1px solid rgba(255,255,255,0.6);
                box-shadow: inset 0 6px 9px rgba(40,80,20,0.16), inset 0 -4px 6px rgba(30,60,15,0.14);
                pointer-events: none; z-index: 0;
            }
            #btn-dorm .pkt-art.dorm .dorm-hero,
            #btn-dorm .pkt-art.dorm .dorm-side,
            #btn-dorm .pkt-art.dorm .dorm-sun { position: absolute; transform: none; }
            #btn-dorm .pkt-art.dorm .dorm-hero {
                height: 88px; left: 40px; bottom: 6px; z-index: 4;
                filter: drop-shadow(0 4px 5px rgba(30,60,10,0.5));
            }
            #btn-dorm .pkt-art.dorm .dorm-side-l { height: 42px; left: 4px; bottom: 21px; z-index: 2; }
            #btn-dorm .pkt-art.dorm .dorm-side-r { height: 64px; right: 4px; bottom: 12px; z-index: 3; }
            /* 贴地投影（原版 plantshadow32.png，压在草台阶之上、植物之下） */
            #btn-dorm .pkt-art.dorm .dorm-sh {
                position: absolute; z-index: 1;
                background: url('assets/images/interface/plantshadow32.png') center/100% 100% no-repeat;
                pointer-events: none;
            }
            #btn-dorm .pkt-art.dorm .dorm-sh-l { width: 38px; height: 11px; left: 5px; bottom: 19px; }
            #btn-dorm .pkt-art.dorm .dorm-sh-c { width: 54px; height: 15px; left: 44px; bottom: 3px; }
            #btn-dorm .pkt-art.dorm .dorm-sh-r { width: 46px; height: 13px; right: 8px; bottom: 10px; }
            #btn-dorm .pkt-art.dorm .dorm-sun {
                right: 6px; top: 5px; width: 26px; height: 26px; z-index: 5; opacity: .96;
                filter: drop-shadow(0 0 9px rgba(255,231,110,1));
                animation: dorm-sun-float 3.4s ease-in-out infinite;
            }
            @keyframes dorm-sun-float {
                0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
                50% { transform: translateY(-6px) rotate(7deg) scale(1.08); }
            }
            """
rep(OLD_CSS, NEW_CSS, '1-CSS 块替换')

# ---------- 2. HTML 结构替换 ----------
OLD_HTML = """<div class="pkt-art dorm">
                            <span class="dorm-leaf dorm-leaf-l">🌿</span>
                            <img src="assets/images/Plants/SunFlower/0.gif" alt="向日葵" class="dorm-side dorm-side-l">
                            <img src="assets/images/Plants/TallNut/0.gif" alt="高坚果" class="dorm-hero">
                            <img src="assets/images/Plants/Peashooter/0.gif" alt="豌豆射手" class="dorm-side dorm-side-r">
                            <span class="dorm-leaf dorm-leaf-r">🌿</span>
                            <span class="dorm-sun">☀️</span>
                        </div>"""

NEW_HTML = """<div class="pkt-art dorm">
                            <img src="assets/images/Plants/SunFlower/0.gif" alt="向日葵" class="dorm-side dorm-side-l">
                            <img src="assets/images/Plants/TallNut/0.gif" alt="高坚果" class="dorm-hero">
                            <img src="assets/images/Plants/Peashooter/0.gif" alt="豌豆射手" class="dorm-side dorm-side-r">
                            <span class="dorm-sh dorm-sh-l"></span>
                            <span class="dorm-sh dorm-sh-c"></span>
                            <span class="dorm-sh dorm-sh-r"></span>
                            <img class="dorm-sun" src="assets/images/interface/Sun.gif" alt="阳光">
                        </div>"""
rep(OLD_HTML, NEW_HTML, '2-HTML 结构替换')

# ---------- 3. 卡片注释同步 ----------
OLD_CMT = """                    <!-- v4.0.28 守屋卡片重做：弃用暗色截图封面，改为明亮草地「向日葵+高坚果+豌豆射手」守护组合
                         （与其他模式卡同款原版手绘素材风，高坚果居中=守护家园，凸显守护大自然主题） -->"""
NEW_CMT = """                    <!-- v4.0.112 守屋卡片封面重做：三只植物由「横排互挤」改为「远小近大」三段景深
                         （向日葵远景小件 / 高坚果近景盾牌 / 豌豆中景射手），去 emoji、补原版投影与草地地平线 -->"""
rep(OLD_CMT, NEW_CMT, '3-卡片注释')

io.open(P, 'w', encoding='utf-8').write(src)
print('已写入', P, len(src), '字符')

# ---------- 4. 残留检查 ----------
assert 'dorm-leaf' not in src, 'dorm-leaf 残留'
assert 'dorm-sun-glow' not in src, 'dorm-sun-glow 残留'
assert '☀️' not in src[src.index('<div class="pkt-art dorm">'):src.index('<div class="pkt-art dorm">') + 900], 'emoji 残留'
print('残留检查通过')
