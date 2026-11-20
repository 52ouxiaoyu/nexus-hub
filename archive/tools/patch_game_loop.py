import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

# 1. Show buttons in showMenu/startGame
content = content.replace("document.getElementById('start-menu').style.display = 'none';", """document.getElementById('start-menu').style.display = 'none';
        if (this.fusionMode) {
            document.getElementById('glove-bank').style.display = 'block';
            document.getElementById('recipe-book-btn').style.display = 'block';
            this.initFusionUI();
        }""")

# 2. Add initFusionUI method
fusion_ui = """    initFusionUI() {
        const gloveBtn = document.getElementById('glove-bank');
        this.isGloveActive = false;
        this.gloveSource = null;
        
        gloveBtn.addEventListener('click', () => {
            this.isGloveActive = !this.isGloveActive;
            this.isShovelActive = false;
            this.gloveSource = null;
            this.container.style.cursor = this.isGloveActive ? 'url("data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' style=\\'font-size:24px\\'><text y=\\'24\\'>🧤</text></svg>"), auto' : 'default';
            gloveBtn.style.background = this.isGloveActive ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0,0,0,0.5)';
        });
        
        const recipes = [
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵 (产阳光+射击)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手 (高血量+射击)' },
            { a: 'snowpea', b: 'cherrybomb', result: '冰霜樱桃炸弹 (爆炸+大范围冰冻)' },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷 (短手射击+秒杀爆炸)' },
            { a: 'chomper', b: 'wallnut', result: '尖刺坚果 (高血量+反伤)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果 (高血量+受击冰冻)' }
        ];
        
        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        recipes.forEach(r => {
            let li = document.createElement('li');
            li.style.borderBottom = '1px dashed #ccc';
            li.style.padding = '5px 0';
            li.innerText = `${this.getPlantName(r.a)} + ${this.getPlantName(r.b)} = ${r.result}`;
            list.appendChild(li);
        });
        
        document.getElementById('recipe-book-btn').addEventListener('click', () => {
            document.getElementById('recipe-modal').style.display = 'block';
        });
        
        document.getElementById('close-recipe').addEventListener('click', () => {
            document.getElementById('recipe-modal').style.display = 'none';
        });
    }

    tryGloveInteraction(row, col) {
        if (!this.isGloveActive) return false;
        
        const plant = this.board.grid[row][col];
        if (!plant) {
            // Clicked empty space, cancel glove
            this.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            this.gloveSource = null;
            return true;
        }
        
        if (!this.gloveSource) {
            this.gloveSource = plant;
            plant.element.style.filter = 'brightness(1.5) drop-shadow(0 0 10px #0f0)';
        } else {
            if (this.gloveSource === plant) {
                // Cancel selection
                plant.element.style.filter = '';
                this.gloveSource = null;
                return true;
            }
            
            // Try to fuse
            const fusionType = this.getFusionResult(this.gloveSource.type, plant.type);
            if (fusionType) {
                this.gloveSource.element.style.filter = ''; // Reset filter before dying
                this.gloveSource.hp = 0; // kill source
                plant.hp = 0; // kill target
                
                this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                this.board.grid[row][col] = null;
                
                let newPlant = new Plant(this, fusionType);
                if (this.board.addPlant(newPlant, row, col)) {
                    if (this.audioManager) this.audioManager.play('btn');
                    this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
                }
            } else {
                this.gloveSource.element.style.filter = '';
                this.showAnnouncement('这两种植物无法融合', '#ff0000');
            }
            
            this.isGloveActive = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            this.gloveSource = null;
        }
        return true;
    }
"""

content = content.replace("    getPlantName(type) {", fusion_ui + "\n    getPlantName(type) {")

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)

