"""
生成西瓜子弹图（Melon.gif, 64x64）。
结构：一个圆形西瓜的正面切片：圆形外皮+红色瓜瓤+黑籽+高光。
原版 PVZ 西瓜子弹是圆形切片在飞。
"""
from PIL import Image, ImageDraw
import math

W, H = 64, 64
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

cx, cy = W // 2, H // 2
R = 28  # 外皮半径
flesh_R = 23  # 瓜瓤半径
rind_w = R - flesh_R  # 4 像素宽的皮


def ellipse_fill(x0, y0, x1, y1, color, outline=None, width=1):
    d.ellipse([x0, y0, x1, y1], fill=color, outline=outline, width=width)


# ============ 阴影 ============
ellipse_fill(cx - R + 1, cy - R + 3, cx + R + 1, cy + R + 3, (40, 80, 30, 180))

# ============ 绿皮（外圈环）============
# 先画整圆绿色外皮
ellipse_fill(cx - R, cy - R, cx + R, cy + R, (60, 145, 55), outline=(25, 80, 30), width=2)

# 深绿条纹（西瓜外皮典型 6 条）
for ang_deg in [-80, -55, -30, -5, 20, 45]:
    a = math.radians(ang_deg)
    x1 = cx + math.sin(a) * R
    y1 = cy - math.cos(a) * R
    x2 = cx + math.sin(a) * R
    y2 = cy + math.cos(a) * R
    d.line([(x1, y1), (x2, y2)], fill=(25, 80, 30), width=1)

# ============ 红瓤（内圈）============
ellipse_fill(cx - flesh_R, cy - flesh_R, cx + flesh_R, cy + flesh_R,
             (220, 70, 60), outline=(150, 30, 30), width=1)

# 瓤的高光（上部浅红）
ellipse_fill(cx - flesh_R + 4, cy - flesh_R + 4, cx + flesh_R - 4, cy + 1,
             (245, 130, 110, 220))

# 瓤的右下阴影
ellipse_fill(cx + 6, cy + 6, cx + flesh_R, cy + flesh_R,
             (170, 40, 40, 160))

# ============ 黑籽 ============
seed_color = (30, 20, 10)
# 中央几粒瓜子
for (sx, sy, dx, dy) in [
    (cx - 8, cy - 6, 2, 1),
    (cx + 8, cy - 5, 2, 1),
    (cx - 4, cy + 6, 2, 1),
    (cx + 6, cy + 7, 2, 1),
    (cx, cy - 1, 2, 1),
]:
    d.ellipse([sx - dx, sy - dy, sx + dx, sy + dy], fill=seed_color)

# 整体左上高光点
ellipse_fill(cx - flesh_R + 2, cy - flesh_R + 2, cx - flesh_R + 8, cy - flesh_R + 6,
             (255, 200, 200, 200))

img.save('pvz-web/assets/images/Plants/MelonPult/Melon.gif', 'GIF', transparency=0)
print('saved Melon.gif 64x64')