"""
修复 WinterMelon.png 底座（y>=55）镂空：
- 底座 alpha 用 MelonPult.png 的底座（同款投石车，60.6% 实心）
- 颜色用 MelonPult 底座色做冰色化（绿 -> 冰蓝）
- 上半（冰西瓜+冰柱）保持当前 WinterMelon 不动
"""
import numpy as np
from PIL import Image
from collections import deque


def grass_to_ice_color(rgb):
    """把绿色调转冰蓝：r*0.5, g*0.85, b*1.3+25"""
    r, g, b = rgb
    return (
        int(r * 0.5),
        int(g * 0.85),
        min(255, int(b * 1.3 + 25))
    )


def main():
    wm = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png').convert('RGBA')
    mp = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png').convert('RGBA')

    wm_arr = np.array(wm)
    mp_arr = np.array(mp)
    h, w = wm_arr.shape[:2]

    # 底座区域：y >= 55
    for y in range(55, h):
        for x in range(w):
            mp_a = mp_arr[y, x, 3]
            if mp_a > 0:
                # 用 MelonPult 底座的 alpha 覆盖
                # 颜色：MelonPult 底座色 -> 冰色化
                mr, mg, mb = mp_arr[y, x, 0], mp_arr[y, x, 1], mp_arr[y, x, 2]
                wm_arr[y, x, 0], wm_arr[y, x, 1], wm_arr[y, x, 2] = grass_to_ice_color((mr, mg, mb))
                wm_arr[y, x, 3] = 255

    # 过渡带（y=50-55）：MelonPult 有 alpha 的也补上（平滑衔接）
    for y in range(50, 55):
        for x in range(w):
            if mp_arr[y, x, 3] > 0 and wm_arr[y, x, 3] == 0:
                mr, mg, mb = mp_arr[y, x, 0], mp_arr[y, x, 1], mp_arr[y, x, 2]
                wm_arr[y, x, 0], wm_arr[y, x, 1], wm_arr[y, x, 2] = grass_to_ice_color((mr, mg, mb))
                wm_arr[y, x, 3] = 255

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png'
    Image.fromarray(wm_arr, 'RGBA').save(out, 'PNG')
    print(f'saved {out}')

    # 验证
    region = wm_arr[55:90, 10:90, 3]
    print(f'底座区域 (y55-90, x10-90): 实心={ (region==255).sum() } 透明={ (region==0).sum() } 占比={ (region==255).sum()/region.size:.1%}')

    # 内部空洞检查
    alpha = wm_arr[:, :, 3]
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
    print(f'内部空洞: {holes.sum()}')


if __name__ == '__main__':
    main()