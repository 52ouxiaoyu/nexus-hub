class WaveManager {
    constructor(game) {
        this.game = game;
        this.timeElapsed = 0;
        this.nextSpawnTime = 25; // First zombie in 25 seconds
        this.spawnInterval = 20; // 20 seconds before the second zombie
        this.waveCount = 0;
    }
    
    update(deltaTime) {
        this.timeElapsed += deltaTime;
        
        if (this.timeElapsed >= this.nextSpawnTime) {
            this.spawnZombie();
            
            this.spawnInterval = Math.max(5, this.spawnInterval - 0.5); // Gradually speeds up, minimum 5 seconds
            this.nextSpawnTime = this.timeElapsed + this.spawnInterval;
        }
    }
    
    spawnZombie() {
        const row = Math.floor(Math.random() * this.game.board.rows);
        
        let coneChance = 0, bucketChance = 0, footballChance = 0;
        let poleChance = 0, newsChance = 0, screenChance = 0;
        let danceChance = 0, jackChance = 0, zomboniChance = 0, impChance = 0;
        let pogoChance = 0, ladderChance = 0, gargantuarChance = 0;
        let bossChance = 0;
        
        if (this.timeElapsed > 60) coneChance = Math.min(0.2, (this.timeElapsed - 60) / 300); 
        if (this.timeElapsed > 120) poleChance = Math.min(0.15, (this.timeElapsed - 120) / 400);
        if (this.timeElapsed > 180) bucketChance = Math.min(0.15, (this.timeElapsed - 180) / 400);
        if (this.timeElapsed > 240) newsChance = Math.min(0.15, (this.timeElapsed - 240) / 400);
        if (this.timeElapsed > 300) screenChance = Math.min(0.15, (this.timeElapsed - 300) / 400);
        if (this.timeElapsed > 360) footballChance = Math.min(0.1, (this.timeElapsed - 360) / 500);
        if (this.timeElapsed > 420) danceChance = Math.min(0.1, (this.timeElapsed - 420) / 500);
        if (this.timeElapsed > 480) jackChance = Math.min(0.1, (this.timeElapsed - 480) / 500);
        if (this.timeElapsed > 540) zomboniChance = Math.min(0.05, (this.timeElapsed - 540) / 600);
        if (this.timeElapsed > 540) pogoChance = Math.min(0.1, (this.timeElapsed - 540) / 500);
        if (this.timeElapsed > 540) ladderChance = Math.min(0.1, (this.timeElapsed - 540) / 500);
        if (this.timeElapsed > 600) impChance = Math.min(0.1, (this.timeElapsed - 600) / 500);
        if (this.timeElapsed > 600) gargantuarChance = Math.min(0.05, (this.timeElapsed - 600) / 800);
        if (this.timeElapsed > 600) bossChance = Math.min(0.05, (this.timeElapsed - 600) / 1000); // Rare boss spawn
        
        const r = Math.random();
        let type = 'normal';
        let acc = 0;
        
        if (r < (acc += bossChance)) type = 'lgboss';
        else if (r < (acc += gargantuarChance)) type = 'gargantuar';
        else if (r < (acc += zomboniChance)) type = 'zomboni';
        else if (r < (acc += pogoChance)) type = 'pogo';
        else if (r < (acc += ladderChance)) type = 'ladder';
        else if (r < (acc += footballChance)) type = 'football';
        else if (r < (acc += danceChance)) type = 'dancing';
        else if (r < (acc += jackChance)) type = 'jackinthebox';
        else if (r < (acc += screenChance)) type = 'screendoor';
        else if (r < (acc += bucketChance)) type = 'buckethead';
        else if (r < (acc += poleChance)) type = 'polevaulting';
        else if (r < (acc += newsChance)) type = 'newspaper';
        else if (r < (acc += impChance)) type = 'imp';
        else if (r < (acc += coneChance)) type = 'conehead';
        
        this.game.entities.push(new Zombie(this.game, row, type));
    }
}
