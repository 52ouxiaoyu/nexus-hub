class Zombie extends Entity {
    constructor(game, row, type = 'normal') {
        const x = 950;
        const y = game.board.offsetY + row * game.board.cellHeight + game.board.cellHeight / 2 - 20;
        super(game, x, y);
        this.row = row;
        this.type = type;
        
        this.speed = 20; 
        this.damage = 50; 
        this.state = 'WALKING';
        this.eatTarget = null;
        this.yOffset = -30;
        
        this.isSlowed = false;
        this.slowTimer = 0;
        this.hasPlantHead = false;
        this.hypnotized = false; // 被魅惑菇策反后变为友方僵尸（向右行进，与敌方僵尸搏斗）
        // ===== v3.10.0 黄油定身（玉米投手 20% 黄油）=====
        // 与寒冰减速完全独立：减速只是"走/啃变慢"，黄油是"一步不动、一口不啃"3 秒。
        this.butterTimer = 0;
        this.isButtered = false;
        // ===== v3.10.0 破甲（卷心菜投手 / 玉米投手）=====
        // hp 是单一血池，护甲（路障/铁桶/报纸）靠"hp 跌破阈值"来脱落。
        // armorHp 单独记录"护甲能感知到的伤害"：被破甲伤害打掉的部分不计入 armorHp，
        // 于是打本体却不掉护甲（护甲外观一直保留）。见 takeDamage()。
        this.armorHp = null;
        
        if (type === 'normal') {
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'flag') {
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/FlagZombie/FlagZombie.gif';
            this.walkSrc = 'assets/images/Zombies/FlagZombie/FlagZombie.gif';
            this.attackSrc = 'assets/images/Zombies/FlagZombie/FlagZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'peahead' || type === 'nuthead' || type === 'sunhead' || type === 'snowpeahead' || type === 'jalapenohead' || type === 'machinegunhead' || type === 'tallnuthead') {
            // === 植物头僵尸（仅融合进化模式刷出，纯外观变体）===
            // 行为与普通僵尸完全一致（hp=200 / speed=20 / 无任何附加能力），
            // 唯一的区别是头顶顶着一棵基础植物（豌豆/坚果/向日葵/寒冰射手），
            // 该植物是外观而非融合植物，也不是"装甲"，不提供任何增益。
            // v3.22.1：植物头裁剪配置——cw/ch=gif 画布尺寸，keepTop=只保留顶部比例（裁掉茎干底座），
            // w=显示宽度（头部放大到足以完全遮住僵尸自己的头，僵尸头区约 67×70px）
            const headCfg = {
                // v3.23.0：头部缩小到"刚好重叠在僵尸头上、与身体匹配"（僵尸头约 67px 宽）
                peahead:     { src: 'assets/images/Plants/Peashooter/Peashooter.gif', cw: 71, ch: 71, keepTop: 0.66, w: 84 },
                nuthead:     { src: 'assets/images/Plants/WallNut/WallNut.gif',       cw: 65, ch: 73, keepTop: 1.0,  w: 60 },
                sunhead:     { src: 'assets/images/Plants/SunFlower/SunFlower1.gif',  cw: 73, ch: 74, keepTop: 0.68, w: 88 },
                snowpeahead: { src: 'assets/images/Plants/SnowPea/SnowPea.gif',       cw: 71, ch: 71, keepTop: 0.66, w: 80 },
                jalapenohead:{ src: 'assets/images/Plants/Jalapeno/Jalapeno.gif',     cw: 68, ch: 89, keepTop: 1.0,  w: 50 },
                machinegunhead: { src: 'assets/images/Plants/GatlingPea/GatlingPea.gif', cw: 71, ch: 71, keepTop: 0.72, w: 88 },
                tallnuthead: { src: 'assets/images/Plants/TallNut/TallNut.gif',       cw: 83, ch: 119, keepTop: 0.62, w: 58 }
            }[type];
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            this.createPlantHead(headCfg); // 头顶植物头（裁剪+放大，遮住僵尸本头）
            if (type === 'jalapenohead') {
                // v3.22.0 火爆辣椒植物僵尸（融合进化后期专属）：精锐血量保证走到植物跟前，
                // 连续吃掉 2 株植物 → 引爆整排（见 _jalapenoRowBoom）
                this.hp = 600; this.maxHp = 600;
                this._eatenCount = 0;
            } else if (type === 'nuthead') {
                // v3.23.0：坚果头僵尸血量 = 铁桶僵尸（1300）的两倍
                this.hp = 2600; this.maxHp = 2600;
            } else if (type === 'tallnuthead') {
                // v3.23.0：高坚果头僵尸血量 = 坚果头的两倍
                this.hp = 5200; this.maxHp = 5200;
            }
        } else if (type === 'mysterybox') {
            // v3.23.0 盲盒僵尸：本体=普通僵尸（200 血），头顶顶着一只问号罐；
            // 被打死时开出一只随机僵尸（融合+经典全类型，见 _openMysteryBox）。
            // 融合模式可刷出；砸罐子模式仅金罐可出。
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            this.createPlantHead({ src: 'assets/images/Vase/Vase_Question.png', cw: 90, ch: 100, keepTop: 1.0, w: 46 });
        } else if (type === 'conehead') {
            this.hp = 560; this.maxHp = 560;
            this.element.src = 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ConeheadZombie/ConeheadZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ConeheadZombie/ConeheadZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'buckethead') {
            this.hp = 1300; this.maxHp = 1300;
            this.element.src = 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif';
            this.walkSrc = 'assets/images/Zombies/BucketheadZombie/BucketheadZombie.gif';
            this.attackSrc = 'assets/images/Zombies/BucketheadZombie/BucketheadZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'polevaulting') {
            this.hp = 500; this.maxHp = 500;
            this.speed = 45; // Fast initially
            this.hasVaulted = false;
            this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.walkSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.attackSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieDie.gif';
            this.yOffset = -50;
        } else if (type === 'newspaper') {
            this.hp = 300; this.maxHp = 300;
            this.element.src = 'assets/images/Zombies/NewspaperZombie/HeadWalk1.gif';
            this.walkSrc = 'assets/images/Zombies/NewspaperZombie/HeadWalk1.gif';
            this.attackSrc = 'assets/images/Zombies/NewspaperZombie/HeadAttack1.gif';
            this.dieSrc = 'assets/images/Zombies/NewspaperZombie/Die.gif';
            this.hasLostNewspaper = false;
        } else if (type === 'screendoor') {
            // v3.14.0：《我是僵尸》里 铁门(1450) > 橄榄球(1300) = 铁桶(1300)；其它模式原版数值
            this.hp = this.game.zombieMode ? 1450 : 1300; this.maxHp = this.hp;
            this.element.src = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
        } else if (type === 'football') {
            // v3.14.0：《我是僵尸》里橄榄球与铁桶同血量(1300)；其它模式维持原版 1600
            this.hp = this.game.zombieMode ? 1300 : 1600; this.maxHp = this.hp;
            this.speed = 40; 
            this.element.src = 'assets/images/Zombies/FootballZombie/FootballZombie.gif';
            this.walkSrc = 'assets/images/Zombies/FootballZombie/FootballZombie.gif';
            this.attackSrc = 'assets/images/Zombies/FootballZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/FootballZombie/Die.gif';
        } else if (type === 'dancing') {
            this.hp = 500; this.maxHp = 500;
            this.summonTimer = 5.0; // Summons backups periodically
            this.element.src = 'assets/images/Zombies/DancingZombie/DancingZombie.gif';
            this.walkSrc = 'assets/images/Zombies/DancingZombie/DancingZombie.gif';
            this.attackSrc = 'assets/images/Zombies/DancingZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/DancingZombie/Die.gif';
            this.yOffset = -40;
        } else if (type === 'backup') {
            this.hp = 200; this.maxHp = 200;
            this.element.src = 'assets/images/Zombies/BackupDancer/BackupDancer.gif';
            this.walkSrc = 'assets/images/Zombies/BackupDancer/BackupDancer.gif';
            this.attackSrc = 'assets/images/Zombies/BackupDancer/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/BackupDancer/Die.gif';
            this.yOffset = -40;
        } else if (type === 'jackinthebox') {
            this.hp = 500; this.maxHp = 500;
            this.speed = 35; // fast
            this.explodeTimer = Math.random() * 5 + 5; 
            this.element.src = 'assets/images/Zombies/JackinTheBoxZombie/Walk.gif';
            this.walkSrc = 'assets/images/Zombies/JackinTheBoxZombie/Walk.gif';
            this.attackSrc = 'assets/images/Zombies/JackinTheBoxZombie/Attack.gif';
            this.dieSrc = 'assets/images/Zombies/JackinTheBoxZombie/Die.gif';
        } else if (type === 'ladder') {
            this.hp = 500; this.maxHp = 500;
            this.speed = 30; // fast
            this.hasLadder = true;
            this.element.src = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.walkSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif';
            this.attackSrc = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            this.element.style.filter = 'sepia(1) hue-rotate(20deg) saturate(2)'; // give a wooden tint
        } else if (type === 'pogo') {
            this.hp = 340; this.maxHp = 340;
            this.speed = 35; // fast
            this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.walkSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombie.gif';
            this.attackSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieDie.gif';
            this.element.style.filter = 'hue-rotate(90deg)'; // green tint
            this.yOffset = -50;
        } else if (type === 'gargantuar') {
            this.hp = 4000; this.maxHp = 4000;
            this.speed = 10; // slow
            this.hasThrownImps = false;
            this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Zombie/ZombieDie.gif';
            this.yOffset = -80;
            this.element.style.transform = 'scale(2.5)';
            this.element.style.transformOrigin = 'bottom center';
            this.element.style.filter = 'brightness(0.8) contrast(1.2)';
        } else if (type === 'imp') {
            this.hp = 100; this.maxHp = 100;
            this.speed = 35; // fast
            this.element.src = 'assets/images/Zombies/Imp/Zombie.gif'; 
            this.walkSrc = 'assets/images/Zombies/Imp/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Imp/ZombieAttack.gif';
            this.dieSrc = 'assets/images/Zombies/Imp/ZombieDie.gif';
            this.yOffset = -10;
        } else if (type === 'zomboni') {
            this.hp = 1300; this.maxHp = 1300;
            this.speed = 15;
            this.element.src = 'assets/images/Zombies/Zomboni/1.gif';
            this.walkSrc = 'assets/images/Zombies/Zomboni/1.gif';
            this.attackSrc = 'assets/images/Zombies/Zomboni/1.gif'; // crushes, doesn't attack
            this.dieSrc = 'assets/images/Zombies/Zomboni/BoomDie.gif';
        } else if (type === 'lgboss') {
            this.hp = 5000; this.maxHp = 5000;
            this.speed = 10;
            this.element.src = 'assets/images/Zombies/LGBOSS/1.gif';
            this.walkSrc = 'assets/images/Zombies/LGBOSS/1.gif';
            this.attackSrc = 'assets/images/Zombies/LGBOSS/2.gif'; // Assuming 2 is attack
            this.dieSrc = 'assets/images/Zombies/LGBOSS/BoomDie.gif'; // Or 5.gif? 0.gif is probably idle
            this.yOffset = -80; // Assuming it's huge
        }

        // ===== 我是僵尸模式（v3.7.2）：进攻方整体强化 =====
        // 该模式玩家是"进攻方"，而敌阵是"左 6 列全满(30 株)"的密集防线 ——
        // 僵尸从 x=950 走到阵前要 23s 全程挨打，原版 I,Zombie 每行只有 1~2 株植物。
        // 所以对我方僵尸统一加成：血量 ×3、移动 ×1.5（啃食效率 ×3 在啃食分支里按模式加）。
        // 其它模式（经典/融合/砸罐）完全不受影响，玩家用植物防守的手感保持原样。
        if (game.zombieMode) {
            this.hp = Math.round(this.hp * 3);
            this.maxHp = this.hp;
            this.speed *= 1.5;
        }
        // 破甲基准血量（放在所有血量调整之后，保证与 armorMul 的换算一致）
        this.armorHp = this.hp;
    }
    
    // 植物头僵尸：把一颗基础植物顶在头上（独立 DOM 层，随僵尸同步移动）
    createPlantHead(cfg) {
        // v3.22.1：植物头=overflow 裁剪容器——整株 gif 顶部对齐放入，容器只露出顶部 keepTop
        //（豌豆/向日葵只留头部，茎干底座被裁掉）；头部放大到完全遮住僵尸自己的头。
        const wrap = document.createElement('div');
        wrap.style.position = 'absolute';
        wrap.style.pointerEvents = 'none';
        wrap.style.overflow = 'hidden';
        wrap.style.width = cfg.w + 'px';
        wrap.style.height = Math.round(cfg.w * cfg.ch / cfg.cw * cfg.keepTop) + 'px';
        const img = document.createElement('img');
        img.src = cfg.src;
        img.style.position = 'absolute';
        img.style.left = '0';
        img.style.top = '0';
        img.style.width = cfg.w + 'px'; // 整株按 w 等比缩放，底部被容器裁掉
        // 植物原图是种植朝向（面朝右），僵尸面朝左行进 → 水平翻转契合
        img.style.transform = 'scaleX(-1)';
        wrap.appendChild(img);
        this.headEl = wrap;      // 外层容器（定位/滤镜/掉落动画作用于此）
        this.headImgEl = img;    // 内层整株 gif
        this.headSize = cfg.w;
        this.hasPlantHead = true;
        this.game.entityLayer.appendChild(wrap);
        this.syncPlantHead();
    }
    
    // 每帧把植物头锁定在僵尸头顶位置（身体图 144px 高、中心在 (x,y+yOffset)，头顶 ≈ -72px）
    syncPlantHead() {
        if (!this.headEl) return;
        // v3.22.1：头部对位——僵尸头在画布内偏右（头区中心 ≈ 中心右移 15px），且头区
        // 约画布 24~90 行（y-48..y+18）：右移 10px + 顶部扣在 y-48，头部整体罩住僵尸灰头
        this.headEl.style.left = (this.x - this.headSize / 2 + 10) + 'px';
        this.headEl.style.top = (this.y + this.yOffset - 48) + 'px';
        this.headEl.style.zIndex = String(Math.floor(this.y) + 1); // 略高于同一行的身体
        // 被冰冻/黄油定身时头顶植物一起变色（外观联动，与身体同一套状态滤镜）
        this.headEl.style.filter = this._statusFilter();
    }
    
    // v3.23.0：盲盒开箱——随机开出一只僵尸（经典冒险全类型 + 融合植物头家族），在原地出现
    _openMysteryBox() {
        const pool = ['normal', 'conehead', 'buckethead', 'flag', 'polevaulting', 'newspaper',
            'screendoor', 'football', 'zomboni', 'dancing', 'pogo', 'ladder', 'jackinthebox',
            'imp', 'gargantuar', 'peahead', 'nuthead', 'sunhead', 'snowpeahead',
            'jalapenohead', 'machinegunhead', 'tallnuthead'];
        const type = pool[Math.floor(Math.random() * pool.length)];
        const z = new Zombie(this.game, this.row, type);
        z.x = Math.max(60, this.x);
        this.game.entities.push(z);
        if (this.game.audioManager && this.game.audioManager.playFx) this.game.audioManager.playFx('box_open');
        if (this.game.showAnnouncement) {
            const name = this.game._zombieZhName ? this.game._zombieZhName(type) : type;
            this.game.showAnnouncement(`🎁 盲盒开出：${name}！`, '#c8a2ff');
        }
    }

    // v3.22.0：火爆辣椒植物僵尸的绝技——整排引爆（同火爆辣椒：整行火力条 + 全行植物炸毁），
    // 自身在爆炸中消失（走正常死亡流程：倒地动画/计分）。只炸植物，不伤同排僵尸（都是友军）。
    _jalapenoRowBoom() {
        if (this._jalapenoBoomed) return;
        this._jalapenoBoomed = true;
        const g = this.game;
        if (g.audioManager) g.audioManager.play('splat');
        if (g.showAnnouncement) g.showAnnouncement('💥 火爆辣椒僵尸引爆了整排植物！', '#ff7f27');
        const b = g.board;
        const strip = document.createElement('img');
        strip.src = 'assets/images/Plants/Jalapeno/JalapenoAttack.gif';
        strip.style.cssText = 'position:absolute;pointer-events:none;z-index:3000;' +
            'left:' + b.offsetX + 'px;top:' + (this.y - 65) + 'px;' +
            'width:' + (b.cols * b.cellWidth) + 'px;height:131px;object-fit:fill;';
        g.container.appendChild(strip);
        setTimeout(() => strip.remove(), 1000);
        const plants = g.entities.filter(e => typeof Plant !== 'undefined' && e instanceof Plant && e.row === this.row && !e.isDead);
        for (const pl of plants) pl.hp = 0;
        this.hp = 0; // 自爆
    }

    // 死亡时：植物头随僵尸一起翻滚飞落消失（纯视觉，无任何收益/惩罚）
    dropPlantHead() {
        if (!this.headEl) return;
        const h = this.headEl;
        this.headEl = null;
        this.hasPlantHead = false;
        h.style.transition = 'transform 0.5s ease-in, opacity 0.5s ease-in';
        h.style.transform = 'translateY(30px) rotate(40deg)';
        h.style.opacity = '0';
        setTimeout(() => { if (h.parentNode) h.parentNode.removeChild(h); }, 550);
    }
    
    // 减速统一入口（植物头僵尸与普通僵尸一致，均可被减速；友方魅惑僵尸不可被减速）
    setSlow(t = 10) {
        // v3.23.0：寒冰头僵尸免疫寒冰减速
        if (this.isDead || this.hypnotized || this.type === 'snowpeahead') return;
        this.isSlowed = true;
        this.slowTimer = t;
    }
    
    // ===== v3.10.0 黄油定身（玉米投手）：完全冻结 sec 秒 =====
    // 独立于寒冰减速：减速是"行动力 ×0.3"，黄油是"行动力 = 0"，可叠加（黄油期间蓝+黄取黄）。
    freezeButter(sec = 3) {
        // v3.23.0：寒冰头僵尸免疫黄油定身
        if (this.isDead || this.hypnotized || this.state === 'DYING' || this.type === 'snowpeahead') return;
        // 再次命中黄油 → 刷新持续时间（不叠加时长）
        this.butterTimer = Math.max(this.butterTimer, sec);
        this.isButtered = true;
        this._tintedByStatus = true;
        if (this.element) this.element.style.filter = this._statusFilter();
        if (this.headEl) this.headEl.style.filter = this._statusFilter();
    }
    
    // 状态滤镜统一出口：黄油（暖黄）优先于寒冰减速（冰蓝）；都没有则返回空串
    _statusFilter() {
        if (this.butterTimer > 0) {
            return 'brightness(105%) sepia(85%) saturate(260%) hue-rotate(5deg)';   // 黄油黄
        }
        if (this.isSlowed) {
            return 'brightness(70%) sepia(100%) hue-rotate(190deg) saturate(500%)'; // strong blue tint
        }
        return '';
    }
    
    // 解冻（火爆辣椒/火球等）：清掉减速与黄油、并复位滤镜
    thaw() {
        this.isSlowed = false;
        this.slowTimer = 0;
        this.butterTimer = 0;
        this.isButtered = false;
        this._tintedByStatus = false;
        if (this.element) this.element.style.filter = '';
        if (this.headEl) this.headEl.style.filter = '';
    }
    
    // 被魅惑菇策反：调头向右，为玩家而战（PVZ 原版机制：满血转化）
    hypnotize() {
        // v3.23.0：寒冰头僵尸免疫魅惑
        if (this.hypnotized || this.type === 'snowpeahead') return;
        this.hypnotized = true;
        this.thaw();              // 清除冰冻状态与蓝色滤镜
        this.hp = this.maxHp;     // 满状态转化
        this.state = 'WALKING';
        this.eatTarget = null;
        this.fightTarget = null;
        if (this.element) this.element.src = this.walkSrc;
        // v3.21.0：被魅惑后"转体+变粉"——身体水平翻转（面朝右侧行进方向），
        // 滤镜统一染成粉红色，直到离场/阵亡；巨人保留原 scale(2.5) 基准再翻转
        const cur = this.element ? (this.element.style.transform || '') : '';
        if (this.element) {
            if (cur.indexOf('scale(2.5)') > -1) this.element.style.transform = cur + ' scaleX(-1)';
            else this.setTransform('scaleX(-1)');
        }
        const pink = 'grayscale(1) sepia(1) hue-rotate(290deg) saturate(2.4) brightness(1.08)';
        if (this.element) this.element.style.filter = pink;
        if (this.headEl) this.headEl.style.filter = pink;
    }
    
    // 魅惑（友方）僵尸每帧逻辑：向右行进，攻击同排遇到的敌方僵尸；走出右边界离场
    updateHypnotized(deltaTime, currentSpeed) {
        if (this.state === 'DYING') return;
        
        if (this.state === 'FIGHTING') {
            const foe = this.fightTarget;
            if (foe && !foe.isDead && foe.state !== 'DYING' && !foe.hypnotized &&
                foe.row === this.row && Math.abs(foe.x - this.x) < 95) {
                // 友方僵尸啃咬：100 伤害/秒（略强于敌方僵尸的 50/秒）
                foe.takeDamage(100 * deltaTime);
                if (!this.chompTimer) this.chompTimer = 0;
                this.chompTimer -= deltaTime;
                if (this.chompTimer <= 0) { this.game.audioManager.play('chomp'); this.chompTimer = 1.0; }
                return;
            }
            this.fightTarget = null;
            this.state = 'WALKING';
            if (this.element) this.element.src = this.walkSrc;
        }
        
        // 向右行进（敌方从右侧来，友方则走向右侧离开战场）
        this.x += currentSpeed * deltaTime;
        if (this.x > 985) {
            // 走出画面右侧 → 离场（不触发游戏结束，也不计分）
            this.state = 'DYING';
            if (this.element) this.element.src = this.dieSrc;
            if (this.headEl) this.dropPlantHead();
            setTimeout(() => { this.isDead = true; }, 1500);
            return;
        }
        
        // 接战：正前方 95px 内出现敌方僵尸则停下搏斗
        const foe = this.game.entities.find(e =>
            e instanceof Zombie && !e.isDead && e.state !== 'DYING' && !e.hypnotized &&
            e.row === this.row && e.x > this.x - 20 && e.x - this.x < 95
        );
        if (foe) {
            this.state = 'FIGHTING';
            this.fightTarget = foe;
            if (this.element) this.element.src = this.attackSrc;
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.element.style.top = `${this.y + this.yOffset}px`;
        this.syncPlantHead(); // 植物头跟随身体移动
        
        // ===== v3.10.0 状态滤镜（黄油 优先于 寒冰）=====
        // 只在"确有状态"时写入 → 没状态时不动 filter，避免抹掉 zomboni/pogo/ladder 的固有色调。
        if (this.isSlowed) {
            this.slowTimer -= deltaTime;
            if (this.slowTimer <= 0) this.isSlowed = false;
        }
        if (this.isSlowed || this.butterTimer > 0 || this._tintedByStatus) {
            const f = this._statusFilter();
            this.element.style.filter = f;
            if (this.headEl) this.headEl.style.filter = f;
            this._tintedByStatus = !!f;
        }
        
        const currentSpeed = this.isSlowed ? this.speed * 0.3 : this.speed; // 70% slow!
        const currentDamage = this.isSlowed ? this.damage * 0.3 : this.damage;
        // 我是僵尸模式僵尸血量整体 ×3，护甲/报纸的"掉落阈值"必须同比放大，
        // 否则路障帽、铁桶、铁门会一直赖到生命值只剩 1/3 时才掉（视觉反馈与掉血脱节）。
        const armorMul = this.game.zombieMode ? 3 : 1;
        
        // Handle cone falling off
        if (this.type === 'conehead' && this.armorHp <= 200 * armorMul && this.state !== 'DYING') {
            this.type = 'normal';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }
        
        // Handle bucket falling off
        if (this.type === 'buckethead' && this.armorHp <= 200 * armorMul && this.state !== 'DYING') {
            this.type = 'normal';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }
        
        // 植物头僵尸的头顶植物是纯外观：不提供装甲/不掉落，随僵尸一起行动直到死亡。
        
        // Handle newspaper falling off
        if (this.type === 'newspaper' && this.armorHp <= 150 * armorMul && !this.hasLostNewspaper && this.state !== 'DYING') {
            this.hasLostNewspaper = true;
            this.speed = 45; // Gets very angry and fast
            this.walkSrc = 'assets/images/Zombies/NewspaperZombie/HeadWalk0.gif';
            this.attackSrc = 'assets/images/Zombies/NewspaperZombie/HeadAttack0.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }

        // Handle screendoor falling off
        if (this.type === 'screendoor' && this.armorHp <= 200 * armorMul && this.state !== 'DYING') {
            this.type = 'normal';
            this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
            this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
            this.element.src = this.state === 'EATING' ? this.attackSrc : this.walkSrc;
        }

        // Handle jack-in-the-box explosion
        if (this.type === 'jackinthebox' && this.state !== 'DYING' && !this.hypnotized) {
            this.explodeTimer -= deltaTime;
            if (this.explodeTimer <= 0) {
                // Explode!
                this.hp = 0;
                this.element.src = 'assets/images/Zombies/JackinTheBoxZombie/Boom.gif';
                this.element.style.zIndex = 3000;
                this.element.style.transform = 'translate(-50%, -80%)'; // Move boom up a bit
                
                // Kill plants in 3x3 area
                const plants = this.game.entities.filter(e => e instanceof Plant && !e.isDead);
                for (let p of plants) {
                    if (Math.abs(p.row - this.row) <= 1 && Math.abs(p.x - this.x) < 150) {
                        p.hp = 0;
                    }
                }
                setTimeout(() => { this.isDead = true; }, 1000);
                return;
            }
        }

        // Handle Dancing Zombie summon (被魅惑后不再召唤敌方伴舞)
        if (this.type === 'dancing' && this.state !== 'DYING' && !this.hypnotized) {
            this.summonTimer -= deltaTime;
            if (this.summonTimer <= 0) {
                this.summonTimer = 10.0; // Summon every 10s
                
                // Spawn backups
                const positions = [
                    {r: this.row - 1, dx: 0},
                    {r: this.row + 1, dx: 0},
                    {r: this.row, dx: -80},
                    {r: this.row, dx: 80}
                ];
                
                for (let pos of positions) {
                    if (pos.r >= 0 && pos.r < this.game.board.rows) {
                        const zombieY = this.game.board.offsetY + pos.r * this.game.board.cellHeight + this.game.board.cellHeight / 2 - 20;
                        const backup = new Zombie(this.game, pos.r, 'backup');
                        backup.x = Math.max(40, this.x + pos.dx); // prevent spawning behind game over line
                        backup.y = zombieY;
                        // 我是僵尸模式：舞王僵尸召出的伴舞继承"我方"标记，
                        // 否则 _checkZombieEnd 会漏判（场上还有伴舞在打，却判定我方僵尸全灭）
                        if (this._playerZombie) backup._playerZombie = true;
                        this.game.entities.push(backup);
                    }
                }
            }
        }
        
        if (this.hp <= 0 && this.state !== 'DYING') {
            this.state = 'DYING';
            if (this.headEl) this.dropPlantHead(); // 头顶植物随僵尸倒地（纯外观）
            this.element.src = this.dieSrc;
            // 友方（被魅惑）僵尸战死/离场不计分
            if (!this.hypnotized && this.game.score !== undefined) {
                this.game.score += 10;
                this.game.updateScore();
            }
            // v3.23.0：向日葵头僵尸被击杀 → 掉落随机阳光（25~150，25 一档；魅惑后阵亡不发）
            if (this.type === 'sunhead' && !this.hypnotized && this.game.addSun) {
                this.game.addSun(25 * (1 + Math.floor(Math.random() * 6)));
            }
            // v3.23.0：盲盒僵尸被击杀 → 开出一只随机僵尸
            if (this.type === 'mysterybox' && !this.hypnotized) this._openMysteryBox();
            setTimeout(() => { this.isDead = true; }, 2000); 
        }
        
        if (this.state === 'DYING') return;
        
        // ===== v3.10.0 黄油定身（玉米投手 20% 概率投出黄油）=====
        // 完全冻结：一步不动、一口不啃、不推进任何状态机（连巨人的秒砸也停），持续 3 秒。
        // 与寒冰减速叠加共存：减速改速度，黄油直接封动作。死亡判定在上一段，故被黄油期间仍会被打死。
        if (this.butterTimer > 0) {
            this.butterTimer -= deltaTime;
            if (this.butterTimer > 0) return;
            this.butterTimer = 0;
            this.isButtered = false;
            const f = this._statusFilter();
            this.element.style.filter = f;
            if (this.headEl) this.headEl.style.filter = f;
            this._tintedByStatus = !!f;
        }
        
        // ===== 魅惑（友方）僵尸：短路正常行走/啃食逻辑 =====
        if (this.hypnotized) {
            this.updateHypnotized(deltaTime, currentSpeed);
            return;
        }
        
        // Gargantuar throw imps logic
        if (this.type === 'gargantuar' && this.hp < 2000 && !this.hasThrownImps) {
            this.hasThrownImps = true;
            for (let i = 0; i < 2; i++) {
                let imp = new Zombie(this.game, this.row, 'imp');
                imp.x = Math.max(100, this.x - 150 - (i * 40));
                this.game.entities.push(imp);
            }
        }


        if (this.state === 'WALKING') {
            // v3.23.0：豌豆头/机枪头僵尸边走边向植物防线射击（zpea 只打植物，见 CollisionManager）
            if ((this.type === 'peahead' || this.type === 'machinegunhead') && !this.hypnotized && !this.game.zombieMode) {
                this._shootTimer = (this._shootTimer === undefined ? 1.2 : this._shootTimer) - deltaTime;
                if (this._shootTimer <= 0) {
                    this._shootTimer = this.type === 'machinegunhead' ? 1.4 : 2.0;
                    const shots = this.type === 'machinegunhead' ? 4 : 1;
                    for (let i = 0; i < shots; i++) {
                        setTimeout(() => {
                            if (this.isDead || this.state !== 'WALKING') return;
                            const p = new Projectile(this.game, this.x - 20, this.y - 55, this.row, 'zpea');
                            p.vx = -300; p.vy = 0;
                            this.game.entities.push(p);
                            if (this.game.audioManager && this.game.audioManager.playFx) this.game.audioManager.playFx('pea_pop');
                        }, i * 160);
                    }
                }
            }
            // 同排附近出现被魅惑的友方僵尸 → 停下与它搏斗（僵尸之间唯一的敌对交互）
            const hypnoFoe = this.game.entities.find(e =>
                e instanceof Zombie && !e.isDead && e.state !== 'DYING' && e.hypnotized &&
                e.row === this.row && Math.abs(e.x - this.x) < 95
            );
            if (hypnoFoe) {
                this.state = 'FIGHTING';
                this.fightTarget = hypnoFoe;
                this.element.src = this.attackSrc;
            } else {
            this.x -= currentSpeed * deltaTime;
            
            if (this.x < 40) { 
                // 我是僵尸模式：我方僵尸到达最左端 = 吃掉该行脑子（必须吃光全部 5 行才通关，v3.7.1）
                // 非僵尸模式保持原逻辑：僵尸进入房子 → 玩家(植物方)失败
                if (this.game.zombieMode && this.game.zombieEatBrain) {
                    this.game.zombieEatBrain(this.row, this);
                } else {
                    this.game.gameOver();
                }
            }
            
            const plant = this.game.entities.find(e => 
                e instanceof Plant && 
                // v3.14.0：地刺/钢地刺都不可啃 —— 所有僵尸直接从上面走过
                (!e.hasTrait || (!e.hasTrait('spikeweed') && !e.hasTrait('spikerock'))) &&
                e.row === this.row && 
                Math.abs(e.x - this.x) < 40 &&
                !e.isDead && e.type !== 'crater'
            );
            
            // v3.14.0：冰车碾地刺 —— 碰地刺同归于尽（冰车被扎爆）；钢地刺可扛 3 辆冰车，
            // 第 3 辆碾过才毁；其余僵尸对两种地刺照旧直接走过（不可啃、撑杆跳也不跳）
            if (this.type === 'zomboni') {
                const spike = this.game.entities.find(e => e instanceof Plant && !e.isDead &&
                    e.row === this.row && Math.abs(e.x - this.x) < 40 &&
                    e.hasTrait && (e.hasTrait('spikeweed') || e.hasTrait('spikerock')));
                if (spike) {
                    if (spike.hasTrait('spikeweed')) {
                        spike.hp = 0;
                        this.hp = 0; // 冰车被地刺扎爆
                        // v3.21.0 彩蛋：冰车被地刺扎爆 → 全场公告
                        if (this.game.showAnnouncement) this.game.showAnnouncement('区耀丁真帅', '#ff66cc');
                    } else {
                        // v3.21.0：对齐原版——钢地刺同样扎爆冰车（钢刺自身扛 3 辆，第 3 辆碾过才毁）
                        // 每辆冰车只计 1 次（贴着钢地刺开的每一帧都满足 <40px）
                        if (spike._lastCrusher !== this) {
                            spike._lastCrusher = this;
                            spike._zomboniRuns = (spike._zomboniRuns || 0) + 1;
                            if (spike._zomboniRuns >= 3) spike.hp = 0;
                        }
                        this.hp = 0; // 冰车被钢地刺扎爆
                        if (this.game.showAnnouncement) this.game.showAnnouncement('区耀丁真帅', '#ff66cc');
                    }
                }
            }

            if (plant) {
                // Ignore plants with ladders (except gargantuar and zomboni who smash it)
                if (plant.hasLadder && this.type !== 'gargantuar' && this.type !== 'zomboni') {
                    // Just walk past it!
                } else if (this.type === 'pogo') {
                    // Pogo jumps over all plants directly!
                } else if (this.type === 'ladder' && this.hasLadder && (plant.hasTrait('wallnut') || plant.hasTrait('tallnut'))) {
                    // Place ladder
                    this.hasLadder = false;
                    plant.hasLadder = true;
                    this.element.src = 'assets/images/Zombies/Zombie/Zombie.gif';
                    this.walkSrc = 'assets/images/Zombies/Zombie/Zombie.gif';
                    this.attackSrc = 'assets/images/Zombies/Zombie/ZombieAttack.gif';
                    this.element.style.filter = '';
                    
                    // Create visual ladder on plant
                    let ladderImg = document.createElement('img');
                    ladderImg.src = 'assets/images/Zombies/ScreenDoorZombie/ScreenDoorZombie.gif'; // using screen door as mock ladder
                    ladderImg.style.position = 'absolute';
                    ladderImg.style.left = '0';
                    ladderImg.style.top = '0';
                    ladderImg.style.width = '100%';
                    ladderImg.style.height = '100%';
                    ladderImg.style.filter = 'sepia(1) hue-rotate(20deg) saturate(2)';
                    ladderImg.style.clipPath = 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)'; // just show half of it as a ladder
                    plant.element.parentNode.appendChild(ladderImg);
                    plant.ladderOverlay = ladderImg; // keep reference to clean up on death
                    
                } else if (this.type === 'polevaulting' && !this.hasVaulted && (!plant.hasTrait || !plant.hasTrait('tallnut'))) {
                    // Jump over it!
                    this.hasVaulted = true;
                    this.state = 'JUMPING';
                    this.jumpTimer = 1.0; 
                    this.jumpDuration = 1.0;
                    this.jumpStartX = this.x;
                    this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieJump.gif';
                    this.jumpTargetX = Math.max(40, plant.x - 80); 
                } else if (this.type === 'zomboni' || this.type === 'gargantuar') {
                    // Crush it! (Gargantuar smashes instantly when entering eating, let's just make it stop and eat, but it instantly kills in EATING logic)
                    if (this.type === 'zomboni') {
                        plant.hp = 0;
                    } else {
                        this.state = 'EATING';
                        this.eatTarget = plant;
                        this.element.src = this.attackSrc;
                        this.smashTimer = 1.0; // Gargantuar takes 1 second to smash
                    }
                } else {
                    this.state = 'EATING';
                    this.eatTarget = plant;
                    this.element.src = this.attackSrc;
                }
            } else if (this.game.vaseMode && this.game.vases && this.game.vases.length) {
                // v3.12.0：南瓜套罐——僵尸走到罐格先啃壳（= 不占种植格的坚果）
                const gv = this.game;
                const v = gv.vases.find(x => !x.smashed && x.pumpkinHp > 0 && x.row === this.row &&
                    Math.abs(gv.board.offsetX + x.col * gv.board.cellWidth + gv.board.cellWidth / 2 - this.x) < 40);
                if (v) {
                    if (this.type === 'polevaulting' && !this.hasVaulted) {
                        // v3.13.3：撑杆跳把套罐当普通障碍 —— 直接跳过（与跳过植物一致）
                        this.hasVaulted = true;
                        this.state = 'JUMPING';
                        this.jumpTimer = 1.0;
                        this.jumpDuration = 1.0;
                        this.jumpStartX = this.x;
                        this.element.src = 'assets/images/Zombies/PoleVaultingZombie/PoleVaultingZombieJump.gif';
                        const vcx = gv.board.offsetX + v.col * gv.board.cellWidth + gv.board.cellWidth / 2;
                        this.jumpTargetX = Math.max(40, vcx - 80);
                    } else {
                        this.state = 'EATING';
                        this.eatVase = v;
                        this.element.src = this.attackSrc;
                    }
                }
            }
            } // 关闭"无魅惑僵尸 → 正常行走啃食"分支
        } else if (this.state === 'JUMPING') {
            this.jumpTimer -= deltaTime;
            const progress = 1 - (this.jumpTimer / this.jumpDuration);
            this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * Math.min(1, Math.max(0, progress)); // smoothly move to target without overshooting
            
            if (this.jumpTimer <= 0) {
                this.state = 'WALKING';
                this.speed = 20; // walk slow after jump
                this.element.src = this.walkSrc;
            }
        }
        else if (this.state === 'EATING') {
            // v3.12.0：啃南瓜套罐的壳（罐子不在棋盘格里，独立于 eatTarget 处理）
            if (this.eatVase) {
                if (!this.eatVase.smashed && this.eatVase.pumpkinHp > 0) {
                    const mul = this.game.zombieMode ? 3 : 1;
                    const left = this.game._damageVasePumpkin(this.eatVase, currentDamage * mul * deltaTime);
                    if (!this.chompTimer) this.chompTimer = 0;
                    this.chompTimer -= deltaTime;
                    if (this.chompTimer <= 0) {
                        this.game.audioManager.play('chomp');
                        this.chompTimer = this.isSlowed ? 3.0 : 1.0;
                    }
                    if (left <= 0) {
                        // 壳被啃穿：罐子留在场内（玩家仍可砸），僵尸继续前进
                        this.eatVase = null;
                        this.state = 'WALKING';
                        this.element.src = this.walkSrc;
                    }
                } else {
                    this.eatVase = null;
                    this.state = 'WALKING';
                    this.element.src = this.walkSrc;
                }
            } else if (this.eatTarget && !this.eatTarget.isDead) {
                // v3.12.0：先吃南瓜壳——壳还有耐久时只消耗壳，宿主的"被吃效果"
                // （魅惑策反/大蒜改行等）必须等真正啃到本尊才触发
                if (this.eatTarget.shield && this.eatTarget.shield.hp > 0) {
                    const dmg = (this.type === 'gargantuar') ? this.eatTarget.shield.maxHp : currentDamage * deltaTime;
                    this.eatTarget.shield.hp -= dmg;
                    if (this.eatTarget.shield.hp <= 0) {
                        this.eatTarget.shield.hp = 0;
                        this.eatTarget.removeShield(true); // 外壳碎裂（植物无损）
                        this.game.audioManager.play('splat');
                    } else {
                        this.eatTarget.updateShieldAppearance();
                    }
                    if (!this.chompTimer) this.chompTimer = 0;
                    this.chompTimer -= deltaTime;
                    if (this.chompTimer <= 0) {
                        this.game.audioManager.play('chomp');
                        this.chompTimer = this.isSlowed ? 3.0 : 1.0;
                    }
                } else if ((this.eatTarget.type === 'fusion_hypnoshroom' || this.eatTarget.type === 'hypnoshroom') && !this.eatTarget._hypnoUsed &&
                    this.type !== 'gargantuar' && this.type !== 'zomboni' && this.type !== 'lgboss') {
                    // 魅惑菇（融合版/经典版通用）：吃下即被策反，转为友方僵尸（巨人与冰车不会"吃"，只会砸烂，故不触发）
                    this.eatTarget._hypnoUsed = true;
                    this.eatTarget.hp = 0;      // 蘑菇被吃掉
                    this.game.audioManager.play('chomp');
                    if (this.game.showAnnouncement) {
                        // 我是僵尸模式：玩家方的僵尸被策反 = 倒戈损失（措辞随模式区分）
                        this.game.showAnnouncement(this.game.zombieMode
                            ? '倒戈！这只僵尸被植物策反，向右逃走了'
                            : '魅惑成功！这只僵尸现在为你而战', '#ff69b4');
                    }
                    this.hypnotize();
                } else if (this.eatTarget.type === 'garlic' && this.type !== 'snowpeahead') { // v3.23.0 寒冰头免疫大蒜改行
                    // Bite garlic and switch row!
                    this.eatTarget.hp -= 20; // single bite damage
                    this.game.audioManager.play('chomp'); // disgusted sound ideally
                    
                    // Show text bubble!
                    const textBubble = document.createElement('div');
                    textBubble.innerText = '可恶的区钥丁！';
                    textBubble.style.position = 'absolute';
                    textBubble.style.color = '#ff0000';
                    textBubble.style.fontWeight = 'bold';
                    textBubble.style.fontSize = '24px';
                    textBubble.style.textShadow = '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff';
                    textBubble.style.pointerEvents = 'none';
                    textBubble.style.zIndex = '4000';
                    textBubble.style.whiteSpace = 'nowrap';
                    textBubble.style.left = `${this.x - 30}px`;
                    textBubble.style.top = `${this.y - 60}px`;
                    textBubble.style.transition = 'top 2s ease-out, opacity 2s ease-out';
                    
                    this.game.container.appendChild(textBubble);
                    
                    setTimeout(() => {
                        textBubble.style.top = `${this.y - 120}px`;
                        textBubble.style.opacity = '0';
                    }, 50);
                    
                    setTimeout(() => {
                        if (textBubble.parentNode) textBubble.parentNode.removeChild(textBubble);
                    }, 2000);
                    
                    // Switch row up or down randomly (if possible)
                    const canGoUp = this.row > 0;
                    const canGoDown = this.row < this.game.board.rows - 1;
                    
                    if (canGoUp && canGoDown) {
                        this.row += Math.random() < 0.5 ? -1 : 1;
                    } else if (canGoUp) {
                        this.row -= 1;
                    } else if (canGoDown) {
                        this.row += 1;
                    }
                    
                    // Update visually
                    this.y = this.game.board.offsetY + this.row * this.game.board.cellHeight + this.game.board.cellHeight / 2 - 20;
                    
                    this.state = 'WALKING';
                    this.eatTarget = null;
                    this.element.src = this.walkSrc;
                } else {
                    // （南瓜壳分支已上提：能走到这里说明壳已被啃穿或本来就没有）
                    if (this.type === 'gargantuar') {
                        if (!this.smashTimer) this.smashTimer = 1.0;
                        this.smashTimer -= deltaTime;
                        if (this.smashTimer <= 0) {
                            this.eatTarget.hp = 0; // instantly kill
                            this.game.audioManager.play('splat');
                            this.smashTimer = 1.0;
                        }
                    } else {
                        // 我是僵尸模式：标记"植物正被僵尸啃食"，向日葵被啃死时据此发阳光奖励
                        this.eatTarget._zombieKill = true;
                        // 我是僵尸专属平衡旋钮：该模式玩家是进攻方，敌阵植物 HP 普遍 300~4000，
                        // 按原始 50/s 连一株豌豆射手都要啃 6s（还没啃完就被身后的射手打死）→ 啃食 ×3。
                        // 其它模式维持原速，不影响玩家用植物防守的手感。
                        const eatMul = this.game.zombieMode ? 3 : 1;
                        this.eatTarget.hp -= currentDamage * eatMul * deltaTime;
                        // v3.22.0：火爆辣椒植物僵尸——吃掉一株植物计 1 次，连续 2 株 → 整排引爆
                        if (this.type === 'jalapenohead' && this.eatTarget.hp <= 0) {
                            this._eatenCount++;
                            this.eatTarget = null;
                            this.state = 'WALKING';
                            if (this.element) this.element.src = this.walkSrc;
                            if (this._eatenCount >= 2) this._jalapenoRowBoom();
                        }
                    }
                    
                    // v3.22.0：eatTarget 可能在上方火爆辣椒计数分支被置空（吃满自爆），加 null 守卫
                    if (this.eatTarget && this.eatTarget.hasTrait && (this.eatTarget.hasTrait('spikeweed') || this.eatTarget.hasTrait('chomper'))) {
                        this.hp -= 20 * deltaTime; // reflect damage
                    }
                    if (this.eatTarget && this.eatTarget.hasTrait && this.eatTarget.hasTrait('snowpea') && !this.isSlowed) {
                        this.setSlow(10.0);
                    }
                    
                    if (!this.chompTimer) this.chompTimer = 0;
                    this.chompTimer -= deltaTime;
                    const chompInterval = this.isSlowed ? 3.0 : 1.0;
                    if (this.chompTimer <= 0) {
                        this.game.audioManager.play('chomp');
                        this.chompTimer = chompInterval; 
                    }
                }
            } else {
                this.state = 'WALKING';
                this.eatTarget = null;
                this.element.src = this.walkSrc;
            }
        } else if (this.state === 'FIGHTING') {
            // 敌方僵尸与被魅惑的友方僵尸肉搏（只有敌方僵尸会进入该状态）
            if (this.fightTarget && !this.fightTarget.isDead && this.fightTarget.state !== 'DYING' &&
                this.fightTarget.row === this.row && Math.abs(this.fightTarget.x - this.x) < 95) {
                if (this.fightTarget.hypnotized) {
                    // 敌方啃咬：50 伤害/秒（与啃植物一致；友方反击 100/秒见 updateHypnotized）
                    this.fightTarget.hp -= currentDamage * deltaTime;
                    if (!this.chompTimer) this.chompTimer = 0;
                    this.chompTimer -= deltaTime;
                    if (this.chompTimer <= 0) { this.game.audioManager.play('chomp'); this.chompTimer = 1.0; }
                }
            } else {
                this.state = 'WALKING';
                this.fightTarget = null;
                this.element.src = this.walkSrc;
            }
        }
    }
    
    takeDamage(amount, opts) {
        // 友方（被魅惑）僵尸免疫我方植物/子弹/爆炸的一切伤害，
        // 只能被敌方僵尸肉搏杀死（FIGHTING 直接扣血）
        if (this.hypnotized) return;
        // v3.23.0：寒冰头僵尸免疫一次性炸弹（普通子弹与地刺/钢地刺仍可伤害它）
        if (this.type === 'snowpeahead' && opts && opts.bomb) return;
        // v3.14.0：《我是僵尸》里 橄榄球/铁门/冰车 可以硬扛 3 次一次性炸弹引爆
        //（炸弹照常爆炸、对其它僵尸照常生效），第 4 次才被炸死（opts.bomb 由各爆炸点传入）
        if (opts && opts.bomb && this.game.zombieMode &&
            (this.type === 'football' || this.type === 'screendoor' || this.type === 'zomboni')) {
            this._bombTanked = (this._bombTanked || 0) + 1;
            if (this._bombTanked <= 3) return;
        }
        // ===== v3.10.0 破甲（仅卷心菜投手 / 玉米投手的投掷物）=====
        // opts.pierce=true 表示"越过护甲直接打本体"：
        //   · hp 正常扣（该掉多少血就掉多少血）
        //   · armorHp（护甲能感知到的伤害）**不扣** → 路障/铁桶/报纸/铁门永远不脱落
        // 非破甲伤害两者同时扣，行为与旧版完全一致。
        if (this.armorHp === null || this.armorHp === undefined) this.armorHp = this.hp + amount;
        this.hp -= amount;
        if (!(opts && opts.pierce)) this.armorHp -= amount;
    }
}
