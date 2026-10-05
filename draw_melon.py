"""
生成新的"西瓜投手"植物图（MelonPult.gif, 96x96）。
结构：木质投石车底座 + 一颗完整的圆西瓜（绿皮+深绿条纹+卷须+高光）。
"""
from PIL import Image, ImageDraw
import math

W, H = 96, 96
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)


def ellipse_fill(cx, cy, rx, ry, color, outline=None, width=1):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color, outline=outline, width=width)


# ============ 木质投石车底座（梯形托盘 + 两条腿）============
# 托盘：梯形，从 y=58 到 y=78
tray_top_y = 58
tray_bot_y = 80
# 托盘上窄下宽
tray_color = (155, 110, 60)         # 棕色
tray_dark = (110, 75, 40)
tray_light = (190, 145, 90)
# 上沿
d.rectangle([20, tray_top_y, 76, tray_top_y + 4], fill=tray_color, outline=tray_dark, width=1)
# 主体梯形
d.polygon([
    (22, tray_top_y + 4),
    (74, tray_top_y + 4),
    (80, tray_bot_y),
    (16, tray_bot_y),
], fill=tray_color, outline=tray_dark)
# 木纹线条（横向）
for y in (66, 72):
    d.line([(20, y), (76, y)], fill=tray_dark, width=1)
# 左侧高光
d.polygon([
    (22, tray_top_y + 4),
    (28, tray_top_y + 4),
    (24, tray_bot_y),
    (16, tray_bot_y),
], fill=tray_light)
# 两条腿
d.rectangle([26, tray_bot_y, 32, tray_bot_y + 8], fill=tray_dark)
d.rectangle([64, tray_bot_y, 70, tray_bot_y + 8], fill=tray_dark)


# ============ 西瓜主体（圆形）============
# 西瓜圆心：48, 42
mel_cx, mel_cy = 48, 42
mel_rx, mel_ry = 28, 28

# 阴影（向右下偏移 2 像素）
ellipse_fill(mel_cx + 2, mel_cy + 2, mel_rx, mel_ry, (40, 80, 30, 180))

# 主瓜体：深绿外皮
ellipse_fill(mel_cx, mel_cy, mel_rx, mel_ry, (60, 140, 50), outline=(30, 80, 30), width=2)

# 深绿条纹（6 条，从瓜顶弧线向下）
stripe_color = (30, 90, 30)
for i, ang_deg in enumerate([-70, -45, -20, 5, 30, 55]):
    a = math.radians(ang_deg)
    # 起点（顶部）
    x1 = mel_cx + math.sin(a) * (mel_ry - 2)
    y1 = mel_cy - math.cos(a) * (mel_ry - 2)
    # 终点（底部）
    x2 = mel_cx + math.sin(a) * (mel_ry - 2)
    y2 = mel_cy + math.cos(a) * (mel_ry - 2)
    d.line([(x1, y1), (x2, y2)], fill=stripe_color, width=2)

# 左上高光（亮斑）
ellipse_fill(mel_cx - 9, mel_cy - 11, 8, 5, (180, 230, 160, 220))
ellipse_fill(mel_cx - 12, mel_cy - 6, 3, 2, (220, 250, 210, 240))

# 右下阴影
ellipse_fill(mel_cx + 11, mel_cy + 12, 9, 6, (20, 60, 20, 160))

# 顶部小藤蔓/卷须
d.line([(mel_cx - 2, mel_cy - mel_ry + 2), (mel_cx - 6, mel_cy - mel_ry - 6)],
       fill=(70, 50, 20), width=2)
d.line([(mel_cx + 2, mel_cy - mel_ry + 2), (mel_cx + 5, mel_cy - mel_ry - 8)],
       fill=(70, 50, 20), width=2)
# 小叶子
d.polygon([
    (mel_cx - 6, mel_cy - mel_ry - 6),
    (mel_cx - 12, mel_cy - mel_ry - 10),
    (mel_cx - 4, mel_cy - mel_ry - 8),
], fill=(70, 140, 60), outline=(40, 90, 30))

img.save('pvz-web/assets/images/Plants/MelonPult/MelonPult.gif', 'GIF', transparency=0)
print('saved MelonPult.gif 96x96')