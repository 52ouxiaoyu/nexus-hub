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
        
        let coneChance = 0;
        let bucketChance = 0;
        let footballChance = 0;
        
        if (this.timeElapsed > 60) {
            coneChance = Math.min(0.4, (this.timeElapsed - 60) / 300); 
        }
        if (this.timeElapsed > 180) {
            bucketChance = Math.min(0.3, (this.timeElapsed - 180) / 400);
        }
        if (this.timeElapsed > 300) {
            footballChance = Math.min(0.2, (this.timeElapsed - 300) / 500);
        }
        
        const r = Math.random();
        let type = 'normal';
        if (r < footballChance) type = 'football';
        else if (r < footballChance + bucketChance) type = 'buckethead';
        else if (r < footballChance + bucketChance + coneChance) type = 'conehead';
        
        this.game.entities.push(new Zombie(this.game, row, type));
    }
}
