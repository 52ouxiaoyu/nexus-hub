// v3.39.0 主菜单「操作与道具说明」—— 图片网格版：
//   玩法说明（精简文字） / 植物图鉴（经典+融合 两组卡面网格，无长描述） /
//   僵尸图鉴（按模式分组：经典冒险 / 砸罐子 / 我是僵尸·敌阵 / 有趣的配饰，全部带图）
// 详细数值收进悬停 tooltip（title），页面只留名字与关键徽标。
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
            '卡片有阳光价与冷却，冷却转圈结束后才能再次使用。' ] },
        { icon: '🧤', title: '融合进化', items: [
            '点手套进入拖拽状态，把一株植物拖到另一株上即融合（选卡栏 15 种，其余全靠配方）。',
            '炸弹爆炸会把 3×3 内有配方的植物直接融合；游戏内可点「融合配方大全」查全部秘方。' ] },
        { icon: '🏺', title: '砸罐子', items: [
            '点击罐子敲开：绿罐出植物、红罐出僵尸、问号罐随机；敲完全部罐子并清场即胜。',
            '难度分简单 / 困难 / 地狱；路灯花要花 75 阳光在种子栏购买，能照亮罐中内容。' ] },
        { icon: '🧟', title: '《我是僵尸》', items: [
            '阵营反转：花阳光买僵尸放到草坪上，吃掉全部脑子即胜。',
            '阳光 < 50 且场上无僵尸存活即判负；小心植物头僵尸的反击防线。' ] },
    ];

    // ================= 植物图鉴 =================
    // 经典 = 经典选卡栏可直接选择（按厉害程度排序）；融合 = 只能通过融合获得
    // g=卡面素材名 c=阳光 t=tooltip
    const CLASSIC = [
        { n: '毁灭菇', g: 'DoomShroom', c: 125, t: '全屏 9999 秒杀；原地留陨石坑 30 秒' },
        { n: '樱桃炸弹', g: 'CherryBomb', c: 150, t: '1800 伤害 / 3×3，种下 1 秒后引爆' },
        { n: '火爆辣椒', g: 'Jalapeno', c: 125, t: '1800 伤害烧光一整行' },
        { n: '冰西瓜投手', g: 'WinterMelon', c: 200, t: '直击 60+溅射 30，命中减速 10 秒' },
        { n: '西瓜投手', g: 'MelonPult', c: 300, t: '抛射 60+溅射 30，无视铁门' },
        { n: '猫尾草', g: 'Cattail', c: 225, t: '全场自动追踪，20 伤 / 1.4s' },
        { n: '机枪射手', g: 'GatlingPea', c: 250, t: '4 连发×20 / 1.5s，单行持续输出' },
        { n: '三线射手', g: 'Threepeater', c: 300, t: '同时射上中下三行，每发 20' },
        { n: '寒冰菇', g: 'IceShroom', c: 75, t: '全屏冻结 + 减速 10 秒' },
        { n: '忧郁菇', g: 'GloomShroom', c: 150, t: '3×3 每 1s 八发×80，穿甲穿门近身绞肉机' },
        { n: '卷心菜投手', g: 'CabbagePult', c: 150, t: '抛射 40 破甲，护甲打不掉' },
        { n: '玉米投手', g: 'KernelPult', c: 175, t: '20 伤，20% 投黄油定身 3 秒' },
        { n: '火炬树桩', g: 'Torchwood', c: 175, t: '豌豆穿过点燃，伤害翻倍' },
        { n: '杨桃', g: 'Starfruit', c: 125, t: '五向×40 且可穿透' },
        { n: '双向豌豆', g: 'SplitPea', c: 125, t: '向前 20 / 向后 40' },
        { n: '双发豌豆', g: 'Repeater', c: 200, t: '每轮 2×20' },
        { n: '寒冰射手', g: 'SnowPea', c: 175, t: '20 伤 + 减速 10 秒' },
        { n: '豌豆射手', g: 'Peashooter', c: 100, t: '20 伤 / 1.5s，最基础的输出' },
        { n: '魅惑菇', g: 'HypnoShroom', c: 75, t: '啃食者被策反为你而战' },
        { n: '大蒜', g: 'Garlic', c: 50, t: '咬一口就换行，引导走位' },
        { n: '胆小菇', g: 'ScaredyShroom', c: 25, t: '20 伤，僵尸靠近会缩头暂停' },
        { n: '大嘴花', g: 'Chomper', c: 150, t: '整只吞噬（巨人除外），咀嚼 40 秒' },
        { n: '土豆地雷', g: 'PotatoMine', c: 25, t: '武装 15 秒，踩上即 1800 单体' },
        { n: '窝瓜', g: 'Squash', c: 50, t: '跃起压扁 1800，即种即用' },
        { n: '钢地刺', g: 'Spikerock', c: 125, t: '120 / 0.75s，不会被啃，扎爆冰车' },
        { n: '地刺', g: 'Spikeweed', c: 100, t: '40 / 0.75s，贴地不可被啃' },
        { n: '高坚果', g: 'TallNut', c: 125, t: '8000 耐久，撑杆/跳跳无法越过' },
        { n: '南瓜头', g: 'PumpkinHead', c: 125, t: '套在植物外的 4000 耐久护壳' },
        { n: '坚果墙', g: 'WallNut', c: 50, t: '4000 耐久纯肉盾' },
        { n: '双子向日葵', g: 'TwinSunflower', c: 150, t: '2×25 / 24s，经济翻倍' },
        { n: '向日葵', g: 'SunFlower', c: 50, t: '25 / 24s，开局必种' },
        { n: '阳光菇', g: 'SunShroom', c: 25, t: '15 起步，长大后 25 / 24s' },
        { n: '路灯花', g: 'Plantern', c: 75, t: '砸罐子限定：照亮周围罐子的内容' },
        { n: '大喷菇', g: 'FumeShroom', c: 75, t: '单行穿透孢子 4 发×20，无视铁门' },
        { n: '小喷菇', g: 'PuffShroom', c: 0, t: '完全免费的前排过渡' },
        { n: '植物盲盒', g: 'PlantBox', c: 500, t: '随机开出全植物池一株' },
    ];
    // 融合专属：p=主体卡面 q=副体卡面（右下角叠放，与游戏内融合卡面同规则）
    const FUSION = [
        { n: '玉米加农炮', g: 'CobCannon', t: '三株玉米投手合体，占两格；充能 25s 后手动瞄准 1800 / 3×3，全游戏最强单发' },
        { n: '寒冰炸弹', p: 'CherryBomb', q: 'SnowPea', t: '寒冰射手+樱桃炸弹：900 / 3×3 且全场减速' },
        { n: '冰西瓜猫尾草', p: 'Cattail', q: 'WinterMelon', t: '冰西瓜投手+猫尾草：全场追踪 60+30 + 减速' },
        { n: '西瓜猫尾草', p: 'Cattail', q: 'MelonPult', t: '西瓜投手+猫尾草：全场追踪 60+30' },
        { n: '樱桃射手', p: 'CherryBomb', q: 'Peashooter', t: '豌豆射手+樱桃炸弹：每第 10 发射出小樱桃，900 / 3×3' },
        { n: '冰杨桃', p: 'SnowPea', q: 'Starfruit', t: '寒冰射手+杨桃：五向冰晶 + 减速' },
        { n: '爆米花投手', p: 'KernelPult', q: 'Jalapeno', t: '玉米投手+火爆辣椒：40 破甲 + 3×3 焦香溅射' },
        { n: '双料投手', p: 'KernelPult', q: 'CabbagePult', t: '玉米投手+卷心菜投手：两种弹药交替' },
        { n: '寒冰卷心菜', p: 'CabbagePult', q: 'IceShroom', t: '卷心菜投手+寒冰菇：40 破甲 + 减速' },
        { n: '坚果射手', p: 'WallNut', q: 'Peashooter', t: '坚果墙+豌豆射手：能扛能打' },
        { n: '卷心菜堡垒', p: 'WallNut', q: 'CabbagePult', t: '坚果墙+卷心菜投手：肉盾+破甲投掷' },
        { n: '大嘴坚果', p: 'WallNut', q: 'Chomper', t: '坚果墙+大嘴花：4000 血又能吞' },
        { n: '钢刺高坚果', p: 'TallNut', q: 'Spikerock', t: '高坚果+钢地刺：8000 血 + 脚下带刺' },
        { n: '寒冰坚果', p: 'WallNut', q: 'SnowPea', t: '坚果墙+寒冰射手：啃它的人被冻慢' },
        { n: '地刺坚果', p: 'WallNut', q: 'Spikeweed', t: '坚果墙+地刺：啃它等于啃刺' },
        { n: '南瓜壳', p: 'WallNut', q: 'TallNut', t: '坚果墙+高坚果：套在任意植物外的 12000 超厚壳' },
        { n: '坚果向日葵', p: 'SunFlower', q: 'WallNut', t: '向日葵+坚果墙：能扛的发电机' },
        { n: '毁灭向日葵', p: 'SunFlower', q: 'DoomShroom', t: '向日葵+毁灭菇：正常产阳光，被啃死时原地 1800 大爆炸' },
        { n: '豌豆向日葵', p: 'SunFlower', q: 'Peashooter', t: '向日葵+豌豆射手：产阳光还打人' },
        { n: '孢子地雷', p: 'PotatoMine', q: 'PuffShroom', t: '土豆地雷+小喷菇：廉价控场地雷' },
    ];

    // ================= 僵尸图鉴（按模式分组，组内按厉害程度排序） =================
    // img=贴图 h=显示高度 head=头顶植物（与游戏内 createPlantHead 同款裁剪） acc=配饰 hp/ t=tooltip
    const Z_GROUPS = [
        { title: '经典冒险', list: [
            { n: '巨尸 Boss', img: ZB + 'LGBOSS/1.gif', h: 84, hp: 5000, t: '关底 Boss，血量与压迫感都是 Boss 级' },
            { n: '巨人僵尸', img: ZB + 'Zombie/Zombie.gif', h: 104, dark: true, hp: 4000, t: '2 倍体型重锤砸扁植物，过半血掷出小鬼' },
            { n: '冰车僵尸', img: ZB + 'Zomboni/1.gif', h: 66, hp: 1300, t: '碾压植物不留啃痕并留冰道，只有地刺能扎爆它' },
            { n: '橄榄球僵尸', img: ZB + 'FootballZombie/FootballZombie.gif', h: 70, acc: '🏈', hp: 1600, t: '速度 40 的重装骑兵，头盔 1400 护甲' },
            { n: '铁桶僵尸', img: ZB + 'BucketheadZombie/BucketheadZombie.gif', h: 70, acc: '🪣', hp: 1300, t: '铁桶 1100 护甲，桶掉后与普通僵尸无异' },
            { n: '铁门僵尸', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, acc: '🚪', hp: 1300, t: '铁门挡正面直射；投手/孢子类破甲攻击无视它' },
            { n: '舞王僵尸', img: ZB + 'DancingZombie/DancingZombie.gif', h: 72, hp: 500, t: '每 10 秒召唤一排伴舞' },
            { n: '伴舞僵尸', img: ZB + 'BackupDancer/BackupDancer.gif', h: 70, hp: 200, t: '舞王召唤的随从，成群出现' },
            { n: '撑杆僵尸', img: ZB + 'PoleVaultingZombie/PoleVaultingZombie.gif', h: 74, hp: 500, t: '高速冲来，跳过遇到的第一株植物' },
            { n: '读报僵尸', img: ZB + 'NewspaperZombie/HeadWalk1.gif', h: 70, acc: '📰', hp: 300, t: '报纸 150 护甲，打碎后狂暴加速' },
            { n: '路障僵尸', img: ZB + 'ConeheadZombie/ConeheadZombie.gif', h: 70, acc: '🚧', hp: 560, t: '路障 360 护甲，基础加强版' },
            { n: '旗帜僵尸', img: ZB + 'FlagZombie/FlagZombie.gif', h: 70, hp: 200, t: '「一大波僵尸」的先导，举旗领军' },
            { n: '普通僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, hp: 200, t: '最普通的僵尸，啃食植物缓慢前进' },
            { n: '小鬼僵尸', img: ZB + 'Imp/Zombie.gif', h: 42, hp: 100, t: '又小又快，巨人抛投的常客，一碰就碎' },
        ]},
        { title: '砸罐子', list: [
            { n: '锤子僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, hammer: true, hp: 560, t: '手持木锤，一路替你（或敌人）锤碎沿途罐子' },
            { n: '小丑盒僵尸', img: ZB + 'JackinTheBoxZombie/Walk.gif', h: 70, hp: 500, t: '抱着玩偶盒前进，随时开盒自爆，炸毁 3×3 内植物' },
            { n: '铁梯僵尸', img: ZB + 'ScreenDoorZombie/ScreenDoorZombie.gif', h: 70, acc: '🪜', hp: 500, t: '速度快，架梯翻过坚果墙类防御' },
            { n: '跳跳僵尸', img: ZB + 'PoleVaultingZombie/PoleVaultingZombieJump.gif', h: 62, hp: 340, t: '踩弹簧连续跳过植物，需高坚果才能拦住' },
        ]},
        { title: '我是僵尸 · 敌阵', list: [
            { n: '高坚果头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'TallNut/TallNut.gif', cw: 83, ch: 119, keepTop: 1.0, w: 58 }, hp: 5200, t: '头顶高坚果，全游戏最厚血量之一' },
            { n: '坚果头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'WallNut/WallNut.gif', cw: 65, ch: 73, keepTop: 1.0, w: 54 }, hp: 2600, t: '头顶坚果墙，普通输出打不动' },
            { n: '机枪头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'GatlingPea/GatlingPea.gif', cw: 88, ch: 84, keepTop: 0.74, w: 78 }, hp: 200, t: '头顶机枪射手，边走边 4 连发反击' },
            { n: '寒冰头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'SnowPea/SnowPea.gif', cw: 71, ch: 71, keepTop: 0.70, w: 74 }, hp: 200, t: '头顶寒冰射手，冰弹减速你的僵尸' },
            { n: '火爆辣椒头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'Jalapeno/Jalapeno.gif', cw: 68, ch: 89, keepTop: 1.0, w: 46 }, hp: 600, t: '连吃 2 株植物后引爆整行' },
            { n: '豌豆头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'Peashooter/Peashooter.gif', cw: 71, ch: 71, keepTop: 0.70, w: 76 }, hp: 200, t: '头顶豌豆射手，边走边向植物开火' },
            { n: '向日葵头僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, head: { src: PL + 'SunFlower/SunFlower1.gif', cw: 73, ch: 74, keepTop: 0.72, w: 78 }, hp: 200, t: '被打死后头顶向日葵掉落一撮阳光' },
            { n: '盲盒僵尸', img: ZB + 'Zombie/Zombie.gif', h: 70, gift: true, hp: 200, t: '扛着神秘礼盒，死后打开随机放出一僵尸' },
        ]},
        { title: '有趣的配饰', list: [
            { n: '木锤', img: ZB + 'HammerZombie/Hammer.png', ih: 54, t: '锤子僵尸的配饰，一锤一个罐子' },
            { n: '神秘礼盒', img: PL + 'PlantBox/GiftBox.png', ih: 54, t: '盲盒僵尸的行李，开出随机僵尸' },
            { n: '植物罐', img: 'assets/images/Vase/Vase_Plant.png', ih: 58, t: '绿罐，稳赚的植物' },
            { n: '僵尸罐', img: 'assets/images/Vase/Vase_Zombie.png', ih: 58, t: '红罐，小心里面有僵尸' },
            { n: '问号罐', img: 'assets/images/Vase/Vase_Question.png', ih: 58, t: '随机惊喜：阳光、植物或僵尸' },
            { n: '金罐', img: 'assets/images/Vase/Vase_Gold.png', ih: 58, t: '地狱限定：必出强力植物或强化僵尸' },
            { n: '冰道', img: ZB + 'Zomboni/ice.png', ih: 40, t: '冰车碾过留下的冰面，其他僵尸会踩着滑行加速' },
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
        font-family: 'PingFang SC','Microsoft YaHei',sans-serif; overflow: hidden; }
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
    .hg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
    .hg-tile { display: flex; flex-direction: column; align-items: center; padding: 7px 4px 5px;
        background: rgba(255,255,255,.5); border: 1px solid #d8c290; border-radius: 10px; cursor: default; }
    .hg-tile:hover { background: #fff; border-color: #b3945c; }
    .hg-art { position: relative; width: 86px; height: 86px; display: flex; align-items: flex-end; justify-content: center; }
    .hg-card { width: 66px; height: 79px; background-size: 100% 200%; background-position: top; background-repeat: no-repeat;
        border-radius: 7px; border: 1px solid rgba(90,60,20,.4); box-shadow: 0 2px 4px rgba(60,40,10,.25); }
    .hg-card-ov { position: absolute; right: 4px; bottom: 4px; width: 40px; aspect-ratio: 5/3; pointer-events: none;
        background-size: 100% 200%; background-position: top; background-repeat: no-repeat;
        border-radius: 4px; border: 1px solid rgba(90,60,20,.45); }
    .hg-zbody { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); image-rendering: auto; }
    .hg-zhead { position: absolute; overflow: hidden; pointer-events: none; }
    .hg-zhead img { position: absolute; left: 0; top: 0; transform: scaleX(-1); }
    .hg-zacc { position: absolute; top: 2px; right: 4px; font-size: 17px; filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); }
    .hg-zhammer { position: absolute; bottom: 6px; right: 2px; width: 34px; transform: rotate(-24deg); }
    .hg-zgift { position: absolute; bottom: 8px; right: 0px; width: 34px; }
    .hg-tname { margin-top: 4px; font-size: 12.5px; font-weight: 700; color: #4a3414; text-align: center; line-height: 1.25; }
    .hg-tsub { font-size: 11px; color: #8a6d3b; margin-top: 1px; }
    .hg-tip { font-size: 12px; color: #8a6d3b; margin: 10px 0 2px; text-align: center; }
    .hg-foot { padding: 10px; text-align: center; }
    #help-close { padding: 8px 44px; font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 18px;
        font-weight: 900; letter-spacing: 3px; color: #f7e9c0; cursor: pointer;
        background: linear-gradient(180deg, #7a5a33 0%, #5d4223 100%);
        border: 3px solid #3a2812; border-radius: 10px; text-shadow: 1px 1px 0 #2a1c0c; }
    #help-close:hover { filter: brightness(1.12); }
    `;

    const cardUrl = g => `url('${CARD}${g}.png${V}')`;

    // 植物瓦片：经典 = 单卡面；融合 = 主体卡面 + 副体卡面右下角叠放（与游戏内融合卡面同规则）
    function plantTile(p, fusion) {
        let art = '<div class="hg-card" style="background-image:' + cardUrl(p.g || p.p) + '"></div>';
        if (fusion && p.q) {
            art += '<div class="hg-card-ov" style="background-image:' + cardUrl(p.q) + '"></div>';
        }
        return '<div class="hg-tile" title="' + (p.t || '') + '">' +
            '<div class="hg-art">' + art + '</div>' +
            '<div class="hg-tname">' + p.n + '</div>' +
            '<div class="hg-tsub">' + (fusion ? '融合获得' : '☀ ' + p.c) + '</div>' +
            '</div>';
    }

    // 僵尸瓦片：gif 本体 + （可选）头顶植物 / 锤子 / 礼盒 / 配饰徽章
    function zombieTile(z) {
        const h = z.h || 70;
        let art = '<img class="hg-zbody" src="' + z.img + V + '" style="height:' + h + 'px;' +
            (z.dark ? 'filter:brightness(.72) contrast(1.25);' : '') + '">';
        if (z.head) {
            const c = z.head;
            const w = c.w * (h / 70);            // 头随本体缩放
            const boxH = Math.round(w * c.ch / c.cw * c.keepTop);
            art += '<div class="hg-zhead" style="width:' + Math.round(w) + 'px;height:' + boxH + 'px;' +
                'left:calc(50% - ' + Math.round(w / 2 - 6) + 'px);top:' + Math.max(0, 60 - boxH) + 'px;">' +
                '<img src="' + c.src + V + '" style="width:' + Math.round(w) + 'px;">' +
                '</div>';
        }
        if (z.hammer) art += '<img class="hg-zhammer" src="' + ZB + 'HammerZombie/Hammer.png' + V + '">';
        if (z.gift) art += '<img class="hg-zgift" src="' + PL + 'PlantBox/GiftBox.png' + V + '">';
        if (z.acc) art += '<span class="hg-zacc">' + z.acc + '</span>';
        return '<div class="hg-tile" title="' + (z.hp ? '血量 ' + z.hp + ' · ' : '') + (z.t || '') + '">' +
            '<div class="hg-art">' + art + '</div>' +
            '<div class="hg-tname">' + z.n + '</div>' +
            '</div>';
    }

    // 配饰瓦片：道具图直接展示
    function propTile(z) {
        return '<div class="hg-tile" title="' + (z.t || '') + '">' +
            '<div class="hg-art"><img src="' + z.img + V + '" style="max-height:' + (z.ih || 56) + 'px;max-width:80px;"></div>' +
            '<div class="hg-tname">' + z.n + '</div>' +
            '</div>';
    }

    function renderModes() {
        return MODES.map(m =>
            '<div class="hg-mode"><h4>' + m.icon + ' ' + m.title + '</h4><ul>' +
            m.items.map(it => '<li>' + it + '</li>').join('') + '</ul></div>'
        ).join('') +
        '<div class="hg-tip">※ 悬停植物 / 僵尸图片可查看详细数值（伤害 / 血量 / 特性）。</div>';
    }

    function renderPlants() {
        return groupBar('经 典', '') +
            '<div class="hg-grid">' + CLASSIC.map(p => plantTile(p, false)).join('') + '</div>' +
            groupBar('融 合', 'hg-orange') +
            '<div class="hg-grid">' + FUSION.map(p => plantTile(p, true)).join('') + '</div>' +
            '<div class="hg-tip">※ 经典 = 选卡栏直接可选 · 融合 = 手套融合获得（配方见游戏内「融合配方大全」）</div>';
    }

    function renderZombies() {
        return Z_GROUPS.map((g, i) => {
            const tagCls = i === 1 ? 'hg-orange' : (i >= 2 ? 'hg-red' : '');
            return groupBar(g.title, tagCls) +
                '<div class="hg-grid">' + g.list.map(z => zombieTile(z)).join('') + '</div>';
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

        // 弹窗骨架
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
            '</div>';
        document.body.appendChild(modal);

        const body = modal.querySelector('#help-body');
        const tabs = modal.querySelectorAll('.hg-tab');
        const contents = { modes: renderModes(), plants: renderPlants(), zombies: renderZombies() };
        tabs.forEach(t => t.addEventListener('click', () => {
            tabs.forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            body.innerHTML = contents[t.dataset.tab];
            body.scrollTop = 0;
        }));

        btn.addEventListener('click', () => {
            modal.style.display = 'flex';
            tabs[0].click();
        });
        modal.querySelector('#help-close').addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.style.display = 'none'; });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
