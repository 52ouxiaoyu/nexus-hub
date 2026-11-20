"""
WinterMelon 最终版：与 MelonPult 同布局（圆球居中 + 顶部冰柱 + 底部冰色底座）
1. 从 Winter_Melon1 抠出"冰柱"(左上) + "冰蓝圆球"(右下)
2. 重排：圆球居中（对齐 MelonPult 圆球位置），冰柱在球顶
3. 底部补投石车底座（MelonPult 底座 alpha + 冰色化）——底座是结构不是西瓜
4. 填洞
"""
import numpy as np
from PIL import Image
from collections import deque


def grass_to_ice(rgb):
    r, g, b = rgb
    return (int(r*0.5), int(g*0.85), min(255, int(b*1.3+25)))


def fill_holes(arr):
    h, w = arr.shape[:2]
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
    n = int(holes.sum())
    if n:
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
    return arr, n


def main():
    winter = Image.open('/tmp/wg3/Winter_Melon1.png').convert('RGBA')
    mp = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png').convert('RGBA')

    arr = np.array(winter)
    h, w = arr.shape[:2]
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3].copy()

    # 1. 抠草（亮绿草 b<60），保留冰柱/圆球（b 高）
    grass = (g - r > 100) & (b < 60) & (a > 0)
    a[grass] = 0
    arr[:, :, 3] = a
    # 先填洞（保留原始位置）
    arr, _ = fill_holes(arr)

    # 2. 提取"冰柱"(x0-50, y0-58) 和 "圆球"(x40-96, y50-92) 两个区域
    icicle = arr[0:60, 0:52].copy()      # 冰柱（左上）
    sphere = arr[48:96, 40:96].copy()    # 圆球（右下）

    # 3. 新建画布：圆球居中 + 冰柱在球顶 + 底座底部
    canvas = np.zeros((96, 96, 4), dtype=np.uint8)

    # 圆球贴到 (20, 22) 位置（MelonPult 圆球在 (48,36)，中心约 (20,14)-(76,58)）
    # 圆球源区域是 48x48（x40-96, y48-96），缩放到 50x50 放中央
    sphere_img = Image.fromarray(sphere, 'RGBA').resize((50, 50), Image.LANCZOS)
    sphere_arr = np.array(sphere_img)
    canvas[18:68, 23:73] = sphere_arr  # 圆球中心约 (48,43)

    # 冰柱贴到球顶（x23-73 上半，覆盖球顶 y8-30）
    icicle_img = Image.fromarray(icicle, 'RGBA').resize((50, 32), Image.LANCZOS)
    icicle_arr = np.array(icicle_img)
    # 冰柱放在球顶上方
    for y in range(32):
        for x in range(50):
            if icicle_arr[y, x, 3] > 0 and canvas[8+y, 23+x, 3] == 0:
                canvas[8+y, 23+x] = icicle_arr[y, x]

    # 4. 底座（y>=62）：MelonPult 底座 alpha + 冰色化
    mp_arr = np.array(mp)
    for y in range(62, h):
        for x in range(w):
            if mp_arr[y, x, 3] > 0:
                mr, mg, mb = mp_arr[y, x, 0], mp_arr[y, x, 1], mp_arr[y, x, 2]
                canvas[y, x, 0], canvas[y, x, 1], canvas[y, x, 2] = grass_to_ice((mr, mg, mb))
                canvas[y, x, 3] = 255

    # 5. 填洞
    canvas, n_holes = fill_holes(canvas)

    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png'
    Image.fromarray(canvas, 'RGBA').save(out, 'PNG')
    print(f'saved {out}  填洞: {n_holes}')

    # 验证
    a2 = canvas[:, :, 3]
    print(f'实心: {(a2==255).sum()} 透明: {(a2==0).sum()}')
    region = canvas[55:90, 40:96, 3]
    print(f'右下角区域实心占比: {(region==255).sum()/region.size:.1%}')
    # 圆球颜色
    print('圆球(45,40):', canvas[40,45][:3], ' 冰柱(25,15):', canvas[15,25][:3], ' 底座(70,45):', canvas[70,45][:3])


if __name__ == '__main__':
    main()