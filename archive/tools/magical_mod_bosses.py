import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

config_js = """
const CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    FPS: 60,
    
    STARTING_GOLD: 0,
    
    WEAPON_TIERS: [
        { id: 'bow', name: '木弓', damage: 20, speed: 10, fireRate: 500, sprite: 'ARROW', color: '#FFFFFF' },
        { id: 'gun', name: '火铳', damage: 45, speed: 15, fireRate: 350, sprite: 'BULLET', color: '#FFD700' },
        { id: 'cannon', name: '红衣大炮', damage: 120, speed: 8, fireRate: 800, sprite: 'CANNONBALL', color: '#A9A9A9', splash: 80 },
        { id: 'laser', name: '天基激光', damage: 60, speed: 30, fireRate: 150, sprite: 'LASER', color: '#00FFFF', pierce: true },
        { id: 'missile', name: '东风导弹', damage: 400, speed: 12, fireRate: 1000, sprite: 'MISSILE', color: '#FF4500', homing: true, splash: 150 },
        { id: 'nuke', name: '核爆(终极)', damage: 3000, speed: 5, fireRate: 2500, sprite: 'NUKE', color: '#32CD32', splash: 600 }
    ],

    UPGRADES: [
        { name: '武器进化', cost: 150, costMult: 2.5, type: 'weapon' },
        { name: '射速强化', cost: 100, fireRateMult: 0.85, costMult: 1.5, type: 'speed' },
        { name: '多重散射', cost: 300, arrows: 1, costMult: 2.0, type: 'arrows' }
    ],
    
    ENEMY_TYPES: {
        INFANTRY: { id: 'infantry', name: '黄巾军', hp: 30, speed: 1.5, reward: 5, color: '#FFD700', size: 15 },
        CAVALRY: { id: 'cavalry', name: '西凉铁骑', hp: 80, speed: 2.2, reward: 15, color: '#8B4513', size: 20 },
        HEAVY: { id: 'heavy', name: '铁浮屠', hp: 250, speed: 0.6, reward: 30, color: '#808080', size: 25 },
        BOSS_DOGE: { id: 'boss_doge', name: '精神小伙(狗头)', hp: 1500, speed: 0.4, reward: 500, color: '#FFD700', size: 40, jumpInterval: 1500, jumpRange: 2 },
        BOSS_CXK: { id: 'boss_cxk', name: '中分战神(唱跳)', hp: 2000, speed: 0.3, reward: 800, color: '#808080', size: 45, jumpInterval: 800, jumpRange: 1 },
        BOSS_BAOAN: { id: 'boss_baoan', name: '摸鱼保安(划水)', hp: 3000, speed: 0.2, reward: 1000, color: '#00BFFF', size: 50, jumpInterval: 3000, jumpRange: 3 }
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

sprites_js = """
const SPRITE_PALETTE = {
    '0': 'transparent',
    '1': '#000000', // Outline/Eyes
    '2': '#FFCDB2', // Skin
    '3': '#FFFFFF', // White
    '4': '#FF0000', // Red
    '5': '#8B4513', // Brown
    '6': '#808080', // Grey
    '7': '#FFD700', // Gold
    '8': '#8A2BE2', // Purple
    '9': '#006400', // Dark Green
    'A': '#00FFFF', // Cyan
    'B': '#32CD32'  // Lime
};

const SPRITES = {
    HERO: [
        "00004440000",
        "00004440000",
        "00077777000",
        "00677777600",
        "06622222660",
        "06612221660",
        "00066666000",
        "00CCCCCCC00",
        "06C6CCC6C60",
        "066C666C660",
        "00660006600"
    ],
    INFANTRY: [
        "000777000",
        "007777700",
        "002121200",
        "002222200",
        "005555500",
        "065555560",
        "005555500",
        "001101100"
    ],
    CAVALRY: [
        "00000220000",
        "00002120000",
        "00004440000",
        "00554445500",
        "05555555550",
        "55155555155",
        "55555555555",
        "05500000550",
        "01100000110"
    ],
    HEAVY: [
        "0006666000",
        "0066666600",
        "0666116660",
        "0666666660",
        "0666666660",
        "6666666666",
        "6666666666",
        "6666666666",
        "0666006660",
        "0666006660",
        "0111001110"
    ],
    BOSS_DOGE: [
        "000077770000",
        "000777777000",
        "007177771700",
        "007771177700",
        "000777777000",
        "007777777700",
        "077077770770",
        "000077770000",
        "000010010000"
    ],
    BOSS_CXK: [
        "000011110000",
        "000122221000",
        "000212212000",
        "003333333300",
        "003133331300",
        "003133331300",
        "000111111000",
        "000100001000",
        "000300003000"
    ],
    BOSS_BAOAN: [
        "000011110000",
        "0000AAAA0000",
        "000212212000",
        "00AA2222AA00",
        "000AAAAAA000",
        "000AAAAAA000",
        "000111111000",
        "000100001000"
    ],
    ARROW: [
        "0110", "1661", "0110", "0550", "0550", "0550", "0550", "1441", "1441"
    ],
    BULLET: [
        "0770", "7777", "7777", "0770"
    ],
    CANNONBALL: [
        "06660", "66366", "63666", "66666", "06660"
    ],
    LASER: [
        "AA", "33", "33", "33", "33", "33", "33", "33", "33", "AA"
    ],
    MISSILE: [
        "004400", "047740", "043340", "033330", "033330", "033330", "166661", "166661", "440044"
    ],
    NUKE: [
        "00B11B00", "0B1331B0", "B133331B", "B133331B", "B133331B", "B133331B", "0B1331B0", "00B11B00"
    ]
};

function drawSprite(ctx, spriteObj, x, y, sizeMultiplier, dynamicColor) {
    if (!spriteObj) return;
    const rows = spriteObj.length;
    const cols = spriteObj[0].length;
    const pSize = sizeMultiplier;
    
    const startX = x - (cols * pSize) / 2;
    const startY = y - (rows * pSize) / 2;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const char = spriteObj[r][c];
            if (char === '0') continue;
            
            let color = SPRITE_PALETTE[char];
            if (char === 'C') color = dynamicColor;
            
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(startX + c * pSize, startY + r * pSize, pSize, pSize);
            }
        }
    }
}
"""

with open(os.path.join(base_dir, 'config.js'), 'w') as f:
    f.write(config_js)

with open(os.path.join(base_dir, 'sprites.js'), 'w') as f:
    f.write(sprites_js)

main_path = os.path.join(base_dir, 'main.js')
with open(main_path, 'r') as f:
    main_content = f.read()

target_spawn_func = """    spawnEnemy(isBoss = false) {
        const laneWidth = CONFIG.CANVAS_WIDTH / this.numLanes;
        const lane = (Math.floor(Math.random() * this.numLanes) + 0.5) * laneWidth;
        
        let type = CONFIG.ENEMY_TYPES.INFANTRY;
        if (isBoss) {
            type = CONFIG.ENEMY_TYPES.BOSS;
            this.triggerShake(15, 500); // Dramatic entrance
            this.spawnFloatingText("⚠️魔将降临⚠️", lane, 120, '#FF00FF', 24);
        } else {
            const rand = Math.random();
            if (rand > 0.6) type = CONFIG.ENEMY_TYPES.CAVALRY || type;
            if (rand > 0.9) type = CONFIG.ENEMY_TYPES.HEAVY || type;
        }

        this.enemies.push({
            type: type,
            x: lane,
            y: 110,
            hp: type.hp * this.waveMultiplier,
            maxHp: type.hp * this.waveMultiplier,
            frozenTimer: 0,
            hitTimer: 0
        });
    }"""
replacement_spawn_func = """    spawnEnemy(isBoss = false) {
        const laneWidth = CONFIG.CANVAS_WIDTH / this.numLanes;
        const lane = (Math.floor(Math.random() * this.numLanes) + 0.5) * laneWidth;
        
        let type = CONFIG.ENEMY_TYPES.INFANTRY;
        if (isBoss) {
            const bossTypes = [CONFIG.ENEMY_TYPES.BOSS_DOGE, CONFIG.ENEMY_TYPES.BOSS_CXK, CONFIG.ENEMY_TYPES.BOSS_BAOAN];
            type = bossTypes[Math.floor(Math.random() * bossTypes.length)];
            this.triggerShake(15, 500); 
            this.spawnFloatingText(`⚠️${type.name} 降临⚠️`, lane, 120, '#FF00FF', 24);
        } else {
            const rand = Math.random();
            if (rand > 0.6) type = CONFIG.ENEMY_TYPES.CAVALRY || type;
            if (rand > 0.9) type = CONFIG.ENEMY_TYPES.HEAVY || type;
        }

        this.enemies.push({
            type: type,
            x: lane,
            y: 110,
            hp: type.hp * this.waveMultiplier,
            maxHp: type.hp * this.waveMultiplier,
            frozenTimer: 0,
            hitTimer: 0,
            jumpTimer: type.jumpInterval ? type.jumpInterval : 0,
            targetX: lane
        });
    }"""
main_content = main_content.replace(target_spawn_func, replacement_spawn_func)

target_enemy_update = """            if (e.frozenTimer > 0) e.frozenTimer -= deltaTime;
            else e.y += e.type.speed * (0.8 + this.waveMultiplier*0.2) * (deltaTime / 16);"""
replacement_enemy_update = """            if (e.frozenTimer > 0) {
                e.frozenTimer -= deltaTime;
            } else {
                e.y += e.type.speed * (0.8 + this.waveMultiplier*0.2) * (deltaTime / 16);
                
                // Strafe logic for bosses
                if (e.type.jumpInterval && this.numLanes > 1) {
                    e.jumpTimer -= deltaTime;
                    if (e.jumpTimer <= 0) {
                        e.jumpTimer = e.type.jumpInterval + Math.random() * 500;
                        const currentLaneIdx = Math.floor(e.x / (CONFIG.CANVAS_WIDTH / this.numLanes));
                        let dir = (Math.random() > 0.5 ? 1 : -1) * Math.ceil(Math.random() * e.type.jumpRange);
                        let newLaneIdx = currentLaneIdx + dir;
                        if (newLaneIdx < 0) newLaneIdx = 0;
                        if (newLaneIdx >= this.numLanes) newLaneIdx = this.numLanes - 1;
                        
                        e.targetX = (newLaneIdx + 0.5) * (CONFIG.CANVAS_WIDTH / this.numLanes);
                    }
                }
                
                // Smooth horizontal dash
                if (e.targetX !== undefined && Math.abs(e.x - e.targetX) > 1) {
                    e.x += (e.targetX - e.x) * 0.15;
                }
            }"""
main_content = main_content.replace(target_enemy_update, replacement_enemy_update)

# Fix missing sprite mapping for boss in drawSprite wrapper
target_draw_enemy = """            drawSprite(ctx, SPRITES[spriteId], e.x, e.y, e.type.size/4, null);"""
replacement_draw_enemy = """            // Support exact boss sprite IDs
            const exactSprite = SPRITES[e.type.id.toUpperCase()];
            drawSprite(ctx, exactSprite || SPRITES[spriteId], e.x, e.y, e.type.size/4, null);"""
main_content = main_content.replace(target_draw_enemy, replacement_draw_enemy)

with open(main_path, 'w') as f:
    f.write(main_content)

print("Funny Bosses with strafing logic added successfully!")
