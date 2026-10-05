# v3.3.10-melon-hd — 西瓜投手 / 冰西瓜投手精灵图更换

## 背景与目标

用户肉眼观察到 `MelonPult.png` 比其它植物偏糊，担心是以前特殊处理时损坏了原图。
明确诉求："不希望你再去制作图片了，而是直接去寻找官方原版的 GIF 图。如果能找到'西瓜投手'的图，最好能直接替换。"
进一步答复："我感觉所有的都有点糊，都需要替换"——确认同时替换 game sprite + 融合配方图 + 选卡三处用法。

## 调查路径（依序尝试，全部失败后才回退到方案）

1. **git 历史反查** → 静态 PNG 来自 Fandom 下载 + 扣草绿底（`3e0d66d`），当前锐度拉普拉斯方差 2887.6（同目录 Peashooter.gif 5144）
2. **wiki.gg `Animated Melon-pult.gif`** → 188×144 82 帧，**但角像素不透明（带草地背景）**，舍弃
3. **Spriters-Resource `162766.png`** → 拿到后发现是**抛石机部件分解图**（连通分量 10+ 块），不是完整精灵
4. **GitHub 原版克隆**（jiangnangame/New-Plants-vs-Zombies-JavaScript、studyzy/pvzjs）→ **根本不存在 MelonPult**，因为它是后期补的素材
5. **最终方案**：用 wiki.gg 的**官方透明静态版** `Melon-pulthd.png` (260×197) + `HD Winter Melon.png` (456×417)，α 轮廓相关 0.878 / 0.824 vs 当前版，姿势一致，色板正确（冬西瓜全蓝带霜，纠正原 make_wm_blue.py 滤镜伪全蓝）

## 实施

| 文件 | 旧 (lap_var) | 新 (lap_var) | 提升 |
|------|-------------|-------------|------|
| `Plants/MelonPult/MelonPult.png` 96×96 | 2887.6 | 3039.6 | +5% |
| `Plants/WinterMelon/WinterMelon.png` 96×96 | 2858.3 | 3620.1 | +27% |

适配公式：`crop_to_alpha_bbox → scale height=88 (Lanczos) → bottom_align base_y=91 → center_horizontal`，与原 sprite 脚位严格对齐，零布局位移。

替换覆盖 4 处用法：game sprite（Plant.js:156, 161）、recipe result img（GameLoop.js:287, 296）、recipe 叠层（GameLoop.js:306, 307）、recipe getImg map（GameLoop.js:338, 339）、选卡（`<img class="entity">`）。

**弹丸小图（50×40 + 32×32）故意不动**——它们是 Projectile.js 专用，分辨率本就该低。

## 验证（puppeteer headless，截图肉眼比对）

- `_verify_v3310.js` 三场景全 PASS：选卡 modal（西瓜投手卡右下角是新图）→ 草坪 5 株植物并排（peashooter 参考 + melonpult + wintermelon × 2 行）→ 配方图鉴滚到底（西瓜猫尾草 + 冰西瓜猫尾草 叠层清晰）
- `g.update()` 必须显式调用，否则 Plant.element.style.top/left 没写，截图里看不到植物
- 配方图鉴需要 `recipe-list.scrollTop = list.scrollHeight`（不是 parent）才能滚到底
- 缓存置换 54 处 `?v=1788689333 → ?v=1788695989`，版本徽标显示 `v3.3.10-melon-hd (build 2026-09-06)`

## 流程

`/Users/clawbox/nexus-hub/bump_version.py "v3.3.10-melon-hd"` → commit `d76c4d0` → push origin main ✓

## 关键教训（已写入项目 MEMORY.md / 2026-09-06.md）

1. 找不到动图就退而求其次找同姿势的官方高清透明图，比反复在糊图上"东处理西处理"高效得多
2. 静态精灵与弹丸图必须分清（路径相似但尺寸/用途不同，改前必查 grep）
3. 锐度（拉普拉斯方差）连续指标：>4000 清晰 / <3000 糊 / <1000 不可用
4. Plant 截图前必须 `g.update()`，否则实体未挂载到 entity-layer
5. 配方 modal 可滚动容器是 `#recipe-list`（不是它的父元素）
6. **植物素材至少分 3 套**（`Plants/<Name>/<Name>.png` 96×96 立绘 vs `Card/Plants/<Name>.png` 100×120 双段式卡图 vs `Plants/<Name>/<Name>.gif` 动图），改 sprite 时必须把 `Plant.js` + `Projectile.js` + `GameLoop.js seeds.img` 三处引用全部覆盖
7. **Card/Plants/*.png 不能直接用 Plants 立绘替换**——卡面有"上半彩立绘 + 下半灰度图标 + 主题底色"标准版式（边角 alpha=0、卡片圆角由 CSS 切），需要用清晰卡片做模板按 bbox 合成
8. Lanczos resize 后 alpha 会软化回半透，必须**两次 alpha point 二值化**（resize 前 + 后）才能保证边缘不与底色混色

## v3.3.11-card-hd 补充

`Card/Plants/MelonPult.png` + `Card/Plants/WinterMelon.png`（100×120 双段式种子卡，用作 chooser-grid backgroundImage + HUD .seed-card backgroundImage）也漏改导致用户继续看到老图。用 Peashooter.png 作版式模板，把植物 bbox 抠掉换新 HD 透明立绘；下半做 `(L, L, L, alpha_binary)` 灰底；alpha 硬 255 防混色。锐度 MelonPult 6692→7706 (+15%)、WinterMelon 7078→7410 (+5%)。commit a3f1ef0 已 push。

## v3.4.0-vasebreaker 砸罐子模式（已 push 77400fb）

**主页第三张 `.mode-card`**：与"经典冒险"/"融合进化"同款（268×292 种子包样式），`.pkt-art` 绿色方框插图用 PvZ3 官方 vaseIcon `assets/images/Vase/Vase_Question.png`（220×279 透明，问号罐子立绘）。

**规则实现**：
- 三类罐子：植物罐（必出植物）/ 问号罐（55% 植物 45% 僵尸）/ 僵尸罐（必出僵尸）
- 5×9 棋盘，避开 row0（第一排）和 col0（第一列）
- 罐子数 20–28 随机
- 类型比例 plant 53% / question 27% / zombie 20%（8 trial 验证总样本 181：plant 56.9% / zombie 23.2% / question 19.9%）
- `WaveManager.update` 顶部 `if (this.game.vaseMode) return;` 停刷怪，所有僵尸来自罐子
- 融合 / 砸罐子模式都关闭随机事件：`update()` 内 eventTimer gate、`updateScore()` 内 scoreMilestones gate、`triggerRandomEvent()` 顶部 return 三处都加 `|| vaseMode`
- 砸罐：`InputManager.mouseup` 普通点击分支顶部先查 vase，命中则 `game.smashVase(row, col)` return（不消耗阳光也不引爆炸弹）
- 砸开内容：植物池 = 全 PVZ1 植物全集（攻击型权重高，少量坚果/向日葵）+10 分/罐；僵尸池 = normal/conehead/buckethead/flag/polevaulting/newspaper，出生 `z.x` 设为罐子所在列中心（不是默认 950），-5 分/罐
- 胜利：所有 vase smashed + 场上无 `Zombie && !isDead && state!=='DYING'` → `state = 'GAMEOVER'` + VICTORY 横幅 + Final Score + 回主菜单按钮
- 失败沿用原 gameOver 流程（僵尸 `x < 40` 触发）

**3 个罐子 sprite 生成**（`assets/images/Vase/*.png`，90×100 RGBA 透明）：
- `Vase_Question.png` = PvZ3 官方 `vaseIcon.png` (220×279 RGBA 透明) → 紧 alpha bbox（`point(lambda v:255 if v>30 else 0)` 防 PNG 抗锯齿边角污染）→ Lanczos 缩到高 86 → 居中到底对齐
- `Vase_Plant.png` = 问号罐 + PIL 贴 PvZ1 `Plants/SunFlower/0.gif` 头 bbox（32px 缩放后）
- `Vase_Zombie.png` = 问号罐 + PIL ImageDraw 写白色描边 Arial Bold "Z"（56px）

**关键工程坑**：
1. **PvZ3 vaseIcon alpha bbox 填满 220×279**：png 抗锯齿 + 罐底地面阴影都 alpha>0，让 `getbbox()` 返回 (2,2,218,276)，缩放后被错误等比拉伸成"飞碟"。改 alpha 阈值收紧后比例正确。**经验：透明 PNG 的 `getbbox()` 不可信，必须阈值收紧**。
2. **权重逻辑错误 1**：原版 `weights[3 组各 1/3 选择 + 组内 pick]` → 实际 ~1:1:1（每组内部全 plant/全 zombie/全 question）。必须做 15 元素 `drawBag` 直接加权（8 plant + 4 question + 3 zombie = 53/27/20%）。
3. **PvZ3 罐子 vs PVZ1 手绘风**：PvZ3 是 3D 渲染，整体作为新模式 sprite 接受，植物头贴 PVZ1 向日葵头形成混搭风格。
4. **Edit 工具"成功"但实际未插入 HTML**：第一次用整段 old_string 替换 `</button>\n</div>`（融合卡结束 + menu-cards 结束），报告成功但 grep 不到 `btn-vase`。可能是缩进/不可见字符不完全匹配。重做时改用更短 old_string（仅最后两行）成功。

**fandom / wiki.gg 抓资源**：
- wiki.gg PvZ3 `Vasebreaker vaseIcon.png` 220×279 RGBA 透明 ✓
- wiki.gg PvZ1 `2.PNG` 是 PvZ2 截图（非 sprite）✗
- fandom PvZ2 `HD Vase / HD Plant Vase / HD Gargantuar Vase` 因 rate limit / 后台进程丢失 ✗
- **结论**：单一 PvZ3 vaseIcon 足够用作问号罐母体，植物罐/僵尸罐用 PIL 合成

**puppeteer 验证** `_verify_vase.js`：
- 5 trial 总样本 109，类型分布 ~1:1:1（修正前）
- 8 trial 总样本 181，修正后 plant 56.9% / zombie 23.2% / question 19.9%
- 端到端：菜单 3 卡 → 选植物+开局 → 砸 6 罐（4 僵尸 2 植物 score=20）→ 强制胜利 VICTORY 横幅。无 pageerror。

`bump_version.py "v3.4.0-vasebreaker"` → commit `77400fb` → push origin main ✓

## v3.4.1-vase-click-fix 修复"砸罐子点不进去"（已 push 3a94a74）

**用户反馈**：主页"砸罐子"卡点击无反应，封面本身 OK 不用改。

**根因 = v3.4.0 两处静默遗漏 + 一个潜在遮挡**：
1. `showMenu()` 漏绑 `btn-vase` onclick（只绑了 adventure/fusion）→ 点击无反应
2. `this.vaseMode` **全项目只被读、从未被赋值**（`startGame:202` 的 setupVases 闸门 / `WaveManager.update:11` 停刷怪闸门 / `InputManager` 砸罐分支三处读它）→ 永远 falsy，即使绑了按钮也进不了玩法
3. `#seed-chooser` 内联 style 里 `display:none` 被后面的 `display:flex` 覆盖 → 选卡黑幕默认可见（平时被 start-menu z-index 2000 盖住；砸罐跳过选卡后会盖住草坪吞点击）

**修复**：
- 构造函数补默认 `fusionMode=false; vaseMode=false`
- `showMenu()` 绑 `btnVase.onclick`：隐藏菜单+选卡 → `vaseMode=true` → `selectedSeeds=[]` 直接 `startGame()`（PVZ1 规则：无需选卡，植物在罐子里）；adventure/fusion 同步补 `vaseMode=false` 重置
- index.html `#seed-chooser` 改为末尾单一 `display:none`（flex 布局属性保留）

**验证（puppeteer 真实事件，非直调函数）**：`page.click('#btn-vase')` → 菜单隐藏 / PLAYING / vaseMode=true / 罐子 20-28 / 0 错误；`page.mouse.click` 罐子中心 → smashed 1/27 实体生成。

**新教训**：新增模式提交前必须 `grep -rn "xxxMode" js/` 检查标志变量的赋值点；模式入口要用真实点击做端到端验证（`p.click` 而非 `evaluate` 直调内部函数），否则"内部都通、入口没接"会留给用户发现。
## v3.4.2-vase-colors-cards 罐子配色 + 植物卡机制（已 push a4665b7）

**用户需求**：① 植物罐=问号罐染绿、僵尸罐=问号罐染紫（封面色调不用动）② 砸植物罐得到可拖到任意格子种植的"植物卡片"（替代原地自动种）。

**罐子染色**：HSV hue-swap（橙 22°→绿 98°→紫 272°），逐像素保留 S/V 明暗立体感、近黑描边与纯白高光保持中性；删掉旧"向日葵头/Z 字"贴标方案。三色 sprite 由 setupVases 按 type 选用，颜色即类别。

**植物卡机制**：`grantVasePlantCard()` 取代 `revealPlantFromVase()`——抽 type 后向 HUD seed-bank 追加 `.seed-card.vase-free-card`（卡面 Card/Plants/<Name>.png、cost=0、金圈高亮），`tryPlanting()` 顶部加免费分支（canPlant 成功才扣卡），`plantCardArt()`/`assetStamp()` 保证卡面路径大小写与缓存戳正确。constructor + startGame 重置队列。

**验证**：3 色 sprite 按类型计数正确 → 真实点击植物罐得 spikeweed 卡 → 真实拖到 (1,1) 种下、卡消耗、sun 不变、0 报错。

## v3.4.3-vase-lantern-rebalance 砸罐子再平衡 + 路灯花揭示（已 push f110299）

**用户需求**（三条合一）：① 植物罐明显减少，问号罐占多数 ② 问号罐出植物时别只给"那几个植物"——含一次性植物(樱桃炸弹)及强力(西瓜类等) ③ 问号罐出僵尸概率高一点 ④ **新增**：植物罐小概率含**路灯花**(plantern)，种下后**照亮周围一圈罐子里的内容**。

**类型再平衡**：drawBag 从 8/4/3(53/27/20) → 5/11/4(25/55/20)，问号成绝对多数。问号罐内部 60% 出僵尸(原 45%)，单关总僵尸 ~12 只(原 ~8)。植物奖励池扩到 27 种：豌豆×3、寒冰×2、双发×2、向日葵、坚果×2、高坚果、樱桃×2、窝瓜×2、火爆辣椒、土豆×2、寒冰菇、大嘴、地刺、三线、裂荚、机枪、西瓜投手、冰西瓜投手、猫尾草。**问号罐不出 plantern**(防"白白挖坑")；仅植物罐 27+4 plantern 池约 12.9% 出。

**内容预掷(关键架构变化)**：`setupVases` 阶段为每个罐子预掷 `v.content = {kind, type}`(植物种/僵尸种)；`smashVase` 不再随机 roll，直接读 `v.content.kind/type` 决定发卡/出僵尸；公告前缀按 `v.type` 区分「植物罐/僵尸罐/问号罐」。**plantern 揭示 = 100% 真相**(非概率预告)，与实际砸出完全一致。

**路灯花 plantern 新增**：
- 资产**全部已有**：`Card/Plants/Plantern.png` 100×120 双段卡(原版) + `Plants/Plantern/0.gif` 250×237 白天透明大画布(夜版 Plantern.gif 20 帧不适合白天场地)
- `getPlantName` 映射 `plantern→路灯花`；`plantCardArt` 映射 `plantern→Plantern`；`InputManager` dragGhost 走 `Plantern/0`(透明大画布)
- `Plant.js` 加 stat 分支：hp 300、src 0.gif、yOffset 0；非 fusion 出口处加 90×90 objectFit:contain
- **新方法 `lightUpNeighbors(row,col)`**：8 邻居中未砸未揭示的罐子 → 打 content badge
  - 植物内容：缩 46×55 的 `Card/Plants/<Art>.png` 卡图预览(种下去会得到什么)
  - 僵尸内容：该僵尸 in-game 立绘 50px(路障/铁桶/撑杆等)
  - badge 浮在罐子上方 (cy-38)，与 v.element 一起在 smash 时 removeChild
- `tryPlanting` 免费分支新增 `if (type==='plantern') this.lightUpNeighbors(row,col)` 钩子
- 提示 toast「路灯花照亮了 N 个罐子里的内容！」

**关键工程坑(必读)**：
- **Edit 工具"successfully edited"也可能没真改**！本轮对 setupVases 注释/drawBag/chosen.forEach 的 4 个 Edit 都报告成功，但 grep 发现 line 994 旧注释、line 1016 旧 drawBag 仍存在；新方法被**追加到旧方法后面**，导致 setupVases 创建的 v 没有 content 字段 → smashVase 读 v.content.kind 报 "Cannot read properties of undefined"。
- 同样问题影响 tryPlanting 里的 plantern 钩子。
- **应对**：批量 Edit 后**必须 `git diff -- <file>` 验证关键方法签名/钩子存在**，不能只信 Edit 工具的成功消息。用 grep 反查新方法名/新钩子字符串确认。
- 修复方式：用**完整方法签名 + 唯一锚点**的更大 old_string 做单次 Edit 替换。

**puppeteer 真实点击验证**：
- 起 `python3 -m http.server 51823`(8765/9876 被系统网关拦截返 502)
- 流程：`page.click('#btn-vase')` → 等 vaseMode=true → 真实 `page.mouse.click` 砸开 4 个植物罐(拿到 wallnut/plantern×2/iceshroom) → 真实 `page.mouse.move/down/move/up` 拖路灯花卡到 (2,4) → 验证 plantGrid[2][4]=='plantern' 且 3 个邻居罐子全部 revealed+badge
- 分布实测：total=20, plant=4(20%), question=13(65%), zombie=3(15%)，与目标 25/55/20 随机波动吻合
- 关卡总僵尸 13(纯紫色罐+问号罐出僵尸)；0 pageerror，仅 2 个 404 资源(无关)

**截图见**：`/tmp/v343_02_field_initial.png`(开局 20 罐三色分布) + `/tmp/v343_03_plantern_lit.png`(路灯花种下后 3 邻居亮徽标)

`bump_version.py "v3.4.3-vase-lantern-rebalance"` → commit `f110299` → push origin main ✓

## v3.4.4-vase-sun-lantern-shop 阳光经济 + 路灯花商店 + 半透明揭示 + 胜利双按钮（已 push 2674f79）

**用户四条需求合一**：① 植物罐可砸出阳光，阳光买路灯花 ② 路灯花只能买，罐子不再掉 ③ 路灯花照亮 = 罐子半透明 + 罐内可见内容 ④ 胜利画面双按钮（再玩一局 / 退出）。

**阳光经济**：
- `v.content.kind` 扩展为 `'plant' | 'zombie' | 'sun'`；植物罐 55% 植物卡 / **45% 阳光罐**(Sun 实体，落地 0.5s 自动收集 +50 阳光)
- vase 模式开局 `sunCount=0`，update() skySun 段加 `!vaseMode` 守卫**禁天降阳光**——所有阳光都来自砸罐
- v3.4.3 的 `allowPlantern` 参数与 plantern 池项**全部清除**，任何罐子都打不出路灯花

**路灯花商店**：
- `seed-bank` 首位常驻 `.plantern-shop-card`（原版 Card/Plants/Plantern.png 双段卡 + ☀75 金边角标，CSS `.plantern-shop-card .shop-price`）
- `InputManager.mousedown` 特判 `buyPlantern()`：阳光不足提示「阳光不足：路灯花需要 75 阳光…」；足够扣 75 追加一张可拖的路灯花免费卡(vase-free-card)
- 顺手补**罐位种植拦截**：`tryPlanting` 免费分支加 `if (vaseMode && 该格有未砸罐子) return 提示`，防止路灯花盖住罐子

**半透明揭示（替换 v3.4.3 浮在罐子上方的徽标）**：
- `lightUpNeighbors` 重写：罐子 `opacity 0.40` + 暖光 `drop-shadow` + 罐内中心叠内容缩略图
- 内容物：植物 → `Card/Plants/<Art>.png` 46×55 / 僵尸 → in-game 立绘 56×64 / 阳光 → Sun 图标 40×40
- `badgeEl` 字段统一改为 `contentEl`，与预掷 `v.content` 100% 一致

**胜利画面重做**：
- 双按钮「再玩一局」（绿）/「退出」（棕）并排
- `_vaseWinEls` 跟踪 UI 元素方便重置
- `restartVaseLevel()`：清整场（罐子/植物/僵尸/阳光/子弹 DOM 与数组 + board.grid + history）后 `startGame`
- `startGame` 加 `!PLAYING` 守卫（防止 PLAYING 中重开导致双 rAF 双倍速）
- 胜利检测从 smashVase 瞬间调用改为 update() 每帧末尾调用，防止最后僵尸被植物打死而非砸罐砸出时遗漏触发
- 退出按钮 = `location.reload()` 回主菜单

**puppeteer 真实点击验证**（端口 51998，scale=1.2667）：
- 21 罐局，开局 sun=0、shop 卡存在、罐内无 plantern
- 阳光不足点击被拒 + 提示「阳光不足：路灯花需要 75 阳光」
- 砸 2 个阳光罐 sun 0→50→100
- 真实点击 shop 卡 → sun 100→25 + 路灯花金圈 free 卡出现
- 真实拖到 (3,4) → 路灯花种下 → 5 个邻居罐全半透明 + 罐内可见内容
- 胜利画面：双按钮「再玩一局」「退出」都在
- 真实点击「再玩一局」→ 干净开新局（21 罐、sun 0、无残留实体/植物、shop 在、胜利 UI 清除）
- 新局真实砸罐成功，0 JS error（仅 2 个无关资源 404）

**关键工程坑(必读)**：
- **puppeteer 坐标**：必须 `rect.left + (logic * window.gameScale||1)` 才是真实 client 坐标。`window.gameScale=1.2667` 把 900×600 逻辑按 1.2667 缩放铺满 1140×760 视口，初版用 `rect.left + logic` 落点偏 1-2 格 → row4 点击失败
- **Sun collect 时序**：自动收集需 0.5s 落地 + ~1s 飞向 (50,30) 计数器。1500ms 多数帧率足够但偶发不够 → 测试分段等待 600/900/1000ms + "点不中换下一个阳光罐"容错

**截图**：`/tmp/v344_03_bought.png`(购买) + `/tmp/v344_04_reveal_transparent.png`(半透明揭示) + `/tmp/v344_05_victory.png`(双按钮胜利) + `/tmp/v344_06_replay.png`(新局干净开局)

`bump_version.py "v3.4.4-vase-sun-lantern-shop"` → commit `2674f79` → push origin main ✓

## v3.5.0-vase-difficulty-sfx-sign 难度分级 + 罐子破碎音效 + 战场左侧「区耀丁」署名（已 push 7a1dda2）

**三大改动合一**：① 砸罐子时同步播放原版 PvZ 官方 Vase_breaking 音效（0.64s 11.8KB）② 把砸罐子分成「简单/困难/地狱」三档（主页砸罐卡先弹难度选择弹窗）③ 战场左侧罐子区左边的第一列 col0 打出帅帅的竖排金字「区耀丁」署名。

**罐子破碎音效**：
- 从 wiki.gg 下载原版 PvZ `Vase_breaking.ogg`（0.64s, 12KB, 188 kbps Ogg Vorbis）→ ffmpeg 转码 148 kbps MP3（11.8KB）放入 `assets/audio/vase_breaking.mp3`
- `AudioManager` 新增 `vasebreak` 频道（克隆节点支持重叠），`smashVase()` 在 `v.smashed=true` 后立即 `play('vasebreak')`，与放大淡出动画同步响起

**难度分级（简单/困难/地狱）**：
- 主页「砸罐子」卡改为先弹难度选择弹窗（z 2400 黑幕 + 木板面板 + 三张绿/橙/粉紫按钮），选定后免选卡直接开局
- 所有参数集中在 `_vaseDiffCfg()`：简单 16-20/植物罐 53%/问号 35% 出僵尸/植物罐 78% 出卡/僵尸池 normal+conehead+flag；困难 22-26/问号 55%/60% 出僵尸（≈ v3.4.4 基准）；地狱 26-28/植物罐仅 15%/问号 75% 出僵尸/植物罐 45% 出卡/僵尸加重 buckethead+screendoor/砸出僵尸血量 ×1.35
- HUD 右上常驻 `.diff-chip` 角标（绿/橙/紫红三色 + 「难度 · 中文 EN」）
- 胜利画面标题附难度名，`restartVaseLevel` 沿用当前难度
- 附属：`_revealZombieFromVase` 加 `hpMul` 厚血 + `lightUpNeighbors` 补 `screendoor` 图标 + `zhName` 补「铁门僵尸」+ 公告前缀「【简单/困难/地狱】」

**战场左侧「区耀丁」署名**：
- 罐子区（col1 起）左边的第一列 col0（永不摆罐的竖列）正中，竖排打出帅气的「区耀丁」三字
- 楷体 46px / `writing-mode: vertical-rl` / 字距 18px / 金黄色 + 四向 `#4a2f0c` 描边 + 暖光外发光
- `z-index: 2` 低于实体（植物/僵尸/罐子 zIndex≈300+）纯水印，`pointer-events: none` 不挡点击
- `startGame()` vase 分支 `_showVaseSignature()` 创建；`restartVaseLevel()` 自动重建；非 vase 模式不创建

**puppeteer 真实点击验证**（端口 52100，scale 1.2667）：
- 三档难度全过 PLAYING + 罐数范围 + chip + 署名 + row0/col0 无罐 + shop/sun 0
- 地狱 28 罐场真实砸 1 个问号罐 (4,5) → smashed 0→1 无错
- 真实 `restartVaseLevel()` → 仍为地狱难度，27 罐（范围），署名 1，shop 1，干净重开
- 0 pageerror（仅 `favicon.ico` 404 无关）

`bump_version.py "v3.5.0-vase-difficulty-sfx-sign"` → commit `7a1dda2` → push origin main ✓

## v3.5.1-vase-plant-permanent-ratio 植物池分层 + 问号罐僵尸比例收紧（已 push aa5c9ea）

**用户两条反馈合并修**（GameLoop.js 单一文件）：

**植物卡池「分层抽取 + 每局保底」** —— 之前 27 项平权池连抽即"全炸弹"：
- 拆成 `_vasePermPool(26 权重: 豌豆×4/寒冰×3/双发×3/坚果×3/向日葵×2/高坚果×2/地刺×2/大嘴花/三线/裂荚/机枪/西瓜/冰西瓜/猫尾)` + `_vaseOncePool(8 权重: 樱桃×2/土豆雷×2/窝瓜×2/辣椒/寒冰菇)`
- 先按难度比例掷类目再类目内抽；比例进 `_vaseDiffCfg`：
  - 简单 0.85/0.72 / 困难 0.80/0.62 / 地狱 0.90/0.72
- 每局保底（setupVases 尾部）：本局所有 plant content 中一次性占比强制 ≤40%（永久 ≥60%），从机制上杜绝"整局全是炸弹"

**问号罐内僵尸概率按难度收紧**：
- 简单 0.35→0.25（75% 是植物）
- 困难 0.6→0.5（50/50 各半）
- 地狱 0.75→0.6（60% 僵尸偏多但 40% 保底植物）
- 问号罐保底：≥2 个全僵尸时强制改写第一个为植物，杜绝"所有问号罐全是僵尸"

**顺序关键**（踩坑）：问号罐保底必须先于植物保底执行，否则前者塞入的一次性 plant 会绕过 60% 校正。初版顺序反了，25 局里 hell 出现 1 局超 40%，对调后 0 局违规。

**puppeteer 真实点击 + 25 局/难度采样统计**（端口 52111）：
- easy: 一次性 17.1% / 问号僵尸 28.5% / 场均僵尸 4.5
- hard: 一次性 28.0% / 问号僵尸 48% / 场均僵尸 11.0
- hell: 一次性 19.2% / 问号僵尸 63.3% / 场均僵尸 17.4
- 0 局超 40% 一次性 / 问号罐(≥2)从无全僵尸 / 场均僵尸单调 easy < hard < hell / 0 pageerror

`bump_version.py "v3.5.1-vase-plant-permanent-ratio"` → commit `aa5c9ea` → push origin main ✓
EOF\necho OK
## v3.5.2-vase-win-music-modal 修复胜利音乐错放为失败音乐 + 胜利弹窗升级（已 push 370ff13）

**用户反馈"游戏胜利了之后，播放的音乐是输掉的音乐"**。

**双根因**：
1. `checkVaseVictory()`（胜利路径）误调 `audioManager.play('lose')`
2. `AudioManager.sounds` 缺 `win` 频道——`assets/audio/winmusic.mp3`（官方 4.75s 胜利音乐）一直在仓库闲置

**修复**：
- AudioManager.sounds 新增 `win` + `vasebreak` 频道（winmusic.mp3 / vase_breaking.mp3 资源都已在）
- play() 克隆特判加 `name !== 'win'`（长音乐播原对象以便 stop）
- checkVaseVictory 改播 `'win'`
- startGame 播 bgm 前统一 `stop('lose'); stop('win')` 防叠播
- **顺带补 v3.5.0 漏加的 vasebreak 频道**（罐子破碎音效实际从未响起）

**胜利弹窗升级**（v3.5.0 之前是 3 个分散绝对定位 div）：
- `.vase-win-overlay` 全屏半透明黑幕 + `.vase-win-panel` 奶油纸木框
- 内容：LEVEL CLEAR / VICTORY! 大字 / 砸罐子完成!+难度 / Final Score: N / 再玩一局(绿) + 退出(棕) 双按钮
- style.css 追加完整 `.vase-win-*` 样式套件

**puppeteer 真实点击端到端**（端口 52122, `--autoplay-policy=no-user-gesture-required`）：
- 胜利触发 → overlay ✓ / state=GAMEOVER / 文本完整 / **win 播放 lose 静音** ✓
- 再玩一局 → overlay 消失 / win 停 / bgm 重播 / 无叠播 ✓
- 失败路径 → lose 仍播 ✓
- vasebreak 频道 registered ✓
- 0 pageerror

**教训已写入 MEMORY.md**：AudioManager.play() 缺频道时**静默不报错**——新增音效时必须同时注册 sounds 字典 + 端到端断言。

`bump_version.py "v3.5.2-vase-win-music-modal"` → commit `370ff13` → push origin main ✓
