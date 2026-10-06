# nexus-hub 项目长期备忘

## 概况
- 用户 区耀丁；仓库 github.com/52ouxiaoyu/nexus-hub.git
- 项目：pvz-web/、tank-battle/、billiards/、racing-3d/、kingdom-rush/、thunder-wing/、tvbox/
- 本文件只留铁律与契约；各版本细节查 .workbuddy/memory/ 日期日志与各子游戏 README.md

## 用户偏好（铁律）
- 每次改动：升版本号（游戏内徽标可见）→ git add+commit+push origin main；**版本号只升不降**
- **bump 前必须 `git log --oneline -5` + `git show HEAD:<ver文件>` 核对实际最新版**（摘要可能过期）
- 版本号单一来源=各子游戏主界面徽标；games.html 禁加版本号
- PVZ 严格原版手绘素材，禁自画/Q 版；融合配方要有清晰逻辑；改动最小化
- 红圈截图按标注精确位置实现，禁止推测；删除类操作先只读扫描+等确认
- 键位精简：一个玩法=方向+主动作+大招三类键；双人两套键必须互不串台
- 改完立即 commit+push（防并行会话扫走，见下）

## 通用工程教训
- python rep()（assert in + count==1）替换防 Edit 不落盘/歧义；改完 grep/git diff 复核；整脚本先全部替换后统一写盘（断言失败=零写入）
- Bash 多模式 grep、中文搜索常假阴性 → 用 Grep 工具或 python
- 倒序遍历+循环内清表 → 每轮开头 `const b=arr[i]; if(!b) break;`
- 左右修饰键必须 e.code；断言帧推进前清 hitstop/无敌帧（先 frame(1) 消化复活帧）
- 像素亮度阈值留余量；主循环每帧 filter() 换新数组 → push 探针失聪（断言前冻结模拟）
- **丢 keyup 卡键**：窗口 blur/切后台收不到 keyup → keys 残留 true（漂移/永远开火）→ blur+visibilitychange 全量释放 keys+firing（tw v1.4.11、pvz 4625b88 均已做）
- **e.key 会被输入法/布局改变**（中文 IME 吞成 'Process'）→ 键位表每键同时认 e.key+e.code
- data-page-node-id 注入是噪声 diff，git add 前剥离
- puppeteer：绝对路径+repo 根 node_modules；`--no-sandbox`+独立 userDataDir（沙箱坑）；系统 Chrome executablePath

## 并行会话风险（多次踩）
- **只 add 自己改的文件，绝不 git commit -a / add -A**；别人的未提交改动不要碰；绝不在真仓库跑 `git checkout HEAD -- .`
- 交付后必须 `git show HEAD:<file>` 逐个核对；`<script src>` 引用的每个文件都必须在 HEAD（曾 404）
- 实录：pvz 会话多次卷走 thunder-wing 未提交文件（v1.4.7 四文件、v1.4.11=782c682 四文件），均完整自洽幸免——事后 diff HEAD 确认即可

## pvz-web（最活跃，v4.0.0 本地双人协作架构）
- 禁裸写 element.style.transform（.entity 靠 CSS translate(-50%,-50%) 居中，走 setTransform/addTransform）；手套显隐统一 Plant.gloveHide()/gloveRestore() 快照还原（覆盖 fusionOverlay2）
- 数据驱动融合：PVZ_FUSION_EXTRA 总表；**材料名含下划线会被 split('_') 截断（scaredy 教训）**
- 加新植物 9 接入点 / 新弹种三表同步（CollisionManager 行命中排除+破甲+减速）/ 加第二玩家要点 → 查日期日志
- 测试：每用例清场（g.entities.length=0）；融合模式走真实菜单；强制 state='PLAYING' 需手动驱动+真实 sleep
- 紫色系 sprite 转冰蓝：sepia(1) saturate(2.2) hue-rotate(185deg) brightness(1.25)
- v4.0.0（并行 pvz 会话）：双幸存者协作、共享镜头、双人独立选人（59edbed/6162219/782c682），勿与其冲突

## tank-battle（v1.4.20）
- 单文件 game.js；句柄 window._tankGame；击杀收敛 Tank.destroy(killer,damage)；Boss 覆写不调 super（Boss 回充须单独加进 Boss.update）
- 数值集中 VITALS；伤害先扣 shieldHp；新字段先 grep 双拼名查重（shieldMax/maxShield 教训）
- 性能红线：禁 shadowBlur；改 map.grid 必 markDirty()；MAX_EFFECTS=90/BULLET_CAP=100
- 测试：清空敌人触发 STAGE_CLEAR 停摆→留 frozen 敌人；测 AI 先关自动刷兵+P2 冻结远置

## billiards（v2.8.5）
- G.aimDir 是快照恒旧值 → 运行时瞄准用 aimLine 几何端点反推；重定向必须 setAim()；POOL.state 只读 getter
- 角袋捕获圆心 (±(W/2+0.015),±(H/2+0.015)) r=0.081；斯诺克结算用出杆瞬间快照 shot.snOn
- 双人键盘：P1=WASD+空格 / P2=方向键+回车，kbOwner() 按 current 分派；自由球 keyboard 放置依赖 startBallInHand
- 斯诺克 AI：simulateShot+scoreSnookerSim；简单档无噪声复验+只打 cosCut>=0.45 直球位；v2.8.5 难度重分级（sigma 噪声+力度抖动）；辅助线保底 Math.max(assist,1)
- 测试：摆干扰球间距>2R；规则结算必须真实出杆端到端；难度类 bug 走真实菜单（`||默认值` 会顶掉 0 档）；测 AI 自主回合必须 `POOL.current=1; POOL.maybeRunAI()`

## racing-3d（v1.4.1）
- 相机 right=-worldX；_test.js 96 条必全跑；输入类问题先跑真实 DOM 键盘事件
- 深草 off=1：极速 0.40×/滚阻 0.055/抓地 0.65；LAT_GRIP=36；车对车 Game.carVsCar 动量守恒
- frame() 给 P2 必须显式传 Input.p2；隔离性断言「只按一方键另一方不动」

## thunder-wing（v1.4.11）
- 纯 Canvas2D 零素材；script 顺序 sprites→fx→enemies→build→meta→ultimate→ai→game；句柄 window.__twGame
- 玩家状态下沉 G.players[]；新增属性同时改 makePlayer+defineProperty 代理名单+HUD
- 键位（v1.4.3 定稿+v1.4.11 e.code 兜底）：1P `WASD/空格/M`，2P `方向键/NumpadEnter/NumpadAdd`；NumpadEnter 的 e.key='Enter' 必须靠 e.code 区分主回车；KEYMAP 每键含 code 兜底（IME/布局免疫）；blur/visibilitychange 全量释放防卡键
- **弹幕契约（用户密集恐惧症）**：敌弹上限 120/我方 80；敌弹速 1.4~2.2/我方 5~7；出弹间隔×2；我方少而重；品红蛇行。改弹幕数值先看 memory 弹幕段
- 救援信标 G.pods（坠机不出局，接触 46px 复活，双方坠机才 OVER）；PSEP_MIN=52 双机不重叠（updatePlayer 后硬校正）；顶部对称 HUD（中央+左右镜像，y=26/44/59-67/86/104）
- AI：AI_IDLE=5*60 帧接管；势场 AI 闪避权重恒占优+拾取 VAL 分级（weapon/power1.25/bomb1.1/medal0.75/exp0.45）；AI 自设 firing 不算控制；物理按键 noteActivity 夺回
- 词条（build.js gainExp 自动发放无弹窗）/超载 OVERDRIVE（倍率在 shoot() 现算，别存 pl.od）/关卡机制（elites/gimmick，激光缺口冷色）/每日挑战（日期种子）/成就 → meta.js
- 画面自适应：纵向恒 800，W=clamp(vw/vh*800,420,720)，TW.setWidth 广播；**关卡横向字面量必须包 X(v)**
- 配色契约：有害=暖色+尖锐星芒 hazard()；有利=白环徽章 ITEM_LOOK；**禁绿色敌人/绿弹**；我方冷色
- 节奏常量：COMBO_WIN=210/COMBO_CAP=30/BOSS_GRACE=240；Boss 触发=清场或 240 帧强制
- 测试：_test.js 65 项（含像素配色断言）；killOne 先拉开席位 x=100/400；注入敌弹前清 pbullets+players ult=null（残留大招污染）；HUD 断言前手动 S.render()；改键位/输入必跑真实键盘事件用例

## tvbox-web-player
- CF Pages 连 GitHub，push main 自动部署；v0.1.0 多级代理链；functions/api/proxy.js；播放发生在访问者端
