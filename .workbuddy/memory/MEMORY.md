# nexus-hub 项目长期备忘

## 概况
- 用户 区耀丁；仓库 github.com/52ouxiaoyu/nexus-hub.git
- 项目：pvz-web/、tank-battle/、billiards/、racing-3d/、kingdom-rush/、thunder-wing/、tvbox/、slime-cannon/
- 本文件只留铁律与契约；逐版细节查 .workbuddy/memory/ 日期日志与各子游戏 README.md

## 用户偏好（铁律）
- 每次改动：升版本号 → git add+commit+push origin main；**版本号只升不降**；改完立即推（防并行会话扫走）
- **bump 前必须 `git log --oneline -5` + `git show HEAD:<ver文件>` 核对实际最新版**（摘要可能过期）
- 版本号单一来源=各子游戏主界面徽标；games.html 禁加版本号
- PVZ 严格原版手绘素材，禁自画/Q 版/emoji 混搭；融合配方要有清晰逻辑；改动最小化
- 红圈截图按标注精确位置实现，禁止推测；删除类操作先只读扫描+等确认
- 键位精简：一个玩法=方向+主动作+大招；双人两套键互不串台

## 通用工程教训
- python rep()（`assert count==1`）替换防 Edit 不落盘；整脚本先全部断言再统一写盘（失败=零写入）；改完 git diff 复核
- Bash 多模式 grep / 中文搜索常假阴性 → 用 Grep 工具或 python
- 倒序遍历+循环内清表 → 每轮开头 `const b=arr[i]; if(!b) break;`
- 左右修饰键/e.code；**e.key 会被 IME 改写**（中文吞成 'Process'）→ 每键同时认 e.key+e.code
- 丢 keyup 卡键 → blur+visibilitychange 全量释放 keys+firing
- 断言帧推进前清 hitstop/无敌帧；像素阈值留余量；主循环 filter() 换数组会让 push 探针失聪（先冻结模拟）
- data-page-node-id 注入是噪声 diff，add 前剥离
- puppeteer：绝对路径 require repo 根 node_modules；系统 Chrome + `--no-sandbox` + 独立 userDataDir（并行开会冲突，串行跑）

## 并行会话风险（多次踩）
- **只 add 自己改的文件，绝不 `git commit -a`/`add -A`**；别人的未提交改动不要碰；绝不在真仓库 `git checkout HEAD -- .`
- 交付后 `git show HEAD:<file>` 逐个核对；`<script src>` 引用的文件必须在 HEAD（曾 404）
- push 遇 502 时**以 push 输出 `<old>..<new> main -> main` 为准**，再补 ls-remote 验真（ssh 通道更稳）

## pvz-web 通用
- 禁裸写 element.style.transform（.entity 靠 CSS translate(-50%,-50%) 居中，走 setTransform/addTransform）；手套显隐统一 gloveHide()/gloveRestore()
- 数据驱动融合 PVZ_FUSION_EXTRA；**材料名含下划线会被 split('_') 截断（scaredy 教训）**
- 加新植物 9 接入点 / 新弹种三表同步（CollisionManager 行命中排除+破甲+减速）→ 查日期日志
- 测试：每用例清场（g.entities.length=0）；融合模式走真实菜单；强制 state='PLAYING' 需手动驱动+sleep
- 主菜单模式卡在 body 内 `<style id="menu-style">`：**puppeteer addStyleTag 插 head 会被它反超**（同权重按文档序）→ 试验 CSS 用 `insertBefore(st, menuStyle.nextSibling)`；`.pkt-art` 有 3px border，absolute 的 left/right 从 padding box 起算（断言 +3/-3）；覆盖旧规则**必须显式 `transform: none`**

## 守屋大作战（HauntedDorm.js 单文件，最活跃）
- **入口=index.html 内嵌 #dorm-screen**（原页开局，URL 不跳转），haunted-dorm.html 只做直链兼容；启动 `window.startHauntedDorm({mode,role1,role2,faction})`；代际号 __dormGen 防旧 rAF；样式作用域 #dorm-screen
- **allPlayers 含 5 个人机**；真人存活判 _humansAll()；AI 发育在 _updateAIs、行走/认领在 _tick；植物随身 owner（spawnPlant 第 5 参），伤害记账 `pl.owner||owners[0]||null` 绝不兜底给 P1；结算=_humansAll 全灭
- **暂停/托管/钉床（v4.0.101~106）**：暂停=P 键零模拟（loop 顶部 return，gameTime 不推进；恢复须后移 p._lastInputAt + 挂起 _pendingGameOver 补结算）；托管=2p 任一方 10s 无本方键 → 塞进 AI 两条链（不设 isAi）、禁抢盲盒；钉床=_pinToBed，认领判定必须 `owners.includes(self)`（否则 cap=1 时自家房恒判「有人」→ 进屋即出乒乓）
- **人机行走必须 4 连通（v4.0.113）**：一律用 `_pathToBed(x,y,rm)` 一次 BFS 直达床位，**禁止「到门口 + push 床位点」**（门格到床位隔 4~6 格，最后那步直线穿墙）；每帧路点相邻性自检（曼哈顿 >1.5 格即重算）+ 单帧位移封顶 0.9 格 + 墙内救援（放 `_updateAIs` 循环开头，放 path 非空块里进不去）。根因教训：**任何搬移/瞬移（_placeHomeSpawn/跳板/钉床）后必须重算该实体的 path**，否则它会朝旧起点直线狂奔穿墙
- 小推车（v4.0.30）=存活奖励：无自动摆放/无地图道具；祝福「推车布防」=恢复自家已用或随身获得（mowerCarry+badge），走回自家门口格自动放置；僵尸 AI 每 90s 自动领；僵尸玩家开局冻结 10s
- AI 行为：hp 300、接触咬 1.5s/口按血量；无房 AI 贴脸 130px 反向逃、蹲避**丢路点**；门破选房避开僵尸 250px；**整段替换代码前先列出段内全部方法清单**（曾连带删掉 _placeMower）
- 砸罐子/盲盒（v4.0.24）：_plantBoxPool（含 plantbox 自身，连开链）；开箱统一 _openPlantBoxAt；金罐 _rollGoldenVaseContent
- **豌豆链伤害（v4.0.111）**：tier1~9 每级 ×2（1→256），**tier10~16 ×1.85**（480/890/1650/3050/5650/10450/**19300**）；只改 DEFS `shoot.dmg`（图鉴/飘字自动同步），**别动弹数/射速**。固有非单调：tier9 机枪 853 DPS → tier10 西瓜 218 DPS（cd2.2/n1，aoe 70 补偿）
- **地板规则（v4.0.109）**：房间 footprint 铺 `.tile.room`，但**敞开凹口格不铺**（屋外露草地）——边界洞格 4 邻域 flood fill 能连到边界=外部；封闭中庭照铺
- **图鉴三分区（v4.0.110）**：HelpGuide `FUSION` 混着真融合与守屋升级形态（必须标 `k:'dorm'`）→ 分区「守屋专属」+ 副标题 + 徽章。**别再把守屋 DEFS 升级形态塞进融合区**（v4.0.74 塞 21 条 → 被当成"融合植物漏配方"）。同名 4 组（魅惑向日葵/冰蒜卫士/金蒜坚果/蒜味高坚果）守屋侧加「·守屋」
- 融合卡面（v4.0.25）：PLANT_ART_BBOX 表 + fitOversizedCardArt；`.vz-card img`/`.zcard img` 收窄为 `>` 直接子
- 诊断范式：全植物体检 _diag_plants.js（每批新开对局）；全游戏巡检 _audit_all_games.js；旧脚本失败先 git worktree add /tmp 对照 HEAD 判历史遗留

## 守屋数值骨架（v4.0.106 审计，仍未改）
- **病根**：四条 ×2 曲线叠加（产出/升费/植物伤害/僵尸血量）→ 回本恒定 10~20s → 永远升级恒最优；开局「杀 1 僵尸 300s vs 门 18s 破」无解，终局「满级门 306s 啃不穿 + 满级植物 0.6s 秒杀巨人」双向无敌。只能重设骨架（产出 ×2→×1.6），调参无效；55 融合配方全建在 ×2 链上，必须「先骨架后内容」
- v4.0.107 已修：僵尸阵营 2p 的 P2 幽灵 / 门板回血 def.hp→maxHp / 人机盲盒按档 600·90·150 + 40% 产出 / AI 僵尸补 Lv10 / P2 天使停产 / 阳光袋复活 / 回血 5 格半径 / 开局 ☀50
- **v4.0.108 出生点=场外**：落点=最近空房房门朝外第 3 格（240px），硬约束 `_insideRoom` 必须 null + 非墙/无碰撞；被挡按 3→2→4→1 退让再环形搜。配套 `_homeReservedUntil=45000` 开局保护（_roomReservedForHuman 4 处 AI 选房过滤 + _claimRoom 拦截）。引导文案按屋内/屋外动态给；**别用 `_flyText` 循环 allPlayers**（飘字池复用 → 重开出现多份同文），用单条 DOM + `window.game !== this` 守卫
- **v4.0.112 封面**：`#btn-dorm .pkt-art.dorm` 改绝对定位「远小近大三段景深」——向日葵 38px(左/bottom16) / 高坚果 84px(中/left34/z4) / 豌豆 62px(右/bottom10)，互压 7px·5px；三枚原版 plantshadow32 投影 + 16px 草地台阶 + 左上暖光 + 四角暗角 + 原版 Sun.gif

## 守屋平衡铁律（用户 2026-10-16 明确要求）
- **僵尸血量必须与植物攻击力匹配**：植物 ×2 链（豌豆 2^(tier-1) 1→1024 → v4.0.111 后放缓），僵尸 50×2^(L-1)（普通 50→机甲 25600）、小鬼 25×2^(lv-1)、僵王 800×2^波次封顶。调植物伤害/加植物必须同步重算，保持「单株同级豌豆恒 50 发击杀」

## 其他子游戏（只留铁律，细节看日期日志）
- **tank-battle v1.4.20**：单文件 game.js，句柄 window._tankGame；击杀收敛 Tank.destroy(killer,damage)；Boss 覆写不调 super（回充单独加）；数值集中 VITALS，伤害先扣 shieldHp；禁 shadowBlur，改 map.grid 必 markDirty()，MAX_EFFECTS=90/BULLET_CAP=100；测试清空敌人会触发 STAGE_CLEAR 停摆 → 留 frozen 敌人
- **billiards v2.8.5**：G.aimDir 是快照恒旧值 → 用 aimLine 端点反推、重定向必须 setAim()；POOL.state 只读 getter；角袋圆心 (±(W/2+0.015),±(H/2+0.015)) r=0.081，斯诺克结算用出杆瞬间快照；双人 P1=WASD+空格 / P2=方向键+回车；测试干扰球间距>2R、难度 bug 走真实菜单（`||默认值` 会顶掉 0 档）、测 AI 回合先 `POOL.current=1; POOL.maybeRunAI()`
- **racing-3d v1.4.1**：相机 right=-worldX；_test.js 96 条必全跑；深草 off=1（极速 0.40×/滚阻 0.055/抓地 0.65）；LAT_GRIP=36；frame() 给 P2 必须显式传 Input.p2
- **thunder-wing v1.5.1**：纯 Canvas2D 零素材；句柄 window.__twGame；玩家状态在 G.players[]（加属性同改 makePlayer+defineProperty 代理名单+HUD）；键位 1P `WASD/空格/M`、2P `方向键/NumpadEnter/NumpadAdd`（每键含 e.code 兜底）。**铁律：坚决不能有弹窗**（弹卡/选单/强制读字全禁，升级=全自动随机发放只飘一行字，TW.drawPick 永久禁用）；**弹幕契约（用户密集恐惧症）**：敌弹上限 120/我方 80、敌弹速 1.4~2.2/我方 5~7、出弹间隔×2；色彩契约：有害=暖色尖锐星芒、有利=白环徽章、**禁绿色敌人/绿弹**；自适应纵向恒 800，**关卡横向字面量必须包 X(v)**
- **slime-cannon v4.5.0（纯单局双塔·纯键盘）**：单文件 index.html，只有双人模式；1280x720，F 全屏 P 暂停。**纯单局铁律（2026-10-24）**：绝不能有 localStorage 存档/金币银行/局外永久强化（用户拒绝"每天上瘾式养成"），菜单写「一次一局 · 不存档 · 每盘从零开始」。坐标 WALL_TOP=596/TOWER_X=[206,1074]/TOWER_Y=646/**PIVOT_Y=630**（敌人在炮口上方，角 0=正上、±1.45）；四键 P1 `A/D`+`W`推+`S`选、P2 `←/→`+**`↑`换下一张、`↓`选**；**画布不接受任何指针输入**（mousemove/touch 已全删）；角度状态只认 t.ang；5 秒 AI 托管；**子弹微吸附** homingSteer（HOME_ARC=0.38/HOME_RATE=1.2 rad/s 绝不能调大/锥外不转向/模长守恒）；**处决** `EXEC.cd=12`/`hpPct=0.008` 绝不能调高；词缀精英 `AFFIX_KEYS` 5 种、`affixRate=clamp(.05+t/1400,.05,.30)`、boss 与分裂产物 `noAffix`；`G.shocks` 半径必须按各自 dur 算（固定值→r 负→arc 抛错）；drawSlime 必须走 slimePath()；**头顶禁止圆球**（用户嫌像炸弹）
- **tvbox-web-player**：CF Pages 连 GitHub，push main 自动部署；functions/api/proxy.js；播放发生在访问者端
