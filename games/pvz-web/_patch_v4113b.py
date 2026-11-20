#!/usr/bin/env python3
# v4.0.113 补丁 2：把「墙内救援」从 path 非空块挪到 AI 循环开头（path 为 null 时原来根本不会触发）
import io, sys
P = 'js/HauntedDorm.js'
src = io.open(P, encoding='utf-8').read()

RESCUE = """                // v4.0.113：万一人已经站在墙格里（历史穿墙/被新砌的墙包住）——先把人请到最近的空地，
                // 否则它会从墙体内部踩着墙走出去，视觉上依然是「穿墙」。
                {
                    const wc = Math.floor(ai.x / this.gridSize), wr = Math.floor(ai.y / this.gridSize);
                    if (this.walls.has(wc + ',' + wr)) {
                        let bestSpot = null, bestD = Infinity;
                        for (let rad = 1; rad <= 4 && !bestSpot; rad++) {
                            for (let dx = -rad; dx <= rad; dx++) {
                                for (let dy = -rad; dy <= rad; dy++) {
                                    if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
                                    const nc = wc + dx, nr = wr + dy;
                                    if (nc < 1 || nr < 1 || nc >= this.cols - 1 || nr >= this.rows - 1) continue;
                                    if (this.walls.has(nc + ',' + nr)) continue;
                                    const px = nc * this.gridSize + 40, py = nr * this.gridSize + 40;
                                    const d = Math.hypot(px - ai.x, py - ai.y);
                                    if (d < bestD) { bestD = d; bestSpot = { x: px, y: py }; }
                                }
                            }
                        }
                        if (bestSpot) {
                            ai.x = bestSpot.x; ai.y = bestSpot.y;
                            const fixP = this._pathToBed(ai.x, ai.y, ai.targetRoom || ai.room);
                            ai.path = (fixP && fixP.length > 0) ? fixP : null;
                        }
                    }
                }
"""

# 1) 删除原位置（在 path 非空块里）
old_block = RESCUE
assert src.count(old_block) == 1, 'rescue block not found'
src = src.replace(old_block, '')

# 2) 插入 AI 循环开头（紧跟在 _jumpFly 跳过之后）
anchor = """        for (const ai of hostList) {
            if (ai.dead) continue;
            if (ai._jumpFly) continue; // v4.0.74：跳板飞行中 AI 不寻路不行动
"""
assert src.count(anchor) == 1, 'anchor count=%d' % src.count(anchor)
new_anchor = anchor + RESCUE.replace('\n                ', '\n            ').replace('                // v4.0.113', '            // v4.0.113', 1)
# 上面的缩进替换只处理首行；统一用左移 4 空格的版本更稳妥
lines = RESCUE.rstrip('\n').split('\n')
shifted = '\n'.join([l[4:] if l.startswith('    ') else l for l in lines]) + '\n'
new_anchor = anchor + shifted
src = src.replace(anchor, new_anchor)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK 救援块已前移到 AI 循环开头')
