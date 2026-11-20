
const CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    FPS: 60,
    
    STARTING_GOLD: 200,
    
    WEAPON_TIERS: [
        { id: 'bow', name: '长弓', damage: 20, speed: 10, fireRate: 500, sprite: 'ARROW', color: '#FFFFFF' },
        { id: 'crossbow', name: '诸葛连弩', damage: 45, speed: 15, fireRate: 350, sprite: 'BOLT', color: '#FFD700' },
        { id: 'trebuchet', name: '霹雳车', damage: 120, speed: 8, fireRate: 800, sprite: 'ROCK', color: '#A9A9A9', splash: 80 },
        { id: 'ballista', name: '八牛床弩', damage: 60, speed: 30, fireRate: 150, sprite: 'BALLISTA', color: '#00FFFF', pierce: true },
        { id: 'axe', name: '双刃回旋斧', damage: 150, speed: 15, fireRate: 600, sprite: 'AXE', color: '#FF4500', pierce: true, boomerang: true },
        { id: 'shockwave', name: '伏波冲击波', damage: 200, speed: 6, fireRate: 1000, sprite: 'SHOCKWAVE', color: '#00BFFF', pierce: true, isWave: true },
        { id: 'fan', name: '冰魄羽扇', damage: 80, speed: 12, fireRate: 400, sprite: 'FAN', color: '#E0FFFF', freeze: true },
        { id: 'firedragon', name: '火龙出水', damage: 400, speed: 12, fireRate: 1000, sprite: 'DRAGON', color: '#FF4500', homing: true, splash: 150 },
        { id: 'sword', name: '太虚剑阵', damage: 180, speed: 20, fireRate: 150, sprite: 'SWORD', color: '#FFD700', homing: true, pierce: true },
        { id: 'zhentianlei', name: '万人敌(震天雷)', damage: 5000, speed: 5, fireRate: 2500, sprite: 'BOMB_WEAPON', color: '#FF0000', splash: 600 }
    ],

    UPGRADES: [
        { name: '神兵锻造', cost: 80, costMult: 2.0, type: 'weapon' },
        { name: '轻功神行', cost: 50, fireRateMult: 0.85, costMult: 1.5, type: 'speed' },
        { name: '万箭齐发', cost: 150, arrows: 1, costMult: 2.0, type: 'arrows' }
    ],
    
    ENEMY_TYPES: {
        INFANTRY: { id: 'infantry', name: '黄巾军', hp: 30, speed: 1.0, reward: 10, color: '#FFD700', size: 15 },
        CAVALRY: { id: 'cavalry', name: '西凉铁骑', hp: 80, speed: 1.8, reward: 25, color: '#8B4513', size: 20 },
        HEAVY: { id: 'heavy', name: '铁浮屠', hp: 250, speed: 0.4, reward: 50, color: '#808080', size: 25 },
        BOSS_LUBU: { id: 'boss_lubu', name: '无双吕布(飞将)', hp: 1500, speed: 0.4, reward: 500, color: '#FF0000', size: 40, jumpInterval: 1500, jumpRange: 2 },
        BOSS_ZHANGJIAO: { id: 'boss_zhangjiao', name: '天公张角(妖术)', hp: 2000, speed: 0.3, reward: 800, color: '#FFD700', size: 45, jumpInterval: 800, jumpRange: 1 },
        BOSS_DONGZHUO: { id: 'boss_dongzhuo', name: '魔王董卓(肉山)', hp: 3000, speed: 0.2, reward: 1000, color: '#8A2BE2', size: 50, jumpInterval: 3000, jumpRange: 3 },
        FINAL_BOSS: { id: 'final_boss', name: '修罗·鬼神吕布(终极魔神)', hp: 150000, speed: 0.15, reward: 99999, color: '#8B0000', size: 120, jumpInterval: 2500, jumpRange: 5 }
    },

    ITEMS: {
        BOMB: { id: 'bomb', color: '#FF4500', size: 15, text: '🔥', name: '业火红莲(全屏轰炸)' },
        FREEZE: { id: 'freeze', color: '#00FFFF', size: 15, text: '📜', name: '奇门遁甲(全员罚站)' },
        HEAL: { id: 'heal', color: '#32CD32', size: 15, text: '🥟', name: '军粮包子(回血+钱)' },
        RAPID: { id: 'rapid', color: '#FF00FF', size: 15, text: '🥁', name: '击鼓进军(攻速拉满)' },
        KNOCKBACK: { id: 'knockback', color: '#FFFFFF', size: 15, text: '🦁', name: '张飞怒吼(全员击退)' },
        RICH: { id: 'rich', color: '#FFD700', size: 15, text: '💰', name: '劫取辎重(+500G)' },
        MULTISHOT: { id: 'multishot', color: '#00FF00', size: 15, text: '🏹', name: '草船借箭(弓弩暴走)' },
        POISON: { id: 'poison', color: '#8B0000', size: 15, text: '🍷', name: '鸩酒(扣除200G)' },
        SLOW: { id: 'slow', color: '#808080', size: 15, text: '🐢', name: '深陷泥沼(攻速骤降)' },
        DISARM: { id: 'disarm', color: '#000000', size: 15, text: '💨', name: '妖风大作(缴械三秒)' },
        EMPTY_CITY: { id: 'empty_city', color: '#DAA520', size: 15, text: '🪕', name: '空城计(全体退退退)' },
        REVERSE: { id: 'reverse', color: '#8A2BE2', size: 15, text: '🎭', name: '反间计(敌军倒戈)' },
        GIANT: { id: 'giant', color: '#FF4500', size: 15, text: '👹', name: '武神附体(巨型投射物)' },
        GAMBLE: { id: 'gamble', color: '#FFD700', size: 15, text: '🏮', name: '七星灯(非神即鬼)' },
        BLIND: { id: 'blind', color: '#2F4F4F', size: 15, text: '🌫️', name: '大雾漫江(视野受阻)' }
    }
};
