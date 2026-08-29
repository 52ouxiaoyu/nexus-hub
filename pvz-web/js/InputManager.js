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
        document.getElementById('seed-bank').addEventListener('mousedown', (e) => {
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
            else if (type === 'wintermelon') imgName = 'MelonPult/MelonPult';
            else if (type === 'cattail') imgName = 'Cattail/Cattail';
            
            this.dragGhost.style.backgroundImage = `url('assets/images/Plants/${imgName}.gif')`;
        }
    }
}
