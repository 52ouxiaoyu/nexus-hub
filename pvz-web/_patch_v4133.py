# -*- coding: utf-8 -*-
"""v4.0.133 主菜单封面换图：融合卡火炬树桩 / 经典冒险猫尾草 / 双人寒冰豌豆 / 小游戏毁灭菇
全部替换先断言唯一，任一失败零写入。"""
import io, sys

P = '/Users/clawbox/nexus-hub/pvz-web/index.html'
s = io.open(P, encoding='utf-8').read()
orig = s
reps = []


def rep(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '[%s] 出现 %d 次（应为 1）' % (tag, n)
    reps.append((old, new, tag))


# 1) 融合进化卡：豌豆射手 + 樱桃炸弹 → 豌豆射手 + 火炬树桩（游戏里确有 fusion_peashooter_torchwood=火焰射手）
rep('<img class="img-b" src="assets/images/Plants/CherryBomb/0.gif" alt="樱桃炸弹">',
    '<img class="img-b" src="assets/images/Plants/Torchwood/0.gif" alt="火炬树桩">',
    'fusion-imgb')

# 同处旧注释同步
rep('/* v3.13.0：封面改用静止态樱桃炸弹（倭瓜是竖长图，压到 58px 后太窄显小） */',
    '/* v4.0.133：封面第二植物改为火炬树桩（豌豆+火炬=火焰射手，配方真实可查） */',
    'fusion-comment')

# 2) 经典冒险：向日葵 → 猫尾草
rep('<img src="assets/images/Plants/SunFlower/0.gif" alt="向日葵" class="solo">',
    '<img src="assets/images/Plants/Cattail/Cattail.gif" alt="猫尾草" class="solo">',
    'adventure-cattail')

# 3) 双人对战：豌豆射手 → 寒冰豌豆
rep('<img class="vs-p" src="assets/images/Plants/Peashooter/0.gif" alt="植物方">',
    '<img class="vs-p" src="assets/images/Plants/SnowPea/0.gif" alt="寒冰豌豆">',
    'vs-snowpea')

# 4) 小游戏卡最右：樱桃炸弹 → 毁灭菇
rep('<img class="mg-c" src="assets/images/Plants/CherryBomb/0.gif" alt="樱桃炸弹">',
    '<img class="mg-c" src="assets/images/Plants/DoomShroom/0.gif" alt="毁灭菇">',
    'mini-doom')

for old, new, tag in reps:
    s = s.replace(old, new)

assert s != orig
io.open(P, 'w', encoding='utf-8').write(s)
print('已写入 index.html：')
for _, _, tag in reps:
    print('  ✓', tag)
