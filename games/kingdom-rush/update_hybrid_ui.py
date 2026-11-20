import re

with open('js/main.js', 'r') as f:
    content = f.read()

# 1. Update constructor to setup DOM events
constructor_addition = """
        this.setupDOMEvents();
"""
content = content.replace("this.showMainMenu();", constructor_addition + "        this.showMainMenu();")

# 2. Add setupDOMEvents method
dom_events = """
    setupDOMEvents() {
        document.getElementById('btn-players-minus').onclick = () => { this.numPlayers = Math.max(1, this.numPlayers - 1); document.getElementById('lbl-players').innerText = this.numPlayers; };
        document.getElementById('btn-players-plus').onclick = () => { this.numPlayers = Math.min(3, this.numPlayers + 1); document.getElementById('lbl-players').innerText = this.numPlayers; };
        document.getElementById('btn-lanes-minus').onclick = () => { this.numLanes = Math.max(1, this.numLanes - 1); document.getElementById('lbl-lanes').innerText = this.numLanes; };
        document.getElementById('btn-lanes-plus').onclick = () => { this.numLanes = Math.min(10, this.numLanes + 1); document.getElementById('lbl-lanes').innerText = this.numLanes; };
        
        document.getElementById('btn-start').onclick = () => { Audio.init(); Audio.resume(); this.startGame(); };
        document.getElementById('btn-restart').onclick = () => { this.showMainMenu(); };
    }
    
    updateHUDDOM() {
        if (this.state !== 'playing') return;
        
        // Update King HP
        const hpPercent = (this.castleHp / this.maxCastleHp) * 100;
        document.getElementById('king-hp-fill').style.width = hpPercent + '%';
        document.getElementById('king-hp-text').innerText = this.castleHp + '/' + this.maxCastleHp;
        
        // Update Wave
        document.getElementById('hud-wave').innerText = Math.floor(1 + this.gameTimer/30000);
        
        // Update Player Cards (create if not exist)
        const playersBar = document.getElementById('players-bar');
        if (playersBar.children.length !== this.numPlayers) {
            playersBar.innerHTML = '';
            for (let i = 0; i < this.numPlayers; i++) {
                const hero = this.heroes[i];
                const card = document.createElement('div');
                card.className = 'player-card';
                card.style.borderColor = hero.color;
                card.innerHTML = `
                    <div class="p-name" style="color:${hero.color}">${hero.name}</div>
                    <div class="p-stat"><span>💰金币</span> <span class="p-gold" id="p${i}-gold">${hero.gold}</span></div>
                    <div class="p-stat"><span>🏆得分</span> <span id="p${i}-score">${hero.score}</span></div>
                `;
                playersBar.appendChild(card);
            }
        } else {
            for (let i = 0; i < this.numPlayers; i++) {
                document.getElementById(`p${i}-gold`).innerText = this.heroes[i].gold;
                document.getElementById(`p${i}-score`).innerText = this.heroes[i].score;
            }
        }
    }
"""
content = content.replace("initEventListeners() {", dom_events + "\n    initEventListeners() {")


# 3. Clean up Canvas handleClick (remove menu logic and upgrade logic since it's auto-upgrade anyway or we can leave auto-upgrade)
# The current game uses auto-upgrade for players. So no manual button needed for upgrades in HUD for now to keep it clean.
handleClick_new = """    handleClick(pos) {
        Audio.init();
        Audio.resume();
        // Canvas clicks can be used for manual interaction in the future (like tower defense grid placement)
        // For now, in lane defense, mostly auto or keyboard.
    }"""
content = re.sub(r'handleClick\(pos\)\s*\{.*?(?=\s*showMainMenu\(\)\s*\{)', handleClick_new + '\n\n', content, flags=re.DOTALL)


# 4. State Management - Toggle DOM panels
showMainMenu_new = """    showMainMenu() {
        this.state = 'menu';
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById('menu-panel').classList.add('active');
        document.getElementById('lbl-players').innerText = this.numPlayers;
        document.getElementById('lbl-lanes').innerText = this.numLanes;
    }"""
content = re.sub(r'showMainMenu\(\)\s*\{\s*this\.state\s*=\s*\'menu\';\s*\}', showMainMenu_new, content)

startGame_new = """    startGame() {
        this.state = 'playing';
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById('hud-panel').classList.add('active');
        document.getElementById('players-bar').innerHTML = ''; // Force redraw player cards
"""
content = content.replace("    startGame() {\n        this.state = 'playing';", startGame_new)

# In update loop, add updateHUDDOM() call
content = content.replace("this.waveMultiplier = 1 + Math.floor(this.gameTimer / 30000) * 0.2;", "this.waveMultiplier = 1 + Math.floor(this.gameTimer / 30000) * 0.2;\n        this.updateHUDDOM();")

gameover_trigger_old = """                if (this.castleHp <= 0) {
                    this.gameOver = true;
                    this.state = 'gameover';
                    Audio.playGameOver();
                }"""
gameover_trigger_new = """                if (this.castleHp <= 0) {
                    this.gameOver = true;
                    this.state = 'gameover';
                    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                    document.getElementById('gameover-panel').classList.add('active');
                    document.getElementById('final-wave').innerText = Math.floor(1 + this.gameTimer/30000);
                    Audio.playGameOver();
                }"""
content = content.replace(gameover_trigger_old, gameover_trigger_new)


# 5. Clean up render() - Remove old Canvas UI rendering
render_start = "    render() {"
render_body = """
        const ctx = this.renderer.ctx;
        ctx.save();

        if (this.screenShakeMagnitude > 0) {
            const dx = (Math.random() - 0.5) * this.screenShakeMagnitude;
            const dy = (Math.random() - 0.5) * this.screenShakeMagnitude;
            ctx.translate(dx, dy);
        }

        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.textBaseline = 'alphabetic'; 
        
        const cx = CONFIG.CANVAS_WIDTH / 2;
        const cy = CONFIG.CANVAS_HEIGHT / 2;

        if (this.state !== 'playing') {
            ctx.restore();
            return;
        }

        ctx.fillStyle = '#2d4c1e'; 
"""
content = re.sub(r'    render\(\)\s*\{.*?(?=        ctx\.fillStyle = \'#2d4c1e\';)', render_start + render_body, content, flags=re.DOTALL)


# Remove the old drawPixelText and drawButton functions which we no longer need (or keep them just in case)
# We will just write the file out.
with open('js/main.js', 'w') as f:
    f.write(content)

print("Updated main.js")
