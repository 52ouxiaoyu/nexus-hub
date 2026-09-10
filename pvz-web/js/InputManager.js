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
                        this.game.board.removePlant(gridPos.row, gridPos.col);
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

            // Melon / Winter Melon 图是 PNG，其他植物是 GIF
            const isMelonSprite = imgName === 'MelonPult/MelonPult' || imgName === 'WinterMelon/WinterMelon';
            const url = isMelonSprite
                ? `assets/images/Plants/${imgName}.png?v=1789049338`
                : `assets/images/Plants/${imgName}.gif?v=1789049338`;
            this.dragGhost.style.backgroundImage = `url('${url}')`;
        }
    }
}
