class WaveManager {
    constructor(mapData) {
        this.mapData = mapData;
        this.currentWave = 0;
        this.totalWaves = mapData.waves;
        this.enemies = [];
        this.waveActive = false;
        this.waveComplete = false;
        this.allWavesComplete = false;
        
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawnInterval = 800;
    }
    
    startWave() {
        if (this.waveActive || this.currentWave >= this.totalWaves) return;
        
        this.currentWave++;
        this.waveActive = true;
        this.waveComplete = false;
        this.spawnQueue = this.generateWave(this.currentWave);
        this.spawnTimer = 0;
    }
    
    generateWave(waveNumber) {
        const queue = [];
        const multiplier = 1 + (waveNumber - 1) * 0.15;
        
        const baseCount = 5 + waveNumber * 2;
        
        const types = Object.keys(CONFIG.ENEMY_TYPES);
        
        for (let i = 0; i < baseCount; i++) {
            let type;
            const rand = Math.random();
            
            if (waveNumber <= 3) {
                type = rand < 0.7 ? 'GOBLIN' : 'ORC';
            } else if (waveNumber <= 6) {
                if (rand < 0.4) type = 'GOBLIN';
                else if (rand < 0.7) type = 'ORC';
                else if (rand < 0.9) type = 'TROLL';
                else type = 'KNIGHT';
            } else {
                if (rand < 0.2) type = 'GOBLIN';
                else if (rand < 0.4) type = 'ORC';
                else if (rand < 0.6) type = 'TROLL';
                else if (rand < 0.8) type = 'KNIGHT';
                else type = 'DRAGON';
            }
            
            queue.push({ type, multiplier });
        }
        
        if (waveNumber % 5 === 0) {
            for (let i = 0; i < 3; i++) {
                queue.push({ type: 'DRAGON', multiplier: multiplier * 1.2 });
            }
        }
        
        return queue;
    }
    
    update(currentTime, deltaTime) {
        if (!this.waveActive) return;
        
        this.spawnTimer += deltaTime;
        
        if (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            const spawnData = this.spawnQueue.shift();
            const enemy = new Enemy(spawnData.type, Utils.getPathPixels(this.mapData.path), spawnData.multiplier);
            this.enemies.push(enemy);
        }
        
        for (const enemy of this.enemies) {
            enemy.update(currentTime);
        }
        
        this.enemies = this.enemies.filter(e => e.alive || e.reachedEnd);
        
        if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
            this.waveActive = false;
            this.waveComplete = true;
            
            if (this.currentWave >= this.totalWaves) {
                this.allWavesComplete = true;
            }
        }
    }
    
    getAliveEnemies() {
        return this.enemies.filter(e => e.alive);
    }
    
    getEndEnemies() {
        return this.enemies.filter(e => e.reachedEnd);
    }
    
    render(ctx) {
        for (const enemy of this.enemies) {
            enemy.render(ctx);
        }
    }
}
