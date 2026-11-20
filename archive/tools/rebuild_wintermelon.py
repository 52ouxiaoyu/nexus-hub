"""
重建 WinterMelon.png：
- 底座（y>=55）：用 MelonPult.png 的完整投石车底座（两款 PVZ1 投石车同款）
- 上半（y<55）：用 Winter_MelonO.png 的冰西瓜+冰柱（抠草）
这样冰西瓜的底座不再镂空。
"""
import numpy as np
from PIL import Image


def keyout_top_half_grass(img):
    """只对上半部(y<55)做草色键控（冰西瓜蓝白 r>80 不会误扣，草 r<80 & g-r>100 会被扣）。"""
    arr = np.array(img.convert('RGBA'))
    h, w = arr.shape[:2]
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3].copy()
    for y in range(55):
        grass = (r[y] < 80) & ((g[y] - r[y]) > 100)
        a[y, grass] = 0
    arr[:, :, 3] = a
    return Image.fromarray(arr, 'RGBA')


def main():
    melon_base = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png').convert('RGBA')
    winter_orig = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/_orig/Winter_MelonO.png').convert('RGBA')

    # 1. Winter 上半（冰西瓜+冰柱）抠草
    winter_top = keyout_top_half_grass(winter_orig)

    # 2. 用 MelonPult 底座为底，贴 Winter 上半
    canvas = melon_base.copy()
    # 取 Winter 上半 (0-55)
    winter_upper = winter_top.crop((0, 0, 96, 55))
    canvas.paste(winter_upper, (0, 0), winter_upper)

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png'
    canvas.save(out, 'PNG')
    print(f'saved {out}  {canvas.size}')

    # 验证底座实心度
    arr = np.array(canvas)
    region = arr[55:90, 10:90, 3]
    print(f'新 WinterMelon 底座区域 (y55-90, x10-90): 实心={ (region==255).sum() } 透明={ (region==0).sum() } 占比={ (region==255).sum()/region.size:.1%}')

    # 内部空洞检查（flood fill）
    from collections import deque
    alpha = arr[:, :, 3]
    transparent = alpha == 0
    visited = np.zeros_like(transparent, dtype=bool)
    q = deque()
    h, w = arr.shape[:2]
    for x in range(w):
        if transparent[0, x] and not visited[0, x]: q.append((0, x)); visited[0, x] = True
        if transparent[h-1, x] and not visited[h-1, x]: q.append((h-1, x)); visited[h-1, x] = True
    for y in range(h):
        if transparent[y, 0] and not visited[y, 0]: q.append((y, 0)); visited[y, 0] = True
        if transparent[y, w-1] and not visited[y, w-1]: q.append((y, w-1)); visited[y, w-1] = True
    while q:
        y, x = q.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and transparent[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True; q.append((ny, nx))
    holes = transparent & ~visited
    print(f'内部空洞: {holes.sum()}')


if __name__ == '__main__':
    main()