"""
生成冰西瓜投手植物图（WinterMelon.gif, 96x96）。
结构同 MelonPult，但西瓜换成冰蓝绿色调（外皮冰绿、条纹冰蓝）。
"""
from PIL import Image, ImageDraw
import math

W, H = 96, 96
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)


def ellipse_fill(cx, cy, rx, ry, color, outline=None, width=1):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color, outline=outline, width=width)


# ============ 木质投石车底座（同 MelonPult）============
tray_top_y = 58
tray_bot_y = 80
tray_color = (155, 110, 60)
tray_dark = (110, 75, 40)
tray_light = (190, 145, 90)

d.rectangle([20, tray_top_y, 76, tray_top_y + 4], fill=tray_color, outline=tray_dark, width=1)
d.polygon([
    (22, tray_top_y + 4),
    (74, tray_top_y + 4),
    (80, tray_bot_y),
    (16, tray_bot_y),
], fill=tray_color, outline=tray_dark)
for y in (66, 72):
    d.line([(20, y), (76, y)], fill=tray_dark, width=1)
d.polygon([
    (22, tray_top_y + 4),
    (28, tray_top_y + 4),
    (24, tray_bot_y),
    (16, tray_bot_y),
], fill=tray_light)
d.rectangle([26, tray_bot_y, 32, tray_bot_y + 8], fill=tray_dark)
d.rectangle([64, tray_bot_y, 70, tray_bot_y + 8], fill=tray_dark)


# ============ 冰西瓜主体（蓝绿冷色调）============
mel_cx, mel_cy = 48, 42
mel_rx, mel_ry = 28, 28

# 阴影
ellipse_fill(mel_cx + 2, mel_cy + 2, mel_rx, mel_ry, (30, 70, 90, 180))

# 主瓜体：冰蓝外皮
ellipse_fill(mel_cx, mel_cy, mel_rx, mel_ry, (90, 170, 200), outline=(40, 110, 150), width=2)

# 深冰蓝条纹
stripe_color = (40, 110, 160)
for ang_deg in [-70, -45, -20, 5, 30, 55]:
    a = math.radians(ang_deg)
    x1 = mel_cx + math.sin(a) * (mel_ry - 2)
    y1 = mel_cy - math.cos(a) * (mel_ry - 2)
    x2 = mel_cx + math.sin(a) * (mel_ry - 2)
    y2 = mel_cy + math.cos(a) * (mel_ry - 2)
    d.line([(x1, y1), (x2, y2)], fill=stripe_color, width=2)

# 左上高光（冰晶亮斑）
ellipse_fill(mel_cx - 9, mel_cy - 11, 8, 5, (210, 240, 250, 230))
ellipse_fill(mel_cx - 12, mel_cy - 6, 3, 2, (240, 250, 255, 240))

# 右下阴影
ellipse_fill(mel_cx + 11, mel_cy + 12, 9, 6, (30, 80, 110, 160))

# 顶部小藤蔓
d.line([(mel_cx - 2, mel_cy - mel_ry + 2), (mel_cx - 6, mel_cy - mel_ry - 6)],
       fill=(70, 50, 20), width=2)
d.line([(mel_cx + 2, mel_cy - mel_ry + 2), (mel_cx + 5, mel_cy - mel_ry - 8)],
       fill=(70, 50, 20), width=2)
# 小冰叶
d.polygon([
    (mel_cx - 6, mel_cy - mel_ry - 6),
    (mel_cx - 12, mel_cy - mel_ry - 10),
    (mel_cx - 4, mel_cy - mel_ry - 8),
], fill=(110, 180, 200), outline=(40, 110, 150))

# 表面一点白色霜点
for (x, y) in [(60, 30), (38, 55), (55, 50), (45, 30)]:
    d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(240, 250, 255, 200))

img.save('pvz-web/assets/images/Plants/WinterMelon/WinterMelon.gif', 'GIF', transparency=0)
print('saved WinterMelon.gif 96x96')