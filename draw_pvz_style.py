"""
PVZ 风格精细版：
- 西瓜投手：碗形棕色投石车 + 完整圆润圆西瓜 + 小藤蔓
- 冰西瓜投手：同上但冰色调
- 西瓜子弹：完整圆西瓜（无投石车）
- 冰西瓜子弹：同上但冰色调
"""
from PIL import Image, ImageDraw
import math


# ============ 工具函数 ============
def ellipse_fill(d, cx, cy, rx, ry, color, outline=None, width=1):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color, outline=outline, width=width)


def round_rect(d, x0, y0, x1, y1, r, fill, outline=None, width=1):
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill, outline=outline, width=width)


# ============ 1. 植物图：西瓜投手 96x96 ============
def draw_melonpult_plant():
    W = H = 96
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 投石车底座（碗形棕色托盘）—— 居中底部
    # 主碗：梯形（上方窄下方宽）+ 弧形底部
    bowl_color = (170, 120, 60)      # 主色
    bowl_dark = (110, 70, 30)        # 阴影
    bowl_light = (210, 160, 90)      # 高光

    # 主碗体（梯形 + 半圆底）
    d.polygon([
        (24, 64), (72, 64),          # 上沿
        (78, 76),                    # 右下斜
        (82, 84),                    # 右弧
        (14, 84),                    # 底弧
        (18, 76),                    # 左下斜
    ], fill=bowl_color, outline=bowl_dark, width=2)
    # 碗沿（顶部厚边）
    round_rect(d, 22, 60, 74, 68, 4, bowl_light, outline=bowl_dark, width=1)
    # 碗底阴影
    d.ellipse([12, 80, 84, 92], fill=bowl_dark)
    # 木纹
    for y in (72, 78):
        d.line([(20, y), (76, y)], fill=bowl_dark, width=1)
    # 左高光
    d.polygon([
        (24, 68), (32, 68),
        (26, 82), (18, 82),
    ], fill=bowl_light)
    # 右侧阴影
    d.polygon([
        (66, 68), (74, 68),
        (80, 82), (74, 82),
    ], fill=bowl_dark)

    # ============ 完整圆西瓜（顶部）============
    cx, cy = 48, 36
    rx, ry = 28, 26

    # 西瓜阴影（右下）
    ellipse_fill(d, cx + 3, cy + 4, rx, ry, (20, 60, 25, 180))

    # 主瓜体
    ellipse_fill(d, cx, cy, rx, ry, (60, 155, 60), outline=(20, 80, 30), width=2)

    # 深绿条纹（西瓜外皮典型 5 条）
    stripe_color = (25, 85, 30)
    for ang in [-65, -32, 0, 32, 65]:
        a = math.radians(ang)
        x1 = cx + math.sin(a) * rx
        y1 = cy - math.cos(a) * ry
        x2 = cx + math.sin(a) * rx
        y2 = cy + math.cos(a) * ry
        d.line([(x1, y1), (x2, y2)], fill=stripe_color, width=3)

    # 左上大高光
    ellipse_fill(d, cx - 11, cy - 11, 11, 6, (190, 235, 175, 230))
    ellipse_fill(d, cx - 13, cy - 6, 4, 2, (230, 250, 220, 240))

    # 右下阴影
    ellipse_fill(d, cx + 12, cy + 12, 10, 7, (20, 60, 25, 180))

    # 顶部小藤蔓 + 叶子
    d.line([(cx - 4, cy - ry + 2), (cx - 8, cy - ry - 10)], fill=(80, 50, 25), width=2)
    d.line([(cx + 2, cy - ry + 2), (cx + 6, cy - ry - 12)], fill=(80, 50, 25), width=2)
    # 叶子1（左）
    d.polygon([
        (cx - 8, cy - ry - 10),
        (cx - 16, cy - ry - 14),
        (cx - 6, cy - ry - 12),
    ], fill=(70, 145, 60), outline=(35, 90, 35))
    # 叶子2（右）
    d.polygon([
        (cx + 6, cy - ry - 12),
        (cx + 14, cy - ry - 16),
        (cx + 4, cy - ry - 8),
    ], fill=(70, 145, 60), outline=(35, 90, 35))

    # 投石车"投绳"（从前端延伸的小绳子，连到西瓜底部）
    # 简洁点：用两条短线表示牵引绳
    d.line([(48, 60), (44, 64)], fill=(80, 50, 25), width=2)
    d.line([(48, 60), (52, 64)], fill=(80, 50, 25), width=2)

    return img


# ============ 2. 植物图：冰西瓜投手 96x96 ============
def draw_wintermelon_plant():
    W = H = 96
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 投石车底座（同西瓜投手）
    bowl_color = (170, 120, 60)
    bowl_dark = (110, 70, 30)
    bowl_light = (210, 160, 90)

    d.polygon([
        (24, 64), (72, 64),
        (78, 76),
        (82, 84),
        (14, 84),
        (18, 76),
    ], fill=bowl_color, outline=bowl_dark, width=2)
    round_rect(d, 22, 60, 74, 68, 4, bowl_light, outline=bowl_dark, width=1)
    d.ellipse([12, 80, 84, 92], fill=bowl_dark)
    for y in (72, 78):
        d.line([(20, y), (76, y)], fill=bowl_dark, width=1)
    d.polygon([
        (24, 68), (32, 68),
        (26, 82), (18, 82),
    ], fill=bowl_light)
    d.polygon([
        (66, 68), (74, 68),
        (80, 82), (74, 82),
    ], fill=bowl_dark)

    # ============ 冰色圆西瓜 ============
    cx, cy = 48, 36
    rx, ry = 28, 26

    ellipse_fill(d, cx + 3, cy + 4, rx, ry, (30, 80, 100, 180))
    # 主瓜体：冰蓝
    ellipse_fill(d, cx, cy, rx, ry, (100, 180, 215), outline=(30, 110, 150), width=2)

    # 深冰蓝条纹
    stripe_color = (30, 110, 150)
    for ang in [-65, -32, 0, 32, 65]:
        a = math.radians(ang)
        x1 = cx + math.sin(a) * rx
        y1 = cy - math.cos(a) * ry
        x2 = cx + math.sin(a) * rx
        y2 = cy + math.cos(a) * ry
        d.line([(x1, y1), (x2, y2)], fill=stripe_color, width=3)

    # 左上冰晶高光
    ellipse_fill(d, cx - 11, cy - 11, 11, 6, (220, 245, 250, 230))
    ellipse_fill(d, cx - 13, cy - 6, 4, 2, (245, 255, 255, 240))

    # 右下阴影
    ellipse_fill(d, cx + 12, cy + 12, 10, 7, (20, 70, 100, 180))

    # 顶部小藤蔓 + 叶子（冰色调）
    d.line([(cx - 4, cy - ry + 2), (cx - 8, cy - ry - 10)], fill=(80, 50, 25), width=2)
    d.line([(cx + 2, cy - ry + 2), (cx + 6, cy - ry - 12)], fill=(80, 50, 25), width=2)
    d.polygon([
        (cx - 8, cy - ry - 10),
        (cx - 16, cy - ry - 14),
        (cx - 6, cy - ry - 12),
    ], fill=(120, 190, 210), outline=(30, 110, 150))
    d.polygon([
        (cx + 6, cy - ry - 12),
        (cx + 14, cy - ry - 16),
        (cx + 4, cy - ry - 8),
    ], fill=(120, 190, 210), outline=(30, 110, 150))

    # 表面霜点
    for (x, y) in [(60, 30), (38, 55), (55, 50), (45, 28), (62, 42)]:
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(245, 255, 255, 220))

    # 投绳
    d.line([(48, 60), (44, 64)], fill=(80, 50, 25), width=2)
    d.line([(48, 60), (52, 64)], fill=(80, 50, 25), width=2)

    return img


# ============ 3. 子弹：完整圆西瓜（无投石车）64x64 ============
def draw_melon_bullet(size=64):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    rx, ry = size // 2 - 4, size // 2 - 4

    # 阴影
    ellipse_fill(d, cx + 2, cy + 2, rx, ry, (20, 60, 25, 180))
    # 主瓜体
    ellipse_fill(d, cx, cy, rx, ry, (60, 155, 60), outline=(20, 80, 30), width=2)

    # 深绿条纹
    stripe_color = (25, 85, 30)
    for ang in [-65, -32, 0, 32, 65]:
        a = math.radians(ang)
        x1 = cx + math.sin(a) * rx
        y1 = cy - math.cos(a) * ry
        x2 = cx + math.sin(a) * rx
        y2 = cy + math.cos(a) * ry
        d.line([(x1, y1), (x2, y2)], fill=stripe_color, width=2)

    # 高光
    ellipse_fill(d, cx - rx // 3, cy - ry // 3, rx // 2, ry // 3, (190, 235, 175, 220))
    ellipse_fill(d, cx - rx // 3 + 2, cy - ry // 3, 2, 1, (230, 250, 220, 240))

    # 阴影
    ellipse_fill(d, cx + rx // 3, cy + ry // 3, rx // 2, ry // 3, (20, 60, 25, 150))

    # 顶部小藤须（简化）
    d.line([(cx, cy - ry + 1), (cx, cy - ry - 4)], fill=(80, 50, 25), width=2)

    return img


# ============ 4. 子弹：完整冰色圆西瓜 64x64 ============
def draw_wintermelon_bullet(size=64):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    rx, ry = size // 2 - 4, size // 2 - 4

    ellipse_fill(d, cx + 2, cy + 2, rx, ry, (30, 80, 100, 180))
    ellipse_fill(d, cx, cy, rx, ry, (100, 180, 215), outline=(30, 110, 150), width=2)

    stripe_color = (30, 110, 150)
    for ang in [-65, -32, 0, 32, 65]:
        a = math.radians(ang)
        x1 = cx + math.sin(a) * rx
        y1 = cy - math.cos(a) * ry
        x2 = cx + math.sin(a) * rx
        y2 = cy + math.cos(a) * ry
        d.line([(x1, y1), (x2, y2)], fill=stripe_color, width=2)

    ellipse_fill(d, cx - rx // 3, cy - ry // 3, rx // 2, ry // 3, (220, 245, 250, 220))
    ellipse_fill(d, cx - rx // 3 + 2, cy - ry // 3, 2, 1, (245, 255, 255, 240))
    ellipse_fill(d, cx + rx // 3, cy + ry // 3, rx // 2, ry // 3, (20, 70, 100, 150))

    # 顶部冰须
    d.line([(cx, cy - ry + 1), (cx, cy - ry - 4)], fill=(80, 50, 25), width=2)
    # 霜点
    for (x, y) in [(cx - 8, cy - 6), (cx + 8, cy - 4), (cx + 6, cy + 8)]:
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(245, 255, 255, 220))

    return img


# ============ 保存 ============
def save_gif(img, path):
    img.save(path, 'GIF', transparency=0)
    print(f'saved {path}  {img.size}')


mp = draw_melonpult_plant()
save_gif(mp, 'pvz-web/assets/images/Plants/MelonPult/MelonPult.gif')

wm = draw_wintermelon_plant()
save_gif(wm, 'pvz-web/assets/images/Plants/WinterMelon/WinterMelon.gif')

mb = draw_melon_bullet(64)
save_gif(mb, 'pvz-web/assets/images/Plants/MelonPult/Melon.gif')

wmb = draw_wintermelon_bullet(64)
save_gif(wmb, 'pvz-web/assets/images/Plants/MelonPult/WinterMelon.gif')

# cattail 系列（小尺寸子弹，32x32）
mb_s = draw_melon_bullet(32)
save_gif(mb_s, 'pvz-web/assets/images/Plants/MelonPult/Melon_small.gif')
wmb_s = draw_wintermelon_bullet(32)
save_gif(wmb_s, 'pvz-web/assets/images/Plants/MelonPult/WinterMelon_small.gif')