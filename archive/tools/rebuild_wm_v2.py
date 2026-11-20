"""
用 Winter_Melon1.png（PVZ1 原版，整体冰色调：冰柱+冰蓝圆西瓜）重建 WinterMelon：
1. 草色键控抠背景
2. 底座区域(y>=55)用 MelonPult 底座 alpha 补回（PVZ1 同款投石车）
3. 底座颜色冰色化
4. flood-fill 填洞
"""
import numpy as np
from PIL import Image
from collections import deque


def grass_to_ice(rgb):
    r, g, b = rgb
    return (int(r*0.5), int(g*0.85), min(255, int(b*1.3+25)))


def main():
    winter = Image.open('/tmp/wg2/Winter_Melon1.png').convert('RGBA')
    mp = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png').convert('RGBA')

    arr = np.array(winter)
    h, w = arr.shape[:2]
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3].copy()

    # 1. 草色键控（r<80 & g-r>100）
    grass = (r < 80) & ((g - r) > 100) & (a > 0)
    a[grass] = 0
    arr[:, :, 3] = a

    # 2. 底座区域补回（y>=50，用 MelonPult alpha + 冰色化颜色）
    mp_arr = np.array(mp)
    for y in range(50, h):
        for x in range(w):
            if mp_arr[y, x, 3] > 0 and arr[y, x, 3] == 0:
                mr, mg, mb = mp_arr[y, x, 0], mp_arr[y, x, 1], mp_arr[y, x, 2]
                arr[y, x, 0], arr[y, x, 1], arr[y, x, 2] = grass_to_ice((mr, mg, mb))
                arr[y, x, 3] = 255
            elif mp_arr[y, x, 3] > 0:
                # 保留 Winter 的颜色（如果本身不透明）
                pass

    # 3. flood-fill 填内部空洞
    alpha = arr[:, :, 3]
    transparent = alpha == 0
    visited = np.zeros_like(transparent, dtype=bool)
    q = deque()
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
    print('内部空洞:', holes.sum())
    if holes.sum() > 0:
        work = arr.copy()
        for _ in range(max(h, w)):
            ys, xs = np.where(holes)
            if len(ys) == 0: break
            filled = []
            for y, x in zip(ys, xs):
                colors = []
                for dy in (-1,0,1):
                    for dx in (-1,0,1):
                        if dy==0 and dx==0: continue
                        ny, nx = y+dy, x+dx
                        if 0 <= ny < h and 0 <= nx < w and work[ny,nx,3] > 0:
                            colors.append(work[ny,nx,:3])
                if colors:
                    avg = tuple(int(np.mean([c[i] for c in colors])) for i in range(3))
                    work[y,x,:3] = avg; work[y,x,3] = 255
                    filled.append((y,x))
            for y,x in filled: holes[y,x] = False
            if not filled: break
        arr = work

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png'
    Image.fromarray(arr, 'RGBA').save(out, 'PNG')
    print(f'saved {out}')

    # 验证
    alpha2 = arr[:, :, 3]
    print(f'实心: {(alpha2==255).sum()} 透明: {(alpha2==0).sum()} 半透明: {((alpha2>0)&(alpha2<255)).sum()}')
    region = arr[55:90, 10:90, 3]
    print(f'底座实心占比: {(region==255).sum()/region.size:.1%}')
    # 采样颜色
    print('西瓜区(50,40):', arr[40, 50][:3], ' 冰柱区(25,20):', arr[20, 25][:3], ' 底座(50,70):', arr[70, 50][:3])


if __name__ == '__main__':
    main()