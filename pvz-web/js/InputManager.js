class InputManager {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('game-container');
        this.dragGhost = document.getElementById('drag-ghost');
        
        this.selectedSeed = null;
        this.isShovelSelected = false;
        
        this.bindEvents();
    }
    
    bindEvents() {
        // 我是僵尸模式（v3.7.0）：点僵尸卡选中 → 点草坪任意行释放（该行最右进场）
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

        document.getElementById('seed-bank').addEventListener('mousedown', (e) => {
            // 路灯花商店卡：点击=购买（不走拖拽）；阳光不足时给提示
            const shopCard = e.target.closest('.plantern-shop-card');
            if (shopCard) {
                this.game.buyPlantern();
                return;
            }
            const card = e.target.closest('.seed-card');
            if (card && !card.classList.contains('disabled')) {
                const type = card.dataset.type;
                const cost = parseInt(card.dataset.cost);
                
                if (this.game.sunCount >= cost) {
                    this.selectedSeed = type;
                    this.isShovelSelected = false;
                    this.game.isGloveActive = false;
                    if(document.getElementById('glove-bank')) document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
                    if(this.game.gloveSource) { this.game.gloveSource.element.style.display = 'block'; if (this.game.gloveSource.fusionOverlay) this.game.gloveSource.fusionOverlay.style.display = 'block'; this.game.isGloveDragging = false; this.game.gloveSource = null; }
                    this.game.container.style.cursor = 'default';
                    this.updateDragGhost(e.clientX, e.clientY, type);
                    this.game.audioManager.play('btn');
                }
            }
        });
        
        document.getElementById('shovel').addEventListener('mousedown', (e) => {
            this.isShovelSelected = true;
            this.selectedSeed = null;
            this.game.isGloveActive = false;
            if(document.getElementById('glove-bank')) document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            if(this.game.gloveSource) { this.game.gloveSource.element.style.display = 'block'; if (this.game.gloveSource.fusionOverlay) this.game.gloveSource.fusionOverlay.style.display = 'block'; this.game.isGloveDragging = false; this.game.gloveSource = null; }
            this.game.container.style.cursor = 'default';
            this.updateDragGhost(e.clientX, e.clientY, 'shovel');
            this.game.audioManager.play('btn');
        });
        
        document.addEventListener('mousemove', (e) => {
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
            // ===== 我是僵尸模式：点草坪行 = 在该行最右释放选中的僵尸（v3.7.0）=====
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
        const rect = this.container.getBoundingClientRect();
        const scale = window.gameScale || 1;
        this.dragGhost.style.left = ((x - rect.left) / scale) + 'px';
        this.dragGhost.style.top = ((y - rect.top) / scale) + 'px';
        
        if (type === 'shovel') {
            this.dragGhost.style.backgroundImage = "url('assets/images/interface/Shovel/0.gif')";
        } else {
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
            else if (type === 'plantbox') imgName = '';                            // v3.24.0 植物盲盒：问号罐（见下方特判）

            // v3.24.0 植物盲盒：拖拽图直接用原版问号罐
            if (type === 'plantbox') {
                this.dragGhost.style.backgroundImage = "url('assets/images/Plants/PlantBox/GiftBox.png?v=1790318035')";
                this.dragGhost.style.width = '46px';
                this.dragGhost.style.height = '64px';
                this.dragGhost.style.backgroundSize = 'contain';
                this.dragGhost.style.backgroundPosition = 'center';
                return;
            }

            // Melon / Winter Melon / 两个投手 图是 PNG，其他植物是 GIF
            const isMelonSprite = imgName === 'MelonPult/MelonPult' || imgName === 'WinterMelon/WinterMelon'
                || imgName === 'CabbagePult/CabbagePult' || imgName === 'KernelPult/KernelPult';
            const url = isMelonSprite
                ? `assets/images/Plants/${imgName}.png?v=1790318035`
                : `assets/images/Plants/${imgName}.gif?v=1790318035`;
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
