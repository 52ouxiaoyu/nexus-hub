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
        
        // As time passes, higher chance of conehead, but NO coneheads before 90 seconds!
        let coneChance = 0;
        if (this.timeElapsed > 90) {
            coneChance = Math.min(0.4, (this.timeElapsed - 90) / 400); 
        }
        
        const type = Math.random() < coneChance ? 'conehead' : 'normal';
        
        this.game.entities.push(new Zombie(this.game, row, type));
    }
}
