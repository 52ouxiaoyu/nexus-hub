class Entity {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        
        this.isDead = false;
        this.row = -1;
        
        this.element = document.createElement('img');
        this.element.className = 'entity';
        this.element.style.pointerEvents = 'none'; // Prevent entities from blocking clicks
        this.game.entityLayer.appendChild(this.element);
    }
    
    // ===== v3.9.1 修复「整体右下偏移」=====
    // .entity 的定位基准是"中心对齐"，靠 CSS 里的 transform: translate(-50%, -50%) 实现。
    // 直接写 element.style.transform = '...' 会把这条 CSS 整段覆盖掉 → 元素退化成
    // "左上角对齐" → 视觉上整体向右下偏移半个贴图（贴图越大偏得越多：
    // 西瓜投手 96×96 偏 (48,48) ≈ 一格，小喷菇 40×66 偏 (20,33)）。
    // 所以任何需要附加缩放/旋转的地方都必须走下面两个方法，不要直接赋值。
    setTransform(extra = '') {
        this.element.style.transform = extra
            ? `translate(-50%, -50%) ${extra}`
            : 'translate(-50%, -50%)';
    }

    // 在已有效果之后追加（可叠加，如缩小/巨化）。若当前没有内联 transform，
    // 先补上居中基准，避免出现"裸 scale(...)"把 translate 丢掉。
    // 若当前已有自定义基准（如巨人僵尸的 scale(2.5)），按原样追加，不擅自改变定位基准。
    addTransform(extra) {
        const cur = this.element.style.transform || '';
        this.element.style.transform = cur
            ? `${cur} ${extra}`
            : `translate(-50%, -50%) ${extra}`;
    }

    update(deltaTime) {
        // Update DOM element position
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
}
