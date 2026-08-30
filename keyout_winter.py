"""
PVZ1 原版 Winter Melon 抠背景 + 提取子弹。
- Winter_MelonO.png 96x96 PVZ1 原版静态（投石车+冰柱+冰蓝白西瓜+小虫） → 抠背景作为植物
- 子弹：从 Winter_MelonO.png 裁剪"圆形冰西瓜"部分（去掉底部投石车+眼睛）
"""
import numpy as np
from PIL import Image


def keyout_grass_v2(img):
    """更稳的颜色键控：草色判断 = r 低 + g 显著大于 r。
    MelonPult 草: rgb(16, 170, 22)  -> g-r=154
    WinterMelon 草: rgb(23, 179, 119) -> g-r=156 (g-b=60)
    通用条件：g - r > 100 且 r < 80 → 草
    """
    img = img.convert("RGBA")
    arr = np.array(img)
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3].copy()

    # 草：r 低 且 g 比 r 大很多
    grass_mask = (r < 80) & ((g - r) > 100)

    # 边缘羽化：alpha 渐变
    # 如果像素接近草色但不完全相同，半透明
    dist_to_grass = np.where(grass_mask, 255, 0)

    a = np.where(grass_mask, 0, a).astype(np.uint8)
    arr[:, :, 3] = a
    return Image.fromarray(arr, "RGBA")


def crop_ice_melon_bullet(src_img):
    """从 Winter_MelonO.png 抠出'圆形冰西瓜'部分作为子弹（去掉底部投石车+眼睛+顶部雪柱）。
    96x96 中，圆形西瓜在中间偏下大约 (8, 30) ~ (88, 90)。
    子弹要 64x64。"""
    img = src_img.convert("RGBA")
    # 裁剪: 上 30~88 (西瓜主体), 水平 5~90
    cropped = img.crop((5, 30, 91, 88))
    # resize 到 64x64
    return cropped.resize((64, 64), Image.LANCZOS)


def main():
    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants'

    # ===== 植物本图 =====
    plant = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/_orig/Winter_MelonO.png').convert("RGBA")
    plant_clean = keyout_grass_v2(plant)
    plant_clean.save(f'{out}/WinterMelon/WinterMelon.png', 'PNG')
    print('saved WinterMelon/WinterMelon.png  ', plant_clean.size, '  (PVZ1 原版冰西瓜静态)')

    # ===== 子弹（从植物图抠圆冰西瓜部分）=====
    bullet = crop_ice_melon_bullet(plant_clean)
    bullet.save(f'{out}/MelonPult/WinterMelon.png', 'PNG')
    print('saved MelonPult/WinterMelon.png  (winter bullet)  ', bullet.size)

    # cattail 小尺寸
    bullet.resize((32, 32), Image.LANCZOS).save(f'{out}/MelonPult/WinterMelon_small.png', 'PNG')
    print('saved MelonPult/WinterMelon_small.png 32x32')


if __name__ == '__main__':
    main()