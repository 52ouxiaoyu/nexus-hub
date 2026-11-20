"""
修复冰西瓜子弹（MelonPult/WinterMelon.png 64x64）底部空洞：
用周围非透明像素的平均色填充（避免原色(0,0,0)黑点）。
同时重新验证植物图无空洞。
"""
import numpy as np
from PIL import Image
from collections import deque


def fill_holes_with_surround(path, out_path=None):
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    alpha = arr[:, :, 3]
    transparent = alpha == 0

    # BFS 找真背景
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
    if n == 0:
        print(f'{path.split("/")[-1]}: 无内部空洞')
        return

    # 迭代填充：每轮填一层（用邻居的非透明色）
    work = arr.copy()
    for _ in range(max(h, w)):
        ys, xs = np.where(holes)
        if len(ys) == 0:
            break
        filled = []
        for y, x in zip(ys, xs):
            colors = []
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < h and 0 <= nx < w and work[ny, nx, 3] > 0:
                        colors.append(work[ny, nx, :3])
            if colors:
                avg = tuple(int(np.mean([c[i] for c in colors])) for i in range(3))
                work[y, x, :3] = avg
                work[y, x, 3] = 255
                filled.append((y, x))
        for y, x in filled:
            holes[y, x] = False
        if not filled:
            break

    out = out_path or path
    Image.fromarray(work, 'RGBA').save(out, 'PNG')
    print(f'{path.split("/")[-1]}: 填补 {n} 个空洞 -> saved {out}')


# 子弹
fill_holes_with_surround(
    '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/WinterMelon.png')

# 植物（验证无空洞）
from PIL import Image as I2
import numpy as np
img = I2.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png').convert('RGBA')
arr = np.array(img)
print('WinterMelon 植物: alpha=0:', (arr[:,:,3]==0).sum(), 'alpha=255:', (arr[:,:,3]==255).sum())

# 小尺寸子弹同步
fill_holes_with_surround(
    '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/WinterMelon_small.png')