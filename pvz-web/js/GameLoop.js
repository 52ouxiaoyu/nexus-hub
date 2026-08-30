class AudioManager {
    constructor() {
        this.sounds = {
            bgm: new Audio('assets/audio/uraniwani.mp3'),
            plant: new Audio('assets/audio/plant_water.mp3'),
            chomp: new Audio('assets/audio/chomp.mp3'),
            sun: new Audio('assets/audio/points.mp3'),
            lose: new Audio('assets/audio/losemusic.mp3'),
            btn: new Audio('assets/audio/buttonclick.mp3'),
            splat: new Audio('assets/audio/bowlingimpact.mp3')
        };
        this.sounds.bgm.loop = true;
    }
    
    play(name) {
        if (this.sounds[name]) {
            // Clone node to allow overlapping sounds
            if (name !== 'bgm' && name !== 'lose') {
                const s = this.sounds[name].cloneNode();
                s.play().catch(e => console.log(e));
            } else {
                this.sounds[name].play().catch(e => console.log(e));
            }
        }
    }
    
    stop(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        }
    }
}

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.entityLayer = document.getElementById('entity-layer');
        
        this.lastTime = 0;
        this.entities = []; 
        
        this.sunCount = 50;
        this.sunCountElement = document.getElementById('sun-count');
        
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        
        this.lastTime = 0;
        
        this.board = new Board(this);
        this.inputManager = new InputManager(this);
        this.waveManager = new WaveManager(this);
        this.collisionManager = new CollisionManager(this);
        this.audioManager = new AudioManager();
        
        this.skySunTimer = 0;
        this.skySunInterval = 8; 
        
        this.score = 0;
        this.cooldowns = {}; // Stores cooldown timers for plants
        this.gameSpeed = 1;
        
        this.initUI();
        this.showMenu();
        
        const speedBtn = document.getElementById('btn-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                if (this.gameSpeed === 1) this.gameSpeed = 2;
                else if (this.gameSpeed === 2) this.gameSpeed = 5;
                else this.gameSpeed = 1;
                speedBtn.innerText = `Speed: ${this.gameSpeed}x`;
            });
        }
    }
    
    updateScore() {
        const scoreEl = document.getElementById('score-count');
        if (scoreEl) {
            scoreEl.innerText = this.score;
        }
        
        // Trigger event on milestone
        if (this.scoreMilestones && this.scoreMilestones.length > 0) {
            if (this.score >= this.scoreMilestones[0]) {
                this.scoreMilestones.shift(); // Remove the reached milestone
                this.eventTimer = 120 + Math.random() * 60; // Reset time-based timer so they don't overlap
                this.triggerRandomEvent();
            }
        }
    }
    
    showMenu() {
        const menu = document.getElementById('start-menu');
        const btnAdv = document.getElementById('btn-adventure');
        const btnFusion = document.getElementById('btn-fusion');
        
        btnAdv.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = false;
            this.showSeedChooser();
        };
        
        btnFusion.onclick = () => {
            this.audioManager.play('btn');
            menu.style.display = 'none';
            this.fusionMode = true;
            this.showSeedChooser();
        };
    }

    showSeedChooser() {
        const chooser = document.getElementById('seed-chooser');
        const grid = document.getElementById('chooser-grid');
        const countSpan = document.getElementById('chooser-count');
        const btnRock = document.getElementById('btn-lets-rock');
        
        chooser.style.display = 'flex';
        this.selectedSeeds = []; // Will store the selected seed objects
        grid.innerHTML = '';
        
        this.seeds.forEach(s => {
            const card = document.createElement('div');
            card.className = 'chooser-card';
            card.style.backgroundImage = `url('${s.img}')`;
            // Add a tick or dim when selected
            card.onclick = () => {
                const index = this.selectedSeeds.indexOf(s);
                if (index > -1) {
                    this.selectedSeeds.splice(index, 1);
                    card.style.filter = 'none';
                } else {
                    if (this.selectedSeeds.length < 10) {
                        this.selectedSeeds.push(s);
                        card.style.filter = 'brightness(50%)'; // Dim to show selected
                    }
                }
                
                countSpan.innerText = this.selectedSeeds.length;
                if (this.selectedSeeds.length > 0) {
                    btnRock.disabled = false;
                    btnRock.style.opacity = '1';
                } else {
                    btnRock.disabled = true;
                    btnRock.style.opacity = '0.5';
                }
            };
            grid.appendChild(card);
        });
        
        btnRock.onclick = () => {
            this.audioManager.play('btn');
            chooser.style.display = 'none';
            this.startGame();
        };

        const btnBack = document.getElementById('btn-back');
        btnBack.onclick = () => {
            this.audioManager.play('btn');
            chooser.style.display = 'none';
            document.getElementById('start-menu').style.display = 'block';
        };
    }
    
    startGame() {
        const seedBank = document.getElementById('seed-bank');
        seedBank.innerHTML = ''; // clear
        this.cooldowns = {};
        
        if (this.fusionMode) {
            document.getElementById('glove-bank').style.display = 'flex';
            document.getElementById('recipe-book-btn').style.display = 'flex';
            this.initFusionUI();
        } else {
            document.getElementById('glove-bank').style.display = 'none';
            document.getElementById('recipe-book-btn').style.display = 'none';
        }
        
        // Setup random events (Delay time-based events, favor score-based)
        this.eventTimer = 150 + Math.random() * 60; // First time-based event between 2.5 to 3.5 minutes
        this.scoreMilestones = [100, 300, 500, 800, 1200, 1800, 2500, 3500, 5000]; // Events trigger specifically at these scores
        
        this.selectedSeeds.forEach((s, i) => {
            this.cooldowns[s.type] = 0;
            const card = document.createElement('div');
            card.className = 'seed-card';
            card.dataset.type = s.type;
            card.dataset.cost = s.cost;
            card.dataset.cooldown = s.cooldown;
            card.style.backgroundImage = `url('${s.img}')`;
            card.innerHTML = `
                <div class="cooldown-overlay"></div>
            `;
            seedBank.appendChild(card);
        });
        
        this.updateUI();
        this.state = 'PLAYING';
        this.audioManager.play('bgm');
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }
    
    initUI() {
        // Just define the seeds, don't populate the top bar yet
        this.seeds = [
            { type: 'sunflower', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/SunFlower.png' },
            { type: 'peashooter', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Peashooter.png' },
            { type: 'wallnut', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/WallNut.png' },
            { type: 'cherrybomb', cost: 150, cooldown: 50, img: 'assets/images/Card/Plants/CherryBomb.png' },            { type: 'squash', cost: 50, cooldown: 30, img: 'assets/images/Card/Plants/Squash.png' },
            { type: 'jalapeno', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/Jalapeno.png' },
            { type: 'potatomine', cost: 25, cooldown: 30, img: 'assets/images/Card/Plants/PotatoMine.png' },
            { type: 'chomper', cost: 150, cooldown: 7.5, img: 'assets/images/Card/Plants/Chomper.png' },
            { type: 'tallnut', cost: 125, cooldown: 30, img: 'assets/images/Card/Plants/TallNut.png' },
            { type: 'puffshroom', cost: 0, cooldown: 7.5, img: 'assets/images/Card/Plants/PuffShroom.png' },
            { type: 'melonpult', cost: 300, cooldown: 7.5, img: 'assets/images/Card/Plants/MelonPult.png?v=1788076883' },            { type: 'wintermelon', cost: 500, cooldown: 30, img: 'assets/images/Card/Plants/WinterMelon.png?v=1788076883' },{ type: 'iceshroom', cost: 75, cooldown: 50, img: 'assets/images/Card/Plants/IceShroom.png' },
            { type: 'doomshroom', cost: 125, cooldown: 50, img: 'assets/images/Card/Plants/DoomShroom.png' },
            { type: 'spikeweed', cost: 100, cooldown: 7.5, img: 'assets/images/Card/Plants/Spikeweed.png' },
            { type: 'garlic', cost: 50, cooldown: 7.5, img: 'assets/images/Card/Plants/Garlic.png' }
        ];
        // The top bar will be populated in startGame() after selection
    }
    
    addSun(amount) {
        this.sunCount += amount;
        this.sunCountElement.innerText = this.sunCount;
        this.updateUI();
    }
    

    initFusionUI() {
        const gloveBtn = document.getElementById('glove-bank');
        this.isGloveActive = false;
        this.gloveSource = null;
        if (this._fusionUIInit) return;
        this._fusionUIInit = true;
        
        gloveBtn.addEventListener('click', () => {
            this.isGloveActive = !this.isGloveActive;
            this.isGloveDragging = false;
            if (this.isGloveActive) {
                if (this.inputManager) {
                    this.inputManager.selectedSeed = null;
                    this.inputManager.isShovelSelected = false;
                    this.inputManager.dragGhost.style.display = 'none';
                }
            } else {
                // Cancel dragging if active
                if (this.gloveSource) {
                    this.gloveSource.element.style.display = 'block';
                    if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                }
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            }
            this.gloveSource = null;
            this.container.style.cursor = this.isGloveActive ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' style=\'font-size:24px\'><text y=\'24\'>🧤</text></svg>"), auto' : 'default';
            gloveBtn.style.background = this.isGloveActive ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0,0,0,0.5)';
        });
        
        const recipes = [
            { a: 'peashooter', b: 'peashooter', result: '双发豌豆', img: 'assets/images/Plants/Repeater/Repeater.gif', css: false },
            { a: 'peashooter', b: 'repeater', result: '三线射手', img: 'assets/images/Plants/Threepeater/Threepeater.gif', css: false },
            { a: 'repeater', b: 'repeater', result: '机枪射手', img: 'assets/images/Plants/GatlingPea/GatlingPea.gif', css: false },
            { a: 'sunflower', b: 'sunflower', result: '双子向日葵', img: 'assets/images/Plants/TwinSunflower/TwinSunflower1.gif', css: false },
            { a: 'peashooter', b: 'iceshroom', result: '寒冰射手', img: 'assets/images/Plants/SnowPea/SnowPea.gif', css: false },
            { a: 'peashooter', b: 'squash', result: '双向豌豆', img: 'assets/images/Plants/SplitPea/SplitPea.gif', css: false },
            { a: 'puffshroom', b: 'puffshroom', result: '大喷菇', img: 'assets/images/Plants/FumeShroom/FumeShroom.gif', css: false },
            { a: 'puffshroom', b: 'sunflower', result: '阳光菇', img: 'assets/images/Plants/SunShroom/SunShroom.gif', css: false },
            { a: 'puffshroom', b: 'peashooter', result: '胆小菇', img: 'assets/images/Plants/ScaredyShroom/ScaredyShroom.gif', css: false },
            { a: 'wallnut', b: 'jalapeno', result: '火炬树桩', img: 'assets/images/Plants/Torchwood/Torchwood.gif', css: false },
            { a: 'peashooter', b: 'sunflower', result: '豌豆向日葵', base: 'assets/images/Plants/SunFlower/SunFlower1.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(0px, -20px) scale(1.0)' },
            { a: 'peashooter', b: 'wallnut', result: '坚果射手', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Peashooter/Peashooter.gif', overClip: 'polygon(0 0, 100% 0, 100% 65%, 0 65%)', overTransform: 'translate(5px, -15px) scale(1.0)' },
            { a: 'snowpea', b: 'cherrybomb', result: '寒冰炸弹', img: 'assets/images/Plants/CherryBomb/CherryBomb.gif', filter: 'hue-rotate(180deg) saturate(1.5)', css: false },
            { a: 'puffshroom', b: 'potatomine', result: '孢子地雷', base: 'assets/images/Plants/PotatoMine/PotatoMine.gif', over: 'assets/images/Plants/PuffShroom/PuffShroom.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -45px) scale(0.9)' },
            { a: 'chomper', b: 'wallnut', result: '大嘴坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Chomper/Chomper.gif', overClip: 'polygon(0 0, 100% 0, 100% 85%, 0 85%)', overTransform: 'translate(0px, -25px) scale(0.9)' },
            { a: 'snowpea', b: 'wallnut', result: '寒冰坚果', img: 'assets/images/Plants/WallNut/WallNut.gif', filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.2)', css: false },
            { a: 'peashooter', b: 'cherrybomb', result: '樱桃射手', img: 'assets/images/Plants/Peashooter/Peashooter.gif', filter: 'hue-rotate(-45deg) saturate(2.0)', css: false },
            { a: 'sunflower', b: 'doomshroom', result: '毁灭向日葵', img: 'assets/images/Plants/SunFlower/SunFlower1.gif', filter: 'grayscale(0.8) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(3)', css: false },
            { a: 'melonpult', b: 'iceshroom', result: '冰西瓜投手', img: 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1788076883', css: false },
            { a: 'repeater', b: 'spikeweed', result: '猫尾草', img: 'assets/images/Plants/Cattail/Cattail.gif', css: false },
            { a: 'fumeshroom', b: 'fumeshroom', result: '忧郁菇', img: 'assets/images/Plants/GloomShroom/GloomShroom.gif', css: false },
            { a: 'spikeweed', b: 'spikeweed', result: '钢地刺', img: 'assets/images/Plants/Spikerock/Spikerock.gif', css: false },
            { a: 'spikeweed', b: 'wallnut', result: '地刺坚果', base: 'assets/images/Plants/WallNut/WallNut.gif', over: 'assets/images/Plants/Spikeweed/Spikeweed.gif', overTransform: 'translate(0px, 40px) scale(1.0)' },
            { a: 'spikerock', b: 'tallnut', result: '钢刺高坚果', img: 'assets/images/Plants/TallNut/TallNut.gif', css: false }
        ];
        
        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        recipes.forEach(r => {
            let li = document.createElement('li');
            li.style.borderBottom = '1px dashed #ccc';
            li.style.padding = '10px 0';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            
            const getImg = (t) => {
                const map = {
                    'peashooter': 'assets/images/Plants/Peashooter/Peashooter.gif',
                    'sunflower': 'assets/images/Plants/SunFlower/SunFlower1.gif',
                    'wallnut': 'assets/images/Plants/WallNut/WallNut.gif',
                    'snowpea': 'assets/images/Plants/SnowPea/SnowPea.gif',
                    'cherrybomb': 'assets/images/Plants/CherryBomb/CherryBomb.gif',
                    'puffshroom': 'assets/images/Plants/PuffShroom/PuffShroom.gif',
                    'potatomine': 'assets/images/Plants/PotatoMine/PotatoMine.gif',
                    'chomper': 'assets/images/Plants/Chomper/Chomper.gif',
                    'repeater': 'assets/images/Plants/Repeater/Repeater.gif',
                    'iceshroom': 'assets/images/Plants/IceShroom/IceShroom.gif',
                    'squash': 'assets/images/Plants/Squash/Squash.gif',
                    'doomshroom': 'assets/images/Plants/DoomShroom/DoomShroom.gif',
                    'jalapeno': 'assets/images/Plants/Jalapeno/Jalapeno.gif',
                    'melonpult': 'assets/images/Plants/MelonPult/MelonPult.png?v=1788076883',
                    'wintermelon': 'assets/images/Plants/WinterMelon/WinterMelon.png?v=1788076883',
                    'cattail': 'assets/images/Plants/Cattail/Cattail.gif',
                    'gloomshroom': 'assets/images/Plants/GloomShroom/GloomShroom.gif',
                    'spikerock': 'assets/images/Plants/Spikerock/Spikerock.gif'
                };
                return map[t] || '';
            };
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; width: 40%;">
                    <img src="${getImg(r.a)}" style="height: 50px;"> 
                    <span style="font-weight: bold; font-size: 20px;">+</span> 
                    <img src="${getImg(r.b)}" style="height: 50px;">
                </div>
                <div style="width: 10%; text-align: center; font-size: 24px; font-weight: bold;">=</div>
                <div style="width: 50%; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 10px; font-weight: bold; color: #822; font-size: 16px;">
                    <span>${r.result}</span>
                    <div style="position: relative; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center;">
                        ${r.base ? 
                          `<div style="position: relative; transform: scale(0.5); transform-origin: center center;">
                              <img src="${r.base}" style="display: block;">
                              <img src="${r.over}" style="position: absolute; left: 0; top: 0; transform: ${r.overTransform}; transform-origin: center center; ${r.overClip ? `clip-path: ${r.overClip}; -webkit-clip-path: ${r.overClip};` : ''}">
                           </div>` 
                          : `<img src="${r.img}" style="height: 50px; filter: ${r.filter || 'none'}; object-fit: contain;">`
                        }
                    </div>
                </div>
            `;
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
            // Clicked empty space, cancel drag but keep glove active maybe? Or cancel all.
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            if (this.gloveSource) {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
            }
            this.gloveSource = null;
            return true;
        }
        
        if (!this.gloveSource) {
            // Pick up the first plant
            this.gloveSource = plant;
            this.isGloveDragging = true;
            plant.element.style.display = 'none';
            if (plant.fusionOverlay) plant.fusionOverlay.style.display = 'none';
            
            // Set drag ghost image to this plant
            if (this.inputManager) {
                this.inputManager.dragGhost.style.display = 'block';
                this.inputManager.dragGhost.style.backgroundImage = `url('${plant.element.src}')`;
                // Manually trigger move to put ghost at cursor immediately
            }
        } else {
            if (this.gloveSource === plant) {
                // Cancel selection
                plant.element.style.display = 'block';
                if (plant.fusionOverlay) plant.fusionOverlay.style.display = 'block';
                this.gloveSource = null;
                this.isGloveDragging = false;
                if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
                return true;
            }
            
            // Try to fuse
            let fusionType = null;
            try { fusionType = this.getFusionResult(this.gloveSource.type, plant.type); } catch(e) { console.error(e); }
            if (fusionType) {
                this.gloveSource.element.style.display = 'block'; // Reset display before dying to ensure cleanup
                this.gloveSource.hp = 0; // kill source
                plant.hp = 0; // kill target
                
                this.board.grid[this.gloveSource.row][this.gloveSource.col] = null;
                this.board.grid[row][col] = null;
                
                try {
                    let newPlant = new Plant(this, fusionType);
                    if (this.board.addPlant(newPlant, row, col)) {
                        if (this.audioManager) this.audioManager.play('btn');
                        this.showAnnouncement(`融合成功：${this.getPlantName(fusionType)}!`, '#ff00ff');
                    }
                } catch(e) { console.error(e); }
            } else {
                this.gloveSource.element.style.display = 'block';
                if (this.gloveSource.fusionOverlay) this.gloveSource.fusionOverlay.style.display = 'block';
                this.showAnnouncement('这两种植物无法融合', '#ff0000');
            }
            
            this.isGloveActive = false;
            this.isGloveDragging = false;
            document.getElementById('glove-bank').style.background = 'rgba(0,0,0,0.5)';
            this.container.style.cursor = 'default';
            if (this.inputManager) this.inputManager.dragGhost.style.display = 'none';
            this.gloveSource = null;
        }
        return true;
    }

    getPlantName(type) {
        const names = {
            sunflower: '向日葵', peashooter: '豌豆射手', wallnut: '坚果墙', cherrybomb: '樱桃炸弹',
            snowpea: '寒冰射手', repeater: '双发射手', squash: '窝瓜', jalapeno: '火爆辣椒',
            potatomine: '土豆地雷', chomper: '大嘴花', tallnut: '高坚果', puffshroom: '小喷菇',
            fumeshroom: '大喷菇', sunshroom: '阳光菇', scaredyshroom: '胆小菇', iceshroom: '寒冰菇',
            doomshroom: '毁灭菇', spikeweed: '地刺', threepeater: '三线射手', splitpea: '裂荚射手',
            gatlingpea: '机枪射手', twinsunflower: '双子向日葵', torchwood: '火炬树桩', garlic: '大蒜',
            fusion_peaflower: '豌豆向日葵', fusion_nutshooter: '坚果射手', fusion_frostbomb: '寒冰炸弹',
            fusion_sporemine: '孢子地雷', fusion_spikynut: '地刺坚果', fusion_snownut: '寒冰坚果',
            fusion_cherrybomb_peashooter: '樱桃射手', fusion_doomshroom_sunflower: '毁灭向日葵',
            fusion_spikerock_tallnut: '钢地刺高坚果',
            fusion_melon_cattail: '西瓜猫尾草', fusion_wintermelon_cattail: '冰西瓜猫尾草'
        };
        return names[type] || type;
    }

    getFusionResult(plantA, plantB) {
        if (plantA === 'peashooter' && plantB === 'peashooter') return 'repeater';
        if (plantA === 'repeater' && plantB === 'peashooter') return 'threepeater';
        if (plantA === 'peashooter' && plantB === 'repeater') return 'threepeater';
        if (plantA === 'repeater' && plantB === 'repeater') return 'gatlingpea';
        if (plantA === 'sunflower' && plantB === 'sunflower') return 'twinsunflower';
        if (plantA === 'puffshroom' && plantB === 'puffshroom') return 'fumeshroom';
        
        const set = new Set([plantA, plantB]);
        if (set.has('peashooter') && set.has('sunflower')) return 'fusion_peaflower';
        if (set.has('spikeweed') && set.has('wallnut')) return 'fusion_spikynut';
        if (set.has('spikerock') && set.has('tallnut')) return 'fusion_spikerock_tallnut';
        if (set.has('wallnut') && set.has('peashooter')) return 'fusion_nutshooter';
        if (set.has('snowpea') && set.has('cherrybomb')) return 'fusion_frostbomb';
        if (set.has('puffshroom') && set.has('potatomine')) return 'fusion_sporemine';

        if (set.has('wallnut') && set.has('snowpea')) return 'fusion_snownut';
        if (set.has('peashooter') && set.has('iceshroom')) return 'snowpea';
        if (set.has('peashooter') && set.has('squash')) return 'splitpea';
        if (set.has('melonpult') && set.has('iceshroom')) return 'wintermelon';
        if (set.has('repeater') && set.has('spikeweed')) return 'cattail';
        if (set.has('melonpult') && set.has('cattail')) return 'fusion_melon_cattail';
        if (set.has('wintermelon') && set.has('cattail')) return 'fusion_wintermelon_cattail';
        if (set.has('puffshroom') && set.has('sunflower')) return 'sunshroom';
        if (plantA === 'fumeshroom' && plantB === 'fumeshroom') return 'gloomshroom';
        if (plantA === 'spikeweed' && plantB === 'spikeweed') return 'spikerock';
        if (set.has('puffshroom') && set.has('peashooter')) return 'scaredyshroom';
        if (set.has('wallnut') && set.has('jalapeno')) return 'torchwood';
        return null;
    }
    
    tryPlanting(type, row, col) {
        if (this.cooldowns[type] > 0) return; // Still cooling down
        
        const seed = this.seeds.find(s => s.type === type);
        if (!seed) return;
        if (this.sunCount < seed.cost) return;

        let existingPlant = this.board.grid[row][col];
        
        // Wallnut First Aid
        if (existingPlant) {
            if ((type === 'wallnut' && existingPlant.hasTrait('wallnut')) ||
                (type === 'tallnut' && existingPlant.hasTrait('tallnut'))) {
                if (existingPlant.hp < existingPlant.maxHp) {
                    existingPlant.hp = existingPlant.maxHp;
                    // Reset appearance if they have visual damage states (cracked nut)
                    if (existingPlant.updateAppearance) {
                        existingPlant.updateAppearance();
                    }
                    // Reset visual filter if applicable (ice blue)
                    // But actually wait, updateAppearance will handle basic images.
                    // Let's just deduct sun and return.
                    this.sunCount -= seed.cost;
                    this.sunCountElement.innerText = this.sunCount;
                    this.cooldowns[type] = seed.cooldown;
                    this.updateUI();
                    this.audioManager.play('plant');
                    return;
                }
            }
        }
        
        // Bomb planting exception: allow planting bombs on plants
        const isBomb = ['cherrybomb', 'doomshroom', 'iceshroom', 'jalapeno'].includes(type);
        if (existingPlant && isBomb) {
            this.sunCount -= seed.cost;
            this.sunCountElement.innerText = this.sunCount;
            this.cooldowns[type] = seed.cooldown; // Start cooldown
            this.updateUI();
            this.audioManager.play('plant');
            
            let plant = new Plant(this, type);
            plant.row = row;
            plant.col = col;
            plant.x = 250 + col * 80 + 40;
            plant.y = 100 + row * 100 + 50;
            plant.fusionTarget = existingPlant; // Mark it!
            this.entities.push(plant); // Add to entities but NOT to board grid!
            return;
        }

        if (this.board.canPlant(row, col)) {
            let plant = new Plant(this, type);
            if (this.board.addPlant(plant, row, col)) {
                this.sunCount -= seed.cost;
                this.sunCountElement.innerText = this.sunCount;
                this.cooldowns[type] = seed.cooldown; // Start cooldown
                this.updateUI();
                this.audioManager.play('plant');
            }
        }
    }
    
    updateUI() {
        const cards = document.querySelectorAll('#seed-bank .seed-card');
        cards.forEach(card => {
            const type = card.dataset.type;
            const cost = parseInt(card.dataset.cost);
            const totalCooldown = parseFloat(card.dataset.cooldown);
            const currentCooldown = this.cooldowns[type];
            
            const overlay = card.querySelector('.cooldown-overlay');
            
            // Check if on cooldown
            if (currentCooldown > 0) {
                card.classList.add('disabled');
                const percent = (currentCooldown / totalCooldown) * 100;
                overlay.style.height = `${percent}%`;
            } else {
                overlay.style.height = '0%';
                if (this.sunCount >= cost) {
                    card.classList.remove('disabled');
                } else {
                    card.classList.add('disabled'); // Not enough sun
                }
            }
        });
    }
    
    gameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.audioManager.stop('bgm');
        this.audioManager.play('lose');
        
        // Add ZombiesWon.png overlay
        const wonImg = document.createElement('img');
        wonImg.src = 'assets/images/interface/ZombiesWon.png';
        wonImg.style.position = 'absolute';
        wonImg.style.top = '50%';
        wonImg.style.left = '50%';
        wonImg.style.transform = 'translate(-50%, -50%)';
        wonImg.style.zIndex = '1000';
        document.getElementById('game-container').appendChild(wonImg);
        
        // Add Score overlay
        const scoreDiv = document.createElement('div');
        scoreDiv.innerText = `Final Score: ${this.score}`;
        scoreDiv.style.position = 'absolute';
        scoreDiv.style.top = '70%';
        scoreDiv.style.left = '50%';
        scoreDiv.style.transform = 'translate(-50%, -50%)';
        scoreDiv.style.color = 'white';
        scoreDiv.style.fontSize = '40px';
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.textShadow = '2px 2px 4px black';
        scoreDiv.style.zIndex = '1001';
        document.getElementById('game-container').appendChild(scoreDiv);
        
        // Add Replay Button
        const replayBtn = document.createElement('button');
        replayBtn.innerText = 'Death Replay';
        replayBtn.style.position = 'absolute';
        replayBtn.style.top = '80%';
        replayBtn.style.left = '40%';
        replayBtn.style.transform = 'translate(-50%, -50%)';
        replayBtn.style.fontSize = '24px';
        replayBtn.style.padding = '10px 20px';
        replayBtn.style.zIndex = '1002';
        replayBtn.style.cursor = 'pointer';
        
        // Add Restart Button
        const restartBtn = document.createElement('button');
        restartBtn.innerText = 'Restart';
        restartBtn.style.position = 'absolute';
        restartBtn.style.top = '80%';
        restartBtn.style.left = '60%';
        restartBtn.style.transform = 'translate(-50%, -50%)';
        restartBtn.style.fontSize = '24px';
        restartBtn.style.padding = '10px 20px';
        restartBtn.style.zIndex = '1002';
        restartBtn.style.cursor = 'pointer';

        replayBtn.onclick = () => {
            wonImg.style.display = 'none';
            scoreDiv.style.display = 'none';
            replayBtn.style.display = 'none';
            restartBtn.style.display = 'none';
            this.playReplay();
        };
        restartBtn.onclick = () => {
            location.reload();
        };
        
        document.getElementById('game-container').appendChild(replayBtn);
        document.getElementById('game-container').appendChild(restartBtn);
    }
    
    playReplay() {
        if (!this.history || this.history.length === 0) return;
        
        this.showAnnouncement('DEATH REPLAY', 'red');
        
        // Clear all live entities
        this.entities.forEach(e => {
            if (e.element && e.element.parentNode) {
                e.element.parentNode.removeChild(e.element);
            }
        });
        
        let frameIndex = 0;
        const replayLoop = () => {
            if (frameIndex >= this.history.length) {
                setTimeout(() => {
                    this.showAnnouncement('END OF REPLAY', 'white');
                }, 500);
                return;
            }
            
            const frame = this.history[frameIndex];
            this.entityLayer.innerHTML = '';
            
            frame.forEach(state => {
                const img = document.createElement('img');
                img.className = 'entity';
                img.src = state.src;
                img.style.left = state.left;
                img.style.top = state.top;
                img.style.zIndex = state.zIndex;
                img.style.filter = state.filter;
                img.style.pointerEvents = 'none';
                img.style.position = 'absolute';
                this.entityLayer.appendChild(img);
            });
            
            frameIndex++;
            requestAnimationFrame(replayLoop);
        };
        
        requestAnimationFrame(replayLoop);
    }
    
    loop(timestamp) {
        // Delta time in seconds
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Cap deltaTime to prevent huge jumps if tab was inactive
        const dt = Math.min(deltaTime, 0.1); 
        
        if (this.state === 'PLAYING') {
            for (let i = 0; i < this.gameSpeed; i++) {
                this.update(dt);
            }
            requestAnimationFrame((t) => this.loop(t));
        }
    }
    
    update(deltaTime) {
        this.waveManager.update(deltaTime);
        this.collisionManager.update();
        
        if (this.eventTimer > 0) {
            this.eventTimer -= deltaTime;
            if (this.eventTimer <= 0) {
                this.eventTimer = 120 + Math.random() * 60; // 2 to 3 minutes
                this.triggerRandomEvent();
            }
        }
        
        // Update cooldowns
        let uiNeedsUpdate = false;
        for (let type in this.cooldowns) {
            if (this.cooldowns[type] > 0) {
                this.cooldowns[type] -= deltaTime;
                if (this.cooldowns[type] < 0) this.cooldowns[type] = 0;
                uiNeedsUpdate = true;
            }
        }
        if (uiNeedsUpdate) this.updateUI();
        
        // Sky sun generation
        this.skySunTimer += deltaTime;
        if (this.skySunTimer >= this.skySunInterval) {
            this.skySunTimer = 0;
            const randomX = this.board.offsetX + Math.random() * (this.board.cols * this.board.cellWidth);
            this.entities.push(new Sun(this, randomX, -50));
        }
        
        // Update all entities
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i].update(deltaTime);
        }
        
        // Clean up dead entities (remove from DOM and array)
        this.entities = this.entities.filter(e => {
            if (e.isDead) {
                if (e.element && e.element.parentNode) {
                    e.element.parentNode.removeChild(e.element);
                }
                return false;
            }
            return true;
        });
        
        // Z-Sorting using element zIndex
        this.entities.forEach(e => {
            if (e.element) {
                let z = Math.floor(e.y);
                if (e instanceof Projectile) z += 1000; // Projectiles always on top of row
                if (e instanceof Sun) z += 2000; // Suns always on top of EVERYTHING
                e.element.style.zIndex = z;
            }
        });

        // Record history for replay
        if (!this.history) this.history = [];
        this.history.push(this.entities.map(e => ({
            src: e.element.src,
            left: e.element.style.left,
            top: e.element.style.top,
            zIndex: e.element.style.zIndex,
            filter: e.element.style.filter
        })));
        if (this.history.length > 180) { // Keep last 3 seconds at ~60fps
            this.history.shift();
        }
    }

    showAnnouncement(text, color) {
        if (!this.announcementUI) {
            this.announcementUI = document.createElement('div');
            this.announcementUI.style.position = 'absolute';
            this.announcementUI.style.bottom = '10%';
            this.announcementUI.style.left = '50%';
            this.announcementUI.style.transform = 'translate(-50%, 0)';
            this.announcementUI.style.fontSize = '24px';
            this.announcementUI.style.fontWeight = 'bold';
            this.announcementUI.style.textShadow = '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';
            this.announcementUI.style.zIndex = '5000';
            this.announcementUI.style.pointerEvents = 'none';
            this.announcementUI.style.opacity = '0';
            this.announcementUI.style.transition = 'opacity 0.5s';
            this.container.appendChild(this.announcementUI);
        }
        this.announcementUI.innerText = text;
        this.announcementUI.style.color = color || 'white';
        this.announcementUI.style.opacity = '1';
        
        if (this.announcementTimeout) clearTimeout(this.announcementTimeout);
        this.announcementTimeout = setTimeout(() => {
            this.announcementUI.style.opacity = '0';
        }, 4000);
    }

    triggerRandomEvent() {
        if (!this.eventManager) this.eventManager = new EventManager(this);
        this.eventManager.trigger();
    }
}

// Start game when page loads
window.onload = () => {
    window._pvzGame = new Game();
};
