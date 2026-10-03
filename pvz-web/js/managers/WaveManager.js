class WaveManager {
    constructor(game) {
        this.game = game;
        this.timeElapsed = 0;
        this.nextSpawnTime = 25; // First zombie in 25 seconds
        this.spawnInterval = 20; // 20 seconds before the second zombie
        this.waveCount = 0;
    }

    // v3.11.1：经典/融合「再玩一局」原地重开时，把刷怪节奏恢复到开局状态
    // （此前 spawnInterval 只减不增、timeElapsed 累计，重开后高级僵尸立刻出现）
    reset() {
        this.timeElapsed = 0;
        this.nextSpawnTime = 25; // First zombie in 25 seconds
        this.spawnInterval = 20; // 20 seconds before the second zombie
        this.waveCount = 0;
    }

    update(deltaTime) {
        if (this.game.vaseMode) return; // 砸罐子模式：所有僵尸来自罐子，waveManager 不刷怪
        if (this.game.zombieMode) return; // 我是僵尸模式：僵尸全部由玩家购买释放，waveManager 不刷怪
        if (this.game.vsMode) return; // v3.81.0 双人对战：僵尸全部由僵尸方玩家购买释放，不自然刷怪
        this.timeElapsed += deltaTime;

        if (this.timeElapsed >= this.nextSpawnTime) {
            if (this.game.fusionMode) {
                // —— v3.58.0 融合进化难度×2（用户爸爸指定）——
                // ①间隔衰减加倍：每次 -1.0（原 -0.5），下限 5s→2.5s——前中期刷怪速率约翻倍；
                // ②后期（≥420s，7 分钟）改「尸潮制」：一次上一波 18~24 只（"上一次大概上 20 多个"），
                //   波与波之间用间隔下限 10s 拉开，真的"一波一波上、一批一批上"。前期节奏不变软。
                this.spawnInterval = Math.max(2.5, this.spawnInterval - 1.0);
                if (this.timeElapsed >= 420) {
                    const count = 18 + Math.floor(Math.random() * 7); // 18~24 只
                    for (let i = 0; i < count; i++) this.spawnZombie();
                    this._showHugeWaveNote(count);
                    this.waveCount++;
                    this.nextSpawnTime = this.timeElapsed + Math.max(10, this.spawnInterval);
                    return;
                }
            } else {
                this.spawnInterval = Math.max(5, this.spawnInterval - 0.5); // Gradually speeds up, minimum 5 seconds
            }
            this.spawnZombie();
            this.waveCount++;
            this.nextSpawnTime = this.timeElapsed + this.spawnInterval;
        }
    }

    // v3.58.0 尸潮预警横幅（复刻原版"一大波僵尸正在接近！"的红色大字）
    _showHugeWaveNote(count) {
        try {
            const note = document.createElement('div');
            note.textContent = '一大波僵尸正在接近！（' + count + ' 只）';
            note.style.cssText = 'position:absolute;left:50%;top:18%;transform:translateX(-50%);' +
                'z-index:5000;pointer-events:none;white-space:nowrap;' +
                'font:bold 34px/1.4 "Hiragino Sans GB",sans-serif;color:#c62828;' +
                'text-shadow:0 2px 6px rgba(0,0,0,.55), 0 0 2px #fff;';
            this.game.container.appendChild(note);
            setTimeout(() => note.remove(), 3000);
        } catch (e) { /* 横幅失败不影响刷怪 */ }
    }
    
    spawnZombie() {
        const row = Math.floor(Math.random() * this.game.board.rows);
        
        let coneChance = 0, bucketChance = 0, footballChance = 0;
        let poleChance = 0, newsChance = 0, screenChance = 0;
        let danceChance = 0, jackChance = 0, zomboniChance = 0, impChance = 0;
        let pogoChance = 0, ladderChance = 0, gargantuarChance = 0;
        let bossChance = 0, plantheadChance = 0, jalapenoheadChance = 0;
        
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
        // v3.80.0：Boss 极后期才解锁（900s，比巨人晚一半场），概率上限 0.05→0.02、爬坡更慢——
        // （用户：boss 出现频率低一点，只有后期才能出现）
        if (this.timeElapsed > 900) bossChance = Math.min(0.02, (this.timeElapsed - 900) / 1500);
        
        // 植物头僵尸（peahead/nuthead/sunhead/snowpeahead）：
        // 头顶基础植物的"僵尸改造体"。
        // v3.50.0（用户：难度适中的融合植物僵尸加入经典模式）：
        //   融合进化 —— 75s 解锁，概率上限 0.24（原样）；
        //   经典冒险 —— 150s 解锁，概率上限压到 0.10（融合模式的四成出头，难度适中）。
        if (this.game.fusionMode && this.timeElapsed > 75) {
            plantheadChance = Math.min(0.24, (this.timeElapsed - 75) / 280);
        } else if (!this.game.fusionMode && this.timeElapsed > 150) {
            plantheadChance = Math.min(0.10, (this.timeElapsed - 150) / 600);
        }

        // v3.22.0 火爆辣椒植物僵尸（融合进化专属）：后期出场，与冰车同期解锁（540s），
        // 概率上限压低（0.06）——整排引爆威力太大，只做偶发威胁
        if (this.game.fusionMode && this.timeElapsed > 540) {
            jalapenoheadChance = Math.min(0.06, (this.timeElapsed - 540) / 600);
        }
        
        const r = Math.random();
        let type = 'normal';
        let acc = 0;
        
        if (r < (acc += plantheadChance)) {
            const pr = Math.random();
            if (pr < 0.35) type = 'peahead';      // 豌豆头
            else if (pr < 0.6) type = 'nuthead';  // 坚果头
            else if (pr < 0.82) type = 'sunhead'; // 向日葵头
            else type = 'snowpeahead';            // 寒冰头
        }
        else if (r < (acc += bossChance)) type = 'lgboss';
        else if (r < (acc += gargantuarChance)) type = 'gargantuar';
        else if (r < (acc += jalapenoheadChance)) type = 'jalapenohead'; // v3.22.0
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
