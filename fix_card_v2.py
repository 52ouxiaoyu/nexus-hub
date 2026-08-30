"""
MelonPult 卡片最终版（彻底去灰色西瓜）：
- 模板：Peashooter.png（100x120 圆角黑边，与其他植物一致）
- 上半：擦掉豌豆射手 → 纯草背景，贴入 MelonPult 彩色西瓜
- 下半：整块草地绿（不贴灰度剪影）—— 灰色西瓜彻底消失
"""
import numpy as np
from PIL import Image

GRASS = (12, 198, 32)  # PVZ1 草绿


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

    # 1. 上半部 (y<64)：擦豌豆（非草→草绿）
    for y in range(0, 64):
        for x in range(w):
            if a[y, x] > 0 and not is_grass[y, x]:
                arr[y, x, 0], arr[y, x, 1], arr[y, x, 2] = GRASS
                arr[y, x, 3] = 255

    # 2. 下半部 (y>=64)：全部草地绿（含灰色剪影/灰底）——灰色西瓜彻底消失
    for y in range(64, h):
        for x in range(w):
            if a[y, x] > 0:
                # 保留卡片边框（黑色描边/圆角边缘不透明部分）
                # 灰色/浅色（r≈g≈b>100）→ 草地；深色边框保留
                rr, gg, bb, aa = arr[y, x, 0], arr[y, x, 1], arr[y, x, 2], arr[y, x, 3]
                if abs(rr - gg) < 40 and abs(gg - bb) < 40 and rr > 60:
                    arr[y, x, 0], arr[y, x, 1], arr[y, x, 2] = GRASS
                    arr[y, x, 3] = 255

    canvas = Image.fromarray(arr, 'RGBA')

    # 3. 贴彩色西瓜（上半 y=-4..74）
    melon_top = melon.resize((74, 78), Image.LANCZOS)
    canvas.paste(melon_top, (13, -6), melon_top)

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/MelonPult.png'
    canvas.save(out, 'PNG')
    print(f'saved {out}')

    # 验证：灰色像素应为 0（除边框描边）
    arr2 = np.array(Image.open(out).convert('RGBA'))
    r2 = arr2[:, :, 0].astype(int)
    g2 = arr2[:, :, 1].astype(int)
    b2 = arr2[:, :, 2].astype(int)
    gray = (abs(r2 - g2) < 25) & (abs(g2 - b2) < 25) & (arr2[:, :, 3] > 0) & (r2 > 60)
    print(f'灰色像素（>60 亮度）: {gray.sum()}')
    # 草地绿
    grass_px = (r2 < 60) & (g2 > 150) & (b2 < 80) & (arr2[:, :, 3] > 0)
    print(f'草地绿像素: {grass_px.sum()}')


if __name__ == '__main__':
    main()