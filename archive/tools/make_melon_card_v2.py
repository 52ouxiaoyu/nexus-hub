"""
用 Peashooter.png 卡片作为模板，生成与其他植物完全一致的 MelonPult 卡片：
- 边框/圆角/背景/上下分界 = 与 Peashooter 100% 相同（用户要求"跟其他植物一样"）
- 上半：原版 MelonPult.png（96x96 已抠草）缩放贴入
- 下半：MelonPult 灰度剪影
"""
import numpy as np
from PIL import Image, ImageOps

TPL = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/Peashooter.png'
MELON = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png'
OUT = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/MelonPult.png'


def main():
    base = Image.open(TPL).convert('RGBA')  # 100x120 模板（含圆角/背景）
    melon = Image.open(MELON).convert('RGBA')  # 96x96 抠草植物

    # 1. 上半：彩色西瓜（贴到 y=6..76 区域，居中）
    # 缩放西瓜到约 68x68（保持比例）
    melon_top = melon.resize((68, 68), Image.LANCZOS)
    # 贴到画布上部（居中）
    base.paste(melon_top, (16, 4), melon_top)

    # 2. 下半：灰度剪影（贴到 y=70..118）
    # 提取灰度+alpha
    melon_gray = ImageOps.grayscale(melon.convert('RGB')).convert('RGBA')
    # 用原 alpha 作为遮罩（透明处保持透明）
    r, g, b, a = melon.split()
    melon_gray.putalpha(a)
    melon_gray = melon_gray.resize((68, 68), Image.LANCZOS)
    base.paste(melon_gray, (16, 50), melon_gray)

    base.save(OUT, 'PNG')
    print(f'saved {OUT}  {base.size}')


if __name__ == '__main__':
    main()