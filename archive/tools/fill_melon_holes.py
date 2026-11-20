"""
修复 PVZ1 原版 sprite 抠图时误扣的"身体内部空洞"。
- MelonPult.png: 741 个空洞（投石车绿色底座被草色键控误扣）
- WinterMelon.png: 28 个空洞（冰西瓜身体高光被误扣）

方法：flood fill 从边缘找"真背景"透明区域，剩下的透明像素 = 内部空洞，
把空洞填回原图颜色 + alpha=255。
"""
import numpy as np
from PIL import Image
from collections import deque


def fill_holes(path, out_path=None):
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    alpha = arr[:, :, 3]
    transparent = alpha == 0

    # BFS flood fill 从边缘：连通边缘的透明 = 真背景
    visited = np.zeros_like(transparent, dtype=bool)
    q = deque()
    for x in range(w):
        if transparent[0, x] and not visited[0, x]:
            q.append((0, x)); visited[0, x] = True
        if transparent[h-1, x] and not visited[h-1, x]:
            q.append((h-1, x)); visited[h-1, x] = True
    for y in range(h):
        if transparent[y, 0] and not visited[y, 0]:
            q.append((y, 0)); visited[y, 0] = True
        if transparent[y, w-1] and not visited[y, w-1]:
            q.append((y, w-1)); visited[y, w-1] = True

    while q:
        y, x = q.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and transparent[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    # 内部空洞：透明 且 不连通边缘
    holes = transparent & ~visited
    n_holes = int(holes.sum())
    if n_holes > 0:
        # 填回原图颜色，alpha=255
        new_arr = arr.copy()
        new_arr[holes, 3] = 255  # 恢复不透明
        # 原色已经在 arr 里保留了（抠图只改了 alpha），所以 RGB 不用动
        img2 = Image.fromarray(new_arr, 'RGBA')
    else:
        img2 = img

    out = out_path or path
    img2.save(out, 'PNG')
    print(f'{path.split("/")[-1]}: 修复 {n_holes} 个内部空洞 -> saved {out}')


fill_holes('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png')
fill_holes('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png')