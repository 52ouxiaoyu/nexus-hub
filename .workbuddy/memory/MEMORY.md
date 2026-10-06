# nexus-hub 项目长期备忘

## 概况
- 用户 区耀丁；仓库 github.com/52ouxiaoyu/nexus-hub.git
- 项目：pvz-web/（经典/融合/砸罐/我是僵尸）、tank-battle/、billiards/、racing-3d/、kingdom-rush/
- 各版本细节查 .workbuddy/memory/ 日期日志与各子游戏 README.md

## 用户偏好（铁律）
- 每次改动：升版本号（游戏内徽标可见）→ git add+commit+push origin main；**版本号只升不降**
- **bump 前必须 `git log --oneline -5` + `git show HEAD:pvz-web/version.json` 核对实际最新版——摘要里的"最新版本"可能过期（曾因此把 v3.51.1 降成 v3.45.1）**
- 版本号单一来源=各子游戏主界面徽标；games.html 禁加版本号
- PVZ 严格原版手绘素材，禁自画/Q 版；融合配方要有清晰逻辑；改动最小化
- 红圈截图按标注精确位置实现，禁止推测；删除类操作先只读扫描+等确认

## 通用工程教训
- puppeteer 用绝对路径 + repo 根 node_modules；`--no-sandbox`+独立 userDataDir（沙箱坑）
- 主循环每帧 filter() 换新数组 → push 探针失聪；断言前冻结模拟（覆写 `update=()=>{}`）
- Edit 偶发"报成功未落盘" → 改完 grep 复核；复杂补丁用 Python assert 替换
- data-page-node-id 注入是噪声 diff，git add 前剥离

## 并行会话风险
- 多会话并行常同时有未提交改动 → 改完立即 commit+push；**别人的未提交改动不要碰、提交只 add 自己改的文件、绝不在真仓库跑 `git checkout HEAD -- .`（曾把全工作区回滚）**

## pvz-web（最活跃）
- 禁裸写 element.style.transform：.entity 靠 CSS translate(-50%,-50%) 居中，走 setTransform/addTransform；fusionOverlay 是裸 img，transform 必须自带 translate 前缀；initFusionUI 与 Plant.js 两份拷贝必须同步
- **手套显隐铁律**：滤镜路线融合体 fusionOverlay 构造即 display:none，恢复路径禁写死 'block'——统一走 Plant.gloveHide()/gloveRestore() 快照还原；需覆盖 fusionOverlay2
- 数据驱动融合：PVZ_FUSION_EXTRA 总表（GameLoop 顶部，type/a/b/md/rare/look/t）+ getFusionResult/getPlantName/盲盒池/图鉴自动消费；类型名按 split('_') 解析——**材料名含下划线前缀会截断（scaredy 教训）**
- 新弹种三表同步：CollisionManager 行命中排除+破甲+减速，漏一处就双倍伤害或永不减速
- 加新植物 9 处接入点：GameLoop.seeds / setupZombieEnemies 三档 pools / isShooter / _vasePermPool / getFusionResult / getPlantName / initFusionUI / dragGhost / HelpGuide
- 测试：每用例清场（g.entities.length=0）；命中断言看掉血+slowTimer 非数活弹；融合模式走真实菜单（#btn-fusion→选卡→#btn-lets-rock）；强制 state='PLAYING' 不启动主循环→pl.update 手动驱动+真实 sleep 展开 setTimeout；seeds 表禁行内注释
- 紫色系 sprite 转冰蓝：sepia(1) saturate(2.2) hue-rotate(185deg) brightness(1.25)（直接 hue-rotate 大角度会变绿）

## tank-battle（v1.4.20）
- 单文件 game.js + index.html 徽标；句柄 window._tankGame；击杀收敛 Tank.destroy(killer,damage)；Boss 覆写 destroy/update 都不调 super（Boss 回充须单独加进 Boss.update）
- 数值集中 VITALS 常量块；伤害先扣 shieldHp；新字段命名先定稿并 grep 双拼名查重（shieldMax/maxShield 教训）
- 敌方弹道四方向正交；敌人吃道具共用 PowerUp.applyEffect（血量封顶防膨胀）；屏幕震动已移除（shakeScreen 置空，别加回）
- 性能红线：战斗路径禁 shadowBlur；改 map.grid 必接 markDirty()；保险丝 MAX_EFFECTS=90/BULLET_CAP=100
- 测试：红砖墙红色污染像素断言→拦截 ctx.fillText 做行为断言；清空敌人触发 STAGE_CLEAR 停摆→留 frozen 敌人；测 AI 先关自动刷兵+P2 冻结远置

## billiards（v2.7.5）
- G.aimDir 是快照引用恒旧值——读运行时瞄准用 aimLine 几何端点反推；POOL.state 只读 getter，重定向必须 setAim()
- 角袋捕获圆心 (±(W/2+0.015),±(H/2+0.015)) r=0.081（方向=台心→圆心）；斯诺克结算用出杆瞬间快照 shot.snOn
- rebuildPockets() 模块级必须调用一次；视觉瑕疵定位三件套=逐材质隐藏隔离→可疑像素 Raycaster→世界坐标投影色块地图
- 测试：摆干扰球间距>2R；测力度用切角球；难度类 bug 走真实菜单（`||默认值` 会顶掉合法 0 档）；规则结算必须真实出杆端到端（__resolveMock 不物理进袋）
- 辅助线：斯诺克保底普通档 Math.max(assist,1)（0=简单最长/1=普通/2=困难无——"封顶普通"是 max 不是 min，踩过两次）；objLine 实际点数看 drawRange.count（缓冲恒 256）
- 双人键盘（v2.8.0）：P1=WASD+空格/P2=方向键+回车，kbOwner() 按 current 分派（人机模式 P1 通用）；自由球 keyboard 放置依赖 startBallInHand 给 ghost 合法初始点（键盘玩家无鼠标 hover）；掷硬币先手 beginCoinToss 仅 pvp，tossActive 全锁+重入 clearTimeout
- 斯诺克 AI（v2.7.5/6）全难度 simulateShot 搜索 + scoreSnookerSim；简单档无噪声复验+只打 cosCut>=0.45 直球位（复验会贴近理想线导致简单档无敌）；八球简单档保持一步几何；AI 实弹测试强制 POOL.current=1 + setAim + shoot 轮询 state；脚本必进位要避开粉/黑点位

## racing-3d（v1.4.1）
- 相机 right=-worldX；_test.js 96 条与 _diag_steer.js 已入 git，改物理必须全跑；输入类问题先跑真实 DOM 键盘事件
- 草地惩罚是 off 渐变（5m 过渡带）非二值；深草 off=1：极速 0.40×/滚阻 0.055/抓地 0.65；LAT_GRIP=36
- 车对车=Game.carVsCar 动量守恒；碰撞扣速一次性冲量+冷却；AI 冲量/位移换算到 (s,lane)
- 输入隔离：frame() 给 P2 的 in_ 必须显式传 Input.p2；隔离性用「只按一方键另一方不动」断言；键盘断言优先 e.code 桩

## thunder-wing（v1.4.3）
- 纯 Canvas2D 零外部素材（程序化精灵 + WebAudio 合成音）；模块 sprites.js / fx.js / enemies.js / build.js / meta.js / ultimate.js / ai.js / game.js + index.html/style.css（**script 顺序：sprites→fx→enemies→build→meta→ultimate→ai→game**，ultimate/ai 在 game 前**且必须在 meta 后**）；测试句柄 window.__twGame（start(mode) / frame / render / key / press / playerInfo / setPower(p,i) / castUlt(i) / setAI(i,on) / idle(i) / nextUlt(i) / enemySlow()）
- 玩家状态下沉：`G.players[]`（1 或 2 个），每人独立 lives/bombs/power/weapon/spd/combo/comboT/graze/kills；分数与关卡共享。旧全局 G.lives 等用 defineProperty 代理到 1P——**新增玩家属性要同时改 makePlayer + 代理名单 + HUD**
- **键位铁律（v1.4.3 用户定稿，每人严格三键）**：1P `WASD`/`空格(射击)`/`M(大招)`；2P `方向键`/`小键盘回车(射击)`/`小键盘+(大招)`；暂停 `P/Esc` 全局。冗余键（J/Z/K/X/Q/左Shift/主回车/右Shift/slash 等）已全部删除；**NumpadEnter 的 e.key='Enter' 与主回车相同，必须靠 e.code（小写 'numpadenter'）区分**——主回车现不触发 2P 射击
- **敌弹循环是倒序 for，而 playerDie→clearBullets 会清空 G.ebullets** → 下一轮下标取到 undefined 直接崩。必须 `const b = G.ebullets[i]; if (!b) break;`（单人版靠"死后立即 return"掩盖了这个坑）
- 我方子弹带 owner → 连击与倍率归属开枪者；敌弹用 `b.gz[j]` 逐玩家记擦弹（兼容老数据要兜底初始化）
- 添加第二玩家要点：2P 精灵（SPR.player2 = hue-rotate + source-atop 叠色）、识别环与 1P/2P 标记、敌人取 nearest 存活玩家、公平掉落（power 成对 / weapon 三种各一）、一方 out 后另一方可续战
- 测试：_test.js（46 项）+ _shot.js 不入库；改键位/输入必跑真实键盘事件用例（page.keyboard.down('ShiftRight')）；测"再挨一发"要先 frame(1) 消化复活帧再置 invuln=0，且先把 hitstop 清零
- **画面自适应（v1.2.0）**：纵向恒定 800，横向 `W = clamp(vw/vh*800, 420, 720)`；`W` 在 game.js 是 `let`，resize 里算完后经 `TW.setWidth(w)` 广播给 enemies.js（那边同样是 `let W`）。**关卡脚本里的横向字面量必须包 `X(v)=v/480*W`**（已用脚本批量包好 line/vee/sine 的 x0,dx、col 的 x、hover/turret 的 xs 数组）；F.ground / F.dive / ATK.wall / ATK.rain 内部用 W 已是动态。自机速度乘 `fieldSpd()=min(1.25, W/480)`。resize 里调用 initStars 重建星空
- **配色契约（v1.2.0，改视觉必须遵守）**：有害=暖色(red #ff4864/amber #ffa42e/magenta #ff2fae/purple #c15cff/green槽位已改橙红菱形/big 橙红) + 尖锐星芒（`hazard(size,core,ring,spikes)`，角数 4/5/6/2）+ 深红暗描边 + 出膛 7 帧收缩白环；有利=白粗环圆形徽章（`ITEM_LOOK` 表 + 呼吸光环 + 中心符号 P/W/B/S/♥/★）+ 拾取半径 30。**禁再出现绿色敌人/绿弹（绿色=安全语义）**；我方一律冷色（追踪导弹已由紫改薄荷绿 #5ce8b4）；5 台 Boss 涂装全暖色
- 回归保护：_test.js 现有 50 项，含像素级配色断言（遍历 sprite 的 getImageData，敌弹绿色像素占比 <5%、我方红通道占比 <10%）+ 自适应宽度区间 + 走真实关卡脚本验证编队居中
- **局内 Build（v1.3.0，build.js）**：14 词条表 `TW.PERKS`（id/name/desc/max/rar/color/glyph），稀有度权重 [-,10,5,2.5]；`TW.rollPerks(pl,n)` 只抽未封顶词条，**每日挑战经 `G.perkPool` 限定池**；升级阈值 `expNeed(lv)=5+4lv+lv²/6`；经验球 `G.exps` 走 `TW.spawnExp/updateExp`（磁吸半径 90+70×magnet，40 帧后无条件追踪）
- **升级自动发词条（v1.4.2，三选一弹窗已删）**：用户嫌战斗中弹菜单抢方向键体验差 → `build.js gainExp` 升级时直接 `rollPerks(pl,1)` + `applyPerk`，零弹窗零减速零抢键；`pickActive/updatePick/confirmPick/PICK_LIFE/queue` 全部删除
- **词条生效点**：shoot() 里读 rapid/power/twin/pierce/homing/wing；collide 命中处读 crit(12%/级×3 倍、屏震+CRIT 飘字) 与 split(仅 consumed 时炸碎片，穿透弹不炸以免弹幕失控)；killEnemy 读 splash；updateSats() 驱动卫星（26 帧一轮，自动锁最近敌人）；playerDie 读 shield（1080 帧冷却）；擦弹处累加 odCharge
- **超载 OVERDRIVE（v1.3.0）**：擦弹 `odCharge += 7*(1+0.6*graze级)`，满 100 走 `tryOverdrive`（od = 180+72×over级）；od>0 **不能用 `pl.od` 存伤害倍率**——倍率在 shoot() 里现算（dmg×2 / 射速×1.35 / 弹数+1），擦弹半径 ×1.6
- **关卡机制（v1.3.0）**：`STAGES[i].elites = [1100,2200,3120]` 段末精英机（runScript 里按 `G.stageT === t` 触发）；`STAGES[i].gimmick` ∈ {meteor, beam}，runScript 里按帧间隔生成；实体走 `G.rocks` / `G.beams`，更新与碰撞在 game.js；**激光栅栏的缺口必须用冷色标出**（安全通道语义）
- **长线（v1.3.0，meta.js）**：`TW.Meta` 用 mulberry32 + FNV 哈希做日期种子（**同一天所有人同一套随机**）；`dailyPool()` 返回 6 个词条 id、`dailyPower()` 返回 1.00-1.35；8 项成就 `check(stats)` 返回新解锁项；`G.stats = {maxCombo,deaths,odTriggers}` 在 killEnemy/playerDie/tryOverdrive 里采集，`finishRun(win)` 在 OVER/WIN 时结算
- **节奏常量（v1.3.0，改手感先看这里）**：`COMBO_WIN=210`（原 100 太短，短于击破间隔必然断连）、`COMBO_CAP=30`（x4 上限不变）、`BOSS_GRACE=240`（脚本跑完等清场的宽限帧，超时强制 Boss 登场）、`PICK_LIFE=180`
- **Boss 触发条件已修**：原 `G.enemies.length === 0` 会让 turret/hover（永不自行离场）卡死关卡，现为「清场即触发 / 超时 240 帧强制触发并让残敌撤离」
- 回归保护：_test.js 现有 63 项，含像素级配色断言（遍历 sprite 的 getImageData，敌弹绿色像素占比 <5%、我方红通道占比 <10%）+ 自适应宽度区间 + 走真实关卡脚本验证编队居中 + Build/超载/关卡机制/每日挑战/成就专项
- **v1.4.0：永远双人 + AI 代班 + 随机大招**
  - **恒双人**：`G.two` 恒 true，`G.reset()` 恒 push 2 玩家；不再有"单人/双人"分野，菜单按钮一律 `startGame('story'/'endless'/'daily')` 不带 two。落单座位由 AI 代班
  - **空闲接管（ai.js 势场 AI）**：`AI_IDLE = 5*60` 帧（v1.4.2 用户改定 5 秒；曾按 555 秒实现后用户要求缩短）；每玩家记 `idle` 帧，物理按键经 `noteActivity` 清零并夺回（`controlling = hmv || (pl.firing && !pl.ai)`，AI 自设 firing 不算控制，避免自我判定）；超时 `pl.ai=true` 走 `TW.AI.think(pl)` 取 dx/dy/fire/ult
  - **AI 算法**：威胁排斥（含 3/9/17 帧未来位置预测）+ 擦弹诱导（维持擦弹圈边缘蹭充能）+ 敌机排斥 + 陨石/激光规避 + 低威胁拾取 + 目标对齐 + 边界回收；大招决策（弹幕糊脸/残命/Boss 战换输出）。配色：我方冷色，暖色专属有害物
  - **随机大招（ultimate.js）**：8 种 `TW.ULT`（nova 新星爆破 / wing 僚机风暴 / well 引力井 / orbital 轨道炮 / freeze 时空凝滞 / rain 弹幕骤雨 / fortress 要塞护盾 / chaos 混沌轮盘）；`TW.castUlt(pl)` 释放后 `pl.bombs--` + `invuln`  grace + `TW.pickUlt(pl)` 抽下一发（上一发权重降到 15%）；HUD 预告 `nextUlt`。`useBomb(pl)` 已改为 `return TW.castUlt(pl)`
  - **时空凝滞**：`G.enemySlow > 0` 时敌弹/敌机/Boss 降到 1/3 速（enemies.js 的 `TW.updateEnemy`/`TW.updateBoss` 与 game.js collide 都乘 `slow`，`update()` 每帧递减）；`freeze` 大招设 `enemySlow`
  - **要塞免伤**：`playerDie(pl)` 开头 `if (TW.ultEatDeath && TW.ultEatDeath(pl)) return;`（先于 `stats.deaths++`）
  - 测试：`/tmp/tw14.js` 专项 11 项（恒双人/释放炸弹-1/抽下一发/八种无异常/对敌伤害>0/enemySlow>0/555s接管/按键夺回/AI双席位实战击破14不崩/AI走位/AI实战不崩）；回归 63/63
- **并行会话提交风险（v1.3.0 踩到，v1.4.0 又踩一次）**：别的会话用 `git commit -a`/`add -A` 会把你的未提交改动一起带走，且必然漏掉**新增未跟踪文件** → 线上引用 404。v1.4.0 实测：`index.html` 已在并行会话被提交（含 `ultimate.js`/`ai.js` 引用），但这俩新文件没进仓库，导致 `origin/main` 加载即 404；修复=补 `git add ultimate.js ai.js` 提交推送。交付前**必须** `git cat-file -e HEAD:<path>` 核对 `<script src>` 引用的**每一个**文件都在 HEAD 里，缺则立刻补交，绝不 `git commit -a`

## tvbox-web-player
- 部署方式：CF Pages 已连 GitHub 仓库，git push main 即自动部署（无需手动构建，tvbox/ 构建产物随提交入库）
- 主页入口：media.html 卡片 → tvbox/index.html（相对路径）
- v0.1.0（2026-10-01）：多级代理链（自定义→缓存→CF云端→localhost:8080→allorigins/corsproxy）+ header"代理"按钮 + 详细报错；functions/api/proxy.js 修复生效
- 用户核心诉求：小伙伴打开网页即可在各自本地浏览器播放（播放发生在访问者端，CF 只出页面+代理）
