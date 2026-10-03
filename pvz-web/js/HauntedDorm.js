class HauntedDorm {
    constructor() {
        // 地图大小：大概相当于 10 个标准 PVZ 屏幕（标准是 9x5=45格。这里设为 40x30=1200格，极其巨大）
        this.cols = 40;
        this.rows = 30;
        this.gridSize = 80;
        this.worldWidth = this.cols * this.gridSize;
        this.worldHeight = this.rows * this.gridSize;
        
        // 初始生成在地图正中间
        const cx = this.worldWidth / 2;
        const cy = this.worldHeight / 2;
        
        this.players = [
            { id: 1, x: cx - 40, y: cy, color: 'blue', sun: 0, icon: 'assets/images/Plants/Peashooter/0.gif' },
            { id: 2, x: cx + 40, y: cy, color: 'red', sun: 0, icon: 'assets/images/Plants/SunFlower/0.gif' }
        ];
        
        this.keys = {};
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
        this.world2.style.height = this.worldWidth + 'px';
        
        // 玩家实体
        this.players.forEach(p => {
            // P1 视角的实体
            p.el1 = document.createElement('div');
            p.el1.className = 'entity avatar';
            p.el1.innerHTML = `<img src="${p.icon}">`;
            this.world1.appendChild(p.el1);
            
            // P2 视角的实体
            p.el2 = document.createElement('div');
            p.el2.className = 'entity avatar';
            p.el2.innerHTML = `<img src="${p.icon}">`;
            this.world2.appendChild(p.el2);
        });
    }
    
    generateMap() {
        // 生成铺满全图的草地
        for (let r = 0; r < this.rows; r+=3) {
            for (let c = 0; c < this.cols; c+=3) {
                const bg1 = document.createElement('div');
                bg1.className = 'tile grass';
                bg1.style.left = (c * this.gridSize) + 'px';
                bg1.style.top = (r * this.gridSize) + 'px';
                bg1.style.width = (3 * this.gridSize) + 'px';
                bg1.style.height = (3 * this.gridSize) + 'px';
                this.world1.appendChild(bg1);
                this.world2.appendChild(bg1.cloneNode(true));
            }
        }
        
        // 生成出生点标记
        const center1 = document.createElement('div');
        center1.className = 'tile center';
        center1.style.left = (this.worldWidth / 2 - 120) + 'px';
        center1.style.top = (this.worldHeight / 2 - 120) + 'px';
        center1.style.width = '240px'; center1.style.height = '240px';
        this.world1.appendChild(center1);
        this.world2.appendChild(center1.cloneNode(true));
        
        // 随机生成 10 个房间（带墙体）
        for (let i = 0; i < 10; i++) {
            // 随机房间大小 3x3 到 5x5
            const rw = Math.floor(Math.random() * 3) + 3;
            const rh = Math.floor(Math.random() * 3) + 3;
            
            // 避开中心区域
            let rx, ry;
            do {
                rx = Math.floor(Math.random() * (this.cols - rw - 2)) + 1;
                ry = Math.floor(Math.random() * (this.rows - rh - 2)) + 1;
            } while (Math.abs(rx - this.cols/2) < 5 && Math.abs(ry - this.rows/2) < 5);
            
            // 生成墙壁（墙体占 1 格宽）
            for (let wr = -1; wr <= rh; wr++) {
                for (let wc = -1; wc <= rw; wc++) {
                    // 如果是边缘，则是墙
                    if (wr === -1 || wr === rh || wc === -1 || wc === rw) {
                        // 留一个门（假设下墙正中间是门）
                        if (wr === rh && wc === Math.floor(rw/2)) continue;
                        
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
    
    bindInput() {
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
    }
    
    loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1); // max 100ms dt to prevent huge jumps
        this.lastTime = time;
        
        const speed = 400; // 移速
        
        // P1 (WASD)
        let vx1 = 0, vy1 = 0;
        if (this.keys['a']) vx1 -= speed;
        if (this.keys['d']) vx1 += speed;
        if (this.keys['w']) vy1 -= speed;
        if (this.keys['s']) vy1 += speed;
        
        this.players[0].x = Math.max(0, Math.min(this.worldWidth, this.players[0].x + vx1 * dt));
        this.players[0].y = Math.max(0, Math.min(this.worldHeight, this.players[0].y + vy1 * dt));
        
        // P2 (Arrows)
        let vx2 = 0, vy2 = 0;
        if (this.keys['arrowleft']) vx2 -= speed;
        if (this.keys['arrowright']) vx2 += speed;
        if (this.keys['arrowup']) vy2 -= speed;
        if (this.keys['arrowdown']) vy2 += speed;
        
        this.players[1].x = Math.max(0, Math.min(this.worldWidth, this.players[1].x + vx2 * dt));
        this.players[1].y = Math.max(0, Math.min(this.worldHeight, this.players[1].y + vy2 * dt));
        
        // 渲染坐标
        this.players.forEach(p => {
            if (vx1 !== 0 || vy1 !== 0 || vx2 !== 0 || vy2 !== 0) {
                p.el1.style.left = p.x + 'px'; p.el1.style.top = p.y + 'px';
                p.el2.style.left = p.x + 'px'; p.el2.style.top = p.y + 'px';
            }
        });
        
        // 渲染双摄相机 (跟随玩家)
        const vpw = this.vp1.clientWidth;
        const vph = this.vp1.clientHeight;
        
        // P1 相机
        const cx1 = Math.max(0, Math.min(this.worldWidth - vpw, this.players[0].x - vpw / 2));
        const cy1 = Math.max(0, Math.min(this.worldHeight - vph, this.players[0].y - vph / 2));
        this.world1.style.transform = `translate(${-cx1}px, ${-cy1}px)`;
        
        // P2 相机
        const cx2 = Math.max(0, Math.min(this.worldWidth - vpw, this.players[1].x - vpw / 2));
        const cy2 = Math.max(0, Math.min(this.worldHeight - vph, this.players[1].y - vph / 2));
        this.world2.style.transform = `translate(${-cx2}px, ${-cy2}px)`;
        
        requestAnimationFrame(t => this.loop(t));
    }
}

window.onload = () => {
    window.game = new HauntedDorm();
};
