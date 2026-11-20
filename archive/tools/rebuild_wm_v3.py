"""
从 Winter_Melon1.png 抠出纯净的"冰柱 + 冰蓝圆球"：
- 草：亮绿 (g-r>100 AND b<60) —— 只抠草，保留冰蓝球(b>150)和冰柱
- 不掺入 MelonPult 的任何像素
- flood-fill 填内部洞（用周围颜色均值）
"""
import numpy as np
from PIL import Image
from collections import deque


def main():
    winter = Image.open('/tmp/wg3/Winter_Melon1.png').convert('RGBA')
    arr = np.array(winter)
    h, w = arr.shape[:2]

    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3].copy()

    # 抠草：g-r > 100 且 b < 60（亮黄绿草），保留冰蓝球/冰柱（b 高）
    grass = (g - r > 100) & (b < 60) & (a > 0)
    a[grass] = 0
    arr[:, :, 3] = a

    # 填内部空洞（被不透明像素包围的透明区域 → 周围颜色均值）
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

    # 边缘羽化：把孤立的半透明边缘清理掉（简化：只保留 alpha>=200 为主，其余按原值）
    out = '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png'
    Image.fromarray(arr, 'RGBA').save(out, 'PNG')
    print(f'saved {out}')

    # 验证
    a2 = arr[:, :, 3]
    print(f'实心: {(a2==255).sum()} 透明: {(a2==0).sum()} 半透明: {((a2>0)&(a2<255)).sum()}')
    # 右下角区域：应该是透明（草被抠掉）或少量蓝球
    region = arr[55:90, 40:96]
    rr = region[:,:,0].astype(int); rg = region[:,:,1].astype(int); rb = region[:,:,2].astype(int)
    blue = (rb > rr + 40) & (rb > 150) & (region[:,:,3]>0)
    green = (rg > rr + 30) & (rg > rb + 20) & (region[:,:,3]>0)
    print(f'右下角: 蓝色={blue.sum()} 绿色={green.sum()} 透明={(region[:,:,3]==0).sum()}')


if __name__ == '__main__':
    main()