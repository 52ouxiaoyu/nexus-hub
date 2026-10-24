# -*- coding: utf-8 -*-
"""v4.0.111：守屋大作战豌豆系后期伤害下调（曲线 t10 起由 ×2 放缓为 ×1.85）
用户：后期的豌豆伤害有点太高，稍微降低一点。
做法：tier 1~9 完全不动（开局手感不变），tier 10~16 每级倍率 ×2 → ×1.85，
      终级 32768 → 19300（单发降 41%），单株杀 Lv.10 巨人从 0.6s → 1.1s。
"""
import io, re, sys

P = 'js/HauntedDorm.js'
src = io.open(P, encoding='utf-8').read()
orig = src

# key, 旧 dmg, 新 dmg
CHANGES = [
    ('melonpult',     512,   480),    # tier10 西瓜投手
    ('wintermelon',   1024,  890),    # tier11 冰西瓜投手
    ('cattail',       2048,  1650),   # tier12 猫尾草
    ('superbox',      4096,  3050),   # tier13 超级机箱
    ('machinestail',  8192,  5650),   # tier14 机箱猫尾草
    ('melonstail',    16384, 10450),  # tier15 西瓜猫尾草
    ('icemelonstail', 32768, 19300),  # tier16 冰西瓜猫尾草
]

for key, old_dmg, new_dmg in CHANGES:
    m = re.search(r"\n {12}" + key + r":\s*\{ tier: (\d+),", src)
    assert m, '定位失败: ' + key
    tier = m.group(1)
    seg_start = m.end()
    seg = src[seg_start: seg_start + 1200]
    needle = 'shoot: { dmg: %d,' % old_dmg
    assert seg.count(needle) == 1, '%s(tier%s) 内 %r 出现 %d 次' % (key, tier, needle, seg.count(needle))
    off = seg_start + seg.index(needle)
    src = src[:off] + ('shoot: { dmg: %d,' % new_dmg) + src[off + len(needle):]
    print('  ✓ %-14s tier%-3s dmg %5d → %5d' % (key, tier, old_dmg, new_dmg))

# 1. 更新链条注释
old_c = '//      西瓜投手→冰西瓜投手→猫尾草→超级机箱→机箱猫尾草→西瓜猫尾草→冰西瓜猫尾草；伤害 1→32768 翻倍、射程 3→8 格) ——'
new_c = ('//      西瓜投手→冰西瓜投手→猫尾草→超级机箱→机箱猫尾草→西瓜猫尾草→冰西瓜猫尾草；伤害 1→19300、射程 3→8 格)\n'
         '            //      v4.0.111：tier1~9 保持每级 ×2（1→256，开局手感不变），tier10 起放缓为每级 ×1.85\n'
         '            //      （480→890→1650→3050→5650→10450→19300），终级单发降 41%、单株杀 Lv.10 巨人 0.6s→1.1s。\n'
         '            //      用户反馈「后期豌豆伤害太高」——只放缓后段倍率，不动弹数/射速，前期曲线零改动) ——')
assert src.count(old_c) == 1, '注释锚点 %d 处' % src.count(old_c)
src = src.replace(old_c, new_c)

assert src != orig
io.open(P, 'w', encoding='utf-8').write(src)
print('已写入', P)
