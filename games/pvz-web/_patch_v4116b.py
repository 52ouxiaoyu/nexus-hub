import io
P = 'js/HauntedDorm.js'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(old, new):
    global s
    c = s.count(old)
    assert c == 1, '锚点命中 %d 次:\n%s' % (c, old[:140])
    s = s.replace(old, new)

# ============ 阳光系 ============
# 大阳光菇 → 阳光小喷菇（融合：阳光菇+小喷菇）
rep("""            bigsunshroom:  { tier: 2, name: '大阳光菇', img: 'Plants/SunShroom/0.gif',   hp: 1500, cost: 0, scale: 1.2, nightOnly: true,""",
    """            bigsunshroom:  { tier: 2, name: '阳光小喷菇', img: 'Plants/PuffShroom/PuffShroom.gif', hp: 1500, cost: 0, scale: 1.15, nightOnly: true, // v4.0.116：大阳光菇→已有融合植物「阳光小喷菇」
                             tint: 'sepia(1) saturate(2.6) hue-rotate(-8deg) brightness(1.25)',""")

# 水晶向日葵 → 冰晶向日葵（融合：向日葵+寒冰菇）
rep("""            crystalsunflower:{ tier: 9, name: '水晶向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 16000, cost: 0, scale: 1.25, // v4.0.53：新——冰蓝水晶质感多头
                             tint: 'hue-rotate(180deg) saturate(1.6) brightness(1.3) drop-shadow(0 0 8px #7fd8ff)',
                             overlay: 'Plants/TwinSunflower/TwinSunflower1.gif',
                             overTransform: 'translate(-50%, -50%) translate(10px, 6px) scaleX(-1) scale(1.15)',""",
    """            crystalsunflower:{ tier: 9, name: '冰晶向日葵',img: 'Plants/SunFlower/SunFlower1.gif', hp: 16000, cost: 0, scale: 1.2, // v4.0.116：水晶向日葵→已有融合植物「冰晶向日葵」（向日葵+寒冰菇）
                             tint: 'hue-rotate(150deg) saturate(1.5) brightness(1.15)',""")

# 魅惑向日葵（同名，外观对齐融合植物）
rep("""            charmsunflower:{ tier: 10, name: '魅惑向日葵',img: 'Plants/TwinSunflower/TwinSunflower1.gif', hp: 20000, cost: 0, scale: 1.35, // v4.0.53：新——粉紫魅惑光晕多头
                             tint: 'hue-rotate(290deg) saturate(1.8) brightness(1.15) drop-shadow(0 0 10px #ff9de0)',
                             overlay: 'Plants/TwinSunflower/TwinSunflower1.gif',
                             overTransform: 'translate(-50%, -50%) translate(10px, 6px) scaleX(-1) scale(1.15)',""",
    """            charmsunflower:{ tier: 10, name: '魅惑向日葵',img: 'Plants/SunFlower/SunFlower1.gif', hp: 20000, cost: 0, scale: 1.25, // v4.0.116：就是融合植物「魅惑向日葵」（魅惑菇+向日葵），外观对齐
                             tint: 'hue-rotate(290deg) saturate(1.5) brightness(1.08)',""")

# 石芒杨桃 → 十芒杨桃（融合：杨桃+杨桃）
rep("""            stonestarfruit:{ tier: 11, name: '石芒杨桃', img: 'Plants/Starfruit/Starfruit.gif', hp: 25000, cost: 0, scale: 1.35, // v4.0.53：新——岩石质感巨型杨桃
                             tint: 'grayscale(0.35) sepia(0.6) saturate(1.6) brightness(0.95) drop-shadow(0 0 8px #ffcc80)',""",
    """            stonestarfruit:{ tier: 11, name: '十芒杨桃', img: 'Plants/Starfruit/Starfruit.gif', hp: 25000, cost: 0, scale: 1.25, // v4.0.116：石芒杨桃→已有融合植物「十芒杨桃」（杨桃+杨桃）
                             tint: 'saturate(1.6) brightness(1.2) hue-rotate(15deg)',""")

# ============ 豌豆系 ============
# 双向投手 → 冰双向射手
rep("""            dualpea:       { tier: 4, name: '双向投手', img: 'Plants/SplitPea/SplitPea.gif',      hp: 600, cost: 0,""",
    """            dualpea:       { tier: 4, name: '冰双向射手', img: 'Plants/SplitPea/SplitPea.gif',    hp: 600, cost: 0, tint: 'hue-rotate(165deg) saturate(1.5) brightness(1.1)', // v4.0.116：双向投手→已有融合植物「冰双向射手」""")

# 超级机箱 → 超级机枪
rep("""            superbox:      { tier: 13, name: '超级机箱', img: 'Plants/GatlingPea/GatlingPea.gif', hp: 5000, cost: 0, scale: 1.25, // v4.0.53：新——金色重炮机箱
                             tint: 'sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(1.1) drop-shadow(0 0 6px #ffd54a)',""",
    """            superbox:      { tier: 13, name: '超级机枪', img: 'Plants/GatlingPea/GatlingPea.gif', hp: 5000, cost: 0, scale: 1.25, // v4.0.116：超级机箱→已有融合植物「超级机枪」（机枪射手+双发射手）
                             tint: 'saturate(1.3) brightness(1.1)',""")

# 机箱猫尾草 → 机枪猫尾草
rep("""            machinestail:  { tier: 14, name: '机箱猫尾草', img: 'Plants/Cattail/Cattail.gif',   hp: 6000, cost: 0, scale: 1.2, // v4.0.53：新——机枪猫尾草（金属色）
                             tint: 'grayscale(0.3) sepia(0.8) saturate(1.6) brightness(1.05) drop-shadow(0 0 6px #bdbdbd)',""",
    """            machinestail:  { tier: 14, name: '机枪猫尾草', img: 'Plants/Cattail/Cattail.gif',   hp: 6000, cost: 0, scale: 1.2, // v4.0.116：机箱猫尾草→已有融合植物「机枪猫尾草」（机枪射手+猫尾草）
                             tint: 'saturate(1.15) brightness(1.05)',""")

# ============ 坚果系 ============
# 寒冰高坚果 → 寒冰坚果（融合：坚果墙+寒冰射手）
rep("""            nutlv8:        { tier: 8,  name: '寒冰高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 67500,  cost: 0,""",
    """            nutlv8:        { tier: 8,  name: '寒冰坚果', img: 'Plants/TallNut/TallNut.gif',         hp: 67500,  cost: 0, // v4.0.116：寒冰高坚果→已有融合植物「寒冰坚果」""")

# 巨型坚果 → 钢刺坚果（融合：钢地刺+坚果墙）
rep("""            nutlv10:       { tier: 10, name: '巨型坚果',   img: 'Plants/TenManNut/0.gif',           hp: 150000, cost: 0, scale: 1.1,
                             up:""",
    """            nutlv10:       { tier: 10, name: '钢刺坚果',   img: 'Plants/WallNut/WallNut.gif',       hp: 150000, cost: 0, scale: 1.1, // v4.0.116：巨型坚果→已有融合植物「钢刺坚果」
                             overlay: 'Plants/Spikerock/Spikerock.gif', overTransform: 'translate(-50%, -50%) translate(0px, 34px)',
                             up:""")

# 南瓜堡垒 → 高坚果堡垒（融合：卷心菜投手+高坚果）
rep("""            nutlv11:       { tier: 11, name: '南瓜堡垒',   img: 'Plants/PumpkinHead/PumpkinHead.gif', hp: 225000, cost: 0, scale: 1.4,
                             tint: 'brightness(1.1) saturate(1.2)',""",
    """            nutlv11:       { tier: 11, name: '高坚果堡垒', img: 'Plants/TallNut/TallNut.gif',       hp: 225000, cost: 0, scale: 1.2, // v4.0.116：南瓜堡垒→已有融合植物「高坚果堡垒」
                             tint: 'brightness(1.06)',
                             overlay: 'Plants/CabbagePult/CabbagePult.png', overTransform: 'translate(-50%, -50%) translate(4px, -56px) scale(0.7)',""")

# 永恒高坚果 → 高坚果 Lv12（已是经典植物，不再造新名）
rep("""            nutlv12:       { tier: 12, name: '永恒高坚果', img: 'Plants/TallNut/TallNut.gif',       hp: 340000, cost: 0, scale: 1.2,
                             tint: 'brightness(1.25) saturate(1.3) drop-shadow(0 0 12px #ffd700)',
                             overlay: 'Plants/WallNut/WallNut.gif', overTransform: 'translate(-50%, -50%) translate(0px, -40px) scale(0.7)' },""",
    """            nutlv12:       { tier: 12, name: '高坚果 Lv12', img: 'Plants/TallNut/TallNut.gif',      hp: 340000, cost: 0, scale: 1.2, // v4.0.116：永恒高坚果→经典植物「高坚果」（同名同物，只升等级）
                             tint: 'brightness(1.25) saturate(1.3) drop-shadow(0 0 12px #ffd700)' },""")

# ============ 孢子系 ============
# 巨型忧郁菇 → 忧郁蒜雾（融合：忧郁菇+大蒜）
rep("""            sporelv8:      { tier: 8, name: '巨型忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 8000, cost: 0, scale: 1.15, tint: 'saturate(1.5) brightness(1.2)',""",
    """            sporelv8:      { tier: 8, name: '忧郁蒜雾', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 8000, cost: 0, scale: 1.15, tint: 'sepia(.85) saturate(1.9) hue-rotate(-12deg) brightness(1.18)', // v4.0.116：巨型忧郁菇→已有融合植物「忧郁蒜雾」""")

# 暗影 / 星际 / 宇宙 忧郁菇 → 忧郁菇 Lv9/10/11（经典植物升级，不再造新品种）
rep("""            sporelv9:      { tier: 9, name: '暗影忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 10000, cost: 0, scale: 1.25,""",
    """            sporelv9:      { tier: 9, name: '忧郁菇 Lv9', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 10000, cost: 0, scale: 1.25,""")
rep("""            sporelv10:     { tier: 10, name: '星际忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 12000, cost: 0, scale: 1.35,""",
    """            sporelv10:     { tier: 10, name: '忧郁菇 Lv10', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 12000, cost: 0, scale: 1.35,""")
rep("""            sporelv11:     { tier: 11, name: '宇宙忧郁菇', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 15000, cost: 0, scale: 1.45,""",
    """            sporelv11:     { tier: 11, name: '忧郁菇 Lv11', img: 'Plants/GloomShroom/GloomShroom.gif', hp: 15000, cost: 0, scale: 1.45,""")

# ============ 地刺系 ============
# 终极火焰地刺 → 火焰钢刺（融合：钢地刺+火炬树桩）
rep("""            ultimatefirespikeweed: { name: '终极火焰地刺', img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, sporeCost: 12500, scale: 1.1, tint: 'hue-rotate(-50deg) saturate(3) drop-shadow(0 0 10px #f00)', ground: true,""",
    """            ultimatefirespikeweed: { name: '火焰钢刺', img: 'Plants/Spikerock/Spikerock.gif', hp: 99999, cost: 0, sporeCost: 12500, scale: 1.1, tint: 'sepia(1) saturate(2.6) hue-rotate(-22deg) brightness(1.15)', ground: true, // v4.0.116：终极火焰地刺→已有融合植物「火焰钢刺」（钢地刺+火炬树桩）""")

# ============ 南瓜壳 Lv2~Lv4（同一株植物，只升等级） ============
rep("""            pumpkinshell2: { name: '南瓜壳·愈',""", """            pumpkinshell2: { name: '南瓜壳 Lv2',""")
rep("""            pumpkinshell3: { name: '南瓜壳·愈金',""", """            pumpkinshell3: { name: '南瓜壳 Lv3',""")
rep("""            pumpkinshell4: { name: '南瓜壳·不朽',""", """            pumpkinshell4: { name: '南瓜壳 Lv4',""")

assert s != orig
io.open(P, 'w', encoding='utf-8').write(s)
print('HauntedDorm DEFS 改名 OK')
