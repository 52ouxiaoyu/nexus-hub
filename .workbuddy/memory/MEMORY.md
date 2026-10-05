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

## tvbox-web-player
- 部署方式：CF Pages 已连 GitHub 仓库，git push main 即自动部署（无需手动构建，tvbox/ 构建产物随提交入库）
- 主页入口：media.html 卡片 → tvbox/index.html（相对路径）
- v0.1.0（2026-10-01）：多级代理链（自定义→缓存→CF云端→localhost:8080→allorigins/corsproxy）+ header"代理"按钮 + 详细报错；functions/api/proxy.js 修复生效
- 用户核心诉求：小伙伴打开网页即可在各自本地浏览器播放（播放发生在访问者端，CF 只出页面+代理）
