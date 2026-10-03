class HauntedDorm {
    constructor() {
        this.cols = 40;
        this.rows = 30;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;
        
        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;
        
        // 更改为通用人物图标（戴夫和僵尸头像代表两方）
        this.players = [
            { id: 1, x: cx - 40, y: cy, sun: 200, icon: 'assets/images/interface/Dave.gif', selectedSeed: null },
            { id: 2, x: cx + 40, y: cy, sun: 200, icon: 'assets/images/Zombies/Zombie/ZombieHead.gif', selectedSeed: null }
        ];
        
        this.keys = {};
        this.walls = new Set();
        this.plants = [];
        
        this.initDOM();
        this.generateMap();
        this.bindInput();
        
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }
    
    initDOM() {
        this.world1 = document.getElementById('world1');
        this.world2 = document.getElementById('world2');
        this.vp1 = document.getElementById('vp1');
        this.vp2 = document.getElementById('vp2');
        
        this.world1.style.width = this.worldWidth + 'px';
        this.world1.style.height = this.worldHeight + 'px';
        this.world2.style.width = this.worldWidth + 'px';
        this.world2.style.height = this.worldHeight + 'px';
        
        this.players.forEach(p => {
            p.el1 = document.createElement('div');
            p.el1.className = 'entity avatar';
            p.el1.innerHTML = `<img src="${p.icon}">`;
            this.world1.appendChild(p.el1);
            
            p.el2 = document.createElement('div');
            p.el2.className = 'entity avatar';
            p.el2.innerHTML = `<img src="${p.icon}">`;
            this.world2.appendChild(p.el2);
        });
    }
    
    generateMap() {
        // 由于 CSS 已去掉了草坪网格，只保留中心点和墙壁
        const center1 = document.createElement('div');
        center1.className = 'tile center';
        center1.style.left = (this.worldWidth / 2 - 120) + 'px';
        center1.style.top = (this.worldHeight / 2 - 120) + 'px';
        center1.style.width = '240px'; center1.style.height = '240px';
        this.world1.appendChild(center1);
        this.world2.appendChild(center1.cloneNode(true));
        
        // 随机生成 10 个房间（带墙体）
        for (let i = 0; i < 10; i++) {
            const rw = Math.floor(Math.random() * 3) + 3;
            const rh = Math.floor(Math.random() * 3) + 3;
            
            let rx, ry;
            do {
                rx = Math.floor(Math.random() * (this.cols - rw - 2)) + 1;
                ry = Math.floor(Math.random() * (this.rows - rh - 2)) + 1;
            } while (Math.abs(rx - this.cols/2) < 5 && Math.abs(ry - this.rows/2) < 5);
            
            for (let wr = -1; wr <= rh; wr++) {
                for (let wc = -1; wc <= rw; wc++) {
                    if (wr === -1 || wr === rh || wc === -1 || wc === rw) {
                        if (wr === rh && wc === Math.floor(rw/2)) continue; // 门
                        
                        const key = `${rx + wc},${ry + wr}`;
                        this.walls.add(key);
                        
                        const wall1 = document.createElement('div');
                        wall1.className = 'tile wall';
                        wall1.style.left = ((rx + wc) * this.gridSize) + 'px';
                        wall1.style.top = ((ry + wr) * this.gridSize) + 'px';
                        this.world1.appendChild(wall1);
                        this.world2.appendChild(wall1.cloneNode(true));
                    }
                }
            }
        }
    }
    
    selectSeed(pid, type, cost, event) {
        const p = this.players[pid - 1];
        if (p.sun >= cost) {
            p.selectedSeed = { type, cost };
            // 高亮UI
            document.querySelectorAll(`#hud-p${pid} .seeds img`).forEach(img => img.style.borderColor = '#000');
            event.target.style.borderColor = '#0f0';
        }
    }
    
    tryPlanting(pid, mouseX, mouseY) {
        const p = this.players[pid - 1];
        if (!p.selectedSeed) return;
        
        const vp = pid === 1 ? this.vp1 : this.vp2;
        const rect = vp.getBoundingClientRect();
        
        // 计算世界坐标
        const camX = p.camX || 0;
        const camY = p.camY || 0;
        const worldX = mouseX - rect.left + camX;
        const worldY = mouseY - rect.top + camY;
        
        const col = Math.floor(worldX / this.gridSize);
        const row = Math.floor(worldY / this.gridSize);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
        
        // 检查墙壁和现有植物
        if (this.walls.has(`${col},${row}`)) return;
        if (this.plants.some(pl => pl.c === col && pl.r === row)) return;
        
        // 种下
        p.sun -= p.selectedSeed.cost;
        document.getElementById(`sun${pid}`).innerText = p.sun;
        
        const pTypes = {
            'sunshroom': 'assets/images/Plants/SunShroom/0.gif',
            'wallnut': 'assets/images/Plants/WallNut/0.gif',
            'puffshroom': 'assets/images/Plants/PuffShroom/0.gif'
        };
        
        const pt = { r: row, c: col, type: p.selectedSeed.type };
        this.plants.push(pt);
        
        const el1 = document.createElement('div');
        el1.className = 'tile';
        el1.style.left = (col * this.gridSize) + 'px';
        el1.style.top = (row * this.gridSize) + 'px';
        el1.innerHTML = `<img src="${pTypes[pt.type]}" style="width:100%; height:100%; object-fit:contain; transform: scale(1.2) translateY(-10px);">`;
        
        this.world1.appendChild(el1);
        this.world2.appendChild(el1.cloneNode(true));
        
        // 取消选择
        p.selectedSeed = null;
        document.querySelectorAll(`#hud-p${pid} .seeds img`).forEach(img => img.style.borderColor = '#000');
    }
    
    bindInput() {
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        
        this.vp1.addEventListener('mousedown', e => this.tryPlanting(1, e.clientX, e.clientY));
        this.vp2.addEventListener('mousedown', e => this.tryPlanting(2, e.clientX, e.clientY));
    }
    
    checkCollision(x, y) {
        const r = 20; // 碰撞半径
        const corners = [
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y-r)/this.gridSize) },
            { c: Math.floor((x-r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) },
            { c: Math.floor((x+r)/this.gridSize), r: Math.floor((y+r)/this.gridSize) }
        ];
        return corners.some(p => this.walls.has(`${p.c},${p.r}`));
    }
    
    loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        
        const speed = 400;
        
        const movePlayer = (p, vx, vy) => {
            let nx = p.x + vx * dt;
            let ny = p.y;
            if (nx > 20 && nx < this.worldWidth - 20 && !this.checkCollision(nx, ny)) p.x = nx;
            
            nx = p.x;
            ny = p.y + vy * dt;
            if (ny > 30 && ny < this.worldHeight - 10 && !this.checkCollision(nx, ny)) p.y = ny;
        };
        
        // P1
        let vx1 = 0, vy1 = 0;
        if (this.keys['a']) vx1 -= speed;
        if (this.keys['d']) vx1 += speed;
        if (this.keys['w']) vy1 -= speed;
        if (this.keys['s']) vy1 += speed;
        movePlayer(this.players[0], vx1, vy1);
        
        // P2
        let vx2 = 0, vy2 = 0;
        if (this.keys['arrowleft']) vx2 -= speed;
        if (this.keys['arrowright']) vx2 += speed;
        if (this.keys['arrowup']) vy2 -= speed;
        if (this.keys['arrowdown']) vy2 += speed;
        movePlayer(this.players[1], vx2, vy2);
        
        // 渲染坐标
        this.players.forEach(p => {
            p.el1.style.left = p.x + 'px'; p.el1.style.top = p.y + 'px';
            p.el2.style.left = p.x + 'px'; p.el2.style.top = p.y + 'px';
        });
        
        // 渲染双摄相机
        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;
        
        this.players.forEach((p, idx) => {
            const cx = Math.max(0, Math.min(this.worldWidth - vpw, p.x - vpw / 2));
            const cy = Math.max(0, Math.min(this.worldHeight - vph, p.y - vph / 2));
            p.camX = cx; p.camY = cy;
            
            const world = idx === 0 ? this.world1 : this.world2;
            world.style.transform = `translate(${-cx}px, ${-cy}px)`;
        });
        
        requestAnimationFrame(t => this.loop(t));
    }
}

window.onload = () => {
    window.game = new HauntedDorm();
};
