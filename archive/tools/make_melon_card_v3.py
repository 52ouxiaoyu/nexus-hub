"""
生成 MelonPult 种子卡片 v3（彻底劈掉豌豆）：
1. 用 Peashooter.png 作为模板（取圆角/边框/上下分界/下半灰底）
2. 上半部（y<65）：把豌豆射手区域像素完全替换为统一 PVZ1 草绿 —— 豌豆彻底消失
3. 贴入 MelonPult 抠草图（96x96）彩色版（上半）+ 灰度剪影（下半）
"""
import numpy as np
from PIL import Image, ImageOps

GRASS = (12, 198, 32)  # PVZ1 草绿（与模板草色接近）


def main():
    tpl = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/Peashooter.png').convert('RGBA')
    melon = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png').convert('RGBA')

    arr = np.array(tpl)
    h, w, _ = arr.shape
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    a = arr[:, :, 3].astype(int)

    is_grass = (r < 100) & (g > 140) & (b < 100) & ((g - r) > 60)

    # 上半部（y < 64）所有"非草"像素 → 统一草绿
    for y in range(0, 64):
        for x in range(w):
            if a[y, x] > 0 and not is_grass[y, x]:
                arr[y, x, 0] = GRASS[0]
                arr[y, x, 1] = GRASS[1]
                arr[y, x, 2] = GRASS[2]
                arr[y, x, 3] = 255

    canvas = Image.fromarray(arr, 'RGBA')

    # 上半：彩色西瓜（72x72 居中）
    melon_top = melon.resize((74, 74), Image.LANCZOS)
    canvas.paste(melon_top, (13, -2), melon_top)

    # 下半：灰度剪影
    melon_gray = ImageOps.grayscale(melon.convert('RGB')).convert('RGBA')
    _, _, _, ma = melon.split()
    melon_gray.putalpha(ma)
    melon_gray = melon_gray.resize((74, 74), Image.LANCZOS)
    canvas.paste(melon_gray, (13, 46), melon_gray)

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/MelonPult.png'
    canvas.save(out, 'PNG')
    print(f'saved {out}  {canvas.size}')

    # 验证：黄色豌豆嘴特征应≈0
    arr2 = np.array(canvas)
    r2 = arr2[:, :, 0].astype(int)
    g2 = arr2[:, :, 1].astype(int)
    b2 = arr2[:, :, 2].astype(int)
    yellow = (r2 > 150) & (g2 > 150) & (b2 < 100) & (arr2[:, :, 3] > 0)
    # 排除西瓜自身的黄色（小虫/藤蔓）——限制在 y<8 顶部（豌豆头区域）
    yellow_top = yellow[:8].sum()
    yellow_total = yellow.sum()
    print(f'黄色残留 顶部(y<8): {yellow_top}, 全部: {yellow_total}')


if __name__ == '__main__':
    main()