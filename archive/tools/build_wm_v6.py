"""
WinterMelon 最终造型（v3.2.15-wmsolo）：
- 用户澄清：说的是冰西瓜不是西瓜；西瓜恢复原版不动。
- 冰西瓜要求：一个头（一个冰球）+ 托篮 + 投篮装置（投石臂）+ 下半身底座。
- 顶部冰柱带绿色残留 = 视觉"两个头"元凶，清理残留 + 只保留球顶小冰棱。
- 结构（96x96，垂直投石车）：
    冰棱(球顶自带) → 冰球(居中) → 托篮(球底碗形) → 投石臂(斜杆) → 底座(底部)
"""
import numpy as np
from PIL import Image, ImageDraw
from collections import deque


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
    if holes.sum():
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
    return arr


def iceify(arr):
    """把偏绿像素 HSV 色相偏移成冰蓝（绿 h=0.28 -> 蓝 h=0.55），保留明暗。"""
    import colorsys
    out = arr.copy()
    h, w = out.shape[:2]
    for y in range(h):
        for x in range(w):
            r, g, b, a = out[y, x]
            if a == 0:
                continue
            if g > r + 20 and g > b + 10:
                hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, b/255)
                r2, g2, b2 = colorsys.hsv_to_rgb(0.55, min(ss*1.15, 1.0), vv)
                out[y, x, 0] = int(r2*255)
                out[y, x, 1] = int(g2*255)
                out[y, x, 2] = int(b2*255)
    return out


def main():
    src = Image.open('/tmp/wm_v312.png').convert('RGBA')  # v3.2.12 基准
    arr = np.array(src)

    # 1) 大冰球（含顶部小冰棱）：y9-68, x14-82 —— 整个"头"
    ball = src.crop((14, 9, 82, 68))
    ball_arr = np.array(ball)
    ball_arr = iceify(ball_arr)          # 清绿色残留（冰棱区）
    ball = Image.fromarray(ball_arr, 'RGBA').resize((58, 58), Image.LANCZOS)

    # 2) 底座：y63-95, x35-96（v3.2.12 冰色底座）
    base = src.crop((35, 63, 96, 95))
    base_arr = np.array(base)
    base_arr = iceify(base_arr)
    base = Image.fromarray(base_arr, 'RGBA').resize((64, 32), Image.LANCZOS)

    # 组装
    canvas = np.zeros((96, 96, 4), dtype=np.uint8)

    # 底座：底部居中 x16-80, y64-96
    b_arr = np.array(base)
    canvas[64:96, 16:80] = b_arr

    # 球：居中偏上 x19-77, y8-66（球顶小冰棱露在 y8 上方）
    bl_arr = np.array(ball)
    canvas[8:66, 19:77] = bl_arr

    # 托篮（碗形）：包住球底 y56-76
    d = ImageDraw.Draw(Image.fromarray(canvas, 'RGBA'))
    ice_b = (70, 150, 190)    # 篮色
    ice_d = (30, 80, 120)     # 篮深色描边
    d.arc([18, 54, 78, 78], start=0, end=180, fill=ice_b, width=5)
    d.arc([18, 54, 78, 78], start=0, end=180, fill=ice_d, width=2)
    # 篮沿横条（托住球底）
    d.rectangle([20, 64, 76, 67], fill=ice_d)

    # 投石臂（投篮装置）：底座两侧斜杆到篮沿
    d.line([(14, 92), (22, 68)], fill=ice_b, width=5)
    d.line([(82, 92), (74, 68)], fill=ice_b, width=5)
    d.line([(14, 92), (22, 68)], fill=ice_d, width=2)
    d.line([(82, 92), (74, 68)], fill=ice_d, width=2)
    # 底座两条腿
    d.rectangle([24, 90, 30, 95], fill=ice_d)
    d.rectangle([66, 90, 72, 95], fill=ice_d)

    canvas = fill_holes(canvas)
    out = Image.fromarray(canvas, 'RGBA')
    out.save('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png', 'PNG')
    print('saved WinterMelon.png')

    # 验证
    a = canvas[:, :, 3]
    r = canvas[:, :, 0].astype(int); g = canvas[:, :, 1].astype(int); b = canvas[:, :, 2].astype(int)
    opaque = a > 0
    blue = (b > r + 40) & (b > 120) & opaque
    green = (g > r + 30) & (g > b + 20) & opaque
    n = opaque.sum()
    print(f'实心={n} ({n/9216:.0%}), 透明={(a==0).sum()}')
    print(f'蓝色={blue.sum()} ({blue.sum()/n*100:.0f}%), 绿色残留={green.sum()} ({green.sum()/n*100:.0f}%)')
    print('\nalpha 可视化:')
    for y in range(0, 96, 3):
        line = ''
        for x in range(0, 96, 2):
            line += '#' if a[y,x]>200 else ('o' if a[y,x]>0 else '.')
        print(f'{y:3d} {line}')


if __name__ == '__main__':
    main()
