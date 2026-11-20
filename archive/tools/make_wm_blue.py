"""
WinterMelon = MelonPult 变蓝版（v3.2.16-icemelon）
用户要求：西瓜和冰西瓜除了攻击和颜色以外全部相同。
冰西瓜 = 变蓝之后的西瓜，不要任何额外造型（无冰柱/无投石臂/无篮）。
方法：把 MelonPult 整图绿色系像素 HSV 色相偏移成冰蓝，保留明暗与 alpha。
"""
import numpy as np
from PIL import Image
import colorsys


def winterize(img):
    """绿色系像素 -> 冰蓝色，alpha 与造型 100% 保留。"""
    arr = np.array(img.convert('RGBA'))
    h, w = arr.shape[:2]
    for y in range(h):
        for x in range(w):
            r, g, b, a = arr[y, x]
            if a == 0:
                continue
            # 绿色系：h 0.15-0.55（绿瓜/绿底座/黄绿藤蔓）
            hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            if 0.15 <= hh <= 0.55 and ss > 0.15:
                hh2 = 0.55          # 冰蓝
                ss2 = min(ss*0.85, 1.0)   # 冰色淡一点
                vv2 = min(vv*1.05, 1.0)   # 冰色亮一点
                r2, g2, b2 = colorsys.hsv_to_rgb(hh2, ss2, vv2)
                arr[y, x, 0] = int(r2*255)
                arr[y, x, 1] = int(g2*255)
                arr[y, x, 2] = int(b2*255)
    return Image.fromarray(arr, 'RGBA')


def main():
    base = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants'

    # 1) 植物图 96x96
    mp = Image.open(f'{base}/MelonPult/MelonPult.png')
    wm = winterize(mp)
    wm.save(f'{base}/WinterMelon/WinterMelon.png', 'PNG')

    # 2) 子弹 50x40
    mb = Image.open(f'{base}/MelonPult/Melon.png')
    wb = winterize(mb)
    wb.save(f'{base}/MelonPult/WinterMelon.png', 'PNG')

    # 3) 小子弹 32x32（cattail 用）
    ms = Image.open(f'{base}/MelonPult/Melon_small.png')
    ws = winterize(ms)
    ws.save(f'{base}/MelonPult/WinterMelon_small.png', 'PNG')

    # 验证：alpha 必须与西瓜完全相同（同造型）
    def stats(path):
        arr = np.array(Image.open(path).convert('RGBA'))
        a = arr[:, :, 3]
        r = arr[:, :, 0].astype(int); g = arr[:, :, 1].astype(int); b = arr[:, :, 2].astype(int)
        op = a > 0
        blue = (b > r + 30) & (b > 100) & op
        green = (g > r + 20) & (g > b + 10) & op
        return a, blue.sum(), green.sum(), op.sum()

    for name, src, dst in [
        ('植物', f'{base}/MelonPult/MelonPult.png', f'{base}/WinterMelon/WinterMelon.png'),
        ('子弹', f'{base}/MelonPult/Melon.png', f'{base}/MelonPult/WinterMelon.png'),
        ('小子弹', f'{base}/MelonPult/Melon_small.png', f'{base}/MelonPult/WinterMelon_small.png'),
    ]:
        a1, *_ = stats(src)
        a2, bl, gr, op = stats(dst)
        same = (a1 == a2).all()
        print(f'{name}: alpha一致={same}, 蓝色={bl}, 绿色残留={gr}, 实心={op}')


if __name__ == '__main__':
    main()
