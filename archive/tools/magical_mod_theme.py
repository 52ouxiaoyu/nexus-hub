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
        BOMB: { id: 'bomb', color: '#FF4500', size: 15, text: '🧨' },
        FREEZE: { id: 'freeze', color: '#00FFFF', size: 15, text: '📜' },
        HEAL: { id: 'heal', color: '#FFD700', size: 15, text: '🥟' }
    }
};
"""

sprites_js = """
const SPRITE_PALETTE = {
    '0': 'transparent',
    '1': '#000000', // Outline/Eyes
    '2': '#FFCDB2', // Skin
    '3': '#FFFFFF', // White
    '4': '#FF0000', // Red (Plume/Blood)
    '5': '#8B4513', // Brown (Wood/Leather)
    '6': '#808080', // Grey (Iron)
    '7': '#FFD700', // Gold / Yellow
    '8': '#8A2BE2', // Purple
    '9': '#006400', // Dark Green
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
        "0110",
        "1661",
        "0110",
        "0550",
        "0550",
        "0550",
        "0550",
        "1441",
        "1441"
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

print("Chinese Theme and enemy shapes applied successfully!")
