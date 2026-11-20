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

main_js_path = os.path.join(base_dir, 'main.js')
with open(main_js_path, 'r') as f:
    main_js_content = f.read()

# Replace startGame hero init for weapons
main_js_content = main_js_content.replace(
    """                upgradeLevels: [0, 0, 0],""",
    """                upgradeLevels: [0, 0, 0],
                weaponTier: 0,"""
)

# Replace handleUpgrades to support weapon tier upgrade
target_handleUpgrade = """            if (hero.gold >= upgrade.cost) {
                hero.gold -= upgrade.cost;
                if (upgrade.type === 'damage') hero.damage += upgrade.damageInc;
                if (upgrade.type === 'speed') hero.fireRate *= upgrade.fireRateMult;
                if (upgrade.type === 'arrows') hero.arrows += upgrade.arrows;
                
                upgrade.cost = Math.floor(upgrade.cost * upgrade.costMult);
                hero.upgradeLevels[index]++;
                
                this.spawnFloatingText(`${upgrade.name} UP!`, hero.x, hero.y - 60, '#FFD700', 20);
                this.spawnParticles(hero.x, hero.y, '#FFD700', 10);
            }"""
replacement_handleUpgrade = """            if (hero.gold >= upgrade.cost) {
                if (upgrade.type === 'weapon') {
                    if (hero.weaponTier >= CONFIG.WEAPON_TIERS.length - 1) {
                        this.spawnFloatingText("已达最高级!", hero.x, hero.y - 60, '#FF0000', 16);
                        return; // Cannot upgrade further
                    }
                    hero.weaponTier++;
                    const newWeapon = CONFIG.WEAPON_TIERS[hero.weaponTier];
                    // Reset base fire rate, keep multipliers if any
                    hero.fireRate = newWeapon.fireRate; 
                    for (let i = 0; i < hero.upgradeLevels[1]; i++) { // reapply speed upgrades
                        hero.fireRate *= CONFIG.UPGRADES[1].fireRateMult; 
                    }
                    this.spawnFloatingText(`解锁: ${newWeapon.name}!`, hero.x, hero.y - 60, '#FF00FF', 24);
                } else {
                    if (upgrade.type === 'speed') hero.fireRate *= upgrade.fireRateMult;
                    if (upgrade.type === 'arrows') hero.arrows += upgrade.arrows;
                    this.spawnFloatingText(`${upgrade.name} UP!`, hero.x, hero.y - 60, '#FFD700', 20);
                }
                
                hero.gold -= upgrade.cost;
                upgrade.cost = Math.floor(upgrade.cost * upgrade.costMult);
                hero.upgradeLevels[index]++;
                
                this.spawnParticles(hero.x, hero.y, '#FFD700', 10);
            }"""
main_js_content = main_js_content.replace(target_handleUpgrade, replacement_handleUpgrade)

# Replace shoot logic
target_shoot = """    shoot(hero) {
        let actualArrows = hero.arrows;
        if (hero.buffs.multiTimer > 0) actualArrows += 5; // 机关暴走!
        
        const spread = 20;
        for (let i = 0; i < actualArrows; i++) {
            let targetX = hero.x;
            if (actualArrows > 1) targetX = hero.x - (spread * (actualArrows - 1)) / 2 + i * spread;
            
            let vx_straight = 0;
            if (actualArrows > 1) vx_straight = ((i / (actualArrows - 1)) - 0.5) * 4;
            
            this.projectiles.push({
                x: targetX,
                y: hero.y - 30,
                vx: vx_straight,
                vy: -CONFIG.HERO.projectileSpeed,
                damage: hero.damage,
                color: hero.color,
                heroOwner: hero
            });
        }
        Audio.playShoot();
    }"""
replacement_shoot = """    shoot(hero) {
        let actualArrows = hero.arrows;
        if (hero.buffs.multiTimer > 0) actualArrows += 5; 
        const weapon = CONFIG.WEAPON_TIERS[hero.weaponTier];
        
        const spread = 20;
        for (let i = 0; i < actualArrows; i++) {
            let targetX = hero.x;
            if (actualArrows > 1) targetX = hero.x - (spread * (actualArrows - 1)) / 2 + i * spread;
            
            let vx_straight = 0;
            if (actualArrows > 1) vx_straight = ((i / (actualArrows - 1)) - 0.5) * 4;
            
            this.projectiles.push({
                x: targetX,
                y: hero.y - 30,
                vx: vx_straight,
                vy: -weapon.speed,
                damage: weapon.damage,
                color: weapon.color,
                heroOwner: hero,
                sprite: weapon.sprite,
                homing: weapon.homing,
                splash: weapon.splash,
                pierce: weapon.pierce,
                piercedEnemies: new Set(),
                speedMultiplier: weapon.speed
            });
        }
        if (weapon.id === 'cannon' || weapon.id === 'nuke') Audio.playExplosion();
        else Audio.playShoot();
    }"""
main_js_content = main_js_content.replace(target_shoot, replacement_shoot)

# Replace projectile rendering
target_draw_proj = """        this.projectiles.forEach(p => {
            drawSprite(ctx, SPRITES.ARROW, p.x, p.y, 2, p.color);
        });"""
replacement_draw_proj = """        this.projectiles.forEach(p => {
            const size = (p.sprite === 'NUKE') ? 4 : (p.sprite === 'CANNONBALL' || p.sprite === 'MISSILE') ? 3 : 2;
            drawSprite(ctx, SPRITES[p.sprite] || SPRITES.ARROW, p.x, p.y, size, p.color);
        });"""
main_js_content = main_js_content.replace(target_draw_proj, replacement_draw_proj)

# Replace projectile update and collision logic
target_collision = """            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                if (Math.hypot(e.x - p.x, e.y - p.y) < e.type.size * 2) {
                    e.hp -= p.damage;
                    e.hitTimer = 100;
                    lastHitter = p.heroOwner;
                    this.spawnParticles(p.x, p.y, p.color, 3);
                    this.spawnFloatingText(`-${p.damage}`, e.x, e.y - e.type.size, '#FF6347', 14);
                    this.projectiles.splice(j, 1);
                    Audio.playHit();
                    hit = true;
                }
            }"""

replacement_collision = """            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                const p = this.projectiles[j];
                
                if (p.homing) {
                    let closest = null, minD = Infinity;
                    this.enemies.forEach(eTarget => {
                        if (eTarget.y < p.y) { // only target enemies ahead
                            let d = Math.hypot(eTarget.x - p.x, eTarget.y - p.y);
                            if (d < minD) { minD = d; closest = eTarget; }
                        }
                    });
                    if (closest) {
                        const dx = closest.x - p.x, dy = closest.y - p.y;
                        const len = Math.hypot(dx, dy);
                        p.vx += (dx/len * 0.8) * ts; p.vy += (dy/len * 0.8) * ts;
                        const vlen = Math.hypot(p.vx, p.vy);
                        if (vlen > p.speedMultiplier) { p.vx = (p.vx/vlen) * p.speedMultiplier; p.vy = (p.vy/vlen) * p.speedMultiplier; }
                    }
                }

                if (Math.hypot(e.x - p.x, e.y - p.y) < e.type.size * 2) {
                    if (p.pierce) {
                        if (p.piercedEnemies.has(e)) continue;
                        p.piercedEnemies.add(e);
                    }
                    
                    e.hp -= p.damage;
                    e.hitTimer = 100;
                    lastHitter = p.heroOwner;
                    this.spawnParticles(p.x, p.y, p.color, 5);
                    this.spawnFloatingText(`-${p.damage}`, e.x, e.y - e.type.size, p.color, 14);
                    Audio.playHit();
                    
                    if (p.splash) {
                        this.triggerShake(p.splash/20, 200);
                        Audio.playExplosion();
                        this.spawnParticles(p.x, p.y, '#FF4500', p.splash/10);
                        this.enemies.forEach(e2 => {
                            if (e !== e2 && Math.hypot(e2.x - p.x, e2.y - p.y) < p.splash) {
                                e2.hp -= p.damage / 2;
                                e2.hitTimer = 100;
                                this.spawnFloatingText(`-${Math.floor(p.damage/2)}`, e2.x, e2.y - e2.type.size, '#FFA500', 12);
                                if(e2.hp <= 0 && lastHitter) {
                                    lastHitter.score += e2.type.reward * 10;
                                    lastHitter.gold += e2.type.reward;
                                }
                            }
                        });
                    }

                    if (!p.pierce) {
                        this.projectiles.splice(j, 1);
                    }
                    hit = true;
                }
            }"""
main_js_content = main_js_content.replace(target_collision, replacement_collision)

with open(main_js_path, 'w') as f:
    f.write(main_js_content)

print("Weapon Evolution system added successfully!")
