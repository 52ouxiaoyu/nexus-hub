"""
MelonPult / WinterMelon 最终造型：
- 去掉 MelonPult 的小虫（第二个头），只留一个球
- 垂直布局：球在上中央、托篮托住球、底座在下
- 投石臂：从底座两侧向上伸出的斜杆（投篮装置）
- WinterMelon 同结构 + 冰色 + 顶部冰柱
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


def build_trebuchet(ball_img, base_img, base_color, is_winter=False, icicle=None):
    """组装：球(上) + 托篮 + 投石臂 + 底座(下)"""
    canvas = np.zeros((96, 96, 4), dtype=np.uint8)

    # 1. 底座（底部居中）——原图底座区域 (x30-96, y55-96) 缩放到底部
    base_resized = base_img.resize((78, 36), Image.LANCZOS)
    base_arr = np.array(base_resized)
    canvas[60:96, 9:87] = base_arr

    # 2. 球（居中偏上）
    ball_resized = ball_img.resize((56, 56), Image.LANCZOS)
    ball_arr = np.array(ball_resized)
    canvas[4:60, 20:76] = ball_arr

    # 3. 托篮（球底部 y58-68，碗形）+ 投石臂
    d = ImageDraw.Draw(Image.fromarray(canvas, 'RGBA'))
    bc = base_color  # (r, g, b)
    dark = tuple(max(0, c-50) for c in bc)
    # 托篮：球底部的弧形碗
    d.arc([20, 50, 76, 74], start=0, end=180, fill=bc, width=5)
    # 篮沿
    d.arc([20, 50, 76, 74], start=0, end=180, fill=dark, width=2)
    # 投石臂：从底座两侧向上斜伸到篮沿
    d.line([(14, 92), (20, 62)], fill=bc, width=5)   # 左臂
    d.line([(82, 92), (76, 62)], fill=bc, width=5)   # 右臂
    d.line([(14, 92), (20, 62)], fill=dark, width=2)
    d.line([(82, 92), (76, 62)], fill=dark, width=2)
    # 底座两腿
    d.rectangle([16, 88, 24, 94], fill=dark)
    d.rectangle([72, 88, 80, 94], fill=dark)

    # 冰西瓜：顶部冰柱
    if is_winter and icicle is not None:
        ic_resized = icicle.resize((26, 26), Image.LANCZOS)
        ic_arr = np.array(ic_resized)
        # 放到球顶 (x=35-61, y=0-26)
        for y in range(26):
            for x in range(26):
                if ic_arr[y, x, 3] > 0:
                    cy, cx = y - 2, x + 35
                    if 0 <= cy < 96 and 0 <= cx < 96:
                        canvas[cy, cx] = ic_arr[y, x]

    canvas = fill_holes(canvas)
    return Image.fromarray(canvas, 'RGBA')


def main():
    mp = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png').convert('RGBA')
    wm = Image.open('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png').convert('RGBA')

    # MelonPult：球(y2-36 x0-30，去掉虫) + 底座(y55-96 x30-96)
    mp_arr = np.array(mp)
    # 球区域（绿色，不含虫）：y0-37, x0-30
    ball_mp = mp.crop((0, 0, 30, 37))
    # 底座区域：y55-96, x30-96
    base_mp = mp.crop((30, 55, 96, 96))
    mp_new = build_trebuchet(ball_mp, base_mp, (90, 150, 50))
    mp_new.save('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png', 'PNG')
    print('saved MelonPult')

    # WinterMelon：球(y9-61 x22-73) + 底座(y63-93 x45-96) + 冰柱(y0-26 x35-61)
    ball_wm = wm.crop((22, 9, 73, 61))
    base_wm = wm.crop((45, 63, 96, 93))
    icicle = wm.crop((35, 0, 61, 26))
    wm_new = build_trebuchet(ball_wm, base_wm, (80, 170, 210), is_winter=True, icicle=icicle)
    wm_new.save('/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png', 'PNG')
    print('saved WinterMelon')

    # 验证
    for name, path in [('MelonPult', '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/MelonPult/MelonPult.png'),
                       ('WinterMelon', '/Users/clawbox/nexus-hub/pvz-web/assets/images/Plants/WinterMelon/WinterMelon.png')]:
        arr = np.array(Image.open(path).convert('RGBA'))
        a = arr[:, :, 3]
        print(f'{name}: 实心={(a==255).sum()} 透明={(a==0).sum()} 半透明={((a>0)&(a<255)).sum()}')


if __name__ == '__main__':
    main()