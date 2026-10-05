class MockGame {
    constructor() {
        this.entities = [];
        this.audioManager = { play: () => {} };
        this.entityLayer = { appendChild: () => {}, removeChild: () => {} };
    }
}
class Entity {
    constructor(game, x, y) {
        this.game = game; this.x = x; this.y = y; this.isDead = false;
        this.element = { style: {} };
        this.game.entityLayer.appendChild(this.element);
    }
    update(dt) {
        if(this.isDead) return;
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }
}
class Projectile extends Entity {
    constructor(game, x, y, row, type, target, vx, vy) {
        super(game, x, y);
        this.row = row; this.type = type; this.vx = vx; this.vy = vy;
        this.speed = 300; this.startX = x; this.startY = y;
        this.maxDistance = 150;
    }
    update(dt) {
        super.update(dt);
        if (this.vx !== null && this.vy !== null) {
            this.x += this.vx * this.speed * dt;
            this.y += this.vy * this.speed * dt;
            if (this.type === 'gloom_puff') {
                if (Math.hypot(this.x - this.startX, this.y - this.startY) > 120) {
                    this.isDead = true;
                }
            }
        }
        if (this.maxDistance) {
            if (Math.hypot(this.x - this.startX, this.y - this.startY) >= this.maxDistance) this.isDead = true;
        }
    }
}
let g = new MockGame();
let p = new Projectile(g, 100, 100, 1, 'gloom_puff', null, 1, 0);
g.entities.push(p);
for(let i=0; i<30; i++) {
    for(let e of g.entities) e.update(0.016);
    g.entities = g.entities.filter(e => !e.isDead);
    console.log(`Frame ${i}: len=${g.entities.length} x=${p.x}`);
}
