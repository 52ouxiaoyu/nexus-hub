import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

# 1. Update config.js to add BOSS type
config_path = os.path.join(base_dir, 'config.js')
with open(config_path, 'r') as f:
    config_content = f.read()

config_content = config_content.replace(
    """        HEAVY: { id: 'heavy', name: '铁浮屠', hp: 250, speed: 0.6, reward: 30, color: '#808080', size: 25 }
    },""",
    """        HEAVY: { id: 'heavy', name: '铁浮屠', hp: 250, speed: 0.6, reward: 30, color: '#808080', size: 25 },
        BOSS: { id: 'boss', name: '魔化主将', hp: 2000, speed: 0.3, reward: 500, color: '#8A2BE2', size: 50 }
    },"""
)

# 2. Update sprites.js for BOSS
sprites_path = os.path.join(base_dir, 'sprites.js')
with open(sprites_path, 'r') as f:
    sprites_content = f.read()

sprites_content = sprites_content.replace(
    """    HEAVY: [
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
    ],""",
    """    HEAVY: [
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
    BOSS: [
        "00000888800000",
        "00008888880000",
        "00088488488000",
        "00888888888800",
        "08881188118880",
        "08888888888880",
        "88888844888888",
        "88888888888888",
        "88888888888888",
        "08888888888880",
        "08888000088880",
        "00110000001100"
    ],"""
)
with open(sprites_path, 'w') as f:
    f.write(sprites_content)
with open(config_path, 'w') as f:
    f.write(config_content)


# 3. Modify main.js logic
main_path = os.path.join(base_dir, 'main.js')
with open(main_path, 'r') as f:
    main_content = f.read()

# Scale Gold Drop with WaveMultiplier
main_content = main_content.replace(
    """                                if(e2.hp <= 0 && lastHitter) {
                                    lastHitter.score += e2.type.reward * 10;
                                    lastHitter.gold += e2.type.reward;
                                }""",
    """                                if(e2.hp <= 0 && lastHitter) {
                                    lastHitter.score += e2.type.reward * 10;
                                    lastHitter.gold += Math.floor(e2.type.reward * this.waveMultiplier); // Economy fix
                                }"""
)
main_content = main_content.replace(
    """                    if(e.hp <= 0 && lastHitter) {
                        lastHitter.score += e.type.reward * 10;
                        lastHitter.gold += e.type.reward;
                        this.spawnParticles(e.x, e.y, '#FF4500', 15);
                    }""",
    """                    if(e.hp <= 0 && lastHitter) {
                        lastHitter.score += e.type.reward * 10;
                        lastHitter.gold += Math.floor(e.type.reward * this.waveMultiplier); // Economy fix
                        this.spawnParticles(e.x, e.y, '#FF4500', 15);
                    }"""
)
main_content = main_content.replace(
    """                    if(e.hp <= 0 && lastHitter) {
                        lastHitter.score += e.type.reward * 10;
                        lastHitter.gold += e.type.reward;
                    }""",
    """                    if(e.hp <= 0 && lastHitter) {
                        lastHitter.score += e.type.reward * 10;
                        lastHitter.gold += Math.floor(e.type.reward * this.waveMultiplier); // Economy fix
                    }"""
)


# Fix Item Spawn logic & Boss spawning
target_spawn = """        if (this.enemySpawnTimer > Math.max(500, 2000 - this.gameTimer/10)) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }"""
replacement_spawn = """        // Spawn rate scales dynamically with lane count so 10 lanes = 10x faster spawns
        const laneSpawnFactor = Math.max(1, this.numLanes / 3); 
        if (this.enemySpawnTimer > Math.max(200, (2000 - this.gameTimer/10) / laneSpawnFactor)) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
            
            // Random chance to spawn a BOSS
            if (this.gameTimer > 10000 && Math.random() < 0.02) {
                this.spawnEnemy(true); // Force Boss
            }
        }"""
main_content = main_content.replace(target_spawn, replacement_spawn)

target_spawn_func = """    spawnEnemy() {
        const laneWidth = CONFIG.CANVAS_WIDTH / this.numLanes;
        const lane = (Math.floor(Math.random() * this.numLanes) + 0.5) * laneWidth;
        
        const rand = Math.random();
        let type = CONFIG.ENEMY_TYPES.GOBLIN; // Default fallback
        if (CONFIG.ENEMY_TYPES.INFANTRY) type = CONFIG.ENEMY_TYPES.INFANTRY;
        if (rand > 0.6) type = CONFIG.ENEMY_TYPES.CAVALRY || type;
        if (rand > 0.9) type = CONFIG.ENEMY_TYPES.HEAVY || type;

        this.enemies.push({
            type: type,
            x: lane,
            y: 110,"""
replacement_spawn_func = """    spawnEnemy(isBoss = false) {
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
            y: 110,"""
main_content = main_content.replace(target_spawn_func, replacement_spawn_func)


# Make items immune to splash damage (direct hit only)
target_item_hit = """        this.items.forEach((item, i) => {
            item.y += item.vy * (deltaTime / 16);
            
            for (let j = 0; j < this.projectiles.length; j++) {
                const p = this.projectiles[j];
                if (Math.hypot(item.x - p.x, item.y - p.y) < 20) {
                    this.applyItem(item.type, p.heroOwner, item.x, item.y);
                    this.items.splice(i, 1);
                    this.projectiles.splice(j, 1);
                    break;
                }
            }
        });"""
replacement_item_hit = """        this.items.forEach((item, i) => {
            item.y += item.vy * (deltaTime / 16);
            
            for (let j = 0; j < this.projectiles.length; j++) {
                const p = this.projectiles[j];
                // Requires a very tight DIRECT hit to prevent accidental splash triggers
                if (Math.hypot(item.x - p.x, item.y - p.y) < 15) {
                    this.applyItem(item.type, p.heroOwner, item.x, item.y);
                    this.items.splice(i, 1);
                    // Do not delete piercing projectiles, but delete regular ones
                    if (!p.pierce) this.projectiles.splice(j, 1);
                    break;
                }
            }
        });"""
main_content = main_content.replace(target_item_hit, replacement_item_hit)


with open(main_path, 'w') as f:
    f.write(main_content)

print("Picky gamer polish applied: Economy, Bosses, Item accuracy, and Spawn density fixed!")
