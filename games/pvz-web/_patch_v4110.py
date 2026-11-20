# -*- coding: utf-8 -*-
"""v4.0.110：植物图鉴把「守屋升级形态」从融合区拆出来（用户实报：图鉴里有些"融合植物"没有融合配方）
根因：v4.0.74 为补全守屋可产出植物，把 21 个守屋升级形态（大阳光菇 / 水晶向日葵 / 巨型坚果 / 南瓜壳·愈 ...）
      直接 push 进了 FUSION 数组 —— 图鉴里它们被统一标注"融合获得"、副标题「融合获得」，
      但配方大全里当然没有它们的配方（它们是守屋模式升级链的下一级，不是给手套融出来的）。
      其中 4 个还与真融合产物完全同名（魅惑向日葵 / 冰蒜卫士 / 金蒜坚果 / 蒜味高坚果）→ 图鉴出现两条同名条目。
"""
import io

p = 'js/HelpGuide.js'
s = io.open(p, encoding='utf-8').read()
n = 0


def rep(old, new, cnt=1):
    global s, n
    c = s.count(old)
    assert c == cnt, "锚点 %d 次（期望 %d）：%s" % (c, cnt, old[:70])
    s = s.replace(old, new)
    n += 1


# ---------- 1. 21 条守屋升级形态加 k:'dorm' + 来源文案 + 4 条同名加后缀 ----------
old_block = """        // v4.0.74：补全守屋可产出植物的图鉴条目（此前游戏里能出现但图鉴查无此物，玩家容易懵）
        { n: '大阳光菇', base: PL + 'SunShroom/0.gif', md: 112, t: '阳光菇升级：更大更快产阳光，夜晚每轮 8 点' },
        { n: '水晶向日葵', base: PL + 'TwinSunflower/TwinSunflower1.gif', md: 125, t: '四头向日葵升级：冰蓝水晶质感多头，每轮 256 阳光' },
        { n: '魅惑向日葵', base: PL + 'TwinSunflower/TwinSunflower1.gif', md: 135, t: '水晶向日葵升级：粉紫魅惑光晕，每轮 512 阳光' },
        { n: '石芒杨桃', base: PL + 'Starfruit/Starfruit.gif', md: 112, t: '杨桃升级：五向石弹连射，带破甲' },
        { n: '双向投手', base: PL + 'SplitPea/SplitPea.gif', md: 96, t: '豌豆射手升级：前后双向发射（前方 2 连发，后方 1 发）' },
        { n: '超级机箱', base: PL + 'GatlingPea/GatlingPea.gif', md: 110, t: '机枪射手合体升级：6 连发速射机枪' },
        { n: '机箱猫尾草', base: PL + 'Cattail/Cattail.gif', md: 100, t: '超级机箱+猫尾草：全场自动追踪，高速连射' },
        { n: '巨型坚果', base: PL + 'TenManNut/0.gif', md: 110, t: '高坚果十级：150000 血的巨型壁垒' },
        { n: '南瓜堡垒', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 140, t: '巨型坚果升级：南瓜护盾巨墙，225000 血' },
        { n: '永恒高坚果', base: PL + 'TallNut/TallNut.gif', md: 125, t: '南瓜堡垒升级：340000 血永恒壁垒' },
        { n: '巨型忧郁菇', base: PL + 'GloomShroom/GloomShroom.gif', md: 115, t: '大喷菇升级：穿透群伤，伤害与体型更大' },
        { n: '暗影忧郁菇', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'grayscale(0.6) brightness(0.9) hue-rotate(260deg) saturate(1.8)', md: 125, t: '巨型忧郁菇升级：暗影系穿透群伤' },
        { n: '星际忧郁菇', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'saturate(1.8) brightness(1.25) drop-shadow(0 0 10px #c79aff)', md: 135, t: '暗影忧郁菇升级：星光范围群伤' },
        { n: '宇宙忧郁菇', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'hue-rotate(280deg) saturate(2.2) brightness(1.3) drop-shadow(0 0 14px #9d6bff)', md: 145, t: '星际忧郁菇升级：宇宙暗紫，范围群伤封顶' },
        { n: '终极火焰地刺', base: PL + 'Spikerock/Spikerock.gif', bf: 'hue-rotate(-50deg) saturate(3) drop-shadow(0 0 10px #f00)', md: 110, t: '火焰地刺终极：99999 血反伤地刺' },
        { n: '冰蒜卫士', base: PL + 'Garlic/0.gif', md: 110, t: '大蒜升级：血量不变，僵尸吃后减速' },
        { n: '金蒜坚果', base: PL + 'Garlic/0.gif', md: 120, t: '冰蒜卫士升级：任意僵尸要啃 4 下才能啃掉' },
        { n: '蒜味高坚果', base: PL + 'Garlic/0.gif', md: 135, t: '金蒜坚果升级：僵尸要啃 10 下才啃掉' },
        { n: '南瓜壳·愈', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 100, t: '南瓜壳 Lv2：3500 护盾' },
        { n: '南瓜壳·愈金', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 110, t: '南瓜壳 Lv3：4000 金纹护盾' },
        { n: '南瓜壳·不朽', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 120, t: '南瓜壳 Lv4：5000 不朽护盾' },
"""

new_block = """        // v4.0.74：补全守屋可产出植物的图鉴条目（此前游戏里能出现但图鉴查无此物，玩家容易懵）
        // v4.0.110：k:'dorm' = 守屋专属升级形态 —— 它们靠《守屋大作战》里的「升级」获得，**没有融合配方**。
        //   旧版误把它们混在融合区（副标题统一"融合获得"），用户翻配方大全找不到 → 以为新融合植物漏配方。
        //   现在图鉴单独分「守屋专属」区；4 个与真融合产物同名的加「·守屋」后缀消歧。
        { n: '大阳光菇', k: 'dorm', base: PL + 'SunShroom/0.gif', md: 112, t: '守屋模式：阳光菇升到第 2 级。更大更快产阳光，夜晚每轮 8 点' },
        { n: '水晶向日葵', k: 'dorm', base: PL + 'TwinSunflower/TwinSunflower1.gif', md: 125, t: '守屋模式：四头向日葵升级。冰蓝水晶质感多头，每轮 256 阳光' },
        { n: '魅惑向日葵·守屋', k: 'dorm', base: PL + 'TwinSunflower/TwinSunflower1.gif', md: 135, t: '守屋模式：水晶向日葵升级。粉紫魅惑光晕，每轮 512 阳光（注意：与融合植物「魅惑向日葵」同名不同物——那只靠「魅惑菇+向日葵」融出来）' },
        { n: '石芒杨桃', k: 'dorm', base: PL + 'Starfruit/Starfruit.gif', md: 112, t: '守屋模式：杨桃升级。五向石弹连射，带破甲' },
        { n: '双向投手', k: 'dorm', base: PL + 'SplitPea/SplitPea.gif', md: 96, t: '守屋模式：豌豆射手升级。前后双向发射（前方 2 连发，后方 1 发）' },
        { n: '超级机箱', k: 'dorm', base: PL + 'GatlingPea/GatlingPea.gif', md: 110, t: '守屋模式：机枪射手合体升级。6 连发速射机枪' },
        { n: '机箱猫尾草', k: 'dorm', base: PL + 'Cattail/Cattail.gif', md: 100, t: '守屋模式：超级机箱再升级。全场自动追踪，高速连射' },
        { n: '巨型坚果', k: 'dorm', base: PL + 'TenManNut/0.gif', md: 110, t: '守屋模式：高坚果十级。150000 血的巨型壁垒' },
        { n: '南瓜堡垒', k: 'dorm', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 140, t: '守屋模式：巨型坚果升级。南瓜护盾巨墙，225000 血' },
        { n: '永恒高坚果', k: 'dorm', base: PL + 'TallNut/TallNut.gif', md: 125, t: '守屋模式：南瓜堡垒升级。340000 血永恒壁垒' },
        { n: '巨型忧郁菇', k: 'dorm', base: PL + 'GloomShroom/GloomShroom.gif', md: 115, t: '守屋模式：大喷菇升级。穿透群伤，伤害与体型更大' },
        { n: '暗影忧郁菇', k: 'dorm', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'grayscale(0.6) brightness(0.9) hue-rotate(260deg) saturate(1.8)', md: 125, t: '守屋模式：巨型忧郁菇升级。暗影系穿透群伤' },
        { n: '星际忧郁菇', k: 'dorm', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'saturate(1.8) brightness(1.25) drop-shadow(0 0 10px #c79aff)', md: 135, t: '守屋模式：暗影忧郁菇升级。星光范围群伤' },
        { n: '宇宙忧郁菇', k: 'dorm', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'hue-rotate(280deg) saturate(2.2) brightness(1.3) drop-shadow(0 0 14px #9d6bff)', md: 145, t: '守屋模式：星际忧郁菇升级。宇宙暗紫，范围群伤封顶' },
        { n: '终极火焰地刺', k: 'dorm', base: PL + 'Spikerock/Spikerock.gif', bf: 'hue-rotate(-50deg) saturate(3) drop-shadow(0 0 10px #f00)', md: 110, t: '守屋模式：火焰地刺终极形态。99999 血反伤地刺' },
        { n: '冰蒜卫士·守屋', k: 'dorm', base: PL + 'Garlic/0.gif', md: 110, t: '守屋模式：大蒜升到第 2 级。血量不变，僵尸吃后减速（与融合植物「冰蒜卫士」同名不同物——那只靠「大蒜+寒冰射手」融出来）' },
        { n: '金蒜坚果·守屋', k: 'dorm', base: PL + 'Garlic/0.gif', md: 120, t: '守屋模式：大蒜升到第 3 级。任意僵尸要啃 4 下才能啃掉（与融合植物「金蒜坚果」同名不同物——那只靠「坚果墙+大蒜」融出来）' },
        { n: '蒜味高坚果·守屋', k: 'dorm', base: PL + 'Garlic/0.gif', md: 135, t: '守屋模式：大蒜升到第 4 级。僵尸要啃 10 下才啃掉（与融合植物「蒜味高坚果」同名不同物——那只靠「高坚果+大蒜」融出来）' },
        { n: '南瓜壳·愈', k: 'dorm', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 100, t: '守屋模式：南瓜壳升级（Lv2）。3500 护盾' },
        { n: '南瓜壳·愈金', k: 'dorm', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 110, t: '守屋模式：南瓜壳升级（Lv3）。4000 金纹护盾' },
        { n: '南瓜壳·不朽', k: 'dorm', base: PL + 'PumpkinHead/PumpkinHead.gif', md: 120, t: '守屋模式：南瓜壳升级（Lv4）。5000 不朽护盾' },
"""
rep(old_block, new_block, 1)

# ---------- 2. 瓦片副标题按来源 ----------
rep("""            '<div class="hg-tsub">' + (fusion ? '融合获得' : '☀ ' + p.c) + '</div>' +""",
    """            // v4.0.110：守屋升级形态不能标"融合获得"（它们没有融合配方）
            '<div class="hg-tsub">' + (fusion ? (p.k === 'dorm' ? '守屋升级' : '融合获得') : '☀ ' + p.c) + '</div>' +""",
    1)

# ---------- 3. 详情卡徽章按来源 ----------
rep("""        if (fusion) {
            bs += badge('🧬 融合植物');
        } else {""",
    """        if (fusion) {
            bs += badge(p.k === 'dorm' ? '🏰 守屋专属形态' : '🧬 融合植物');
        } else {""",
    1)
rep("""        bs += badge('📖 ' + (fusion ? '手套融合获得' : '经典选卡'));""",
    """        bs += badge('📖 ' + (fusion ? (p.k === 'dorm' ? '守屋模式升级获得' : '手套融合获得') : '经典选卡'));""",
    1)

# ---------- 4. 图鉴三分区：经典 / 融合 / 守屋专属 ----------
rep("""    function renderPlants() {
        for (const [i, p] of CLASSIC.entries()) plantTile(p, false, 'pc' + i);
        for (const [i, p] of FUSION.entries()) plantTile(p, true, 'pf' + i);
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map((p, i) => plantTile(p, false, 'pc' + i)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + FUSION.map((p, i) => plantTile(p, true, 'pf' + i)).join('') + '</div>' +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选 · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）</div>';
    }""",
    """    function renderPlants() {
        for (const [i, p] of CLASSIC.entries()) plantTile(p, false, 'pc' + i);
        for (const [i, p] of FUSION.entries()) plantTile(p, true, 'pf' + i);
        // v4.0.110：FUSION 里混着 21 个"守屋专属升级形态"（k:'dorm'），它们没有融合配方 —— 单独成区，
        // 免得玩家在融合区看到它们、翻遍配方大全找不到对应配方（用户实报）
        const fuseList = FUSION.map((p, i) => ({ p, i })).filter(o => o.p.k !== 'dorm');
        const dormList = FUSION.map((p, i) => ({ p, i })).filter(o => o.p.k === 'dorm');
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map((p, i) => plantTile(p, false, 'pc' + i)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + fuseList.map(o => plantTile(o.p, true, 'pf' + o.i)).join('') + '</div>' +
            (dormList.length
                ? groupBar('守屋专属', 'hg-red') +
                  '<div class="hg-grid">' + dormList.map(o => plantTile(o.p, true, 'pf' + o.i)).join('') + '</div>'
                : '') +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选 · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）' +
            ' · 守屋专属 = 只在《守屋大作战》里靠「升级 / 套壳」获得，<b>没有融合配方</b></div>';
    }""",
    1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok 替换 %d 处' % n)
