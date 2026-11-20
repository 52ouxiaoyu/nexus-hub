# -*- coding: utf-8 -*-
"""v4.0.137：① 删僵尸图鉴「巨人僵尸王」② 「融合僵尸」组补齐《我是僵尸》融合炉 20 种
③ 图鉴僵尸支持 hue 滤镜 ④ 组尾支持 tip ⑤ 玩法说明《我是僵尸》补融合炉用法"""
import io, sys

P = 'js/HelpGuide.js'
s = io.open(P, encoding='utf-8').read()
orig = s

# ---------- ① 删除「巨人僵尸王」（游戏内并不存在该单位：只有 gargantuar 巨人僵尸 / lgboss 路障巨人）----------
old_wang = """            { n: '巨人僵尸王', img: ZB + 'Gargantuar/0.png', h: 90, hp: 1000, t: '极后期（15 分钟后）才罕见登场，外貌同巨人僵尸；血量不厚，当它是个稀客就好' },
"""
assert s.count(old_wang) == 1, ('巨人僵尸王条目', s.count(old_wang))
s = s.replace(old_wang, '')

# ---------- ② 「融合僵尸」组整段重写 ----------
mark_a = "        { title: '融合僵尸', list: [\n"
mark_b = "        { title: '植物头 · 金罐特殊僵尸', list: [\n"
ia, ib = s.index(mark_a), s.index(mark_b)
assert ia < ib

NEW_GROUP = """        { title: '融合僵尸', list: [
            // v3.74.0 用户点名新增：僵尸+植物/僵尸+僵尸 两两融合而来，难度温和；禁用冰车/橄榄球/舞王/Boss 系本体
            // v3.79.0 外观重做：双盔=铁桶上再叠一顶铁桶；疯狂读报=出场即无报纸狂暴相；
            // 火把=拿在手上；大蒜=改植物头式（与植物头家族一致）
            // v4.0.137：补齐《我是僵尸》融合炉的 20 种（Zombie.ZFUSE，僵尸+僵尸）——
            //   其中 ironcone / madpaper 与砸罐子的双盔 / 疯狂读报是同一种类型，合并成一条不重复列。
            //   血量一律写「基础值」；《我是僵尸》实战里全场 ×3 血、×1.5 速（见 Zombie 构造函数末尾）。
            //   排序与其它组一致：按厉害程度（血量/威胁）从高到低。
            { n: '泰坦冰车', img: ZB + 'Gargantuar/0.png', h: 90, hp: 8000, hue: 'hue-rotate(250deg) saturate(1.25)',
              t: '巨人+冰车 融合（融合炉·终极档）：8000 血，一路碾压推进 + 巨锤秒杀植物，半血照旧掷出小鬼；走得极慢，但没有一株植物能耗得过它' },
            { n: '抛娃巨人', img: ZB + 'Gargantuar/0.png', h: 90, hp: 4000,
              t: '巨人+小鬼 融合（融合炉·终极档）：与巨人僵尸同款，4000 血、重锤砸扁植物，过半血掷出小鬼' },
            { n: '双层坚果头', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 3900,
              head: { src: PL + 'WallNut/WallNut.gif', cw: 65, ch: 73, keepTop: 1.0, w: 42, y: 3, ox: 10 },
              hue: 'hue-rotate(160deg) saturate(1.3)',
              t: '坚果头+坚果头 融合（融合炉·进阶档）：纯血池，3900 血（≈1.5 只坚果头），没有任何技能——就用火力硬磨' },
            { n: '铁桶橄榄', img: ZB + 'FootballZombie/FootballZombie.gif', h: 72, hp: 1600, hue: 'hue-rotate(60deg) saturate(1.25)',
              t: '橄榄球+铁桶 融合（融合炉·进阶档）：速度 40 的重装冲刺，1600 血 + 铁桶防具，顶着一路火力往前撞' },
            { n: '冰球冲刺', img: ZB + 'Zomboni/1.gif', h: 90, ice: true, hp: 1600, hue: 'hue-rotate(210deg) saturate(1.3)',
              t: '冰车+橄榄球 融合（融合炉·高阶档）：速度 32 的高速冰车，碾过的植物减速 8 秒；照样只有地刺能扎爆' },
            { n: '铁甲路障', img: ZB + 'BucketheadZombie/BucketheadZombie.gif', h: 70,
              acc: { src: ZB + 'BucketheadZombie/BucketheadZombie.gif', cw: 166, ch: 144, x1: 52, y1: 2, x2: 104, y2: 52, w: 24, ox: -2.5, by: 58, flip: true },
              hp: 1500, t: '铁桶+路障 融合（融合炉·进阶档；砸罐子里叫「双盔僵尸」）：1500 血，头上倒扣着第二顶铁桶——外层桶先打掉露出里层桶，两顶都掉才变普通僵尸' },
            { n: '堡垒僵尸', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, hp: 1450, hue: 'hue-rotate(270deg) saturate(1.25)',
              t: '铁门+铁桶 融合（融合炉·进阶档）：双层防御——铁门挡正面直射（投手/孢子类破甲无视），门后还有 900 血本体' },
            { n: '铁门报社', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, hp: 1450, hue: 'hue-rotate(300deg) saturate(1.25)',
              t: '铁门+读报 融合（融合炉·进阶档）：铁门挡正面，门一破立刻进入狂暴高速（本体只有 320 血，破门前后是两种威胁）' },
            { n: '护盾撑杆', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, hp: 1450, hue: 'hue-rotate(90deg) saturate(1.25)',
              t: '撑杆+铁门 融合（融合炉·进阶档）：速度 45 冲来，跳过遇到的第一株植物，同时铁门免疫正面单体弹' },
            { n: '狂暴铁桶', img: ZB + 'BucketheadZombie/BucketheadZombie.gif', h: 70, hp: 1300, hue: 'hue-rotate(330deg) saturate(1.25)',
              t: '铁桶+读报 融合（融合炉·进阶档）：1300 血带铁桶，桶一碎就进入高速狂暴——不能只打掉桶就放松' },
            { n: '辣椒战车', img: ZB + 'Zomboni/1.gif', h: 90, hp: 1300, hue: 'hue-rotate(30deg) saturate(1.35)',
              t: '辣椒头+冰车 融合（融合炉·高阶档）：1300 血的战车碾压一路，被击毁时原地 3×3 爆炸，收尾要留出空档' },
            { n: '撑杆路障', img: ZB + 'ConeheadZombie/ConeheadZombie.gif', h: 70, hp: 900, hue: 'hue-rotate(40deg) saturate(1.25)',
              t: '路障+撑杆 融合（融合炉·基础档）：速度 45，头盔抗打 + 跳过遇到的第一株植物（只有高坚果拦得住那一跳）' },
            { n: '霜冻路障', img: ZB + 'ConeheadZombie/ConeheadZombie.gif', h: 70, hp: 900, hue: 'hue-rotate(180deg) saturate(1.3)',
              t: '寒冰头+路障 融合（融合炉·进阶档）：900 血带路障，啃咬过的植物被冻慢（产阳光/射击周期都拉长）' },
            { n: '舞王·双人秀', img: ZB + 'DancingZombie/DancingZombie.gif', h: 72, hp: 700, hue: 'hue-rotate(140deg) saturate(1.3)',
              t: '舞王+舞王 融合（融合炉·高阶档）：700 血，每 20 秒一次从四个角同时召出 4 只伴舞——不清干净会越滚越多' },
            { n: '双子僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 500, hue: 'hue-rotate(12deg) saturate(1.25)',
              t: '普通+普通 融合（融合炉·基础档）：500 血，被击倒时分裂成 2 只小鬼继续啃——别以为打完就结束了' },
            { n: '太阳僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 420,
              head: { src: PL + 'SunFlower/SunFlower1.gif', cw: 73, ch: 74, keepTop: 0.58, w: 38, y: 5, ox: 12 },
              hue: 'hue-rotate(55deg) saturate(1.3)',
              t: '阳光头+阳光头 融合（融合炉·高阶档）：420 血，每 8 秒给僵尸方产 100 阳光——《我是僵尸》里的经济核心，护好它' },
            { n: '迪斯科读报', img: ZB + 'NewspaperZombie/HeadWalk1.gif', h: 70, hp: 400, hue: 'hue-rotate(120deg) saturate(1.25)',
              t: '读报+舞王 融合（融合炉·高阶档）：400 血，狂暴相冲 + 每 15 秒召 1 只伴舞，一边推进一边添丁' },
            { n: '火把僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70,
              acc: { src: PL + 'Torchwood/Torchwood.gif', cw: 73, ch: 87, x1: 0, y1: 0, x2: 73, y2: 87, w: 15, ox: -4, by: 14 },
              hp: 400, t: '僵尸+火炬树桩 融合（紫罐困难/地狱低频·金罐）：手里举着燃烧的火把，啃植物时每秒额外烧 40——防线被它啃得特别快' },
            { n: '疯狂读报', img: ZB + 'NewspaperZombie/LostNewspaper.gif', h: 70, hp: 340,
              t: '读报+撑杆 融合（融合炉·进阶档；砸罐子里叫「疯狂读报僵尸」）：出场就是怒目举拳的疯狂相（没有报纸），高速冲来跳过第一株植物，打到狂暴线还会再度加速' },
            { n: '愤怒新人', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 320, hue: 'hue-rotate(200deg) saturate(1.25)',
              t: '普通+读报 融合（融合炉·基础档）：320 血，啃死第 1 株植物后立刻狂暴——加速 + 啃食伤害翻倍，前排放它进来很危险' },
            { n: '究极盲盒', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 300, gift: true, hue: 'hue-rotate(350deg) saturate(1.3)',
              t: '盲盒+盲盒 融合（融合炉·高阶档）：只有 300 血，但被打死时会开出一只随机融合僵尸——用便宜火力点掉它反而更麻烦' },
            { n: '大蒜僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70,
              head: { src: PL + 'Garlic/Garlic.gif', cw: 60, ch: 59, keepTop: 1.0, w: 38, y: 2, ox: 10 },
              hp: 300, t: '僵尸+大蒜 融合（紫罐困难/地狱低频·金罐）：和植物头僵尸同款融合相——完整僵尸头顶着一颗大蒜头；每被打 4 次就被辣得跳到相邻一行，火力要重新瞄准' },
        ], tip: '※ 以上 22 种里，前 19 条是《我是僵尸》「融合炉」的配方产物（掌套图标 → 依次点两只基础僵尸 → 付「两只价 + 融合费」合成，费用档 基础 +50 / 进阶 +100 / 高阶 +150 / 终极 +250）；最后 3 条（火把 / 疯狂读报 / 大蒜）在砸罐子紫罐·金罐里出现。血量均为基础值，实战《我是僵尸》全场 ×3 血、×1.5 速。' },
"""

s = s[:ia] + NEW_GROUP + s[ib:]

# ---------- ③ 图鉴僵尸支持 hue 滤镜 ----------
old_f = """            (z.dark ? 'filter:brightness(.72) contrast(1.25);' : '') + '">';"""
new_f = """            (z.dark ? 'filter:brightness(.72) contrast(1.25);' : (z.hue ? 'filter:' + z.hue + ';' : '')) + '">';"""
assert s.count(old_f) == 1, ('hue 滤镜挂点', s.count(old_f))
s = s.replace(old_f, new_f)

# ---------- ④ renderZombies 支持组尾 tip ----------
old_r = """                }).join('') + '</div>';
        }).join('');
    }"""
new_r = """                }).join('') + '</div>' +
                (g.tip ? '<div class="hg-tip">' + g.tip + '</div>' : '');
        }).join('');
    }"""
assert s.count(old_r) == 1, ('renderZombies 尾巴', s.count(old_r))
s = s.replace(old_r, new_r)

# ---------- ⑤ 玩法说明《我是僵尸》补融合炉 ----------
old_m = """            '卡带选择：从底部僵尸卡带买僵尸拖到场地上；铁门/橄榄球/冰车按模式概率出现。' ] },"""
new_m = """            '卡带选择：从底部僵尸卡带买僵尸拖到场地上；铁门/橄榄球/冰车按模式概率出现。',
            '融合炉（20 种）：阳光上方的融合手套 → 依次点两只基础僵尸 → 付「两只价 + 融合费」合成一只融合僵尸（基础 +50 / 进阶 +100 / 高阶 +150 / 终极 +250，再点一次手套可取消）。例：普通+普通=双子僵尸、铁桶+路障=铁甲路障、铁门+铁桶=堡垒僵尸、橄榄球+铁桶=铁桶橄榄、冰车+橄榄球=冰球冲刺、巨人+冰车=泰坦冰车（8000 血）。全部配方与数值见僵尸图鉴「融合僵尸」组。' ] },"""
assert s.count(old_m) == 1, ('我是僵尸卡带选择条目', s.count(old_m))
s = s.replace(old_m, new_m)

assert s != orig
io.open(P, 'w', encoding='utf-8').write(s)
print('HelpGuide.js 已更新：删 1 条 + 融合僵尸组 22 条 + hue/tip/说明')
