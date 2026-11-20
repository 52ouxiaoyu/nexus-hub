"""
修复 MelonPult 种子卡片：把下半部（y>=60）的灰色区域（灰色底+灰度西瓜剪影）
全部替换成草地绿，让"灰色西瓜"消失，变成草地。
保留：圆角边框、上半（彩色西瓜+草）、分隔线。
"""
import numpy as np
from PIL import Image

GRASS = (12, 198, 32)  # PVZ1 草绿

def main():
    path = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Card/Plants/MelonPult.png'
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]

    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    a = arr[:, :, 3].astype(int)

    # 下半部 y >= 60：灰色像素（r≈g≈b）→ 草绿
    gray = (abs(r - g) < 30) & (abs(g - b) < 30)
    for y in range(60, h):
        for x in range(w):
            if a[y, x] > 0 and gray[y, x]:
                arr[y, x, 0] = GRASS[0]
                arr[y, x, 1] = GRASS[1]
                arr[y, x, 2] = GRASS[2]
                arr[y, x, 3] = 255

    Image.fromarray(arr, 'RGBA').save(path, 'PNG')
    print(f'saved {path}')

    # 验证
    arr2 = np.array(Image.open(path).convert('RGBA'))
    r2 = arr2[:, :, 0].astype(int)
    g2 = arr2[:, :, 1].astype(int)
    b2 = arr2[:, :, 2].astype(int)
    gray2 = (abs(r2 - g2) < 30) & (abs(g2 - b2) < 30) & (arr2[:, :, 3] > 0)
    print(f'剩余灰色像素（含上下半）: {gray2.sum()}')
    # 下半草地色验证
    region = arr2[70:110, 20:80]
    grass_px = ((region[:,:,0] < 60) & (region[:,:,1] > 150) & (region[:,:,2] < 80)).sum()
    print(f'下半草地绿像素: {grass_px}')


if __name__ == '__main__':
    main()