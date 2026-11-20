"""
生成 PVZ1 标准 100×120 种子卡片：
1. MelonPult.png：把 Melon-pultSeedPacket1HD.png 缩放到 100×120
2. WinterMelon.png：把 MelonPult 卡片蓝化（hsv 转换）
"""
import numpy as np
from PIL import Image
import colorsys


def to_winter_card(src_path, out_path, split_y=70):
    """只冰化上半部分（彩色版），下半保持原灰度。"""
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img).astype(np.float32)
    h, w = arr.shape[:2]
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    # 只对上部分（彩色版）做蓝化
    r_top = r[:split_y]
    g_top = g[:split_y]
    b_top = b[:split_y]
    r_norm = r_top / 255.0
    g_norm = g_top / 255.0
    b_norm = b_top / 255.0
    h_top, s_top, v_top = np.vectorize(colorsys.rgb_to_hsv)(r_norm, g_norm, b_norm)
    h_top = np.array(h_top)
    s_top = np.array(s_top)
    v_top = np.array(v_top)
    # 绿调 (0.20-0.50) → 冰蓝 (0.55)
    h_new = np.where((h_top > 0.20) & (h_top < 0.50), 0.55, h_top)
    s_new = s_top * 0.85
    v_new = np.minimum(1.0, v_top * 1.05 + 0.02)
    r2, g2, b2 = np.vectorize(colorsys.hsv_to_rgb)(h_new, s_new, v_new)
    arr[:split_y, :, 0] = r2 * 255
    arr[:split_y, :, 1] = g2 * 255
    arr[:split_y, :, 2] = b2 * 255
    # 下半 (split_y:) 保持原灰度
    Image.fromarray(arr.astype(np.uint8), 'RGBA').save(out_path, 'PNG')
    print(f'saved {out_path}')


def main():
    # 1. MelonPult 卡片：缩放 HD 原版到 100x120
    hd = Image.open('/tmp/wg/Melon-pultSeedPacket1HD.png').convert('RGBA')
    # 100x120 缩放（HD 是 130x180）
    mp_card = hd.resize((100, 120), Image.LANCZOS)
    mp_card.save('/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/MelonPult.png', 'PNG')
    print(f'saved Card/Plants/MelonPult.png  {mp_card.size}')

    # 2. Winter Melon 卡片：把 Melon 卡片转冰蓝色
    to_winter_card(
        '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/MelonPult.png',
        '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/WinterMelon.png'
    )


if __name__ == '__main__':
    main()