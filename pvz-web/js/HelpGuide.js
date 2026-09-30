// v3.40.0 主菜单「操作与道具说明」—— 图片网格 + 点击详情版：
//   玩法说明（精简文字） / 植物图鉴（经典+融合 两组卡面网格） /
//   僵尸图鉴（按模式分组：经典冒险 / 砸罐子 / 我是僵尸·敌阵 / 有趣的配饰，全部带图）
// v3.40.0：点击任意图片弹出详情卡（阳光/冷却/耐久/血量/特性）；删除僵尸右上角 emoji 角标；
//           修正冰车/小鬼/高坚果头僵尸的体型比例；配饰组移除神秘礼盒、冰道文案对齐实装。
// v3.43.0：跳跳/撑杆僵尸名称对调；植物头贴片去茎（keepTop 收紧）+ 坚果/高坚果头改"头顶小贴片"露出本体；
//           锤子/礼盒改到手部；小鬼放大到普通僵尸一半身高；冰车补冰道；寒冰头描述对齐免疫机制；
//           问号罐阳光实装后文案同步；僵尸罐/问号罐描述具体化。
// v3.44.0：融合图鉴整版换成"场上实拍外观"（与草地上一模一样的主体+叠加层合成，不再用双卡面叠贴）；
//           南瓜壳=南瓜头=同一株（融合区不再重复出现）；经典区阳光价对齐新定价（西瓜500/猫尾275/机枪550/
//           三线325/忧郁菇225/钢地刺225）；撑杆僵尸统一（跳跳僵尸称呼取消，两组都用走路图）；
//           坚果头/高坚果头改回"盖在僵尸身上"，盲盒礼盒贴在身上。
// v3.45.0：融合图鉴新增 11 条用户批准配方（冰机枪/冰猫尾/冰忧郁菇/十芒杨桃/烈焰地雷/爆炸弹跳/
//           冰玉米/火焰地刺/火焰双发/四头向日葵/辣椒高坚果），全部走"原版立绘+滤镜"实拍参数。
(function () {
    const V = '?v=' + Date.now();
    const CARD = 'assets/images/Card/Plants/';
    const ZB = 'assets/images/Zombies/';
    const PL = 'assets/images/Plants/';

    // ================= 玩法说明 =================
    // v3.50.0：内容大幅扩充（用户：说明太简短）；每个玩法配专属图标（原版素材，
    // 用户：经典冒险=向日葵 / 融合进化=手套 / 砸罐子=罐子 / 我是僵尸=僵尸）；
    // 《我是僵尸》不再套边框盒子（用户：把这个框去掉），改为无框段落。
    const MODES = [
        { icon: '☀️', emoji: '☀️', title: '通用操作', items: [
            '收集阳光：点击从天上落下的阳光球和向日葵产出的阳光，攒够阳光才能种植物。',
            '选卡种植：点顶部卡片 → 光标带着植物 → 点草地格子种下；再点一次卡片可取消。',
            '铲子：点铲子再点植物可把它移除（不退阳光），给重要植物腾位置。',
            '卡片冷却：每张卡用完都有冷却（转圈），冷却结束才能再次使用；右上角 Speed 可切换 1x/2x 倍速。',
            '光标操作：选卡/铲子/手套都是"点一下拿起、再点一下放下"；按 Esc 或再点按钮可取消，手套拿着的植物会放回原格。',
            '胜负：僵尸走进房子（或我是僵尸里脑子被吃光）即失败；撑过所有波次 / 清完所有罐子即胜利。' ] },
        { icon: '🌻', img: 'assets/images/Plants/SunFlower/0.gif', title: '经典冒险', items: [
            '开局从选卡栏（Choose Your Plants）选最多 10 张卡：向日葵攒阳光，攻击/防御植物守住 5 条草坪。',
            '经济链：向日葵(25/24s) → 双子向日葵翻倍；没钱时小喷菇(0 阳光)是免费前排。',
            '输出链：豌豆 → 双发 → 机枪；寒冰射手带减速；卷心菜/玉米投手是抛射破甲（无视铁门）。',
            '炸弹类：樱桃炸弹 3×3 秒杀、火爆辣椒清一行、寒冰菇全屏冻结、毁灭菇全屏核平+留陨石坑。',
            '防御链：坚果墙(4000) → 高坚果(8000) → 南瓜壳可套在任意植物外再叠 4000 护甲。',
            '特殊地形：冰车僵尸驶过的格子结冰 30 秒无法种植——火爆辣椒可以直接烧毁整行冰道。',
            '融合植物僵尸：150 秒后会出现头顶植物的僵尸变体（豌豆头/坚果头/向日葵头/寒冰头），难度适中，坚果头很硬要用火力磨。' ] },
        { icon: '🧤', emoji: '🧤', title: '融合进化', items: [
            '点手套按钮（或按空格）进入拖拽状态，把一株植物拖到另一株上即融合——两株合二为一。',
            '选卡栏固定 15 张基础牌（向日葵/豌豆/坚果/樱桃/窝瓜/辣椒/土豆雷/大嘴花/高坚果/小喷菇/寒冰菇/毁灭菇/地刺/大蒜/西瓜投手），其余植物全靠融合获得。',
            '配方都有清晰逻辑：同类叠加（豌豆+豌豆=双发）、属性移植（+寒冰=冰系）、火烤强化（+火炬=火焰系）……游戏内「融合配方大全」可查全部秘方。',
            '炸弹融合：樱桃炸弹爆炸时，3×3 内有配方的两株植物会直接原地融合。',
            '大技能：不少融合株有专属大招（冰系=极寒波动、四头向日葵=阳光雨、火焰双发=过热爆发、一次性植物用完后再补一段爆炸）——同一株的大技能一局只播报一次。',
            '目前共有 55 种以上融合形态；《我是僵尸》与砸罐子模式也能通过盲盒/金罐开出融合株。' ] },
        { icon: '🏺', img: 'assets/images/Vase/Vase_Question.png', title: '砸罐子', items: [
            '点击罐子用木锤敲开（鼠标移到罐子上会变成木锤）：绿罐出植物、红罐出僵尸、问号罐随机（植物/僵尸/偶尔一撮阳光+50）。',
            '目标：敲完全部罐子并清掉所有僵尸即胜利；僵尸罐敲开前最好先摆好防线。',
            '罐子种类：植物罐（稳赚）/ 僵尸罐（危险）/ 问号罐（惊喜）/ 金罐（地狱限定，必出强力植物或强化僵尸，1~2 个）。',
            '路灯花（75 阳光）：种下照亮周围一圈罐子，罐子变半透明、直接看到里面是什么。',
            '难度分简单 / 困难 / 地狱：地狱僵尸血量 ×1.35，且只有地狱出金罐。',
            '特殊僵尸：锤子僵尸会替你（或敌人）锤碎沿途罐子；小丑盒随时自爆；铁梯架梯翻坚果。融合植物头僵尸只从金罐里出来（数量不多但很硬）。' ] },
        { icon: '🧟', img: 'assets/images/Zombies/Zombie/0.gif', title: '《我是僵尸》', plain: true, items: [
            '阵营反转：这次你指挥僵尸大军——花阳光买僵尸、放到草坪上，吃掉全部脑子即胜利。',
            '阳光来源：啃死向日葵 +200 / 双子向日葵 +500；阳光不足 50 且场上无僵尸存活即判负。',
            '阵容推荐：橄榄球/铁门是推线坦，小鬼便宜快速，撑杆一路跳过植物，舞王成群召唤。',
            '敌阵陷阱：对面草坪有地刺（扎脚）、土豆雷（炸）、忧郁菇（绞肉），还有伪装的毁灭菇陷阱——踩上去全屏湮灭，量着血量上。',
            '卡带选择：从底部僵尸卡带买僵尸拖到场地上；铁门/橄榄球/冰车按模式概率出现。' ] },
    ];

    // ================= 植物图鉴 =================
    // 经典 = 经典选卡栏可直接选择（按厉害程度排序）；融合 = 只能通过融合获得
    // g=卡面素材名 c=阳光 cd=冷却秒 hp=耐久 t=特性描述（数值全部取自实装代码）
    const CLASSIC = [
        { n: '毁灭菇', g: 'DoomShroom', c: 125, cd: 50, hp: 300, t: '全屏 9999 秒杀；原地留陨石坑 30 秒' },
        { n: '樱桃炸弹', g: 'CherryBomb', c: 150, cd: 50, hp: 300, t: '1800 伤害 / 3×3，种下 1 秒后引爆' },
        { n: '火爆辣椒', g: 'Jalapeno', c: 125, cd: 50, hp: 300, t: '1800 伤害烧光一整行；可直接烧毁冰车留下的冰道' },
        { n: '冰西瓜投手', g: 'WinterMelon', c: 200, cd: 7.5, hp: 300, t: '直击 60+溅射 30，命中减速 10 秒' }, // v3.44.0 定价不变
        { n: '西瓜投手', g: 'MelonPult', c: 500, cd: 7.5, hp: 300, t: '抛射 60+溅射 30，无视铁门' }, // v3.44.0 300→500
        { n: '猫尾草', g: 'Cattail', c: 275, cd: 7.5, hp: 300, t: '全场自动追踪，20 伤 / 1.4s' }, // v3.44.0 225→275
        { n: '机枪射手', g: 'GatlingPea', c: 550, cd: 50, hp: 300, t: '4 连发×20 / 1.5s，单行持续输出' }, // v3.44.0 250→550
        { n: '三线射手', g: 'Threepeater', c: 325, cd: 7.5, hp: 300, t: '同时射上中下三行，每发 20' }, // v3.44.0 300→325
        { n: '寒冰菇', g: 'IceShroom', c: 75, cd: 50, hp: 300, t: '全屏冻结 + 减速 10 秒' },
        { n: '忧郁菇', g: 'GloomShroom', c: 225, cd: 7.5, hp: 300, t: '3×3 每 1s 八发×80，穿甲穿门近身绞肉机' }, // v3.44.0 150→225
        { n: '卷心菜投手', g: 'CabbagePult', c: 150, cd: 7.5, hp: 300, t: '抛射 40 破甲，护甲打不掉' },
        { n: '玉米投手', g: 'KernelPult', c: 175, cd: 7.5, hp: 300, t: '20 伤，20% 投黄油定身 3 秒' },
        { n: '火炬树桩', g: 'Torchwood', c: 175, cd: 7.5, hp: 300, t: '豌豆穿过点燃，伤害翻倍' },
        { n: '杨桃', g: 'Starfruit', c: 125, cd: 7.5, hp: 300, t: '五向×40 且可穿透' },
        { n: '双向豌豆', g: 'SplitPea', c: 125, cd: 7.5, hp: 300, t: '向前 20 / 向后 40' },
        { n: '双发豌豆', g: 'Repeater', c: 200, cd: 7.5, hp: 300, t: '每轮 2×20' },
        { n: '寒冰射手', g: 'SnowPea', c: 175, cd: 7.5, hp: 300, t: '20 伤 + 减速 10 秒' },
        { n: '豌豆射手', g: 'Peashooter', c: 100, cd: 7.5, hp: 300, t: '20 伤 / 1.5s，最基础的输出' },
        { n: '魅惑菇', g: 'HypnoShroom', c: 75, cd: 30, hp: 300, t: '啃食者被策反为你而战' },
        { n: '大蒜', g: 'Garlic', c: 50, cd: 7.5, hp: 400, t: '咬一口就换行，引导走位' },
        { n: '胆小菇', g: 'ScaredyShroom', c: 25, cd: 7.5, hp: 300, t: '20 伤，僵尸靠近会缩头暂停' },
        { n: '大嘴花', g: 'Chomper', c: 150, cd: 7.5, hp: 300, t: '整只吞噬（巨人除外），咀嚼 40 秒' },
        { n: '土豆地雷', g: 'PotatoMine', c: 25, cd: 30, hp: 300, t: '武装 15 秒，踩上即 1800 单体' },
        { n: '窝瓜', g: 'Squash', c: 50, cd: 30, hp: 300, t: '跃起压扁 1800，即种即用' },
        { n: '钢地刺', g: 'Spikerock', c: 225, cd: 7.5, hp: 1200, t: '120 / 0.75s，不会被啃，可扛 3 辆冰车' }, // v3.44.0 125→225
        { n: '地刺', g: 'Spikeweed', c: 100, cd: 7.5, hp: 300, t: '40 / 0.75s，贴地不可被啃，扎爆冰车' },
        { n: '高坚果', g: 'TallNut', c: 125, cd: 30, hp: 8000, t: '肉盾天花板，连撑杆僵尸的第一跳都跳不过来' },
        { n: '南瓜壳', g: 'PumpkinHead', c: 125, cd: 30, hp: 4000, t: '套在植物外的护壳，三阶段裂纹（与融合区南瓜壳同株，坚果+高坚果可融合出壳）' },
        { n: '坚果墙', g: 'WallNut', c: 50, cd: 30, hp: 4000, t: '纯肉盾' },
        { n: '双子向日葵', g: 'TwinSunflower', c: 150, cd: 50, hp: 300, t: '2×25 / 24s，经济翻倍' },
        { n: '向日葵', g: 'SunFlower', c: 50, cd: 7.5, hp: 300, t: '25 / 24s，开局必种' },
        { n: '阳光菇', g: 'SunShroom', c: 25, cd: 7.5, hp: 300, t: '15 起步，长大后 25 / 24s' },
        { n: '路灯花', g: 'Plantern', c: 75, cd: 7.5, hp: 300, t: '砸罐子限定：照亮周围罐子的内容' },
        { n: '大喷菇', g: 'FumeShroom', c: 75, cd: 7.5, hp: 300, t: '单行穿透孢子 4 发×20，无视铁门' },
        { n: '小喷菇', g: 'PuffShroom', c: 0, cd: 7.5, hp: 300, t: '完全免费的前排过渡' },
        { n: '植物盲盒', g: 'PlantBox', c: 500, cd: 5, hp: 300, t: '随机开出全植物池一株' },
    ];
    // v3.44.0 融合专属：不再用"主卡+副卡"叠贴 —— 直接复刻场上实拍外观。
    // base=主体立绘（=草地上的 this.element.src） bf=主体滤镜 bt=主体 transform
    // ov=叠加层立绘（=fusionOverlay.src） oc=叠加层 clipPath ot=叠加层 transform
    // 全部数值与 Plant.js 实机分支一字不差；md=素材最大边（算缩放用）
    const FUSION = [
        { n: '玉米加农炮', base: PL + 'CobCannon/CobCannon.png', md: 148, t: '三株玉米投手合体，占两格；充能 25s 后手动瞄准 1800 / 3×3，全游戏最强单发' },
        { n: '寒冰炸弹', base: PL + 'CherryBomb/CherryBomb.gif', bf: 'hue-rotate(180deg) saturate(1.5)', md: 112, t: '寒冰射手+樱桃炸弹：2400 秒杀铁桶级 / 3×3 且全场冻结减速 10 秒' },
        { n: '冰西瓜猫尾草', base: PL + 'Cattail/Cattail.gif', ov: PL + 'WinterMelon/WinterMelon.png', ot: 'translate(-5px, -30px) scale(0.7)', md: 96, t: '冰西瓜投手+猫尾草：全场追踪 60+30 + 减速' },
        { n: '西瓜猫尾草', base: PL + 'Cattail/Cattail.gif', ov: PL + 'MelonPult/MelonPult.png', ot: 'translate(-5px, -30px) scale(0.7)', md: 96, t: '西瓜投手+猫尾草：全场追踪 60+30；大技能【瓜弹连射】——每 20 秒朝全场连投 3 颗西瓜' },
        { n: '樱桃射手', base: PL + 'Peashooter/Peashooter.gif', bf: 'hue-rotate(-45deg) saturate(2.0)', md: 71, t: '豌豆射手+樱桃炸弹：每第 10 发射出小樱桃，900 / 3×3' },
        { n: '冰杨桃', base: PL + 'Starfruit/Starfruit.gif', bf: 'brightness(1.1) hue-rotate(160deg) saturate(1.6)', md: 77, t: '寒冰射手+杨桃：五向冰晶 + 减速' },
        { n: '爆米花投手', base: PL + 'KernelPult/KernelPult.png', bf: 'hue-rotate(-18deg) saturate(1.9) brightness(1.18)', md: 96, t: '玉米投手+火爆辣椒：40 破甲 + 3×3 焦香溅射；大技能【焦香连环爆】——每 22 秒连投 3 颗爆米花' },
        { n: '双料投手', base: PL + 'KernelPult/KernelPult.png', ov: PL + 'CabbagePult/CabbagePult.png', ot: 'translate(-8px, -34px) scale(0.68)', md: 96, t: '玉米投手+卷心菜投手：两种弹药交替；大技能【双料连投】——每 18 秒 2 卷心菜+黄油齐投' },
        { n: '寒冰卷心菜', base: PL + 'CabbagePult/CabbagePult.png', bf: 'brightness(112%) hue-rotate(120deg) saturate(1.7)', md: 96, t: '卷心菜投手+寒冰菇：40 破甲 + 减速；大技能【极寒波动】——每 45 秒冰雾冻伤周围' },
        { n: '坚果射手', base: PL + 'WallNut/WallNut.gif', ov: PL + 'Peashooter/Peashooter.gif', ot: 'translate(2px, -40px) scale(0.7)', md: 71, t: '坚果墙+豌豆射手：能扛能打' },
        { n: '卷心菜堡垒', base: PL + 'WallNut/WallNut.gif', ov: PL + 'CabbagePult/CabbagePult.png', ot: 'translate(4px, -42px) scale(0.7)', md: 96, t: '坚果墙+卷心菜投手：肉盾+破甲投掷' },
        { n: '大嘴坚果', base: PL + 'Chomper/Chomper.gif', ov: PL + 'WallNut/WallNut.gif', ot: 'translate(0px, 16px) scale(0.85)', md: 130, t: '坚果墙+大嘴花：4000 血又能吞；v3.50.0 坚果提前、大嘴花往后，不再遮挡；大技能【吞噬回血】' },
        { n: '钢刺高坚果', base: PL + 'TallNut/TallNut.gif', ov: PL + 'Spikerock/Spikerock.gif', ot: 'translate(0px, 58px)', md: 119, t: '高坚果+钢地刺：8000 血 + 脚下带刺；大技能【径向突刺】——每 10 秒钢刺暴起扎周围 120' },
        { n: '寒冰坚果', base: PL + 'WallNut/WallNut.gif', bf: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', md: 73, t: '坚果墙+寒冰射手：啃它的人被冻慢' },
        { n: '地刺坚果', base: PL + 'WallNut/WallNut.gif', ov: PL + 'Spikeweed/Spikeweed.gif', ot: 'translate(0px, 48px)', md: 85, t: '坚果墙+地刺：啃它等于啃刺' },
        // v3.46.0：删除「坚果向日葵」（用户裁定外观太丑）
        { n: '毁灭向日葵', base: PL + 'SunFlower/SunFlower1.gif', bf: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', md: 74, t: '向日葵+毁灭菇：正常产阳光，被啃死时原地 1800 大爆炸' },
        { n: '豌豆向日葵', base: PL + 'SunFlower/SunFlower1.gif', ov: PL + 'Peashooter/Peashooter.gif', ot: 'translate(0px, -40px) scale(0.72)', md: 92, t: '向日葵+豌豆射手：产阳光还打人' },
        { n: '孢子地雷', base: PL + 'PotatoMine/PotatoMine.gif', ov: PL + 'PuffShroom/PuffShroom.gif', ot: 'translate(0px, -30px) scale(0.9)', md: 75, t: '土豆地雷+小喷菇：廉价控场地雷' },
        // ===== v3.45.0 十一条新融合（用户批准名单）=====
        { n: '冰机枪射手', base: PL + 'GatlingPea/GatlingPea.gif', bf: 'brightness(1.15) hue-rotate(180deg) saturate(1.5)', md: 88, t: '机枪射手+寒冰射手：4 连发冰豌豆 20×4，命中减速 10 秒' },
        { n: '冰猫尾草', base: PL + 'Cattail/Cattail.gif', bf: 'brightness(1.2) hue-rotate(160deg) saturate(1.8)', md: 96, t: '猫尾草+寒冰射手：全场追踪冰刺 20，命中减速 10 秒' },
        { n: '冰忧郁菇', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'brightness(1.15) hue-rotate(160deg) saturate(1.7)', md: 112, t: '忧郁菇+寒冰菇：3×3 冰雾 80/发，穿门且命中减速 10 秒' },
        { n: '十芒杨桃', base: PL + 'Starfruit/Starfruit.gif', bf: 'saturate(1.6) brightness(1.2) hue-rotate(15deg)', md: 77, t: '杨桃+杨桃：十方向 36° 均布齐射，每颗 40 穿透；大技能【星环爆发】——每 20 秒十向星环爆发' },
        { n: '烈焰地雷', base: PL + 'PotatoMine/PotatoMine.gif', bf: 'hue-rotate(-30deg) saturate(2.2) brightness(1.15)', md: 75, t: '土豆地雷+火爆辣椒：布好后触发整行 1800 烈焰' },
        { n: '爆炸弹跳', base: PL + 'Squash/Squash.gif', bf: 'hue-rotate(-35deg) saturate(1.9)', bt: 'scale(2.75) translate(0px, -72px)', md: 226, t: '窝瓜+樱桃炸弹：跃起压扁，落点 3×3 爆炸 1800' },
        { n: '冰玉米投手', base: PL + 'KernelPult/KernelPult.png', bf: 'brightness(1.15) hue-rotate(160deg) saturate(1.8)', md: 96, t: '玉米投手+寒冰射手：玉米粒 20+减速，20% 黄油定身保留' },
        { n: '火焰地刺', base: PL + 'Spikeweed/Spikeweed.gif', bf: 'sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.15)', md: 85, t: '地刺+火炬树桩：灼烧刺 80 / 0.75s（普通地刺的 2 倍）；僵尸啃不到它（只有冰车能碾爆），它镇守的一行冰车驶过不留冰道；大技能【烈焰热浪】——每 15 秒本行火焰喷灼 100' },
        { n: '火焰双发', base: PL + 'Repeater/Repeater.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.12)', md: 73, t: '双发射手+火炬树桩：2 连发火焰豌豆 40×2；大技能【过热爆发】——每第 8 轮改为 6 连发爆炎 60×6（弹体加大发光）' },
        { n: '四头向日葵', base: PL + 'TwinSunflower/TwinSunflower1.gif', bf: 'saturate(1.35) brightness(1.12)', bt: 'scale(1.15)', ov: PL + 'TwinSunflower/TwinSunflower1.gif', ot: 'translate(10px, 6px) scaleX(-1) scale(1.15)', md: 84, t: '双子向日葵+双子向日葵：每轮 4 颗阳光共 100；大技能【阳光雨】——每 120 秒全场天降 3 颗阳光' },
        { n: '辣椒高坚果', base: PL + 'TallNut/TallNut.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.1)', md: 119, t: '高坚果+火爆辣椒：8000 血肉盾，啃它的僵尸每秒被烫 40' },
    ];
    // v3.50.0：数据驱动新融合（PVZ_FUSION_EXTRA 同源）自动追加到融合图鉴
    if (window.PVZ_FUSION_EXTRA) {
        for (const f of window.PVZ_FUSION_EXTRA) {
            const L = f.look || {};
            // v3.52.0：透传 bc/of 与第二叠加层 ov2/oc2/ot2/of2（双半剖分冰火等新外观）
            FUSION.push({ n: f.name, base: L.base, bf: L.bf, bt: L.bt, bc: L.bc, ov: L.ov, oc: L.oc, ot: L.ot, of: L.of,
                ov2: L.ov2, oc2: L.oc2, ot2: L.ot2, of2: L.of2, md: f.md || 96, t: f.t });
        }
    }
    // 注：南瓜壳不再单独列在融合区 —— 它与经典区"南瓜壳"是同一株植物（坚果墙+高坚果融合=套壳玩法，
    // 配方见游戏内「融合配方大全」），同一关键词不重复出现。

    // ================= 僵尸图鉴（按模式分组，组内按厉害程度排序） =================
    // img=贴图 h=显示高度（按真实体型比例：普通僵尸=70） head=头顶植物 accNote=护甲说明
    const Z_GROUPS = [
        { title: '经典冒险', list: [
            { n: '巨尸 Boss', img: ZB + 'LGBOSS/1.gif', h: 84, hp: 5000, t: '关底 Boss，血量与压迫感都是 Boss 级' },
            { n: '巨人僵尸', img: ZB + 'Zombie/Zombie.gif', h: 104, dark: true, hp: 4000, t: '2 倍体型重锤砸扁植物，过半血掷出小鬼' },
            { n: '冰车僵尸', img: ZB + 'Zomboni/1.gif', h: 90, ice: true, hp: 1300, t: '体型巨大的冰车，碾压植物不留啃痕，驶过之处留下冰道（冰面无法种植，30 秒融化，火爆辣椒可烧毁）；只有地刺能扎爆它' },
            { n: '橄榄球僵尸', img: ZB + 'FootballZombie/FootballZombie.gif', h: 72, hp: 1600, t: '速度 40 的重装骑兵，头盔 1400 护甲' },
            { n: '铁桶僵尸', img: ZB + 'BucketheadZombie/BucketheadZombie.gif', h: 70, hp: 1300, t: '铁桶 1100 护甲，桶掉后与普通僵尸无异' },
            { n: '铁门僵尸', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, hp: 1300, t: '铁门挡正面直射；投手/孢子类破甲攻击无视它' },
            { n: '舞王僵尸', img: ZB + 'DancingZombie/DancingZombie.gif', h: 72, hp: 500, t: '每 10 秒召唤一排伴舞' },
            { n: '伴舞僵尸', img: ZB + 'BackupDancer/BackupDancer.gif', h: 70, hp: 200, t: '舞王召唤的随从，成群出现' },
            { n: '撑杆僵尸', img: ZB + 'PoleVaultingZombie/PoleVaultingZombie.gif', h: 74, hp: 500, t: '高速冲来，跳过遇到的第一株植物（高坚果跳不过去）' },
            { n: '读报僵尸', img: ZB + 'NewspaperZombie/HeadWalk1.gif', h: 70, hp: 300, t: '报纸 150 护甲，打碎后狂暴加速' },
            { n: '路障僵尸', img: ZB + 'ConeheadZombie/ConeheadZombie.gif', h: 70, hp: 560, t: '路障 360 护甲，基础加强版' },
            { n: '旗帜僵尸', img: ZB + 'FlagZombie/FlagZombie.gif', h: 70, hp: 200, t: '「一大波僵尸」的先导，举旗领军' },
            { n: '普通僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 200, t: '最普通的僵尸，啃食植物缓慢前进' },
            { n: '小鬼僵尸', img: ZB + 'Imp/Zombie.gif', h: 52, hp: 100, t: '只有半个普通僵尸高，又小又快，巨人抛投的常客' },
        ]},
        { title: '砸罐子', list: [
            { n: '锤子僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, hammer: true, hp: 560, t: '手持木锤，一路替你（或敌人）锤碎沿途罐子' },
            { n: '小丑盒僵尸', img: ZB + 'JackinTheBoxZombie/Walk.gif', h: 70, hp: 500, t: '抱着玩偶盒前进，随时开盒自爆，炸毁 3×3 内植物' },
            { n: '铁梯僵尸', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, hp: 500, t: '速度快，架梯翻过坚果墙类防御' },
            { n: '撑杆僵尸', img: ZB + 'PoleVaultingZombie/PoleVaultingZombie.gif', h: 74, hp: 340, t: '高速冲来，一路蹦跳着越过所有植物，连高坚果都拦不住' },
        ]},
        { title: '植物头 · 特殊僵尸', list: [
            { n: '高坚果头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 74, head: { src: PL + 'TallNut/TallNut.gif', cw: 83, ch: 119, keepTop: 1.0, w: 40, y: 0, ox: 10 }, hp: 5200, t: '高坚果罩在身上，全游戏最厚血量之一' },
            { n: '坚果头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'WallNut/WallNut.gif', cw: 65, ch: 73, keepTop: 1.0, w: 42, y: 3, ox: 10 }, hp: 2600, t: '坚果墙盖在身上，普通输出打不动' },
            { n: '机枪头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'GatlingPea/GatlingPea.gif', cw: 88, ch: 84, keepTop: 0.51, w: 46, y: 8, ox: 12 }, hp: 200, t: '头顶机枪射手，边走边 4 连发反击' },
            { n: '寒冰头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'SnowPea/SnowPea.gif', cw: 71, ch: 71, keepTop: 0.52, w: 40, y: 8, ox: 12 }, hp: 200, t: '头顶寒冰射手，樱桃 / 辣椒等一次性炸弹对它全部免疫，只能用普通火力磨' },
            { n: '火爆辣椒头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'Jalapeno/Jalapeno.gif', cw: 68, ch: 89, keepTop: 1.0, w: 34, y: 0, ox: 12 }, hp: 600, t: '连吃 2 株植物后引爆整行' },
            { n: '豌豆头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'Peashooter/Peashooter.gif', cw: 71, ch: 71, keepTop: 0.52, w: 38, y: 8, ox: 12 }, hp: 200, t: '头顶豌豆射手，边走边向植物开火' },
            { n: '向日葵头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'SunFlower/SunFlower1.gif', cw: 73, ch: 74, keepTop: 0.58, w: 38, y: 5, ox: 12 }, hp: 200, t: '被打死后头顶向日葵掉落一撮阳光' },
            { n: '盲盒僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, gift: true, hp: 200, t: '扛着神秘礼盒，死后打开随机放出一僵尸' },
        ]},
        { title: '有趣的配饰', list: [
            { n: '木锤', img: ZB + 'HammerZombie/Hammer.png', ih: 54, t: '锤子僵尸的配饰，一锤一个罐子' },
            { n: '植物罐', img: 'assets/images/Vase/Vase_Plant.png', ih: 58, t: '绿罐，稳赚的植物' },
            { n: '僵尸罐', img: 'assets/images/Vase/Vase_Zombie.png', ih: 58, t: '红色陶罐——敲开会蹦出僵尸偷袭，看到它先修好防线；路灯花可以提前照亮确认' },
            { n: '问号罐', img: 'assets/images/Vase/Vase_Question.png', ih: 58, t: '随机开出植物 / 僵尸，偶尔是一撮阳光（+50）——真正的惊喜罐' },
            { n: '金罐', img: 'assets/images/Vase/Vase_Gold.png', ih: 58, t: '地狱限定：必出强力植物或强化僵尸' },
            { n: '冰道', img: ZB + 'Zomboni/ice.png', ih: 44, t: '冰车僵尸驶过草坪留下的冰道（游戏实装）：冰面上无法种植，约 30 秒后融化；火爆辣椒可以直接烧毁整行冰道' },
        ]},
    ];

    // ================= UI =================
    const CSS = `
    .title-row { display: flex; align-items: center; justify-content: center; gap: 22px; }
    #btn-help-guide {
        display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
        padding: 8px 20px;
        font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif;
        font-size: 19px; font-weight: 900; letter-spacing: 2px;
        color: #f7e9c0; cursor: pointer; vertical-align: middle;
        background: linear-gradient(180deg, #7a5a33 0%, #5d4223 60%, #4a331b 100%);
        border: 3px solid #3a2812; border-radius: 12px;
        box-shadow: inset 0 2px 0 rgba(255,235,180,.25), 0 5px 12px rgba(0,0,0,.45);
        text-shadow: 1px 1px 0 #2a1c0c;
        transition: transform .12s ease, filter .12s ease;
    }
    #btn-help-guide:hover { transform: translateY(-2px); filter: brightness(1.1); }
    #btn-help-guide .hg-ico { font-size: 19px; }
    #help-modal { position: absolute; inset: 0; z-index: 2600; display: none;
        align-items: center; justify-content: center; background: rgba(0,0,0,.8); }
    #help-panel { width: 920px; max-width: 96vw; max-height: 90vh; display: flex; flex-direction: column;
        background: linear-gradient(180deg, #fdf3d0 0%, #f3e2ab 78%, #e6cf8c 100%);
        border: 6px solid #6b4a22; border-radius: 18px;
        box-shadow: inset 0 0 0 2px #caa95f, inset 0 0 24px rgba(120,80,20,.18), 0 14px 34px rgba(0,0,0,.5);
        font-family: 'PingFang SC','Microsoft YaHei',sans-serif; overflow: hidden; position: relative; }
    .hg-head { padding: 14px 20px 0; text-align: center; }
    .hg-title { font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 27px; font-weight: 900;
        letter-spacing: 3px; color: #4a3414; text-shadow: 1px 1px 0 rgba(255,255,255,.7); }
    .hg-tabs { display: flex; gap: 10px; justify-content: center; margin: 12px 0 0; }
    .hg-tab { padding: 8px 26px; font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 18px;
        font-weight: 900; letter-spacing: 2px; color: #6d5626; background: rgba(255,255,255,.4);
        border: 2px solid #b3945c; border-bottom: none; border-radius: 12px 12px 0 0; cursor: pointer; }
    .hg-tab.active { color: #3f6e1f; background: #fbf6e4; box-shadow: 0 -3px 8px rgba(0,0,0,.08); }
    #help-body { flex: 1; overflow-y: auto; padding: 12px 22px 18px; background: #fbf6e4; border-top: 2px solid #b3945c; }
    .hg-mode { background: rgba(255,255,255,.55); border: 1px solid #d8c290; border-radius: 12px;
        padding: 9px 14px; margin-bottom: 9px; display: flex; gap: 12px; align-items: flex-start; }
    /* v3.50.0：我是僵尸段落不带边框盒子（用户要求） */
    .hg-mode.hg-plain { background: transparent; border: none; box-shadow: none; }
    .hg-mode-ico { width: 44px; height: 44px; object-fit: contain; flex: 0 0 44px; margin-top: 3px;
        filter: drop-shadow(0 2px 3px rgba(60,40,10,.35)); }
    .hg-mode-emoji { display: inline-flex; align-items: center; justify-content: center; font-size: 34px; }
    .hg-mode-body { flex: 1; min-width: 0; }
    .hg-mode h4 { margin: 0 0 5px; font-size: 17px; color: #3f6e1f; letter-spacing: 1px; }
    .hg-mode ul { margin: 0; padding-left: 20px; }
    .hg-mode li { font-size: 13.5px; line-height: 1.7; color: #5a4a28; }
    .hg-group { display: flex; align-items: center; gap: 12px; margin: 14px 0 8px; }
    .hg-group-tag { font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 20px; font-weight: 900;
        letter-spacing: 3px; color: #fff8e2; background: linear-gradient(180deg,#7fa050 0%,#5d7c34 100%);
        border: 2px solid #46611f; border-radius: 10px; padding: 4px 22px; text-shadow: 1px 1px 0 #33501a; }
    .hg-group-tag.hg-orange { background: linear-gradient(180deg,#cf8a3c 0%,#a5651f 100%); border-color: #7c4a12; text-shadow: 1px 1px 0 #6b3d0d; }
    .hg-group-tag.hg-red { background: linear-gradient(180deg,#b05656 0%,#8a3232 100%); border-color: #6b2222; text-shadow: 1px 1px 0 #5a1a1a; }
    .hg-group-line { flex: 1; height: 2px; background: linear-gradient(90deg, #c9ab72, rgba(201,171,114,0)); border-radius: 2px; }
    .hg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
    .hg-tile { display: flex; flex-direction: column; align-items: center; padding: 7px 4px 5px;
        background: rgba(255,255,255,.5); border: 1px solid #d8c290; border-radius: 10px; cursor: pointer; }
    .hg-tile:hover { background: #fff; border-color: #b3945c; box-shadow: 0 3px 8px rgba(90,60,20,.22); }
    .hg-art { position: relative; width: 100px; height: 86px; display: flex; align-items: flex-end; justify-content: center; }
    .hg-art-sm { height: 66px; }
    /* 卡面彩色段原始比例 = 100×60（5:3，与游戏内 .seed-card 65×39 一致），禁止拉伸 */
    .hg-card { width: 96px; height: 58px; background-size: 100% 200%; background-position: top; background-repeat: no-repeat;
        border-radius: 7px; border: 1px solid rgba(90,60,20,.4); box-shadow: 0 2px 4px rgba(60,40,10,.25); }
    .hg-card-ov { position: absolute; right: 1px; bottom: 1px; width: 58px; aspect-ratio: 5/3; pointer-events: none;
        background-size: 100% 200%; background-position: top; background-repeat: no-repeat;
        border-radius: 4px; border: 1px solid rgba(90,60,20,.45); }
    .hg-zbody { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); image-rendering: auto; z-index: 1; }
    .hg-zice { position: absolute; bottom: 16px; left: calc(50% + 4px); z-index: 0; opacity: .92; }
    /* v3.50.0：植物头必须盖在僵尸本体之上（zbody z=1）——旧版无 z-index 时头贴片被身体盖住，
       图鉴里看起来"植物头躲在僵尸头后面"（用户反馈），这里提到 2 */
    .hg-zhead { position: absolute; overflow: hidden; pointer-events: none; z-index: 2; }
    .hg-zhead img { position: absolute; left: 0; top: 0; transform: scaleX(-1); }
    .hg-zhammer { position: absolute; bottom: 22px; left: calc(50% - 24px); width: 30px; transform: rotate(-40deg); z-index: 3; }
    /* v3.50.0：盲盒位置对齐头部（用户：盲盒应该在脑袋那部分）——从手部(bottom 20)上移到头顶 */
    .hg-zgift { position: absolute; bottom: 46px; left: calc(50% - 15px); width: 30px; z-index: 3; }
    /* v3.50.0：僵尸图鉴瓦片与植物卡面同款纸感背景框（用户：所有僵尸的图片背景与植物图片框相同） */
    .hg-art.hg-zcard { background: linear-gradient(180deg, #fffef7 0%, #f6eed6 100%);
        border: 1px solid rgba(90,60,20,.4); border-radius: 7px; box-shadow: 0 2px 4px rgba(60,40,10,.25); }
    /* ===== v3.50.0 攻击方式演示（详情卡内的动态小剧场） ===== */
    /* v3.51.0：演示舞台加大（用户：演示里人和植物太小/看不出攻击方式），
       弹道改用真实子弹贴图（hd-proj），不再是清一色绿豌豆 CSS 圆点 */
    .hg-demo { position: relative; width: 100%; height: 96px; margin-top: 8px; overflow: hidden;
        background: linear-gradient(180deg, #d8ecc0 0%, #b8d98e 100%);
        border: 1.5px solid #8fae62; border-radius: 10px; }
    .hg-demo .hd-plant { position: absolute; left: 12px; bottom: 6px; height: 66px; }
    .hg-demo .hd-zombie { position: absolute; right: 14px; bottom: 6px; height: 68px; }
    .hg-demo .hd-pea { position: absolute; left: 58px; bottom: 40px; width: 14px; height: 14px; border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #b6f36a, #4f9a1f); box-shadow: 0 0 6px rgba(120,220,60,.8);
        animation: hd-fly 1.1s linear infinite; }
    .hg-demo .hd-pea.hd-ice { background: radial-gradient(circle at 35% 35%, #d4f4ff, #3f9ad0); box-shadow: 0 0 6px rgba(120,210,255,.9); }
    .hg-demo .hd-pea.hd-fire { background: radial-gradient(circle at 35% 35%, #ffe08a, #e05a12); box-shadow: 0 0 8px rgba(255,140,40,.9); }
    /* v3.51.0：真实子弹贴图（与场上 Projectile 同款素材） */
    .hg-demo img.hd-proj { position: absolute; left: 62px; bottom: 44px; object-fit: contain;
        animation: hd-fly 1.1s linear infinite; filter: drop-shadow(0 1px 2px rgba(40,60,10,.35)); }
    .hg-demo img.hd-proj.hd-lobimg { animation: hd-lob-fly 1.3s ease-in-out infinite; }
    @keyframes hd-fly { 0% { left: 58px; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: calc(100% - 70px); opacity: 0; } }
    .hg-demo .hd-lob { position: absolute; left: 58px; bottom: 40px; width: 18px; height: 18px; border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #dff0b0, #7aa53c);
        animation: hd-lob-fly 1.3s ease-in-out infinite; }
    @keyframes hd-lob-fly {
        0% { left: 58px; bottom: 44px; opacity: 0; } 10% { opacity: 1; }
        50% { bottom: 84px; } 90% { opacity: 1; }
        100% { left: calc(100% - 74px); bottom: 26px; opacity: 0; } }
    /* v3.51.0：路灯花专属演示——周围一圈小罐子被依次照亮（半透明露出内容） */
    .hg-demo .hd-vase { position: absolute; width: 30px; opacity: 1; transition: none;
        animation: hd-lit 2.4s ease-in-out infinite; }
    .hg-demo .hd-vase img { width: 100%; display: block; filter: drop-shadow(0 1px 2px rgba(40,24,4,.4)); }
    @keyframes hd-lit { 0%, 15% { opacity: 1; } 55%, 80% { opacity: .35; } 100% { opacity: 1; } }
    .hg-demo .hd-glow { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px;
        border-radius: 50%; background: radial-gradient(circle, rgba(255,240,150,.95) 0%, rgba(255,220,80,0) 70%);
        animation: hd-glow 2.4s ease-in-out infinite; }
    @keyframes hd-glow { 0%, 15% { transform: scale(.6); opacity: .4; } 60%, 80% { transform: scale(4.6); opacity: .95; } 100% { transform: scale(.6); opacity: .4; } }
    .hg-demo .hd-boom { position: absolute; right: 26px; bottom: 8px; width: 44px; height: 44px; border-radius: 50%;
        background: radial-gradient(circle, #fff3b0 0%, #ff9d2e 45%, rgba(255,80,20,.0) 72%);
        opacity: 0; transform: scale(.3); animation: hd-boom 1.6s ease-out infinite; }
    @keyframes hd-boom { 0%, 55% { opacity: 0; transform: scale(.3); } 62% { opacity: 1; transform: scale(1.15); }
        78% { opacity: .85; transform: scale(1.35); } 100% { opacity: 0; transform: scale(1.6); } }
    .hg-demo .hd-sun { position: absolute; left: 50%; top: -18px; width: 26px; height: 26px; margin-left: -13px; border-radius: 50%;
        background: radial-gradient(circle at 40% 40%, #fff3a0, #ffc400); box-shadow: 0 0 10px rgba(255,200,40,.9);
        animation: hd-sun-fall 1.8s linear infinite; }
    @keyframes hd-sun-fall { 0% { top: -18px; opacity: 0; } 15% { opacity: 1; } 100% { top: 66px; opacity: .2; } }
    .hg-demo .hd-chomp { animation: hd-chomp 1.6s ease-in-out infinite; }
    @keyframes hd-chomp { 0%, 55% { transform: translateX(0); } 62% { transform: translateX(-10px); } 72% { transform: translateX(-4px); } 100% { transform: translateX(0); } }
    .hg-demo .hd-eat { animation: hd-eat 1.2s ease-in-out infinite; }
    @keyframes hd-eat { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-7px); } }
    .hg-demo .hd-shake { animation: hd-shake 1.2s ease-in-out infinite; }
    @keyframes hd-shake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
    .hg-demo .hd-cap { position: absolute; left: 8px; top: 5px; font-size: 11.5px; font-weight: 700; color: #3f5a1e;
        background: rgba(255,255,255,.72); border-radius: 999px; padding: 1px 9px; }
    /* v3.44.0 融合"场上实拍"容器：flex 居中一个 0×0 缩放锚点 */
    .hg-lawn { position: relative; width: 100px; height: 64px; display: flex; align-items: center; justify-content: center; }
    .hg-lawn-d { width: 200px; height: 112px; }
    .hg-tname { margin-top: 4px; font-size: 12.5px; font-weight: 700; color: #4a3414; text-align: center; line-height: 1.25; }
    .hg-tsub { font-size: 11px; color: #8a6d3b; margin-top: 1px; }
    .hg-tip { font-size: 12px; color: #8a6d3b; margin: 10px 0 2px; text-align: center; }
    .hg-foot { padding: 10px; text-align: center; }
    #help-close { padding: 8px 44px; font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 18px;
        font-weight: 900; letter-spacing: 3px; color: #f7e9c0; cursor: pointer;
        background: linear-gradient(180deg, #7a5a33 0%, #5d4223 100%);
        border: 3px solid #3a2812; border-radius: 10px; text-shadow: 1px 1px 0 #2a1c0c; }
    #help-close:hover { filter: brightness(1.12); }
    /* ===== v3.40.0 点击详情卡 —— v3.42.0 中等化：不再全屏铺满，改为居中紧凑卡片 ===== */
    #hg-detail { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
        z-index: 8; display: none; flex-direction: column; align-items: center; justify-content: flex-start;
        width: min(500px, 86%); max-height: 90%; overflow-y: auto; padding: 16px 18px 14px; text-align: center;
        background: linear-gradient(180deg, #fdf3d0 0%, #f3e2ab 78%, #e6cf8c 100%);
        border: 3px solid #8a6a3a; border-radius: 14px; box-shadow: 0 10px 30px rgba(40,24,4,.5); }
    .hg-d-art { position: relative; width: 210px; height: 122px; display: flex; align-items: flex-end; justify-content: center; }
    .hg-d-card { width: 138px; height: 83px; background-size: 100% 200%; background-position: top; background-repeat: no-repeat;
        border-radius: 8px; border: 2px solid rgba(90,60,20,.4); box-shadow: 0 4px 10px rgba(60,40,10,.28); }
    .hg-d-card-ov { position: absolute; right: 18px; bottom: 3px; width: 78px; aspect-ratio: 5/3; pointer-events: none;
        background-size: 100% 200%; background-position: top; background-repeat: no-repeat;
        border-radius: 5px; border: 1.5px solid rgba(90,60,20,.45); }
    .hg-d-name { font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 21px; font-weight: 900;
        letter-spacing: 2px; color: #4a3414; margin-top: 4px; }
    .hg-d-badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 8px 0 2px; }
    .hg-badge { display: inline-flex; align-items: center; padding: 4px 10px; font-size: 12.5px; font-weight: 700;
        color: #4a3414; background: rgba(255,255,255,.75); border: 1.5px solid #b3945c; border-radius: 999px; }
    .hg-d-desc { font-size: 13.5px; color: #5a4a28; line-height: 1.7; margin: 6px 0 2px; }
    #hg-d-back { margin-top: 10px; padding: 6px 30px; font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif;
        font-size: 15px; font-weight: 900; letter-spacing: 3px; color: #f7e9c0; cursor: pointer;
        background: linear-gradient(180deg, #7a5a33 0%, #5d4223 100%);
        border: 3px solid #3a2812; border-radius: 10px; text-shadow: 1px 1px 0 #2a1c0c; }
    #hg-d-back:hover { filter: brightness(1.12); }
    `;

    const cardUrl = g => `url('${CARD}${g}.png${V}')`;
    const DETAILS = {};   // data-k -> 详情 HTML

    function badge(txt) { return '<span class="hg-badge">' + txt + '</span>'; }

    // ===== 详情卡内容 =====
    // v3.44.0 融合株"场上实拍"渲染：0×0 锚点 + 主体/叠加层按实机 transform/clip/filter 原样复刻，
    // 整体 scale = 目标边长 / 素材最大边（实机 translate 数值以原尺寸为准，等比缩放不变形）
    function lawnStage(f, target) {
        const sc = (target / (f.md || 96)).toFixed(3);
        let h = '';
        if (f.base) h += '<img src="' + f.base + V + '" style="position:absolute;transform:translate(-50%,-50%) ' + (f.bt || '') + ';' +
            (f.bf ? 'filter:' + f.bf + ';' : '') + (f.bc ? 'clip-path:' + f.bc + ';' : '') + '">';
        if (f.ov) h += '<img src="' + f.ov + V + '" style="position:absolute;transform:translate(-50%,-50%) ' + (f.ot || '') + ';' +
            (f.oc ? 'clip-path:' + f.oc + ';' : '') + (f.of ? 'filter:' + f.of + ';' : '') + '">';
        // v3.52.0：第二叠加层（冰火两重天双半剖分 / 藤上双坚果等）
        if (f.ov2) h += '<img src="' + f.ov2 + V + '" style="position:absolute;transform:translate(-50%,-50%) ' + (f.ot2 || '') + ';' +
            (f.oc2 ? 'clip-path:' + f.oc2 + ';' : '') + (f.of2 ? 'filter:' + f.of2 + ';' : '') + '">';
        return '<div style="position:relative;width:0;height:0;transform:scale(' + sc + ');">' + h + '</div>';
    }

    // v3.50.0：经典植物详情图 → 原版动态 gif（用户：静态图改成动态的，展现怎么进攻/承受伤害）。
    // 个别素材文件名与卡面名不同（向日葵/双子/投手 png 等），逐一映射；查不到回退卡面。
    const GIF_MAP = {
        SunFlower: 'SunFlower/SunFlower1.gif',
        TwinSunflower: 'TwinSunflower/TwinSunflower1.gif',
        KernelPult: 'KernelPult/KernelPult.png',
        CabbagePult: 'CabbagePult/CabbagePult.png',
        MelonPult: 'MelonPult/MelonPult.png',
        WinterMelon: 'WinterMelon/WinterMelon.png',
        PlantBox: 'PlantBox/GiftBox.png'
    };
    const gifUrl = g => PL + (GIF_MAP[g] || (g + '/' + g + '.gif'));

    // v3.50.0：攻击方式演示小剧场（用户：展示它的爆炸过程/攻击方式和方法）。
    // 依植物特性自动选剧本：shoot=豌豆飞行 / lob=抛物线投掷 / bomb=爆炸闪光 /
    // sun=阳光掉落 / chomp=吞噬啃咬 / wall=纯肉盾（僵尸啃食晃动）。
    function inferAtk(p) {
        const n = p.n || '', t = p.t || '';
        if (p.g === 'Plantern' || /路灯/.test(n)) return 'light';   // v3.51.0：路灯花=照亮演示，不是直线射击
        if (/炸弹|辣椒|毁灭菇|地雷|窝瓜|弹跳|加农炮/.test(n) || /全屏|1800/.test(t)) return 'bomb';
        if (/投手|加农|卷心菜|玉米|堡垒/.test(n)) return 'lob';
        if (/向日葵|阳光菇|阳光雨/.test(n) && !/豌豆/.test(n)) return 'sun';
        if (/大嘴/.test(n)) return 'chomp';
        if (/坚果|墙|南瓜|大蒜/.test(n) && !/射手|投手|猫尾/.test(n)) return 'wall';
        if (/蘑菇|地刺/.test(n)) return 'shoot';
        return 'shoot';
    }
    // v3.51.0：演示弹道用"植物原本的子弹"贴图（与场上 Projectile 同素材），
    // 依名字映射：冰西瓜→整颗冰瓜 / 猫尾→尖刺 / 杨桃→五角星 / 玉米→玉米粒 / 火系→火焰豌豆…
    const VASE_IMG = 'assets/images/Vase/';
    function projFor(p) {
        const n = p.n || '';
        if (/爆米花/.test(n)) return { img: PL + 'KernelPult/Kernel.png', lob: 1, w: 24, hue: 'hue-rotate(-18deg) saturate(1.9) brightness(1.18)' };
        if (/西瓜/.test(n)) return /冰/.test(n) ? { img: PL + 'MelonPult/WinterMelon.png', lob: 1, w: 30 } : { img: PL + 'MelonPult/Melon.png', lob: 1, w: 30 };
        if (/双果/.test(n)) return /冰/.test(n) ? { img: PL + 'MelonPult/WinterMelon.png', lob: 1, w: 30 } : { img: PL + 'MelonPult/Melon.png', lob: 1, w: 30 };
        if (/杨桃/.test(n)) return { img: PL + 'Starfruit/Star.gif', w: 24 };
        if (/猫尾/.test(n)) return { img: PL + 'Cactus/Projectile32.png', w: 20, ice: /冰|寒冰/.test(n) };
        if (/卷心菜/.test(n)) return { img: PL + 'CabbagePult/Cabbage.png', lob: 1, w: 26, ice: /寒冰/.test(n) };
        if (/玉米/.test(n)) return { img: PL + 'KernelPult/Kernel.png', lob: 1, w: 22 };
        if (/樱桃/.test(n)) return { img: PL + 'PB10.gif', w: 18, hue: 'hue-rotate(-15deg) saturate(1.8)' };
        if (/冰蒜卫士/.test(n)) return { img: PL + 'PB-10.gif', w: 18 };          // 冰蒜卫士实际射冰豌豆
        if (/蒜味喷雾|胆小蒜/.test(n)) return { img: PL + 'ShroomBullet.gif', w: 20 };
        if (/火|炎|炬/.test(n)) return { img: PL + 'PB10.gif', w: 18 };
        if (/蘑菇|喷菇|忧郁/.test(n)) return { img: PL + 'ShroomBullet.gif', w: 20 };
        if (/冰|寒冰/.test(n)) return { img: PL + 'PB-10.gif', w: 18 };
        return { img: PL + 'PB00.gif', w: 18 };
    }
    function attackDemo(p, atk) {
        const plantImg = p.gifSrc || (p.base ? p.base : '');
        const fire = /火焰|烈焰|火炬|爆米花/.test(p.n || '') ? ' hd-fire' : '';
        const plant = plantImg ? '<img class="hd-plant" src="' + plantImg + V + '">' : '';
        const zombie = '<img class="hd-zombie' + (atk === 'wall' ? ' hd-eat' : '') + '" src="' + ZB + 'Zombie/Zombie.gif' + V + '">';
        let inner = '';
        if (atk === 'light') {
            // v3.51.0 路灯花：不是直线射击——周围放一圈小罐子，灯光扫过罐子变半透明（照亮）
            inner = plant +
                '<div class="hd-glow"></div>' +
                '<div class="hd-vase" style="left:calc(50% - 60px);top:6px;"><img src="' + VASE_IMG + 'Vase_Question.png' + V + '"></div>' +
                '<div class="hd-vase" style="left:calc(50% + 32px);top:10px;animation-delay:.3s;"><img src="' + VASE_IMG + 'Vase_Question.png' + V + '"></div>' +
                '<div class="hd-vase" style="left:calc(50% - 74px);bottom:4px;animation-delay:.6s;"><img src="' + VASE_IMG + 'Vase_Plant.png' + V + '"></div>' +
                '<div class="hd-vase" style="left:calc(50% + 46px);bottom:2px;animation-delay:.9s;"><img src="' + VASE_IMG + 'Vase_Zombie.png' + V + '"></div>';
        } else if (atk === 'shoot' || atk === 'lob') {
            const pr = projFor(p);
            const st = 'width:' + pr.w + 'px;height:' + pr.w + 'px;' +
                (pr.hue ? 'filter:' + pr.hue + ';' : '') +
                (pr.ice ? 'filter:brightness(1.25) hue-rotate(160deg) saturate(1.9);' : '');
            inner = plant + zombie + '<img class="hd-proj' + (pr.lob ? ' hd-lobimg' : '') + '" src="' + pr.img + V + '" style="' + st + '">';
        }
        else if (atk === 'bomb') inner = plant + zombie + '<div class="hd-boom"></div>';
        else if (atk === 'sun') inner = plant + zombie + '<div class="hd-sun"></div>';
        else if (atk === 'chomp') inner = '<img class="hd-plant hd-chomp" src="' + plantImg + V + '">' + zombie;
        else inner = '<img class="hd-plant hd-shake" src="' + plantImg + V + '">' + zombie;
        const cap = { shoot: '🏹 攻击演示：直线射击', lob: '🎯 攻击演示：抛射轰炸', bomb: '💥 爆炸过程演示', sun: '☀️ 阳光产出演示', chomp: '🕳️ 吞噬演示', wall: '🛡️ 承伤演示：肉盾扛啃', light: '💡 演示：照亮周围一圈罐子' };
        return '<div class="hg-demo"><span class="hd-cap">' + (cap[atk] || cap.shoot) + '</span>' + inner + '</div>';
    }

    function plantDetail(p, fusion) {
        let art;
        if (fusion) {
            art = '<div class="hg-lawn hg-lawn-d">' + lawnStage(p, 104) + '</div>';
        } else {
            // v3.50.0：动态 gif 替代静态卡面；v3.51.0 路灯花素材画布 250×237 但花朵只有 81×88，
            // 110px 限高下花朵只有 ~40px —— 单独放宽到 240px 才与其他植物等大观感
            p.gifSrc = gifUrl(p.g);
            const dh = (p.g === 'Plantern') ? 240 : 110;
            art = '<img src="' + p.gifSrc + V + '" style="max-height:' + dh + 'px;max-width:180px;object-fit:contain;' +
                'filter:drop-shadow(0 3px 5px rgba(60,40,10,.3));">';
        }
        let bs = '';
        if (fusion) {
            bs += badge('🧬 融合植物');
        } else {
            bs += badge('☀ 阳光 ' + p.c);
            bs += badge('⏳ 冷却 ' + p.cd + ' 秒');
            bs += badge('❤️ 耐久 ' + p.hp);
        }
        bs += badge('📖 ' + (fusion ? '手套融合获得' : '经典选卡'));
        const demo = attackDemo(p, fusion ? inferAtk(p) : inferAtk(p));
        return '<div class="hg-d-art">' + art + '</div>' +
            '<div class="hg-d-name">' + p.n + '</div>' +
            '<div class="hg-d-badges">' + bs + '</div>' +
            '<div class="hg-d-desc">' + (p.t || '') + '</div>' + demo;
    }

    // 僵尸大图：本体 + （可选）冰道 / 头顶植物 / 锤子 / 礼盒，s=放大倍数
    // v3.43.0：head 支持 y=贴片显示顶部(px@h70) ox=水平中心偏移(px@h70) —— 坚果/高坚果缩成
    // "头顶小贴片"露出僵尸本体；射手类头 keepTop 收紧后根茎一点不露；冰车带冰道层。
    function zombieArt(z, s) {
        const h = Math.round((z.h || 70) * s);
        let art = '';
        if (z.ice) art += '<img class="hg-zice" src="' + ZB + 'Zomboni/ice.png' + V + '" style="width:' + Math.round(52 * s) + 'px;">';
        art += '<img class="hg-zbody" src="' + z.img + V + '" style="height:' + h + 'px;' +
            (z.dark ? 'filter:brightness(.72) contrast(1.25);' : '') + '">';
        if (z.head) {
            const c = z.head;
            const w = c.w * (h / 70);
            const boxH = Math.round(w * c.ch / c.cw * c.keepTop);
            const offX = (c.ox !== undefined ? c.ox : 6) * (h / 70);
            const topPx = (c.y !== undefined ? c.y : 0) * (h / 70);
            art += '<div class="hg-zhead" style="width:' + Math.round(w) + 'px;height:' + boxH + 'px;' +
                'left:calc(50% - ' + Math.round(w / 2 - offX) + 'px);top:' + Math.round(topPx) + 'px;">' +
                '<img src="' + c.src + V + '" style="width:' + Math.round(w) + 'px;">' +
                '</div>';
        }
        if (z.hammer) art += '<img class="hg-zhammer" src="' + ZB + 'HammerZombie/Hammer.png' + V + '" style="width:' + Math.round(30 * s) + 'px;">';
        if (z.gift) art += '<img class="hg-zgift" src="' + PL + 'PlantBox/GiftBox.png' + V + '" style="width:' + Math.round(34 * s) + 'px;">';
        return art;
    }

    function zombieDetail(z, groupTitle) {
        let bs = '';
        if (z.hp) bs += badge('❤️ 血量 ' + z.hp);
        bs += badge('🧟 ' + groupTitle);
        const big = Math.min(115, Math.max(64, Math.round((z.h || 70) * 1.4)));
        const artH = big + 34;
        // v3.50.0：僵尸详情也带动态演示（啃食植物晃动 / 攻击方式说明）
        const demo = '<div class="hg-demo"><span class="hd-cap">🧟 行为演示：啃食植物前进</span>' +
            '<img class="hd-plant hd-shake" src="' + PL + 'WallNut/WallNut.gif' + V + '">' +
            '<img class="hd-zombie hd-eat" src="' + z.img + V + '" style="height:56px;filter:' + (z.dark ? 'brightness(.72) contrast(1.25);' : 'none') + '"></div>';
        return '<div class="hg-d-art" style="height:' + artH + 'px;">' + zombieArt(z, big / (z.h || 70)) + '</div>' +
            '<div class="hg-d-name">' + z.n + '</div>' +
            '<div class="hg-d-badges">' + bs + '</div>' +
            '<div class="hg-d-desc">' + (z.t || '') + '</div>' + demo;
    }

    function propDetail(z) {
        const big = Math.min(105, Math.max(60, (z.ih || 56) * 1.6));
        return '<div class="hg-d-art" style="height:' + (big + 30) + 'px;">' +
            '<img src="' + z.img + V + '" style="max-height:' + big + 'px;max-width:180px;object-fit:contain;"></div>' +
            '<div class="hg-d-name">' + z.n + '</div>' +
            '<div class="hg-d-badges">' + badge('🏷️ 道具配饰') + '</div>' +
            '<div class="hg-d-desc">' + (z.t || '') + '</div>';
    }

    // ===== 瓦片（点击 → 详情） =====
    function plantTile(p, fusion, key) {
        let art;
        if (fusion) {
            art = '<div class="hg-lawn">' + lawnStage(p, 60) + '</div>';
        } else {
            art = '<div class="hg-card" style="background-image:' + cardUrl(p.g) + '"></div>';
        }
        DETAILS[key] = plantDetail(p, fusion);
        return '<div class="hg-tile" data-k="' + key + '" title="' + (p.t || '') + '">' +
            '<div class="hg-art hg-art-sm">' + art + '</div>' +
            '<div class="hg-tname">' + p.n + '</div>' +
            '<div class="hg-tsub">' + (fusion ? '融合获得' : '☀ ' + p.c) + '</div>' +
            '</div>';
    }

    function zombieTile(z, key) {
        return '<div class="hg-tile" data-k="' + key + '" title="' + (z.hp ? '血量 ' + z.hp + ' · ' : '') + (z.t || '') + '">' +
            // v3.50.0：hg-zcard = 与植物卡面同款纸感背景框
            '<div class="hg-art hg-zcard">' + zombieArt(z, 1) + '</div>' +
            '<div class="hg-tname">' + z.n + '</div>' +
            '</div>';
    }

    function propTile(z, key) {
        return '<div class="hg-tile" data-k="' + key + '" title="' + (z.t || '') + '">' +
            '<div class="hg-art"><img src="' + z.img + V + '" style="max-height:' + (z.ih || 56) + 'px;max-width:80px;"></div>' +
            '<div class="hg-tname">' + z.n + '</div>' +
            '</div>';
    }

    // v3.50.0：每个玩法显示专属原版素材图标；plain=true 的段落（我是僵尸）不带边框盒子
    function renderModes() {
        return MODES.map(m =>
            '<div class="hg-mode' + (m.plain ? ' hg-plain' : '') + '">' +
            (m.img ? '<img class="hg-mode-ico" src="' + m.img + V + '" alt="">'
                   : (m.emoji ? '<span class="hg-mode-ico hg-mode-emoji">' + m.emoji + '</span>' : '')) +
            '<div class="hg-mode-body"><h4>' + m.icon + ' ' + m.title + '</h4><ul>' +
            m.items.map(it => '<li>' + it + '</li>').join('') + '</ul></div></div>'
        ).join('') +
        '<div class="hg-tip">※ 点击植物 / 僵尸 / 道具图片可查看详细数值与攻击方式演示。</div>';
    }

    function renderPlants() {
        for (const [i, p] of CLASSIC.entries()) plantTile(p, false, 'pc' + i);
        for (const [i, p] of FUSION.entries()) plantTile(p, true, 'pf' + i);
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map((p, i) => plantTile(p, false, 'pc' + i)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + FUSION.map((p, i) => plantTile(p, true, 'pf' + i)).join('') + '</div>' +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选 · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）</div>';
    }

    function renderZombies() {
        return Z_GROUPS.map((g, i) => {
            const tagCls = i === 1 ? 'hg-orange' : (i >= 2 ? 'hg-red' : '');
            return groupBar(g.title, tagCls) +
                '<div class="hg-grid">' + g.list.map((z, j) => {
                    const key = (i >= 3 ? 'a' : 'z') + i + '_' + j;
                    DETAILS[key] = i >= 3 ? propDetail(z) : zombieDetail(z, g.title);
                    return i >= 3 ? propTile(z, key) : zombieTile(z, key);
                }).join('') + '</div>';
        }).join('');
    }

    function groupBar(text, cls) {
        return '<div class="hg-group"><span class="hg-group-tag ' + cls + '">' + text + '</span>' +
            '<span class="hg-group-line"></span></div>';
    }

    function init() {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        // 标题旁入口按钮（title-row 由 index.html 提供：标题 + 按钮同一行，副标题仍在下方）
        const titleEl = document.querySelector('#start-menu .game-title');
        if (!titleEl) return;
        const btn = document.createElement('button');
        btn.id = 'btn-help-guide';
        btn.innerHTML = '<span class="hg-ico">📜</span>操作与道具说明';
        titleEl.parentNode.insertBefore(btn, titleEl.nextSibling);

        // 弹窗骨架（含 v3.40.0 详情卡覆盖层）
        const modal = document.createElement('div');
        modal.id = 'help-modal';
        modal.innerHTML =
            '<div id="help-panel">' +
                '<div class="hg-head">' +
                    '<div class="hg-title">操作与道具说明</div>' +
                    '<div class="hg-tabs">' +
                        '<div class="hg-tab active" data-tab="modes">玩法说明</div>' +
                        '<div class="hg-tab" data-tab="plants">植物图鉴（' + (CLASSIC.length + FUSION.length) + '）</div>' +
                        '<div class="hg-tab" data-tab="zombies">僵尸图鉴</div>' +
                    '</div>' +
                '</div>' +
                '<div id="help-body"></div>' +
                '<div class="hg-foot"><button id="help-close">返 回</button></div>' +
                '<div id="hg-detail"></div>' +
            '</div>';
        document.body.appendChild(modal);

        const body = modal.querySelector('#help-body');
        const detail = modal.querySelector('#hg-detail');
        const tabs = modal.querySelectorAll('.hg-tab');
        const contents = { modes: renderModes(), plants: renderPlants(), zombies: renderZombies() };
        tabs.forEach(t => t.addEventListener('click', () => {
            tabs.forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            body.innerHTML = contents[t.dataset.tab];
            body.scrollTop = 0;
        }));

        const openDetail = key => {
            if (!DETAILS[key]) return;
            detail.innerHTML = DETAILS[key] + '<button id="hg-d-back">返 回 图 鉴</button>';
            detail.style.display = 'flex';
            detail.querySelector('#hg-d-back').addEventListener('click', () => { detail.style.display = 'none'; });
        };
        body.addEventListener('click', e => {
            const tile = e.target.closest('.hg-tile');
            if (tile && tile.dataset.k) openDetail(tile.dataset.k);
        });
        const closeDetail = () => { detail.style.display = 'none'; };

        btn.addEventListener('click', () => {
            modal.style.display = 'flex';
            closeDetail();
            tabs[0].click();
        });
        modal.querySelector('#help-close').addEventListener('click', () => { modal.style.display = 'none'; closeDetail(); });
        modal.addEventListener('click', e => { if (e.target === modal) { modal.style.display = 'none'; closeDetail(); } });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (detail.style.display === 'flex') closeDetail();
                else modal.style.display = 'none';
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
