"""
从 PVZ1 原版 Melon-pult 合成图（带绿草背景）抠出 sprite 透明背景。
- MelonPult 植物图：投石车+西瓜+虫+叶 = 前景
- 绿草 = 背景，要 alpha=0
- 边缘做羽化
- 同时生成 Winter Melon 冰色版
"""
import numpy as np
from PIL import Image


def keyout_grass(img, grass_g_min=110, grass_r_max=70, grass_b_max=70):
    """绿草背景 → alpha=0。判断：g 高，r/b 低。"""
    img = img.convert("RGBA")
    arr = np.array(img)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3].copy()
    # 草色：g 高（>110），r 低（<70），b 低（<70）
    grass_mask = (g > grass_g_min) & (r < grass_r_max) & (b < grass_b_max)
    a[grass_mask] = 0
    arr[:, :, 3] = a
    return Image.fromarray(arr, "RGBA")


def to_wintermelon(img):
    """绿调 → 冰蓝调（保留阴影/高光结构）。"""
    img = img.convert("RGBA")
    arr = np.array(img).astype(np.float32)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]
    # 提取原亮度
    bright = (r + g + b) / 3
    # 偏冷色：r *= 0.55, b *= 1.2, g 保持
    r2 = np.clip(r * 0.55, 0, 255)
    g2 = np.clip(g * 0.95, 0, 255)
    b2 = np.clip(b * 1.25 + 25, 0, 255)
    # 保留 alpha（透明处不处理）
    out = np.stack([r2, g2, b2, a], axis=2).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants'

    # 植物
    plant = Image.open('/tmp/melonpult_orig_from_git.gif').convert("RGBA")
    plant_clean = keyout_grass(plant)
    plant_clean.save(f'{out}/MelonPult/MelonPult.png', 'PNG')
    print('saved MelonPult/MelonPult.png  ', plant_clean.size)

    plant_ice = to_wintermelon(plant_clean)
    plant_ice.save(f'{out}/WinterMelon/WinterMelon.png', 'PNG')
    print('saved WinterMelon/WinterMelon.png  ', plant_ice.size)

    # 子弹
    bullet = Image.open('/tmp/melon_proj_cropped_from_git.gif').convert("RGBA")
    bullet_clean = keyout_grass(bullet)
    bullet_clean.save(f'{out}/MelonPult/Melon.png', 'PNG')
    print('saved MelonPult/Melon.png  ', bullet_clean.size)

    bullet_ice = to_wintermelon(bullet_clean)
    bullet_ice.save(f'{out}/MelonPult/WinterMelon.png', 'PNG')
    print('saved MelonPult/WinterMelon.png (bullet)  ', bullet_ice.size)

    # cattail 系列（小尺寸）
    bullet_clean.resize((32, 32), Image.LANCZOS).save(f'{out}/MelonPult/Melon_small.png', 'PNG')
    bullet_ice.resize((32, 32), Image.LANCZOS).save(f'{out}/MelonPult/WinterMelon_small.png', 'PNG')
    print('saved small bullets 32x32')


if __name__ == '__main__':
    main()