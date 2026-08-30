"""
Cattail 种子卡片（100x120 标准样式，与 GloomShroom/Spikerock 一致）：
- 模板：Peashooter.png（圆角黑边）
- 上半：擦豌豆 -> 草背景，贴入 Cattail 原版猫尾草（Cattail.gif 第一帧裁剪）
- 下半：整块草地绿（无灰色剪影，与 MelonPult 卡片风格一致）
"""
import numpy as np
from PIL import Image

GRASS = (12, 198, 32)  # PVZ1 草绿


def main():
    tpl = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/Peashooter.png').convert('RGBA')
    cattail = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/Cattail/Cattail.gif')
    cattail.seek(0)
    cattail = cattail.convert('RGBA')

    arr = np.array(tpl)
    h, w, _ = arr.shape
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    a = arr[:, :, 3].astype(int)

    is_grass = (r < 100) & (g > 140) & (b < 100) & ((g - r) > 60)

    # 1. 上半部 (y<64)：擦豌豆（非草->草绿）
    for y in range(0, 64):
        for x in range(w):
            if a[y, x] > 0 and not is_grass[y, x]:
                arr[y, x, 0], arr[y, x, 1], arr[y, x, 2] = GRASS
                arr[y, x, 3] = 255

    # 2. 下半部 (y>=64)：灰色/浅色 -> 草地绿（保留深色边框）
    for y in range(64, h):
        for x in range(w):
            if a[y, x] > 0:
                rr, gg, bb, aa = arr[y, x, 0], arr[y, x, 1], arr[y, x, 2], arr[y, x, 3]
                if abs(rr - gg) < 40 and abs(gg - bb) < 40 and rr > 60:
                    arr[y, x, 0], arr[y, x, 1], arr[y, x, 2] = GRASS
                    arr[y, x, 3] = 255

    canvas = Image.fromarray(arr, 'RGBA')

    # 3. 贴猫尾草（主体 bbox (3,77)-(86,153) 缩放到上半）
    body = cattail.crop((3, 77, 86, 153))
    body_resized = body.resize((80, 74), Image.LANCZOS)
    canvas.paste(body_resized, (10, -4), body_resized)

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/Cattail.png'
    canvas.save(out, 'PNG')
    print(f'saved {out}')

    # 验证
    arr2 = np.array(Image.open(out).convert('RGBA'))
    r2 = arr2[:, :, 0].astype(int)
    g2 = arr2[:, :, 1].astype(int)
    b2 = arr2[:, :, 2].astype(int)
    gray = (abs(r2 - g2) < 25) & (abs(g2 - b2) < 25) & (arr2[:, :, 3] > 0) & (r2 > 60)
    print(f'灰色像素: {gray.sum()}')
    grass_px = (r2 < 60) & (g2 > 150) & (b2 < 80) & (arr2[:, :, 3] > 0)
    print(f'草地绿像素: {grass_px.sum()}')
    print('size:', Image.open(out).size)


if __name__ == '__main__':
    main()
