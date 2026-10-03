class InputManager {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('game-container');
        this.dragGhost = document.getElementById('drag-ghost');
        
        this.selectedSeed = null;
        this.isShovelSelected = false;
        
        this.bindEvents();
    }
    
    // v3.81.3：选中一张种子卡（鼠标点击 / 双人对战键盘数字键两条路共用）
    // mx/my 有值=跟随鼠标出拖拽图；无值（键盘选卡）=不出图，等 mousemove 再补
    pickSeedCard(card, mx, my) {
        const type = card.dataset.type;
        const cost = parseInt(card.dataset.cost);
        if (this.game.sunCount < cost) return;
        this.selectedSeed = type;
        this.isShovelSelected = false;
        this.game.isGloveActive = false;
        if(document.getElementById('glove-bank')) document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
        if(this.game.gloveSource) { this.game.gloveSource.gloveRestore(); this.game.isGloveDragging = false; this.game.gloveSource = null; }
        this.game.container.style.cursor = 'default';
        if (mx !== undefined) this.updateDragGhost(mx, my, type);
        else this.dragGhost.style.display = 'none';
        this.game.audioManager.play('btn');
    }

    bindEvents() {
        // 我是僵尸模式（v3.7.0）：点僵尸卡选中 → 点草坪任意行释放（该行最右进场）
        // v3.81.0：双人对战底部僵尸栏同一套交互（点卡选中/取消 → 点行部署）
        const zombieBank = document.getElementById('zombie-bank');
        if (zombieBank) {
            zombieBank.addEventListener('mousedown', (e) => {
                const card = e.target.closest('.zcard');
                if (!card || card.classList.contains('disabled')) return;
                if (!this.game.zombieMode) return;
                // 再点同一张卡 = 取消选中
                this.game.pendingZombie = (this.game.pendingZombie === card.dataset.type) ? null : card.dataset.type;
                this.game._refreshZombieBank();
                this.game.audioManager.play('btn');
                this.dragGhost.style.display = 'none';
            });
        }
        const vsBar = document.getElementById('vs-bottom-bar');
        if (vsBar) {
            vsBar.addEventListener('mousedown', (e) => {
                const card = e.target.closest('.zcard');
                if (!card || card.classList.contains('disabled')) return;
                if (!this.game.vsMode) return;
                this.game.pendingZombie = (this.game.pendingZombie === card.dataset.type) ? null : card.dataset.type;
                this.game._refreshVsZombieBar();
                this.game.audioManager.play('btn');
                this.dragGhost.style.display = 'none';
            });
        }

        document.getElementById('seed-bank').addEventListener('mousedown', (e) => {
            // 路灯花商店卡：点击=购买（不走拖拽）；阳光不足时给提示
            const shopCard = e.target.closest('.plantern-shop-card');
            if (shopCard) {
                this.game.buyPlantern();
                return;
            }
            const card = e.target.closest('.seed-card');
            if (card && !card.classList.contains('disabled')) {
                this.pickSeedCard(card, e.clientX, e.clientY);
            }
        });

        // v3.81.3 双人对战键盘选卡：两人共用一个鼠标——
        // 植物方按主键盘数字 1~8 选中第 1~8 张植物卡，僵尸方按小键盘数字 1~8 选中第 1~8 张僵尸卡（再按一次取消）
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (!this.game.vsMode || this.game.state !== 'PLAYING' || this.game.paused) return;
            const m = /^(Digit|Numpad)([1-8])$/.exec(e.code);
            if (!m) return;
            if (m[1] === 'Digit') {
                const card = document.querySelectorAll('#seed-bank .seed-card')[Number(m[2]) - 1];
                if (!card || card.classList.contains('disabled')) return;
                this.pickSeedCard(card); // 键盘选卡：不出跟随图，鼠标一动 mousemove 自动补上
                e.preventDefault();
            } else {
                const card = document.querySelectorAll('#vs-bottom-bar .zcard')[Number(m[2]) - 1];
                if (!card || card.classList.contains('disabled')) return;
                this.game.pendingZombie = (this.game.pendingZombie === card.dataset.type) ? null : card.dataset.type;
                this.game._refreshVsZombieBar();
                this.game.audioManager.play('btn');
                this.dragGhost.style.display = 'none';
                e.preventDefault();
            }
        });
        
        document.getElementById('shovel').addEventListener('mousedown', (e) => {
            this.isShovelSelected = true;
            this.selectedSeed = null;
            this.game.isGloveActive = false;
            if(document.getElementById('glove-bank')) document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            if(this.game.gloveSource) { this.game.gloveSource.gloveRestore(); this.game.isGloveDragging = false; this.game.gloveSource = null; }
            this.game.container.style.cursor = 'default';
            this.updateDragGhost(e.clientX, e.clientY, 'shovel');
            this.game.audioManager.play('btn');
        });
        
        document.addEventListener('mousemove', (e) => {
            // v3.55.0：砸罐子锤子光标只在未砸罐子上出现（用户指定；修复"种植后锤子消失"——
            // 旧版全场锤子被点卡片/铲子路径的 cursor='default' 重置后再也回不来）
            // v3.63.0：暂停中 / 选卡·开始菜单·融合图鉴打开时不出锤子光标（与点击守卫配套）
            if (this.game.vaseMode) {
                let cur = 'default';
                const blocked = this.game.paused ||
                    ['seed-chooser', 'start-menu', 'recipe-modal'].some((id) => {
                        const el = document.getElementById(id);
                        return !!el && el.style.display !== 'none' && el.style.display !== '';
                    });
                if (!blocked && !this.selectedSeed && !this.isShovelSelected && !this.game.isGloveDragging) {
                    const rect = this.container.getBoundingClientRect();
                    const scale = window.gameScale || 1;
                    const gp = this.game.board.getGridPos(
                        (e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale
                    );
                    if (gp && this.game.vases && this.game.vases.some(v => !v.smashed && v.row === gp.row && v.col === gp.col)) {
                        const h = this.game._vaseHammerData;
                        if (h) cur = `url("${h.url}") ${h.hx} ${h.hy}, auto`;
                    }
                }
                if (this.container.style.cursor !== cur) this.container.style.cursor = cur;
            }
            if (this.selectedSeed || this.isShovelSelected || this.game.isGloveDragging) {
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const mouseX = (e.clientX - rect.left) / scale;
                const mouseY = (e.clientY - rect.top) / scale;
                this.dragGhost.style.left = mouseX + 'px';
                this.dragGhost.style.top = mouseY + 'px';
            }
        });
        
        this.container.addEventListener('mouseup', (e) => {
            // v3.63.0：暂停中 / 选卡界面·开始菜单·融合图鉴打开时，一切点击不生效。
            // 旧 bug：暂停遮罩与配方书弹窗都挂在 container 里，mouseup 冒泡上来，
            // "点遮罩恢复暂停/翻配方书"的那一下就把指位上的罐子砸破了（用户实测复现）。
            if (this.game.paused) return;
            const overlayOpen = (id) => {
                const el = document.getElementById(id);
                return !!el && el.style.display !== 'none' && el.style.display !== '';
            };
            if (overlayOpen('seed-chooser') || overlayOpen('start-menu') || overlayOpen('recipe-modal')) return;
            // v3.81.0：点在双人对战底栏上一律不落到草坪（底栏压着草坪底行，防误种植/误部署）
            if (e.target.closest && e.target.closest('#vs-bottom-bar')) return;
            // ===== 我是僵尸模式：点草坪行 = 在该行最右释放选中的僵尸（v3.7.0）=====
            // ===== v3.81.0 双人对战：僵尸方卡选中时点行同理；未选卡则继续走植物方逻辑 =====
            if (this.game.vsMode && this.game.pendingZombie) {
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const gridPos = this.game.board.getGridPos(
                    (e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale
                );
                if (gridPos) {
                    this.game.deployZombie(this.game.pendingZombie, gridPos.row);
                }
                this.dragGhost.style.display = 'none';
                return;
            }
            if (this.game.zombieMode) {
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const gridPos = this.game.board.getGridPos(
                    (e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale
                );
                if (this.game.pendingZombie && gridPos) {
                    this.game.deployZombie(this.game.pendingZombie, gridPos.row);
                }
                // 点卡片本身/其它非草坪区域：不取消选中（取消 = 再点一次同一张僵尸卡）
                this.dragGhost.style.display = 'none';
                return; // 僵尸模式下不走植物侧任何逻辑
            }
            // v3.24.0 玉米加农炮瞄准中：点击任意处取消瞄准（发射用 M 键）
            if (this.game.aimingCob) {
                this.game.exitCobAim();
                return;
            }
            if (this.game.isGloveActive) {
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const mouseX = (e.clientX - rect.left) / scale;
                const mouseY = (e.clientY - rect.top) / scale;
                const gridPos = this.game.board.getGridPos(mouseX, mouseY);
                if (gridPos) {
                    this.game.tryGloveInteraction(gridPos.row, gridPos.col);
                }
                return;
            }
            if (this.selectedSeed || this.isShovelSelected) {
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const mouseX = (e.clientX - rect.left) / scale;
                const mouseY = (e.clientY - rect.top) / scale;
                
                const gridPos = this.game.board.getGridPos(mouseX, mouseY);
                
                if (gridPos) {
                    if (this.selectedSeed) {
                        this.game.tryPlanting(this.selectedSeed, gridPos.row, gridPos.col);
                    } else if (this.isShovelSelected) {
                        // v3.12.0：分层铲除——格子上半部铲植物（壳留）、下半部只铲南瓜壳
                        this.game.shovelPlant(gridPos.row, gridPos.col, mouseY);
                    }
                }
                
                this.selectedSeed = null;
                this.isShovelSelected = false;
                this.dragGhost.style.display = 'none';
            } else {
                // 普通点击：优先砸罐子（vaseMode），再引爆已种下的炸弹
                const rect = this.container.getBoundingClientRect();
                const scale = window.gameScale || 1;
                const mouseX = (e.clientX - rect.left) / scale;
                const mouseY = (e.clientY - rect.top) / scale;
                const gridPos = this.game.board.getGridPos(mouseX, mouseY);
                if (gridPos) {
                    // 砸罐子模式：点击未砸罐子 → smashVase（不消耗阳光也不引爆炸弹）
                    if (this.game.vaseMode && this.game.vases && this.game.vases.length) {
                        const v = this.game.vases.find(x => !x.smashed && x.row === gridPos.row && x.col === gridPos.col);
                        if (v) {
                            this.game.smashVase(gridPos.row, gridPos.col);
                            this.game._vaseHammerSwingFX(gridPos.row, gridPos.col); // v3.63.0 挥锤动画
                            return;
                        }
                    }
                    // 点击已种下的炸弹可立即引爆（不点也会自动爆炸）
                    const p = this.game.board.grid[gridPos.row][gridPos.col];
                    // v3.24.0：点击充能完毕的玉米加农炮 → 出现瞄准镜（M 键发射）
                    if (p && p.type === 'cobcannon' && p.chargeReady && !p.isDead) {
                        this.game.enterCobAim(p);
                        return;
                    }
                    if (p && p.autoExplode && !p.isDead) {
                        p.explodeNow();
                    }
                }
            }
        });
    }
    
    updateDragGhost(x, y, type) {
        this.dragGhost.style.display = 'block';
        // v3.36.0：清幽灵残留提前到所有分支之前 —— 上一株南瓜壳等植物的 stage 内容
        // 会一直留在 dragGhost 里，再拿铲子时"铲子上顶着个南瓜壳"（用户反馈）。
        // 旧版只在植物分支里清，铲子分支直接设背景图导致叠加。
        this.dragGhost.innerHTML = '';
        this.dragGhost.style.filter = '';
        this.dragGhost.style.backgroundImage = 'none';
        const rect = this.container.getBoundingClientRect();
        const scale = window.gameScale || 1;
        this.dragGhost.style.left = ((x - rect.left) / scale) + 'px';
        this.dragGhost.style.top = ((y - rect.top) / scale) + 'px';
        
        if (type === 'shovel') {
            this.dragGhost.style.backgroundImage = "url('assets/images/interface/Shovel/0.gif')";
        } else {
            // v3.33.0：清掉上一株融合体的 stage 子元素/滤镜，防止跨拖拽泄漏
            this.dragGhost.innerHTML = '';
            this.dragGhost.style.filter = '';
            // Mapping for special cases
            let imgName = type.charAt(0).toUpperCase() + type.slice(1);
            if (type === 'sunflower') imgName = 'SunFlower/SunFlower1';
            else if (type === 'wallnut') imgName = 'WallNut/WallNut';
            else if (type === 'cherrybomb') imgName = 'CherryBomb/CherryBomb';
            else if (type === 'peashooter') imgName = 'Peashooter/Peashooter';
            else if (type === 'snowpea') imgName = 'SnowPea/SnowPea';
            else if (type === 'repeater') imgName = 'Repeater/Repeater';
            else if (type === 'squash') imgName = 'Squash/Squash';
            else if (type === 'jalapeno') imgName = 'Jalapeno/Jalapeno';
            else if (type === 'potatomine') imgName = 'PotatoMine/PotatoMine';
            else if (type === 'chomper') imgName = 'Chomper/Chomper';
            else if (type === 'tallnut') imgName = 'TallNut/TallNut';
            else if (type === 'puffshroom') imgName = 'PuffShroom/PuffShroom';
            else if (type === 'spikeweed') imgName = 'Spikeweed/Spikeweed';
            else if (type === 'threepeater') imgName = 'Threepeater/Threepeater';
            else if (type === 'fumeshroom') imgName = 'FumeShroom/FumeShroom';
            else if (type === 'sunshroom') imgName = 'SunShroom/SunShroom';
            else if (type === 'scaredyshroom') imgName = 'ScaredyShroom/ScaredyShroom';
            else if (type === 'iceshroom') imgName = 'IceShroom/IceShroom';
            else if (type === 'doomshroom') imgName = 'DoomShroom/DoomShroom';
            else if (type === 'splitpea') imgName = 'SplitPea/SplitPea';
            else if (type === 'gatlingpea') imgName = 'GatlingPea/GatlingPea';
            else if (type === 'twinsunflower') imgName = 'TwinSunflower/TwinSunflower1';
            else if (type === 'torchwood') imgName = 'Torchwood/Torchwood';
            else if (type === 'garlic') imgName = 'Garlic/Garlic';
            else if (type === 'melonpult') imgName = 'MelonPult/MelonPult';
            else if (type === 'wintermelon') imgName = 'WinterMelon/WinterMelon';
            else if (type === 'cattail') imgName = 'Cattail/Cattail';
            else if (type === 'starfruit') imgName = 'Starfruit/Starfruit';            // v3.6.0 经典新增
            else if (type === 'hypnoshroom') imgName = 'HypnoShroom/HypnoShroom';      // v3.6.0 经典新增
            else if (type === 'pumpkinhead') imgName = 'PumpkinHead/PumpkinHead';       // v3.6.0 经典新增
            else if (type === 'plantern') imgName = 'Plantern/0';   // 路灯花用 0.gif 透明大画布(白天),Plantern.gif 是夜版
            else if (type === 'cabbagepult') imgName = 'CabbagePult/CabbagePult';  // v3.10.0
            else if (type === 'kernelpult') imgName = 'KernelPult/KernelPult';     // v3.10.0
            else if (type === 'gloomshroom') imgName = 'GloomShroom/GloomShroom';  // v3.16.0 修复拖拽无图（目录名大写 S，默认映射 404）
            else if (type === 'spikerock') imgName = 'Spikerock/Spikerock';        // v3.16.0 补钢地刺拖拽图
            else if (type === 'plantbox') imgName = '';                            // v3.24.0 植物盲盒：礼盒（见下方特判）

            // v3.32.2：融合株拖拽图 = 场上主体立绘（探针读素材；默认映射 Fusion_* 目录 404 无图）
            // v3.33.0：升级为完整融合形态（主体+叠加层+配色滤镜）——爆米花投手不再拖成"普通玉米投手"
            if (type.startsWith && type.startsWith('fusion_')) {
                const probe = new Plant(this.game, type);
                const hasArt = !!probe.element.getAttribute('src');
                if (probe.element.parentNode) probe.element.parentNode.removeChild(probe.element);
                if (probe.fusionOverlay && probe.fusionOverlay.parentNode) probe.fusionOverlay.parentNode.removeChild(probe.fusionOverlay);
                if (hasArt) {
                    this.game._applyFusionDragGhost(probe);
                    return;
                }
            }

            // v3.26.0 植物盲盒：拖拽图改回"盲盒图案"（红丝带礼盒）——用户明确盲盒≠问号罐
            // v3.35.0：礼盒重画为宽幅构图，拖拽幽灵同步改宽尺寸
            if (type === 'plantbox') {
                this.dragGhost.style.backgroundImage = "url('assets/images/Plants/PlantBox/GiftBox.png?v=1791013090')";
                this.dragGhost.style.width = '68px';
                this.dragGhost.style.height = '50px';
                this.dragGhost.style.backgroundSize = 'contain';
                this.dragGhost.style.backgroundPosition = 'center';
                return;
            }

            // Melon / Winter Melon / 两个投手 图是 PNG，其他植物是 GIF
            const isMelonSprite = imgName === 'MelonPult/MelonPult' || imgName === 'WinterMelon/WinterMelon'
                || imgName === 'CabbagePult/CabbagePult' || imgName === 'KernelPult/KernelPult';
            const url = isMelonSprite
                ? `assets/images/Plants/${imgName}.png?v=1791013090`
                : `assets/images/Plants/${imgName}.gif?v=1791013090`;
            this.dragGhost.style.backgroundImage = `url('${url}')`;

            // v3.20.0：倭瓜立绘画布 100×226（身体只占底部 68×82），60×60 contain 后
            // 只有 ~26px —— 拖动时"骤然变小"。单独按原尺寸裁底部身体区域显示。
            if (type === 'squash') {
                this.dragGhost.style.width = '70px';
                this.dragGhost.style.height = '85px';
                this.dragGhost.style.backgroundSize = '100px 226px';
                this.dragGhost.style.backgroundPosition = 'center bottom';
            } else {
                this.dragGhost.style.width = '60px';
                this.dragGhost.style.height = '60px';
                this.dragGhost.style.backgroundSize = 'contain';
                this.dragGhost.style.backgroundPosition = 'center';
            }
        }
    }
}
