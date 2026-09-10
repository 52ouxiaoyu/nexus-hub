class Projectile extends Entity {
    constructor(game, x, y, row, type = 'peashooter', targetZombie = null, vx = null, vy = null) {
        super(game, x, y);
        this.targetZombie = targetZombie;
        this.row = row;
        this.vx = vx;
        this.vy = vy;
        this.speed = 300; // pixels per second
        this.damage = 20;
        this.radius = 10;
        this.type = type;
        this.startX = x;
        this.startY = y;
        this.hitZombies = new Set(); // For piercing projectiles
        this.lobbed = false;         // 是否为抛物线弹道（西瓜/冰西瓜）
        
        if (type === 'snowpea') {
            this.element.src = 'assets/images/Plants/PB-10.gif';
        } else if (type === 'scaredyshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            this.damage = 40;
        } else if (type === 'melon' || type === 'wintermelon') {
            // 西瓜/冰西瓜子弹：使用原版 Projectiles 图集里的"整颗西瓜"完整图案
            // （54×46、透明底、硬边；普通版绿皮黑纹，冰瓜版同造型蓝色）。
            // 旧素材是从 MelonPult 整株立绘 flood-fill 出的 50×40 残片 —— 右侧被齐边切掉、
            // 右下被瓜篮挖空，这就是玩家看到的"贴图不完整"。
            this.element.src = type === 'melon'
                ? 'assets/images/Plants/MelonPult/Melon.png?v=1789051587'
                : 'assets/images/Plants/MelonPult/WinterMelon.png?v=1789051587';
            this.element.style.transform = 'scale(1.0)';
            // 注意：不能再加 border-radius:50% —— 那会把完整的椭圆瓜体按内切圆再裁一圈
            this.damage = 60;
            this.setupLob(targetZombie);   // 抛物线弹道（见 setupLob）
        } else if (type === 'cattail') {
            this.element.src = 'assets/images/Plants/Cactus/Projectile32.png';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 20;
            this.speed = 400;
        } else if (type === 'cattail_melon') {
            this.element.src = 'assets/images/Plants/MelonPult/Melon_small.png?v=1789051587';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 60;
            this.speed = 400;
        } else if (type === 'cattail_wintermelon') {
            this.element.src = 'assets/images/Plants/MelonPult/WinterMelon_small.png?v=1789051587';
            this.element.style.transform = 'scale(0.8)';
            this.damage = 60;
            this.speed = 400;
        } else if (type === 'puffshroom' || type === 'gloom_puff') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif';
            if (type === 'gloom_puff') this.damage = 40;
        } else if (type === 'fumeshroom') {
            this.element.src = 'assets/images/Plants/ShroomBullet.gif'; // Fallback for sprite sheet
            this.speed = 400; // Moves faster but dies early
        } else if (type === 'firepea') {
            this.element.src = 'assets/images/Plants/PB10.gif';
            this.damage = 40; // Double damage
        } else if (type === 'cherrypea') {
            // 樱桃射手普通子弹：樱桃红/橙色豌豆（20 伤害同豌豆，纯视觉区分）
            this.element.src = 'assets/images/Plants/PB10.gif';
            this.element.style.filter = 'hue-rotate(-15deg) saturate(1.8)';
        } else if (type === 'minicherry') {
            // 樱桃射手第 10 发：小樱桃炸弹——飞行中的迷你樱桃，命中即爆，
            // 3×3 范围伤害 900（原版樱桃炸弹 1800 的一半）
            this.element.src = 'assets/images/Plants/CherryBomb/CherryBomb.gif';
            this.element.style.transform = 'scale(0.6)';
            this.element.style.filter = 'brightness(1.15)';
            this.damage = 900;
            this.radius = 14;
        } else if (type === 'backpea') {
            this.element.src = 'assets/images/Plants/PB00.gif';
            this.speed = -300; // Moves left
        } else if (type === 'star') {
            // 杨桃星光：原版五角星弹，穿透且可跨行命中
            this.element.src = 'assets/images/Plants/Starfruit/Star.gif';
            this.damage = 20;
            this.speed = 350;
            this.radius = 12;
            this.element.style.width = '26px';
            this.element.style.height = '26px';
            this.element.style.objectFit = 'contain';
        } else {
            this.element.src = 'assets/images/Plants/PB00.gif';
        }
    }

    /* ===== 抛物线弹道（西瓜投手 / 冰西瓜投手）=====
       原版 I,Zombie 的西瓜是"抛射"：先升空、越过前排、在目标僵尸头顶落下。
       这里用标准斜抛公式实现：
         vx = 水平速度（常量），vy = 竖直速度（受重力累加）
         y(t) = y0 + vy0·t + ½·g·t²，x(t) = x0 + vx·t
       为了让弧线既明显又不会飞出草坪顶部，做法是"先定飞行时间 tf 与最高点 peak，
       再反推出重力 g = 8·peak / tf²"，这样不同距离的抛物线形状一致、只是水平速度不同。
       命中判定见 canHitNow()：只在"下落且已接近本行高度"的窗口内才可能打中僵尸，
       否则子弹还在半空就会误判命中。 */
    setupLob(target) {
        this.lobbed = true;
        this.baseY = this.y;                       // 本行的"落点高度"（回到这个高度即落地）
        // 目标：正前方最近的一只僵尸；没有则默认抛出约 5 格
        let dist = target ? (target.x - this.x) : 300;
        dist = Math.max(70, Math.min(900, dist));
        // 飞行时间随距离略增（0.62~1.05s），并据此定水平速度
        const tf = Math.max(0.62, Math.min(1.05, dist / 320));
        // 最高点：88px ≈ 接近一行的高度；草坪最上一行贴近容器顶部，故再做一次安全带收敛
        const peak = Math.max(40, Math.min(88, this.baseY - 26));
        const g = 8 * peak / (tf * tf);
        this.gravity = g;
        this.vx = dist / tf;
        this.vy = -g * tf / 2;                     // 竖直初速向上（屏幕坐标 y 向下，故取负）
        this.flightTime = tf;
        this.flightT = 0;
        this.peakHeight = peak;
    }

    // 是否到了"可以命中"的时机（非抛物线子弹恒为 true）
    canHitNow() {
        if (!this.lobbed) return true;
        // 只在开始下落（vy>0）且已经落回接近本行高度时才允许命中
        return this.vy > 0 && this.y > this.baseY - 60;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        if (this.type === 'cattail' || this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') {
            // 目标已被魅惑成友方：放弃追踪，继续直线飞行（不伤害友军）
            if (this.targetZombie && this.targetZombie.hypnotized) {
                this.targetZombie = null;
            }
            if (this.targetZombie && !this.targetZombie.isDead && this.targetZombie.state !== 'DYING') {
                let dx = this.targetZombie.x + 40 - this.x;
                let dy = this.targetZombie.y + 50 - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    this.vx = (dx / dist) * this.speed;
                    this.vy = (dy / dist) * this.speed;
                    this.x += this.vx * deltaTime;
                    this.y += this.vy * deltaTime;
                }
            } else {
                // Target is dead or missing, keep flying in last known direction or forward
                if (!this.vx) this.vx = this.speed;
                if (!this.vy) this.vy = 0;
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                
                // Also check if it randomly hits another zombie while flying blindly
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized);
                for (let z of zombies) {
                    let dx = z.x + 40 - this.x;
                    let dy = z.y + 50 - this.y;
                    if (Math.hypot(dx, dy) < 40) {
                        this.targetZombie = z; // found a new target!
                        break;
                    }
                }
            }
            
            let dx = this.targetZombie ? this.targetZombie.x + 40 - this.x : 1000;
            let dy = this.targetZombie ? this.targetZombie.y + 50 - this.y : 1000;
            let dist = Math.hypot(dx, dy);
            
            if (dist < 30) {
                 this.targetZombie.takeDamage(this.damage);
                 if (this.type === 'cattail_melon' || this.type === 'cattail_wintermelon') {
                     // Splash damage in 3x3 area
                     const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized);
                     for (let z of zombies) {
                         if (z !== this.targetZombie && Math.abs(z.row - this.targetZombie.row) <= 1 && Math.abs(z.x - this.targetZombie.x) < 150) {
                             z.takeDamage(this.damage / 2); // splash damage is half
                             if (this.type === 'cattail_wintermelon') {
                                 z.setSlow(10.0);
                             }
                         }
                     }
                     if (this.type === 'cattail_wintermelon') {
                         this.targetZombie.setSlow(10.0);
                     }
                     this.game.audioManager.play('splat');
                 }
                 this.isDead = true;
                 return;
            }
        } else if (this.lobbed) {
            // 抛物线飞行：水平匀速 + 竖直匀加速（重力）
            this.flightT += deltaTime;
            this.x += this.vx * deltaTime;
            this.vy += this.gravity * deltaTime;
            this.y += this.vy * deltaTime;
            // 已经落回（甚至低于）本行高度仍未命中 → 落地消失（原版抛射物落空即消失）
            if (this.vy > 0 && this.y > this.baseY + 8) {
                this.isDead = true;
            }
        } else if (this.vx !== undefined && this.vy !== undefined && this.vx !== null && this.vy !== null) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            
            if (this.type === 'gloom_puff') {
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized);
                for (let z of zombies) {
                    let dx = z.x + 40 - this.x;
                    let dy = z.y + 50 - this.y;
                    if (Math.hypot(dx, dy) < 40) {
                        z.takeDamage(this.damage);
                        this.isDead = true;
                        break;
                    }
                }
                // Range limit (1.5 cells)
                if (Math.hypot(this.x - this.startX, this.y - this.startY) > 120) {
                    this.isDead = true;
                }
            } else if (this.type === 'star') {
                // 星光：穿透式（同一条星星可打中多只僵尸），按距离命中任意行的僵尸
                const zombies = this.game.entities.filter(e => e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized);
                for (let z of zombies) {
                    if (this.hitZombies.has(z)) continue;
                    const dx = (z.x + 40) - this.x;
                    const dy = (z.y + 50) - this.y;
                    // 矩形判定（僵尸较宽）：横向 90px × 纵向 110px 内算命中
                    if (Math.abs(dx) < 45 && Math.abs(dy) < 55) {
                        this.hitZombies.add(z);
                        z.takeDamage(this.damage);
                        if (this.game.audioManager) this.game.audioManager.play('splat');
                    }
                }
            }
        } else {
            this.x += this.speed * deltaTime;
        }
        
        if (this.maxDistance) {
            const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
            if (dist >= this.maxDistance) this.isDead = true;
        }
        
        if (this.type === 'fumeshroom' && Math.abs(this.x - this.startX) > 300) {
            this.isDead = true;
        }
        
        if (this.x > 950 || this.x < -50) {
            this.isDead = true;
        }
        
        // 带方向（斜向/纵向）飞行的子弹离开草坪上下边界时也清理（星光会纵向穿越多行）
        if (this.vx !== undefined && this.vx !== null && (this.y < -90 || this.y > 650)) {
            this.isDead = true;
        }
    }
}
