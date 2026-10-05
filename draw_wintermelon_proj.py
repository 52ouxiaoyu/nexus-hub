"""
生成冰西瓜子弹图（WinterMelon.gif, 64x64）。
同 Melon 形状，但瓜皮冰蓝、瓜瓤冰蓝白、瓜子改为冰晶点。
"""
from PIL import Image, ImageDraw
import math

W, H = 64, 64
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

cx, cy = W // 2, H // 2
R = 28
flesh_R = 23


def ellipse_fill(x0, y0, x1, y1, color, outline=None, width=1):
    d.ellipse([x0, y0, x1, y1], fill=color, outline=outline, width=width)


# ============ 阴影 ============
ellipse_fill(cx - R + 1, cy - R + 3, cx + R + 1, cy + R + 3, (30, 70, 90, 180))

# ============ 冰皮 ============
ellipse_fill(cx - R, cy - R, cx + R, cy + R, (95, 175, 200), outline=(40, 110, 150), width=2)
# 冰蓝条纹
for ang_deg in [-80, -55, -30, -5, 20, 45]:
    a = math.radians(ang_deg)
    x1 = cx + math.sin(a) * R
    y1 = cy - math.cos(a) * R
    x2 = cx + math.sin(a) * R
    y2 = cy + math.cos(a) * R
    d.line([(x1, y1), (x2, y2)], fill=(40, 110, 150), width=1)

# ============ 冰瓤（蓝白渐变）============
ellipse_fill(cx - flesh_R, cy - flesh_R, cx + flesh_R, cy + flesh_R,
             (180, 220, 240), outline=(120, 180, 210), width=1)

# 瓤上部浅色高光
ellipse_fill(cx - flesh_R + 4, cy - flesh_R + 4, cx + flesh_R - 4, cy + 1,
             (220, 240, 250, 220))

# 瓤右下阴影
ellipse_fill(cx + 6, cy + 6, cx + flesh_R, cy + flesh_R,
             (130, 180, 210, 160))

# ============ 冰晶点（代替瓜子）============
for (sx, sy) in [(cx - 8, cy - 6), (cx + 8, cy - 5),
                 (cx - 4, cy + 6), (cx + 6, cy + 7),
                 (cx, cy - 1)]:
    # 冰晶：白色四边形+深蓝描边
    d.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(255, 255, 255, 240),
              outline=(80, 150, 200), width=1)

# 左上亮点
ellipse_fill(cx - flesh_R + 2, cy - flesh_R + 2, cx - flesh_R + 8, cy - flesh_R + 6,
             (240, 250, 255, 220))

img.save('pvz-web/assets/images/Plants/MelonPult/WinterMelon.gif', 'GIF', transparency=0)
print('saved WinterMelon.gif (bullet) 64x64')