# nexus-hub 项目长期备忘

## 概况
- 用户 区耀丁；仓库 github.com/52ouxiaoyu/nexus-hub.git
- 子项目：pvz-web / tank-battle / billiards / racing-3d / kingdom-rush / thunder-wing / tvbox / slime-cannon / geometry-wars / snake / tetris-battle / sheep-stack / calabash-brothers / chinese-blitz
- 本文件只留铁律与契约；逐版细节查 `.workbuddy/memory/YYYY-MM-DD.md` 与各子游戏 README

## 用户偏好（铁律）
- 每次改动：升版本号 → git add+commit+push origin main；版本号只升不降；改完立即推
- **bump 前必须 `git log --oneline -5` + `git show HEAD:<ver文件>` 核对实际最新版**（摘要会过期）
- 版本号单一来源＝各子游戏主界面徽标；games.html 禁加版本号
- PVZ 严格原版手绘素材，禁自画/Q 版/emoji 混搭；改动最小化
- 红圈截图按标注位置实现，禁止推测；删除类操作先只读扫描 + 等确认
- 键位精简：一个玩法＝方向 + 主动作 + 大招；双人两套键互不串台

## 通用工程教训
- **Edit 工具偶发「报成功但没落盘」** → python `assert count==1` 替换；整脚本先全部断言再统一写盘（失败=零写入）；改完 `git diff` 复核
- Bash 里 grep 多模式/中文常假阴性 → 用 Grep 工具或 python
- 倒序遍历 + 循环内清表 → 每轮开头 `const b=arr[i]; if(!b) break;`
- 左右修饰键用 `e.code`；**`e.key` 会被 IME 改写**（吞成 'Process'）→ 每键同时认 e.key + e.code
- 丢 keyup 卡键 → blur + visibilitychange 全量释放 keys
- data-page-node-id 注入是噪声 diff，add 前剥离
- puppeteer：绝对路径 require repo 根 node_modules；系统 Chrome + `--no-sandbox` + 独立 userDataDir（并行会冲突，串行跑）
- **Chrome 沙箱坑**：报 "sandbox initialization failed" / "Requesting main frame too early" 时不是环境抖动，加 `--no-sandbox` + `userDataDir`；僵尸进程 `pkill -9 -f "Google Chrome.*--headless"`

## 并行会话风险（多次踩）
- **只 add 自己改的文件，绝不 `git commit -a`/`add -A`**；别人未提交的改动不要碰；绝不在真仓库 `git checkout HEAD -- .`
- 交付后 `git show HEAD:<file>` 逐个核对；`<script src>` / `url()` 引用的新素材必须在 HEAD
- push 遇 502 时以输出 `<old>..<new> main -> main` 为准，再补 ls-remote 验真

## pvz-web 通用
- 禁裸写 `element.style.transform`（.entity 靠 CSS translate(-50%,-50%) 居中，走 setTransform/addTransform）；手套显隐统一 gloveHide()/gloveRestore()
- 数据驱动融合 PVZ_FUSION_EXTRA；**材料名含下划线会被 split('_') 截断**
- 加新植物 9 接入点 / 新弹种三表同步（CollisionManager 行命中排除+破甲+减速）
- 测试：每用例清场（g.entities.length=0）；融合模式走真实菜单；强制 state='PLAYING' 需手动驱动 + sleep
- 主菜单模式卡在 body 内 `<style id="menu-style">`：**puppeteer addStyleTag 插 head 会被它反超**（同权重按文档序）→ 试用 CSS 用 `insertBefore(st, menuStyle.nextSibling)`；`.pkt-art` 有 3px border（absolute 的 left/right 从 padding box 起算 → 断言 +3/-3）；覆盖旧规则**必须显式 `transform: none`**
- 缓存戳 17 处 `?v=<ts>` 手工统一替换（正则断言 17 个且唯一）

## 彩蛋系统（v4.0.146~148）
- 首页 `#menu-egg`（z12、pointer-events:none、挂 #start-menu 内）：pop/peek/brains/sun/imp 五种
- 局内 `#game-egg`（守屋挂 #dorm-container z950；PvZ 挂 #game-container z6）：head/brains/cloud/motes
- 只在**安全窗口**放：守屋未暂停未结算 + 最近僵尸 >320px；PvZ 僵尸全在右半场 x>420
- 暂停/结算/切后台 1.2s 内 purge（loop 排程 17~44s 太长，必须另设 setInterval 盯）
- **抽签用洗牌袋**，不用纯随机（纯随机会让某类长期不出现）；brains 池里放两份加权
- **袋间去重**：`bag[0]===last` 时不能只跟 bag[1] 交换（两份额时会换回同类）→ 找第一个 ≠ last 的项换首位
- 冒头类峰值只到 `translateY(30%)`（0% 会盖住卡牌标题）；小鬼 `Imp/0.gif` 素材朝左 → 往右跑必须 `scaleX(-1)`
- 静态大头贴 `ZombieHeadBig.png`（ZombieHead.gif 是「人头从左上滚到右下」的 12 帧动画，放大后会滚出屏幕）
- 云影必须用**贴图** `assets/images/UI/cloud_shadow.png`：radial-gradient 怎么调都像「屏幕暗了一块」（人眼对均匀渐变无感）

## 守屋大作战（HauntedDorm.js 单文件，最活跃）
- **入口=index.html 内嵌 #dorm-screen**；`window.startHauntedDorm({mode,role1,role2,faction})`；代际号 __dormGen 防旧 rAF
- allPlayers 含 5 个人机；植物随身 owner（spawnPlant 第 5 参），伤害记账 `pl.owner||owners[0]||null` 绝不兜底给 P1；结算=_humansAll 全灭
- **暂停**=P 键零模拟（loop 顶部 return）；恢复须后移 `p._lastInputAt` + 补挂起的 `_pendingGameOver`
- **钉床** `_pinToBed`：认领判定必须 `owners.includes(self)`（否则 cap=1 时自家房恒判「有人」→ 进屋即出乒乓）
- **寻路铁律**：① 人机一律 `_pathToBed` 一次 BFS 直达床位，**禁止「到门口 + push 床位点」**；每帧路点相邻性自检（曼哈顿 >1.5 格重算）+ 单帧位移封顶 0.9 格 + 墙内救援；任何搬移后必须重算 path。② **僵尸寻路绝不能把植物写进障碍表**（屋内通道被堵→BFS null→走直线→撞墙死循环）→ `_findPath(..., false, {ignorePlants:true, nearest:true})`。③ 末端补像素点前验「最后一格 ≤1.5 格」。④ 帧末兜底：位移 <1px 且未啃食累计 5s → 作废 lockedTarget 重选
- **僵尸开局观察期 `zombieFreezeT=10`**：技能封锁要三层（keydown 整批吞技能键 + `_cycleCommandTarget`/`_orderHorde` 入口 `_frozenSkillBlock()` + 技能栏显示）；**横幅 DOM 必须 append 进 #dorm-screen**（它 z4000，挂 body 会被盖住）
- **号令尸潮**：`survivorKills >= 2`，只统计僵尸方真人啃咬击杀；**连发两条 _announce 会互相覆盖**，要合并
- **波次 `WAVE_MAX=7` + `WAVE_GAP=60000`**（v4.0.146）：第 5 波巨人波、第 7 波最终波「尸潮领主」（同波巨人 ×2 血、160% 体型）击杀即胜；开波后 waveAt=Infinity
- **房间尺寸档位**（v4.0.142）：small 6~12（固定 1 间）/ normal 16~25 / trap 16~35 / L 27~33 / **big 40~50（硬上限）**；落点 640 次、>400 降 `normalSmall` 保底；**出生/回血圆圈 ±2 格内无房间**（用包围盒判，_insideRoom 漏 L 形缺口）
- **南瓜套锚点**：`Plant.ART_BOTTOM_RATIO`（内容底边/画布高），素材 bbox 底距画布底 >15% 才登记；否则超大透明画布会让壳整体下坠
- **不能往 `<img>` 里塞子节点**（罐子重掷空白）：要缩略图挂 entityLayer，走 `lightUpNeighbors`，重掷必须传 `selfToo`
- **破门永久**：判据落在 `spawnPlant` 建的 `rm._doorSeen`（建过又没了＝被咬毁）；只靠 doorBroken 会漏「同帧先咬毁后认领」
- **人机不许原地绕圈**：换房失败拉黑 20s（`_aiMarkBadRoom`/`_aiNearestClaimRoom`）+ capacity + `_roomReservedForHuman`；3s 采样净位移、6s 挪不到 1.2 格就钉床/停摆
- **僵尸阵营真人碰到人机＝秒杀**：`v.hp=1; v.biteT=1.5` 让当帧那一口必死；内鬼形态不适用
- **内鬼能动**：床位那格有植物时 checkCollision 会四向全拦 → 内鬼走 `_traitorFreeStep`（只拦新增阻挡格）；跳板出门判据要逐人（原来只看 P1）
- 地板铺 `.tile.room` 但**敞开凹口不铺**（4 邻域 flood fill 能连到边界＝外部）
- **图鉴三分区**：守屋 DEFS 升级形态必须标 `k:'dorm'`，放「守屋专属」，别塞进融合区
- 诊断范式：全植物体检 _diag_plants.js；守屋三场景巡检 _diag_v4144_soak.js（单人植物/双人植物/双人僵尸各 42s 真实按键）

## 守屋数值骨架（v4.0.106 审计，仍未改）
- **病根**：四条 ×2 曲线叠加（产出/升费/植物伤害/僵尸血量）→ 回本恒定 10~20s → 永远升级恒最优；只能重设骨架（产出 ×2→×1.6），调参无效；55 融合配方全建在 ×2 链上 → 「先骨架后内容」
- 豌豆链：tier1~9 ×2（1→256）、tier10~16 ×1.85（封顶 19300）；只改 DEFS `shoot.dmg`，别动弹数/射速
- **平衡铁律**：僵尸血量必须与植物攻击力匹配（普通 50×2^(L-1) → 机甲 25600；小鬼 25×2^(lv-1)），保持「单株同级豌豆恒 50 发击杀」

## 泡泡工坊音效（v4.0.156 起）
- `MiniGames.js` 顶部内置 `SFX`（WebAudio 纯合成，零素材）：调用形如 `SFX.pop(颗数, 音量系数)`；**静音＝总线 gain 归零**，不拦调用
- **两套音色不能混**：泡泡走中高频+气声（玻璃），机械龙走低频锯齿+LFO 颤音（`growl()` 把 LFO 接到 `oscillator.frequency`，纯 sine 滑音像汽笛）
- `BubLane.sfxK` 是音量系数（对轰 AI 侧 0.3）；`f0→f1` 必须 exponentialRamp
- 每个音效带 `gate[name]` 节流 30~90ms，别去掉（一帧连锁消 20 颗会糊成噪声）
- 测音效只能量波形：`SFX.probe()`（AnalyserNode → RMS）；首次读全 0，先预热一次再测
- 通关/失败音统一在 `Base.end()`，新增玩法别重复写
- **`SFX.pop` 在 `BubLane.land()` 里，不在 `settle()` 里** —— 测试直接调 settle 断言"有碎裂声"必失败，要构造真实 `land()`

## 泡泡工坊布局与平衡（v4.0.157 起）
- **画布是 `W=900, H=600`**（不是 700）。新玩法排版前先把 W/H 读出来：牧场花盆第一版按 700 排 → 整排被底边切掉，断言查不出
- **DOM 顶栏（回大厅/关卡名/声音）压在画布 0~52px**：画布内 HUD 必须避开，机械龙血条放 330~620 中间带、牧场 HUD 从 y=68 起
- **同色 = 同种植物，不扩颜色**：机械龙仍是 4 色，靠"消除颗数 n"决定进化形态（绿 `5*(n-2)`、紫 `[0,1,2,4,8][n-2]`）。nColors 加到 8 会稀释同色概率，三消直接玩不动
- **伤害变低就必须同步放慢下压**：旧版 4 点/颗 → 植物体系后整体低 40%，同节奏会先被压死（机器人 32 秒只打掉 18% 血）→ 喷吐间隔 6.6/5/4 → 8.2/6.4/5.2，每次少压 1 颗
- **机器人测平衡会骗人**：瞄准"最低行中间球"会一直打同一列，形成 `[19,18,12,1,1,1,1,1,1]` 长蛇，7 发顶红线 0 伤害。可信做法是**数学模拟**：直接调 `onPop` 按 3~6 连 / 4 色均分 / 25% 空发跑 300 局
- 忧郁菇 = 激怒换爆发：血上限 640→1000 且当前血 +360，但毒 4 倍（模拟触发率 63%，接近常态）

## 砸罐子（v4.0.158 定骨架）
- **配比只有两个开关**：自由局 `_vaseDiffCfg().plantMin/plantMax`（硬夹子，摆完必按它校准绿罐数）+ `bag`；手工关 `VASE_LEVELS` 的 `p/q/z` 配额（写死，`!L` 的校准一律跳过）。改「这档给几个植物罐」就改这两处，别去动抽签概率
- **前排罐分红牌 / 暗雷**：僵尸罐红光脉动、可先不砸也能提前布防 = 明牌（保留，是紧张感）；问号罐/绿罐在前排吐僵尸 = 暗雷（玩家判断不出还必须砸完，必死）。断言只该写 `frontHidden===0`，`frontVisible` 只做上限
- **修暗雷要交换「罐子位置」而不是「内容」**：问号罐彼此一模一样，换位零痕迹；把僵尸塞进绿罐会打破「绿罐=植物/阳光」的视觉承诺。目标优先后排问号罐→绿罐→僵尸罐，每局最多前移 1 个僵尸罐，再不行把暗雷摊成植物
- **砸罐子的第 0 行是死行**（`candidates` 从 r=1 起，没罐子也没植物）→ 大蒜系 `adjRowOf`/`_garlicHits` 的 `minRow` 在 `vaseMode` 下必须锁 1
- **手工关任何补强必须确定性**（用 `(关卡号, 行)` 做输入），否则「最少行动点三星」标准失效；同一关重玩必须逐帧一致（种子 `L.n*7919`）
- 倍速文案只有一个写入点 `_syncSpeedLabel()`；`cycleGameSpeed()` 是唯一循环入口。随机事件改 `gameSpeed` 前必须存 `prev` 还原

### 机器人测平衡的四个坑（判断「关卡不可解」之前按这个顺序查）
1. 别给「有罐子但没僵尸」的行发输出（白扔主力）
2. `plantAt(row, arr.shift(), …)` 是**先吃卡再试种**，种不下就凭空消失；失败即 `break` 会把剩下的卡全废 → 用 `arr[0]` 试种、成功才 shift、按优先级遍历所有行
3. 只数僵尸只数不够，得掂量硬度（1 只路障 538 血 ≠ 0 只）；最终策略：有僵尸的行先各 1 株→再各补第 2 株→剩下按 `rowZ - atk*1.6` 倾斜
4. 判死前先 dump：wrap `_revealZombieFromVase` 记 `type@r?c?[罐型]` + 打印 `board.grid`。掉壳后 `this.type='normal'`（Zombie.js 1174~1221），路障/铁桶会伪装成「凭空出现的普通僵尸」；崩盘行往往是「一株植物都没有」

## 其他子游戏（只留铁律）
- **tank-battle**：单文件 game.js，句柄 window._tankGame；击杀收敛 Tank.destroy(killer,damage)；Boss 覆写不调 super；数值集中 VITALS，伤害先扣 shieldHp；禁 shadowBlur；改 map.grid 必 markDirty()；测试清空敌人会触发 STAGE_CLEAR 停摆 → 留 frozen 敌人
- **billiards**：G.aimDir 是快照 → 用 aimLine 端点反推、重定向必须 setAim()；POOL.state 只读；角袋圆心 (±(W/2+0.015),±(H/2+0.015)) r=0.081；双人 P1=WASD+空格 / P2=方向键+回车；`||默认值` 会顶掉 0 档
- **racing-3d**：相机 right=-worldX；_test.js 96 条必全跑；LAT_GRIP=36；frame() 给 P2 必须显式传 Input.p2
- **thunder-wing**：纯 Canvas2D 零素材；句柄 window.__twGame；玩家状态在 G.players[]。**坚决不能有弹窗**（升级=全自动随机发放只飘一行字）；弹幕契约（密恐）：敌弹 ≤120/我方 ≤80、出弹间隔×2；**禁绿色敌人/绿弹**；关卡横向字面量必须包 X(v)
- **slime-cannon**：纯单局（禁 localStorage 存档/局外养成）；坐标 PIVOT_Y=630；**画布不接受指针输入**；子弹微吸附 HOME_ARC=0.38 不许调大；处决 EXEC.cd=12 不许调高；射速×单发是常数对（6.3×12.5）；**震动禁白噪声**（用 min(shake,9)*0.42 + 低频正弦）；**密度铁律** popMax 30 / popBase 12；元素反应 `reactKey` 必须 sort 后比较、`reactCd ≥ .9`
- **tvbox-web-player**：CF Pages 连 GitHub，push 自动部署；functions/api/proxy.js
