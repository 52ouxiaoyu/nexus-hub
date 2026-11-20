import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

config_js = """
const CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    FPS: 60,
    
    STARTING_GOLD: 0,
    
    HERO: {
        baseDamage: 20,
        fireRate: 500, // ms
        projectileSpeed: 10,
        size: 20
    },

    UPGRADES: [
        { name: '攻击+', cost: 50, damageInc: 10, costMult: 1.5, type: 'damage' },
        { name: '射速+', cost: 100, fireRateMult: 0.85, costMult: 1.6, type: 'speed' },
        { name: '连弩', cost: 300, arrows: 1, costMult: 2.0, type: 'arrows' }
    ],
    
    ENEMY_TYPES: {
        INFANTRY: { id: 'infantry', name: '黄巾军', hp: 30, speed: 1.5, reward: 5, color: '#FFD700', size: 15 },
        CAVALRY: { id: 'cavalry', name: '西凉铁骑', hp: 80, speed: 2.2, reward: 15, color: '#8B4513', size: 20 },
        HEAVY: { id: 'heavy', name: '铁浮屠', hp: 250, speed: 0.6, reward: 30, color: '#808080', size: 25 }
    },

    ITEMS: {
        BOMB: { id: 'bomb', color: '#FF4500', size: 15, text: '🧨', name: '窜天猴(全屏轰炸)' },
        FREEZE: { id: 'freeze', color: '#00FFFF', size: 15, text: '📜', name: '定身符箓(全员罚站)' },
        HEAL: { id: 'heal', color: '#32CD32', size: 15, text: '🥟', name: '百年肉包(回血+钱)' },
        RAPID: { id: 'rapid', color: '#FF00FF', size: 15, text: '🐔', name: '尖叫鸡(攻速拉满)' },
        KNOCKBACK: { id: 'knockback', color: '#FFFFFF', size: 15, text: '🦁', name: '狮吼功(全员击退)' },
        RICH: { id: 'rich', color: '#FFD700', size: 15, text: '💸', name: '天降横财(+500G)' },
        MULTISHOT: { id: 'multishot', color: '#00FF00', size: 15, text: '🤖', name: '墨家机关(万箭齐发)' },
        POISON: { id: 'poison', color: '#8B0000', size: 15, text: '💩', name: '发霉窝窝头(扣除200G)' },
        SLOW: { id: 'slow', color: '#808080', size: 15, text: '🐢', name: '王八附体(攻速骤降)' },
        DISARM: { id: 'disarm', color: '#000000', size: 15, text: '🍌', name: '踩到香蕉皮(缴械三秒)' }
    }
};
"""

with open(os.path.join(base_dir, 'config.js'), 'w') as f:
    f.write(config_js)

main_js_path = os.path.join(base_dir, 'main.js')
with open(main_js_path, 'r') as f:
    main_js_content = f.read()

# Replace startGame to add buffs initialization
target_startGame = """                upgradeLevels: [0, 0, 0]
            });
        }

        this.projectiles = [];"""
replacement_startGame = """                upgradeLevels: [0, 0, 0],
                buffs: { rapidTimer: 0, multiTimer: 0, slowTimer: 0, disarmTimer: 0 }
            });
        }

        this.projectiles = [];"""
main_js_content = main_js_content.replace(target_startGame, replacement_startGame)

# Replace shoot logic for MULTISHOT buff
target_shoot = """    shoot(hero) {
        const spread = 20;
        for (let i = 0; i < hero.arrows; i++) {
            let targetX = hero.x;
            if (hero.arrows > 1) targetX = hero.x - (spread * (hero.arrows - 1)) / 2 + i * spread;
            
            let vx_straight = 0;
            if (hero.arrows > 1) vx_straight = ((i / (hero.arrows - 1)) - 0.5) * 4;"""
replacement_shoot = """    shoot(hero) {
        let actualArrows = hero.arrows;
        if (hero.buffs.multiTimer > 0) actualArrows += 5; // 机关暴走!
        
        const spread = 20;
        for (let i = 0; i < actualArrows; i++) {
            let targetX = hero.x;
            if (actualArrows > 1) targetX = hero.x - (spread * (actualArrows - 1)) / 2 + i * spread;
            
            let vx_straight = 0;
            if (actualArrows > 1) vx_straight = ((i / (actualArrows - 1)) - 0.5) * 4;"""
main_js_content = main_js_content.replace(target_shoot, replacement_shoot)

# Replace update loop for buffs and drop rate
target_update_buffs = """        this.heroes.forEach(hero => {
            if (currentTime - hero.lastShotTime > hero.fireRate) {
                this.shoot(hero);
                hero.lastShotTime = currentTime;
            }
            if (hero.comboTimer > 0) hero.comboTimer -= deltaTime;
            else hero.combo = 0;
        });"""
replacement_update_buffs = """        this.heroes.forEach(hero => {
            if (hero.buffs.rapidTimer > 0) hero.buffs.rapidTimer -= deltaTime;
            if (hero.buffs.multiTimer > 0) hero.buffs.multiTimer -= deltaTime;
            if (hero.buffs.slowTimer > 0) hero.buffs.slowTimer -= deltaTime;
            if (hero.buffs.disarmTimer > 0) hero.buffs.disarmTimer -= deltaTime;

            let currentFireRate = hero.fireRate;
            if (hero.buffs.rapidTimer > 0) currentFireRate = 80; // 机枪射速
            if (hero.buffs.slowTimer > 0) currentFireRate = Math.max(1000, currentFireRate * 3); // 乌龟射速

            if (hero.buffs.disarmTimer <= 0) {
                if (currentTime - hero.lastShotTime > currentFireRate) {
                    this.shoot(hero);
                    hero.lastShotTime = currentTime;
                }
            }

            if (hero.comboTimer > 0) hero.comboTimer -= deltaTime;
            else hero.combo = 0;
        });"""
main_js_content = main_js_content.replace(target_update_buffs, replacement_update_buffs)

target_drop_rate = """                if (Math.random() < 0.1) {
                    const itemTypes = Object.values(CONFIG.ITEMS);"""
replacement_drop_rate = """                if (Math.random() < 0.15) { // 提高爆率到15%，让场面更混乱
                    const itemTypes = Object.values(CONFIG.ITEMS);"""
main_js_content = main_js_content.replace(target_drop_rate, replacement_drop_rate)

# Replace applyItem completely
target_applyItem = """    applyItem(itemType, heroOwner, x, y) {
        if (itemType.id === 'bomb') {
            this.triggerShake(15, 400);
            this.enemies.forEach(e => {
                e.hp -= 200;
                e.hitTimer = 100;
                if(e.hp <= 0 && heroOwner) {
                    heroOwner.score += e.type.reward * 10;
                    heroOwner.gold += e.type.reward;
                    this.spawnParticles(e.x, e.y, '#FF4500', 10);
                }
            });
            this.spawnFloatingText("全屏轰炸!", x, y, '#FF4500');
        } else if (itemType.id === 'freeze') {
            this.enemies.forEach(e => e.frozenTimer = 3000);
            this.spawnFloatingText("时间冻结!", x, y, '#00FFFF');
        } else if (itemType.id === 'heal') {
            if(heroOwner) heroOwner.gold += 150; 
            this.spawnFloatingText("+150G!", x, y, '#FFD700');
            if (this.castleHp < this.maxCastleHp) {
                this.castleHp++;
                this.spawnFloatingText("城墙修复!", x, y - 20, '#32CD32');
            }
        }
    }"""
replacement_applyItem = """    applyItem(itemType, heroOwner, x, y) {
        this.spawnFloatingText(itemType.name, x, y, itemType.color, 18);
        
        switch(itemType.id) {
            case 'bomb':
                this.triggerShake(20, 500);
                this.enemies.forEach(e => {
                    e.hp -= 300; e.hitTimer = 100;
                    if(e.hp <= 0 && heroOwner) {
                        heroOwner.score += e.type.reward * 10;
                        heroOwner.gold += e.type.reward;
                        this.spawnParticles(e.x, e.y, '#FF4500', 15);
                    }
                });
                break;
            case 'freeze':
                this.enemies.forEach(e => e.frozenTimer = 3000);
                break;
            case 'heal':
                if(heroOwner) heroOwner.gold += 100; 
                if (this.castleHp < this.maxCastleHp) {
                    this.castleHp++;
                }
                break;
            case 'rapid':
                if (heroOwner) heroOwner.buffs.rapidTimer = 3000;
                break;
            case 'knockback':
                this.triggerShake(10, 300);
                this.enemies.forEach(e => {
                    e.y = Math.max(110, e.y - 250); // Force back up
                    e.frozenTimer = 500; // Brief stun
                });
                break;
            case 'rich':
                if (heroOwner) heroOwner.gold += 500;
                break;
            case 'multishot':
                if (heroOwner) heroOwner.buffs.multiTimer = 4000;
                break;
            case 'poison':
                if (heroOwner) heroOwner.gold = Math.max(0, heroOwner.gold - 200);
                break;
            case 'slow':
                if (heroOwner) heroOwner.buffs.slowTimer = 4000;
                break;
            case 'disarm':
                if (heroOwner) heroOwner.buffs.disarmTimer = 3000;
                break;
        }
    }"""
main_js_content = main_js_content.replace(target_applyItem, replacement_applyItem)

with open(main_js_path, 'w') as f:
    f.write(main_js_content)

print("Crazy items implemented!")
