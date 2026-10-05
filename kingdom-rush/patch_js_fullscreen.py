import re

with open('js/main.js', 'r') as f:
    js = f.read()

# 1. Update Game constructor to handle resizing
new_constructor = """    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('grid-overlay');
        this.state = 'menu';
        this.gameSpeed = 1.0;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.setupDOMEvents();
        this.resetGame();
        
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.offsetX = (window.innerWidth - CONFIG.WIDTH) / 2;
        this.offsetY = (window.innerHeight - CONFIG.HEIGHT) / 2;
        
        this.overlay.style.width = CONFIG.WIDTH + 'px';
        this.overlay.style.height = CONFIG.HEIGHT + 'px';
        this.overlay.style.left = this.offsetX + 'px';
        this.overlay.style.top = this.offsetY + 'px';
        
        if (this.state === 'playing' && this.selectedEntity && this.selectedEntity.isTower) {
            let menu = document.getElementById('upgrade-menu');
            menu.style.left = (this.selectedEntity.c * 80 + 40 + this.offsetX) + 'px'; 
            menu.style.top = (this.selectedEntity.r * 80 + this.offsetY) + 'px';
        }
    }"""
js = re.sub(r'    constructor\(\) \{.*?requestAnimationFrame.*?\}\n', new_constructor + '\n', js, flags=re.DOTALL)

# 2. Update setupGrid cell onclick to use offsetX and offsetY for upgrade menu
old_onclick = """                        let menu = document.getElementById('upgrade-menu');
                        menu.style.display = 'flex'; menu.style.left = (c * 80 + 40) + 'px'; menu.style.top = (r * 80) + 'px';"""
new_onclick = """                        let menu = document.getElementById('upgrade-menu');
                        menu.style.display = 'flex'; menu.style.left = (c * 80 + 40 + this.offsetX) + 'px'; menu.style.top = (r * 80 + this.offsetY) + 'px';"""
js = js.replace(old_onclick, new_onclick)

# 3. Update draw function to use ctx.translate
old_draw_start = """    draw() {
        // Epic Background
        this.ctx.fillStyle = '#2b3a1a'; 
        this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);"""
new_draw_start = """    draw() {
        // Fill entire window with grass
        this.ctx.fillStyle = '#355E24'; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        
        // Draw playable area background (darker dirt/grass base)
        this.ctx.fillStyle = '#2b3a1a';
        this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);"""
js = js.replace(old_draw_start, new_draw_start)

# Add ctx.restore() at the end of draw()
old_draw_end = """        // Particles
        this.particles.forEach(pt => {
            this.ctx.globalAlpha = pt.life;
            this.ctx.fillStyle = pt.color;
            this.ctx.fillRect(pt.x, pt.y, 5, 5);
        });
        this.ctx.globalAlpha = 1.0;
    }"""
new_draw_end = """        // Particles
        this.particles.forEach(pt => {
            this.ctx.globalAlpha = pt.life;
            this.ctx.fillStyle = pt.color;
            this.ctx.fillRect(pt.x, pt.y, 5, 5);
        });
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }"""
js = js.replace(old_draw_end, new_draw_end)


with open('js/main.js', 'w') as f:
    f.write(js)
