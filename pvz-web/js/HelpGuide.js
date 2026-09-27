// v3.38.0 主菜单「操作与道具说明」—— 三大板块：玩法说明 / 植物图鉴 / 僵尸图鉴
// 植物与僵尸均按厉害程度（战略价值/综合强度）降序排列；数值取自游戏实装（Plant.js / Zombie.js / GameLoop.js）。
(function () {
    // ================= 玩法说明数据 =================
    const MODES = [
        {
            title: '通用操作（所有模式通用）',
            icon: '☀️',
            items: [
                '收集阳光：点击天上掉落或植物产出的阳光，积攒资源。',
                '种植：点击顶部卡片 → 点击草坪格子种下（阳光不足或冷却中卡片会变灰）。',
                '铲子：点击右上角铲子再点植物，可以铲掉它腾出格子（不退阳光）。',
                '波次：消灭整波僵尸撑过关卡；旗帜与「一大波僵尸正在接近」提示大波来袭。',
                '失败条件：僵尸走进左侧房子（或吃光脑子目标失败）。',
                '速度按钮：右上角 Speed 可切换游戏倍速。',
            ],
        },
        {
            title: '经典冒险',
            icon: '🌻',
            items: [
                '原汁原味的塔防：5 行 9 列白昼草地，波次攻防。',
                '开局先选卡（最多 10 张），经济植物（向日葵）先行，攻击植物殿后。',
                '卡片有阳光价格与冷却时间，冷却转圈结束后才能再次使用。',
            ],
        },
        {
            title: '融合进化',
            icon: '🧤',
            items: [
                '核心玩法：点击手套（🧤）进入拖拽状态，把一株植物拖到另一株上即可融合。',
                '选卡栏只有 15 种基础植物，高级形态全靠配方合成（30+ 条秘方）。',
                '游戏内点「融合配方大全」可查看全部配方；本说明的植物图鉴也标注了融合来源。',
                '炸弹类植物（樱桃/毁灭菇等）爆炸时，还会把 3×3 内与它有配方的植物直接融合掉。',
            ],
        },
        {
            title: '砸罐子',
            icon: '🏺',
            items: [
                '点罐子敲开：绿罐出植物（稳赚）、红罐出僵尸（小心）、问号罐出随机惊喜。',
                '开出的植物会自动种在该格；僵尸罐出的敌人立刻行动。',
                '敲开全部罐子且清空场上僵尸即获胜；难度分简单 / 困难 / 地狱（罐更多、僵尸更凶）。',
                '地刺、钢地刺在本模式照常生效；锤子僵尸会替你（或敌人）敲罐子。',
            ],
        },
        {
            title: '《我是僵尸》',
            icon: '🧟',
            items: [
                '阵营反转：你指挥僵尸大军，目标是吃掉关卡里的脑子。',
                '顶部僵尸卡带花阳光买僵尸 → 点击草坪某一行释放。',
                '简单 600 阳光 / 困难 400 / 地狱 250；难度越高解锁的兵种越强。',
                '敌阵是植物防线：豌豆头等植物会反击，坚果挡路需铁门/撑杆/冰车破阵。',
                '阳光 < 50 且场上无僵尸存活即判负；吃掉全部脑子获胜。',
            ],
        },
    ];

    // ================= 植物图鉴（按厉害程度降序） =================
    // c=阳光 cd=冷却(秒) hp=耐久 s=核心性能 d=说明 src=来源
    const PLANTS = [
        { n: '玉米加农炮', c: '融合', cd: '充能25s', hp: 600, s: '手动瞄准 1800 / 3×3', d: '玉米投手×2+第三株融合。占两格，充能后点击开镜、按 M 向准星发射，全游戏最强单发。', src: '融合' },
        { n: '毁灭菇', c: 125, cd: 50, hp: 300, s: '全屏 9999 秒杀', d: '引爆后湮灭全场僵尸，原地留陨石坑 30 秒不可种植。战略级清场。', src: '经典' },
        { n: '寒冰炸弹', c: '融合', cd: 50, hp: 300, s: '900 / 3×3 + 减速', d: '寒冰射手+樱桃炸弹。爆炸伤害减半但附带全范围减速 10 秒。', src: '融合' },
        { n: '樱桃炸弹', c: 150, cd: 50, hp: 300, s: '1800 / 3×3', d: '种下 1 秒后引爆，标准 3×3 秒杀。清密集波次首选。', src: '经典' },
        { n: '火爆辣椒', c: 125, cd: 50, hp: 300, s: '1800 / 整行', d: '火焰铺满一整行，行内僵尸全部秒杀。', src: '经典' },
        { n: '冰西瓜投手', c: 200, cd: 7.5, hp: 300, s: '60+溅射30 / 1.0s + 减速', d: '西瓜投手+寒冰菇。抛射破阵核心：直击 60、溅射 30、命中减速 10 秒。', src: '经典/融合' },
        { n: '西瓜投手', c: 300, cd: 7.5, hp: 300, s: '60+溅射30 / 1.0s', d: '抛物线重炮，溅射波及相邻格僵尸，后期输出主力。', src: '经典' },
        { n: '忧郁菇', c: 150, cd: 7.5, hp: 300, s: '3×3 每 1s 八发×80', d: '大喷菇×2。孢子向四面八方喷发，近身360°无死角绞肉机，破甲穿门。', src: '融合' },
        { n: '机枪射手', c: 250, cd: 50, hp: 300, s: '4 连发×20 / 1.5s', d: '双发豌豆×2。单行持续输出翻倍，配合火炬树桩收益极高。', src: '融合' },
        { n: '冰西瓜猫尾草', c: '融合', cd: 7.5, hp: 300, s: '全场追踪 60+30 + 减速', d: '冰西瓜投手+猫尾草。全场任意僵尸自动追踪的冰瓜炮台。', src: '融合' },
        { n: '西瓜猫尾草', c: '融合', cd: 7.5, hp: 300, s: '全场追踪 60+30', d: '西瓜投手+猫尾草。全屏锁定，无视位置逐个点名。', src: '融合' },
        { n: '猫尾草', c: 225, cd: 7.5, hp: 300, s: '全场追踪 20 / 1.4s', d: '双发豌豆+地刺。子弹自动追踪全场僵尸，不会浪费弹道。', src: '融合' },
        { n: '三线射手', c: 300, cd: 7.5, hp: 300, s: '3 行齐射×20 / 1.5s', d: '双发豌豆+豌豆射手。同时覆盖上中下三行。', src: '经典' },
        { n: '寒冰射手', c: 175, cd: 7.5, hp: 300, s: '20 / 1.5s + 减速', d: '豌豆射手+寒冰菇。命中减速 10 秒，控制型输出。', src: '融合' },
        { n: '杨桃', c: 125, cd: 7.5, hp: 300, s: '5 向×40 / 1.5s', d: '裂荚射手+向日葵。五向星光齐射且可穿透多目标，十字路口之王。', src: '融合' },
        { n: '冰杨桃', c: '融合', cd: 7.5, hp: 300, s: '5 向×40 + 减速', d: '寒冰射手+杨桃。冰晶五向齐射，命中附带减速。', src: '融合' },
        { n: '大喷菇', c: 75, cd: 7.5, hp: 300, s: '单行弹幕 9×6 / 1.5s', d: '小喷菇×2。沿本行喷出密集孢子束（总伤 54），雾气无视铁门。', src: '融合' },
        { n: '卷心菜投手', c: 150, cd: 7.5, hp: 300, s: '40 / 1.4s 破甲', d: '抛射攻击无视路障/铁桶/铁门直接打本体，护甲不脱落。', src: '经典' },
        { n: '爆米花投手', c: '融合', cd: 7.5, hp: 300, s: '40 破甲 + 3×3 溅射', d: '玉米投手+火爆辣椒。命中后焦香溅射波及周围一圈。', src: '融合' },
        { n: '寒冰卷心菜', c: '融合', cd: 7.5, hp: 300, s: '40 破甲 + 减速', d: '卷心菜投手+寒冰菇。破甲之外再附赠减速。', src: '融合' },
        { n: '玉米投手', c: 175, cd: 7.5, hp: 300, s: '20 / 黄油定身3s（20%）', d: '20% 概率改投黄油（40 伤 + 定身 3 秒），投掷物全部破甲。', src: '经典' },
        { n: '双料投手', c: '融合', cd: 7.5, hp: 300, s: '卷心菜 3/4 + 黄油 1/4', d: '卷心菜投手+玉米投手。两种弹药交替，控制输出兼备。', src: '融合' },
        { n: '火炬树桩', c: 175, cd: 7.5, hp: 300, s: '豌豆穿过点燃 ×2', d: '坚果+火爆辣椒。豌豆经过变火豌豆（40 伤），配合机枪射手质变。', src: '融合' },
        { n: '樱桃射手', c: '融合', cd: 7.5, hp: 300, s: '20/发 · 第 10 发小樱桃 900', d: '豌豆射手+樱桃炸弹。每第 10 发射出迷你樱桃，3×3 爆炸 900。', src: '融合' },
        { n: '双向豌豆', c: 125, cd: 7.5, hp: 300, s: '前 20 / 后 40', d: '豌豆射手+窝瓜。照顾身后漏网僵尸。', src: '经典' },
        { n: '双发豌豆', c: 200, cd: 7.5, hp: 300, s: '2×20 / 1.5s', d: '豌豆射手×2。基础输出翻倍，也是多条融合线的原料。', src: '融合' },
        { n: '豌豆射手', c: 100, cd: 7.5, hp: 300, s: '20 / 1.5s', d: '最基础的攻击植物，一切豌豆系的起点。', src: '经典' },
        { n: '胆小菇', c: 25, cd: 7.5, hp: 300, s: '20 / 1.5s（会缩头）', d: '小喷菇+豌豆射手。僵尸靠近会害怕缩头暂停射击，便宜但怂。', src: '融合' },
        { n: '小喷菇', c: 0, cd: 7.5, hp: 300, s: '20 / 1.5s', d: '完全免费！零成本前排过渡，后期可随意铲掉换位。', src: '经典' },
        { n: '大嘴花', c: 150, cd: 7.5, hp: 300, s: '整只吞噬 · 咀嚼 40s', d: '一口吞掉脚下僵尸（巨人除外），咀嚼期间无法再咬。', src: '经典' },
        { n: '大嘴坚果', c: '融合', cd: 7.5, hp: 4000, s: '吞噬 + 坚果肉盾', d: '坚果墙+大嘴花。既能扛又能吞的全能前排。', src: '融合' },
        { n: '土豆地雷', c: 25, cd: 30, hp: 300, s: '1800 单体 · 武装 15s', d: '种下需 15 秒武装，僵尸踩上即被炸上天。超高性价比。', src: '经典' },
        { n: '孢子地雷', c: '融合', cd: 30, hp: 300, s: '地雷 + 孢子系特性', d: '小喷菇+土豆地雷的融合变种，同样廉价控场。', src: '融合' },
        { n: '窝瓜', c: 50, cd: 30, hp: 300, s: '压扁 1800 单体', d: '僵尸贴近即跃起压扁（连巨人都能压），即种即用。', src: '经典' },
        { n: '钢地刺', c: 125, cd: 7.5, hp: 1200, s: '120 / 0.75s', d: '地刺×2。伤害三倍且更耐久，冰车碾上会被扎爆。', src: '融合' },
        { n: '地刺', c: 100, cd: 7.5, hp: 300, s: '40 / 0.75s', d: '贴地不会被啃，持续扎伤路过的僵尸，克制冰车。', src: '经典' },
        { n: '高坚果', c: 125, cd: 30, hp: 8000, s: '肉盾 · 不可跨越', d: '坚果墙的两倍血量，撑杆跳和跳跳僵尸无法越过。', src: '经典' },
        { n: '钢刺高坚果', c: '融合', cd: 30, hp: 8000, s: '8000 耐久 + 扎脚', d: '钢地刺+高坚果。最强墙壁，脚下还带刺。', src: '融合' },
        { n: '寒冰坚果', c: '融合', cd: 30, hp: 4000, s: '肉盾 + 冰霜护体', d: '寒冰射手+坚果墙。冰蓝护体，啃食者行动迟缓。', src: '融合' },
        { n: '地刺坚果', c: '融合', cd: 30, hp: 4000, s: '肉盾 + 扎脚', d: '地刺+坚果墙。啃它等于啃刺。', src: '融合' },
        { n: '坚果射手', c: '融合', cd: 7.5, hp: 4000, s: '肉盾 + 射击', d: '豌豆射手+坚果墙。能扛能打的二合一前排。', src: '融合' },
        { n: '南瓜壳（融合）', c: 125, cd: 30, hp: 12000, s: '套在任意植物外的超厚壳', d: '坚果墙+高坚果。给已有植物再套一层 12000 耐久的外壳。', src: '融合' },
        { n: '南瓜头', c: 125, cd: 30, hp: 4000, s: '套壳护住里层植物', d: '可种在已有植物上叠加护甲，壳破里层无伤。', src: '经典' },
        { n: '坚果墙', c: 50, cd: 30, hp: 4000, s: '基础肉盾', d: '不攻击纯挡路，一切防线的时间买断者。', src: '经典' },
        { n: '坚果向日葵', c: '融合', cd: 7.5, hp: 4000, s: '肉盾 + 产能', d: '向日葵+坚果墙。坚果外圈的太阳花田，能扛的发电机。', src: '融合' },
        { n: '毁灭向日葵', c: '融合', cd: 7.5, hp: 300, s: '产能 · 阵亡大爆炸', d: '向日葵+毁灭菇。平时正常产阳光，被啃死时原地 1800 大爆炸。', src: '融合' },
        { n: '双子向日葵', c: 150, cd: 50, hp: 300, s: '2×25 / 24s', d: '向日葵×2。经济翻倍，中后期经济升级首选。', src: '融合' },
        { n: '向日葵', c: 50, cd: 7.5, hp: 300, s: '25 / 24s', d: '每 24 秒产 25 阳光，开局必种的经济引擎。', src: '经典' },
        { n: '阳光菇', c: 25, cd: 7.5, hp: 300, s: '15 → 成长后 25 / 24s', d: '小喷菇+向日葵。便宜的早期经济，随时间长大增产。', src: '融合' },
        { n: '寒冰菇', c: 75, cd: 50, hp: 300, s: '全屏冻结减速 10s', d: '引爆后全场僵尸冻住并减速，应急控制王。', src: '经典' },
        { n: '魅惑菇', c: 75, cd: 30, hp: 300, s: '啃食者被策反', d: '僵尸啃食后倒戈为你而战，满状态转化。', src: '融合' },
        { n: '大蒜', c: 50, cd: 7.5, hp: 400, s: '逐行驱赶', d: '僵尸咬一口就嫌弃地换行，用来引导僵尸走位。', src: '经典' },
        { n: '植物盲盒', c: 500, cd: 5, hp: 300, s: '随机开出全植物池一株', d: '500 阳光赌一株随机植物（经典+融合全池），欧皇的玩具。', src: '经典' },
    ];

    // ================= 僵尸图鉴（按厉害程度降序） =================
    const ZOMBIES = [
        { n: '巨尸 Boss（LG BOSS）', hp: 5000, s: '关底 Boss', d: '最庞大的敌人，血量与压迫感都是 Boss 级。', src: 'Boss' },
        { n: '巨人僵尸', hp: 4000, s: '锤飞植物 · 过半血扔小鬼', d: '一锤砸扁植物，血量过半后掷出小鬼僵尸偷袭后方。', src: '经典' },
        { n: '高坚果头僵尸', hp: 5200, s: '植物头 · 最肉', d: '头顶高坚果的植物头僵尸，全游戏最厚血量之一。', src: '我是僵尸敌阵' },
        { n: '坚果头僵尸', hp: 2600, s: '植物头 · 移动肉盾', d: '头顶坚果墙，普通输出打起来非常费劲。', src: '我是僵尸敌阵' },
        { n: '橄榄球僵尸', hp: 1600, s: '高速冲锋', d: '速度 40 的重装骑兵，防线上最怕的突脸怪。', src: '经典/我是僵尸' },
        { n: '冰车僵尸', hp: 1300, s: '碾压植物 · 留冰道', d: '无视植物直接碾碎，身后留冰道；被地刺扎爆是它的唯一克星。', src: '经典/我是僵尸' },
        { n: '铁桶僵尸', hp: 1300, s: '铁桶护甲', d: '铁桶提供高额护甲，桶被打掉后与普通僵尸无异。', src: '经典/我是僵尸' },
        { n: '铁门僵尸', hp: 1300, s: '铁门挡直射', d: '铁门挡住正面直线弹道；投手类/大喷菇/土豆雷的破甲攻击可以无视它。', src: '经典/我是僵尸' },
        { n: '锤子僵尸', hp: 560, s: '挥锤敲罐', d: '砸罐子模式特有，会主动锤开沿途的罐子。', src: '砸罐子' },
        { n: '撑杆僵尸', hp: 500, s: '高速 · 跳过第一株植物', d: '起跳越过遇到的第一株植物，落地后恢复普通速度。', src: '经典/我是僵尸' },
        { n: '舞王僵尸', hp: 500, s: '每 10s 召唤伴舞', d: '定期召唤一排伴舞僵尸，人数优势型敌人。', src: '经典/我是僵尸' },
        { n: '手提箱僵尸', hp: 500, s: '自爆 3×3', d: '抱着手提箱前进，到点自爆炸毁 3×3 内植物（同归于尽式）。', src: '砸罐子' },
        { n: '梯子僵尸', hp: 500, s: '架梯翻越防御', d: '速度快，架起梯子翻过坚果墙类防御。', src: '砸罐子' },
        { n: '跳跳僵尸', hp: 340, s: '弹跳前进', d: '踩着弹簧跳过植物，需要高坚果或突然袭击才能拦住。', src: '砸罐子' },
        { n: '火爆辣椒头僵尸', hp: 600, s: '植物头', d: '头顶火爆辣椒的植物头僵尸，自带火气。', src: '我是僵尸敌阵' },
        { n: '读报僵尸', hp: 300, s: '报纸破后狂暴加速', d: '报纸有独立护甲（150），打碎后暴怒加速冲向植物。', src: '经典/我是僵尸' },
        { n: '路障僵尸', hp: 560, s: '路障护甲', d: '比普通僵尸多一顶路障（护甲 360），基础加强版。', src: '经典/我是僵尸' },
        { n: '豌豆头僵尸', hp: 200, s: '会射豌豆反击', d: '头顶豌豆射手，边走边向植物开火。', src: '我是僵尸敌阵' },
        { n: '机枪头僵尸', hp: 200, s: '4 连发射击', d: '头顶机枪射手的进化版植物头，火力翻倍。', src: '我是僵尸敌阵' },
        { n: '向日葵头僵尸', hp: 200, s: '死亡掉阳光', d: '被打死后头顶的向日葵会掉落一撮阳光（25~150）。', src: '我是僵尸敌阵' },
        { n: '礼盒僵尸', hp: 200, s: '死后开礼盒', d: '扛着神秘礼盒，死后打开盒子掉出惊喜。', src: '我是僵尸敌阵' },
        { n: '旗帜僵尸', hp: 200, s: '大波先导', d: '举旗领军，「一大波僵尸」的首个登场者，与普通僵尸同强度。', src: '经典' },
        { n: '伴舞僵尸', hp: 200, s: '舞王的伴舞', d: '舞王召唤的随从，普通强度但成群出现。', src: '经典' },
        { n: '普通僵尸', hp: 200, s: '基础单位', d: '最普通的僵尸，啃食植物缓慢前进。', src: '全部模式' },
        { n: '小鬼僵尸', hp: 100, s: '极快 · 脆弱', d: '又小又快的迷你僵尸，巨人抛投的常客，一碰就碎。', src: '经典' },
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
    #help-panel { width: 860px; max-width: 94vw; max-height: 88vh; display: flex; flex-direction: column;
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
    #help-body { flex: 1; overflow-y: auto; padding: 14px 22px 18px; background: #fbf6e4; border-top: 2px solid #b3945c; }
    .hg-section-title { font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 20px; font-weight: 900;
        color: #4a3414; margin: 10px 0 6px; letter-spacing: 2px; }
    .hg-mode { background: rgba(255,255,255,.55); border: 1px solid #d8c290; border-radius: 12px;
        padding: 10px 14px; margin-bottom: 10px; }
    .hg-mode h4 { margin: 0 0 6px; font-size: 17px; color: #3f6e1f; letter-spacing: 1px; }
    .hg-mode ul { margin: 0; padding-left: 20px; }
    .hg-mode li { font-size: 13.5px; line-height: 1.75; color: #5a4a28; }
    .hg-tip { font-size: 12.5px; color: #8a6d3b; margin: 4px 0 14px; }
    .hg-row { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-bottom: 1px dashed #d8c290; }
    .hg-row:nth-child(odd) { background: rgba(255,255,255,.4); }
    .hg-rank { min-width: 30px; text-align: center; font-family: Impact, 'Arial Black', sans-serif;
        font-size: 17px; color: #a14b18; }
    .hg-name { min-width: 108px; font-weight: 700; font-size: 14px; color: #4a3414; }
    .hg-badges { display: flex; flex-wrap: wrap; gap: 4px; min-width: 168px; max-width: 190px; }
    .hg-badge { font-size: 11px; color: #5a4a28; background: rgba(179,148,92,.22);
        border: 1px solid #c9ab72; border-radius: 8px; padding: 1px 7px; white-space: nowrap; }
    .hg-desc { flex: 1; font-size: 12.5px; line-height: 1.55; color: #5a4a28; }
    .hg-src { font-size: 10.5px; color: #7a5c22; background: rgba(255,255,255,.5); border: 1px solid #d8c290;
        border-radius: 8px; padding: 1px 6px; white-space: nowrap; }
    .hg-foot { padding: 10px; text-align: center; }
    #help-close { padding: 8px 44px; font-family: 'Kaiti SC','STKaiti','KaiTi','楷体',serif; font-size: 18px;
        font-weight: 900; letter-spacing: 3px; color: #f7e9c0; cursor: pointer;
        background: linear-gradient(180deg, #7a5a33 0%, #5d4223 100%);
        border: 3px solid #3a2812; border-radius: 10px; text-shadow: 1px 1px 0 #2a1c0c; }
    #help-close:hover { filter: brightness(1.12); }
    `;

    function buildRow(z, i, fields) {
        return '<div class="hg-row">' +
            '<div class="hg-rank">' + (i + 1) + '</div>' +
            '<div class="hg-name">' + z.n + '</div>' +
            '<div class="hg-badges">' + fields.map(f => '<span class="hg-badge">' + f + '</span>').join('') + '</div>' +
            '<div class="hg-desc">' + z.d + '</div>' +
            '<span class="hg-src">' + z.src + '</span>' +
            '</div>';
    }

    function renderModes() {
        return MODES.map(m =>
            '<div class="hg-mode"><h4>' + m.icon + ' ' + m.title + '</h4><ul>' +
            m.items.map(it => '<li>' + it + '</li>').join('') + '</ul></div>'
        ).join('') +
        '<div class="hg-tip">※ 图鉴数据为当前版本实装数值；融合植物可在「融合配方大全」查看配方。</div>';
    }

    function renderPlants() {
        return '<div class="hg-section-title">植物图鉴 · 按厉害程度排序</div>' +
            PLANTS.map((p, i) => buildRow(p, i, [
                '阳光 ' + p.c, '冷却 ' + p.cd, '耐久 ' + p.hp, p.s
            ])).join('');
    }

    function renderZombies() {
        return '<div class="hg-section-title">僵尸图鉴 · 按厉害程度排序</div>' +
            ZOMBIES.map((z, i) => buildRow(z, i, ['血量 ' + z.hp, z.s])).join('');
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
                        '<div class="hg-tab" data-tab="plants">植物图鉴（' + PLANTS.length + '）</div>' +
                        '<div class="hg-tab" data-tab="zombies">僵尸图鉴（' + ZOMBIES.length + '）</div>' +
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
