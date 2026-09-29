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

    // ================= 玩法说明（精简） =================
    const MODES = [
        { icon: '☀️', title: '通用操作', items: [
            '点击收集阳光 → 选卡片 → 点格子种植；铲子可移除植物。',
            '撑过所有波次即胜利；僵尸走进房子（或脑子被吃光）即失败。',
            '右上角 Speed 可切换游戏倍速。' ] },
        { icon: '🌻', title: '经典冒险', items: [
            '开局选最多 10 张卡：向日葵攒阳光，攻击/防御植物守住 5 条草坪。',
            '卡片有阳光价与冷却，冷却转圈结束后才能再次使用。',
            '冰车僵尸驶过的格子会结冰，冰面上无法种植，约 30 秒后融化；火爆辣椒可以直接烧毁整行冰道。' ] },
        { icon: '🧤', title: '融合进化', items: [
            '点手套进入拖拽状态，把一株植物拖到另一株上即融合（经典植物选卡栏全部可选，独特融合体靠配方）。',
            '炸弹爆炸会把 3×3 内有配方的植物直接融合；游戏内可点「融合配方大全」查全部秘方。' ] },
        { icon: '🏺', title: '砸罐子', items: [
            '点击罐子敲开：绿罐出植物、红罐出僵尸、问号罐随机（植物 / 僵尸 / 偶尔一撮阳光）；敲完全部罐子并清场即胜。',
            '难度分简单 / 困难 / 地狱；路灯花要花 75 阳光在种子栏购买，能照亮罐中内容。' ] },
        { icon: '🧟', title: '《我是僵尸》', items: [
            '阵营反转：花阳光买僵尸放到草坪上，吃掉全部脑子即胜。',
            '阳光 < 50 且场上无僵尸存活即判负；小心敌阵植物的反击防线。' ] },
    ];

    // ================= 植物图鉴 =================
    // 经典 = 选卡栏可直接选择（按厉害程度排序，经典/融合同一套选卡栏）；融合 = 只能通过手套融合获得
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
        { n: '西瓜猫尾草', base: PL + 'Cattail/Cattail.gif', ov: PL + 'MelonPult/MelonPult.png', ot: 'translate(-5px, -30px) scale(0.7)', md: 96, t: '西瓜投手+猫尾草：全场追踪 60+30' },
        { n: '樱桃射手', base: PL + 'Peashooter/Peashooter.gif', bf: 'hue-rotate(-45deg) saturate(2.0)', md: 71, t: '豌豆射手+樱桃炸弹：每第 10 发射出小樱桃，900 / 3×3' },
        { n: '冰杨桃', base: PL + 'Starfruit/Starfruit.gif', bf: 'brightness(1.1) hue-rotate(160deg) saturate(1.6)', md: 77, t: '寒冰射手+杨桃：五向冰晶 + 减速' },
        { n: '爆米花投手', base: PL + 'KernelPult/KernelPult.png', bf: 'hue-rotate(-18deg) saturate(1.9) brightness(1.18)', md: 96, t: '玉米投手+火爆辣椒：40 破甲 + 3×3 焦香溅射' },
        { n: '双料投手', base: PL + 'KernelPult/KernelPult.png', ov: PL + 'CabbagePult/CabbagePult.png', oc: 'polygon(0 0, 48% 0, 48% 50%, 0 50%)', ot: 'translate(37px, 8px)', md: 96, t: '玉米投手+卷心菜投手：两种弹药交替' },
        { n: '寒冰卷心菜', base: PL + 'CabbagePult/CabbagePult.png', bf: 'brightness(112%) hue-rotate(120deg) saturate(1.7)', md: 96, t: '卷心菜投手+寒冰菇：40 破甲 + 减速' },
        { n: '坚果射手', base: PL + 'WallNut/WallNut.gif', ov: PL + 'Peashooter/Peashooter.gif', oc: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', ot: 'translate(5px, -15px)', md: 71, t: '坚果墙+豌豆射手：能扛能打' },
        { n: '卷心菜堡垒', base: PL + 'WallNut/WallNut.gif', ov: PL + 'CabbagePult/CabbagePult.png', oc: 'polygon(0 0, 46% 0, 46% 46%, 0 46%)', ot: 'translate(26px, -4px)', md: 96, t: '坚果墙+卷心菜投手：肉盾+破甲投掷' },
        { n: '大嘴坚果', base: PL + 'WallNut/WallNut.gif', ov: PL + 'Chomper/Chomper.gif', oc: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', ot: 'translate(20px, -25px) scale(0.9)', md: 130, t: '坚果墙+大嘴花：4000 血又能吞' },
        { n: '钢刺高坚果', base: PL + 'TallNut/TallNut.gif', ov: PL + 'Spikerock/Spikerock.gif', ot: 'translate(0px, 58px)', md: 119, t: '高坚果+钢地刺：8000 血 + 脚下带刺' },
        { n: '寒冰坚果', base: PL + 'WallNut/WallNut.gif', bf: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', md: 73, t: '坚果墙+寒冰射手：啃它的人被冻慢' },
        { n: '地刺坚果', base: PL + 'WallNut/WallNut.gif', ov: PL + 'Spikeweed/Spikeweed.gif', ot: 'translate(0px, 48px)', md: 85, t: '坚果墙+地刺：啃它等于啃刺' },
        // v3.46.0：删除「坚果向日葵」（用户裁定外观太丑）
        { n: '毁灭向日葵', base: PL + 'SunFlower/SunFlower1.gif', bf: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', md: 74, t: '向日葵+毁灭菇：正常产阳光，被啃死时原地 1800 大爆炸' },
        { n: '豌豆向日葵', base: PL + 'SunFlower/SunFlower1.gif', ov: PL + 'Peashooter/Peashooter.gif', oc: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', ot: 'translate(0px, -20px)', md: 92, t: '向日葵+豌豆射手：产阳光还打人' },
        { n: '孢子地雷', base: PL + 'PotatoMine/PotatoMine.gif', ov: PL + 'PuffShroom/PuffShroom.gif', oc: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', ot: 'translate(0px, -30px) scale(0.9)', md: 75, t: '土豆地雷+小喷菇：廉价控场地雷' },
        // ===== v3.45.0 十一条新融合（用户批准名单）=====
        { n: '冰机枪射手', base: PL + 'GatlingPea/GatlingPea.gif', bf: 'brightness(1.15) hue-rotate(180deg) saturate(1.5)', md: 88, t: '机枪射手+寒冰射手：4 连发冰豌豆 20×4，命中减速 10 秒' },
        { n: '冰猫尾草', base: PL + 'Cattail/Cattail.gif', bf: 'brightness(1.2) hue-rotate(160deg) saturate(1.8)', md: 96, t: '猫尾草+寒冰射手：全场追踪冰刺 20，命中减速 10 秒' },
        { n: '冰忧郁菇', base: PL + 'GloomShroom/GloomShroom.gif', bf: 'brightness(1.15) hue-rotate(160deg) saturate(1.7)', md: 112, t: '忧郁菇+寒冰菇：3×3 冰雾 80/发，穿门且命中减速 10 秒' },
        { n: '十芒杨桃', base: PL + 'Starfruit/Starfruit.gif', bf: 'saturate(1.6) brightness(1.2) hue-rotate(15deg)', md: 77, t: '杨桃+杨桃：十方向 36° 均布齐射，每颗 40 穿透' },
        { n: '烈焰地雷', base: PL + 'PotatoMine/PotatoMine.gif', bf: 'hue-rotate(-30deg) saturate(2.2) brightness(1.15)', md: 75, t: '土豆地雷+火爆辣椒：布好后触发整行 1800 烈焰' },
        { n: '爆炸弹跳', base: PL + 'Squash/Squash.gif', bf: 'hue-rotate(-35deg) saturate(1.9)', bt: 'scale(2.75) translate(0px, -72px)', md: 226, t: '窝瓜+樱桃炸弹：跃起压扁，落点 3×3 爆炸 1800' },
        { n: '冰玉米投手', base: PL + 'KernelPult/KernelPult.png', bf: 'brightness(1.15) hue-rotate(160deg) saturate(1.8)', md: 96, t: '玉米投手+寒冰射手：玉米粒 20+减速，20% 黄油定身保留' },
        { n: '火焰地刺', base: PL + 'Spikeweed/Spikeweed.gif', bf: 'sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.15)', md: 85, t: '地刺+火炬树桩：灼烧刺 80 / 0.75s（普通地刺的 2 倍）' },
        { n: '火焰双发', base: PL + 'Repeater/Repeater.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.12)', md: 73, t: '双发射手+火炬树桩：2 连发火焰豌豆 40×2（豌豆过火炬=点燃）' },
        { n: '四头向日葵', base: PL + 'TwinSunflower/TwinSunflower1.gif', bf: 'saturate(1.35) brightness(1.12)', bt: 'scale(1.15)', ov: PL + 'TwinSunflower/TwinSunflower1.gif', ot: 'translate(10px, 6px) scaleX(-1) scale(1.15)', md: 84, t: '双子向日葵+双子向日葵：每轮 4 颗阳光共 100' },
        { n: '辣椒高坚果', base: PL + 'TallNut/TallNut.gif', bf: 'sepia(1) saturate(2.6) hue-rotate(-20deg) brightness(1.1)', md: 119, t: '高坚果+火爆辣椒：8000 血肉盾，啃它的僵尸每秒被烫 40' },
    ];
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
        padding: 9px 14px; margin-bottom: 9px; }
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
    .hg-zhead { position: absolute; overflow: hidden; pointer-events: none; }
    .hg-zhead img { position: absolute; left: 0; top: 0; transform: scaleX(-1); }
    .hg-zhammer { position: absolute; bottom: 22px; left: calc(50% - 24px); width: 30px; transform: rotate(-40deg); z-index: 2; }
    .hg-zgift { position: absolute; bottom: 20px; left: calc(50% - 17px); width: 34px; z-index: 2; }
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
            (f.bf ? 'filter:' + f.bf + ';' : '') + '">';
        if (f.ov) h += '<img src="' + f.ov + V + '" style="position:absolute;transform:translate(-50%,-50%) ' + (f.ot || '') + ';' +
            (f.oc ? 'clip-path:' + f.oc + ';' : '') + '">';
        return '<div style="position:relative;width:0;height:0;transform:scale(' + sc + ');">' + h + '</div>';
    }

    function plantDetail(p, fusion) {
        let art;
        if (fusion) {
            art = '<div class="hg-lawn hg-lawn-d">' + lawnStage(p, 104) + '</div>';
        } else {
            art = '<div class="hg-d-card" style="background-image:' + cardUrl(p.g) + '"></div>';
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
        return '<div class="hg-d-art">' + art + '</div>' +
            '<div class="hg-d-name">' + p.n + '</div>' +
            '<div class="hg-d-badges">' + bs + '</div>' +
            '<div class="hg-d-desc">' + (p.t || '') + '</div>';
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
        return '<div class="hg-d-art" style="height:' + artH + 'px;">' + zombieArt(z, big / (z.h || 70)) + '</div>' +
            '<div class="hg-d-name">' + z.n + '</div>' +
            '<div class="hg-d-badges">' + bs + '</div>' +
            '<div class="hg-d-desc">' + (z.t || '') + '</div>';
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
            '<div class="hg-art">' + zombieArt(z, 1) + '</div>' +
            '<div class="hg-tname">' + z.n + '</div>' +
            '</div>';
    }

    function propTile(z, key) {
        return '<div class="hg-tile" data-k="' + key + '" title="' + (z.t || '') + '">' +
            '<div class="hg-art"><img src="' + z.img + V + '" style="max-height:' + (z.ih || 56) + 'px;max-width:80px;"></div>' +
            '<div class="hg-tname">' + z.n + '</div>' +
            '</div>';
    }

    function renderModes() {
        return MODES.map(m =>
            '<div class="hg-mode"><h4>' + m.icon + ' ' + m.title + '</h4><ul>' +
            m.items.map(it => '<li>' + it + '</li>').join('') + '</ul></div>'
        ).join('') +
        '<div class="hg-tip">※ 点击植物 / 僵尸 / 道具图片可查看详细数值（阳光 / 冷却 / 耐久 / 血量 / 特性）。</div>';
    }

    function renderPlants() {
        for (const [i, p] of CLASSIC.entries()) plantTile(p, false, 'pc' + i);
        for (const [i, p] of FUSION.entries()) plantTile(p, true, 'pf' + i);
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map((p, i) => plantTile(p, false, 'pc' + i)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + FUSION.map((p, i) => plantTile(p, true, 'pf' + i)).join('') + '</div>' +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选（经典/融合同款选卡栏） · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）</div>';
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
