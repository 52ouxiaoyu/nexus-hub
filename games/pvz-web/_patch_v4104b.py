#!/usr/bin/env python3
# v4.0.104 补丁 2/2：僵尸/内鬼阵营玩家的啃咬块泛化为「遍历 P1/P2」——P2 变内鬼后同样能挠门、咬幸存者、回血
import re, sys
P = 'js/HauntedDorm.js'
src = open(P, encoding='utf-8').read()

START = '        // 僵尸阵营玩家啃咬逻辑（v4.0.44：内鬼玩家同享——挠门/咬幸存者/中心回血）\n'
END = '        // 【新增】物资盲盒空投机制\n'
i = src.find(START)
j = src.find(END)
assert i > 0 and j > i, f'markers not found i={i} j={j}'
block = src[i:j]

# 1) 头部条件 → 循环两边玩家
old_head = "        if ((this.isZombieFaction || this.playerTraitor) && !this.player.dead) {\n"
assert block.count(old_head) == 1
new_head = (
"        // v4.0.104：啃咬块泛化——僵尸阵营的 P1 与「内鬼形态的 P1/P2」都走这条链路\n"
"        for (const zp of [this.player, this.player2]) {\n"
"            if (!zp || zp.dead) continue;\n"
"            const zpTraitor = !!zp.traitor;\n"
"            if (!zpTraitor && !(this.isZombieFaction && zp === this.player)) continue;\n"
"            const zpCorrupt = zp.corrupt || 0;\n"
)
block = block.replace(old_head, new_head)

# 2) 变量替换：this.playerTraitor → zpTraitor / this.playerCorrupt → zpCorrupt / this.player. → zp.
block = block.replace('this.playerTraitor', 'zpTraitor')
block = block.replace('this.playerCorrupt', 'zpCorrupt')
block = re.sub(r'this\.player(?![\w.])', 'zp', block)   # this.player2 不受影响（后接数字）
block = block.replace('this.player.', 'zp.')             # 兜底（防上面正则边界）
block = block.replace('this._gainCorrupt()', 'this._gainCorrupt(zp)')

# 3) victims 列表排除自己
old_vic = "const victims = [...this.ais, ...(this.player2 ? [this.player2] : [])];"
assert block.count(old_vic) == 1
block = block.replace(old_vic, "const victims = [...this.ais, this.player, this.player2].filter(v => v && v !== zp);")

# 4) 收尾：原块的内层 if 已闭合成循环体，无需额外括号（head 已开 for，尾部原有 } 闭 for）
src = src[:i] + block + src[j:]
open(P, 'w', encoding='utf-8').write(src)
print('PATCH2 OK')
