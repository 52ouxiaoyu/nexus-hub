# v4.0.118：新增融合植物「寒冰高坚果」= 寒冰射手 + 高坚果（高坚果造型 + 冰蓝，啃它的人被冻慢）
#   动机（用户）："我发现还有一个叫做寒冰高坚果的东西，我这里也没有出现。我这里只有一个叫做寒冰坚果，但是它的样子不是高坚果。"
#   → 图鉴/融合系统里补上高坚果版本的冰系坚果；守屋坚果链第 8 级名字改回「寒冰高坚果」（它的立绘本来就是 TallNut）
import io

# ---------- 1) Plant.js：trait 映射 + 渲染分支 ----------
P = 'js/entities/Plant.js'
s = io.open(P, encoding='utf-8').read()


def rep(src, old, new, tag):
    assert src.count(old) == 1, (tag, src.count(old))
    print('OK', tag)
    return src.replace(old, new)


s = rep(s,
        "            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }",
        "            else if (type === 'fusion_snownut') { p1 = 'snowpea'; p2 = 'wallnut'; }\n"
        "            else if (type === 'fusion_snowtallnut') { p1 = 'snowpea'; p2 = 'tallnut'; } // v4.0.118 寒冰高坚果：寒冰射手+高坚果",
        'plant trait map')

s = rep(s,
        """                } else if (type === 'fusion_snownut') {
                    // Wallnut colored ice blue
                    this.element.src = s2.src; // wallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay""",
        """                } else if (type === 'fusion_snownut') {
                    // Wallnut colored ice blue
                    this.element.src = s2.src; // wallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none'; // hide overlay
                } else if (type === 'fusion_snowtallnut') {
                    // v4.0.118 寒冰高坚果：高坚果本体染冰蓝（与寒冰坚果同色系，但保留高坚果身高）
                    this.element.src = s2.src; // tallnut
                    this.element.style.filter = 'hue-rotate(180deg) saturate(1.5) brightness(1.2)';
                    this.fusionOverlay.style.display = 'none';""",
        'plant render branch')
io.open(P, 'w', encoding='utf-8').write(s)

# ---------- 2) GameLoop.js ----------
P = 'js/GameLoop.js'
s = io.open(P, encoding='utf-8').read()

# 2a. PVZ_FUSION_EXTRA 表：紧跟冰系补全的第一条前插入
s = rep(s,
        """const PVZ_FUSION_EXTRA = [
    // —— 冰系补全（与寒冰卷心菜同门，均带【极寒波动】大技能）——""",
        """const PVZ_FUSION_EXTRA = [
    // v4.0.118：寒冰高坚果——寒冰射手+高坚果（高坚果造型染冰蓝，比寒冰坚果更厚）
    { type: 'fusion_snowtallnut', a: 'tallnut', b: 'snowpea', name: '寒冰高坚果', md: 119,
      look: { base: 'assets/images/Plants/TallNut/TallNut.gif', bf: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)' },
      t: '高坚果+寒冰射手：8000 血肉盾，啃它的人被冻慢；大技能【极寒波动】' },
    // —— 冰系补全（与寒冰卷心菜同门，均带【极寒波动】大技能）——""",
        'fusion extra entry')

# 2b. 名称映射
s = rep(s,
        "fusion_sporemine: '孢子地雷', fusion_spikynut: '地刺坚果', fusion_snownut: '寒冰坚果',",
        "fusion_sporemine: '孢子地雷', fusion_spikynut: '地刺坚果', fusion_snownut: '寒冰坚果',\n            fusion_snowtallnut: '寒冰高坚果',",
        'fusion name map')

# 2c. 配方判定（放在 wallnut+snowpea 之后，避免被抢）
s = rep(s,
        "        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';",
        "        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';\n"
        "        if (set.has('tallnut') && set.has('snowpea')) return 'fusion_snowtallnut'; // v4.0.118 寒冰高坚果（高坚果版的冰坚果）",
        'fusion rule')

# 2d. 卡面 parts
s = rep(s,
        "            fusion_snownut: ['wallnut', 'snowpea'],",
        "            fusion_snownut: ['wallnut', 'snowpea'],\n            fusion_snowtallnut: ['tallnut', 'snowpea'],",
        'card parts')

io.open(P, 'w', encoding='utf-8').write(s)

# 2e. 池子：按行号逐行插入（'fusion_snownut', 在池子里出现多次，逐行处理最稳）
lines = io.open(P, encoding='utf-8').read().split('\n')
hits = 0
for i, l in enumerate(lines):
    if "'fusion_snownut'," in l and "'fusion_snowtallnut'" not in l:
        lines[i] = l.replace("'fusion_snownut',", "'fusion_snownut', 'fusion_snowtallnut',", 1)
        hits += 1
assert hits == 5, hits
io.open(P, 'w', encoding='utf-8').write('\n'.join(lines))
print('OK 池子插入', hits, '处')

# ---------- 3) HelpGuide.js：图鉴融合区加一条 ----------
P = 'js/HelpGuide.js'
s = io.open(P, encoding='utf-8').read()
s = rep(s,
        "        { n: '寒冰坚果', base: PL + 'WallNut/WallNut.gif', bf: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', md: 73, t: '坚果墙+寒冰射手：啃它的人被冻慢' },",
        "        { n: '寒冰坚果', base: PL + 'WallNut/WallNut.gif', bf: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', md: 73, t: '坚果墙+寒冰射手：啃它的人被冻慢' },\n"
        "        { n: '寒冰高坚果', base: PL + 'TallNut/TallNut.gif', bf: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', md: 119, t: '高坚果+寒冰射手：8000 血肉盾 + 冻慢啃它的人；大技能【极寒波动】' },",
        'help guide entry')
io.open(P, 'w', encoding='utf-8').write(s)

# ---------- 4) HauntedDorm.js：守屋坚果链第 8 级改回「寒冰高坚果」 ----------
P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()
s = rep(s,
        "            nutlv8:        { tier: 8,  name: '寒冰坚果', img: 'Plants/TallNut/TallNut.gif',         hp: 67500,  cost: 0, // v4.0.116：寒冰高坚果→已有融合植物「寒冰坚果」",
        "            nutlv8:        { tier: 8,  name: '寒冰高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 67500,  cost: 0, // v4.0.118：立绘本就是高坚果 → 名字改回「寒冰高坚果」（融合植物，寒冰射手+高坚果）",
        'dorm nutlv8 name')
io.open(P, 'w', encoding='utf-8').write(s)
print('全部写盘完成')
