import os

base_dir = "/Users/clawbox/game-portal/kingdom-rush/js"

audio_js = """
const Audio = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    },
    
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone(freq, type, duration, vol=0.1, freqEnd=null) {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            if (freqEnd) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), this.ctx.currentTime + duration);
            }
            
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },

    playShoot() {
        this.playTone(600, 'triangle', 0.1, 0.05, 200);
    },
    
    playHit() {
        this.playTone(150, 'square', 0.1, 0.05, 50);
    },

    playExplosion() {
        this.playTone(100, 'square', 0.4, 0.3, 10);
        setTimeout(() => this.playTone(80, 'sawtooth', 0.5, 0.2, 5), 100);
    },

    playGoodItem() {
        if (!this.ctx) return;
        this.playTone(400, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.2, 0.1), 200);
    },

    playBadItem() {
        if (!this.ctx) return;
        this.playTone(300, 'sawtooth', 0.2, 0.1, 200);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.3, 0.1, 100), 200);
    },

    playGameOver() {
        this.playTone(300, 'sawtooth', 0.5, 0.2, 50);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.2, 50), 500);
        setTimeout(() => this.playTone(100, 'sawtooth', 1.0, 0.2, 20), 1000);
    }
};
"""

with open(os.path.join(base_dir, 'audio.js'), 'w') as f:
    f.write(audio_js)

main_js_path = os.path.join(base_dir, 'main.js')
with open(main_js_path, 'r') as f:
    main_js_content = f.read()

# Add init/resume to handleClick
main_js_content = main_js_content.replace(
    """    handleClick(pos) {
        const cx = CONFIG.CANVAS_WIDTH / 2;""",
    """    handleClick(pos) {
        Audio.init();
        Audio.resume();
        const cx = CONFIG.CANVAS_WIDTH / 2;"""
)

# Add playHit to enemy projectile hit
main_js_content = main_js_content.replace(
    """                    e.hitTimer = 100;
                    lastHitter = p.heroOwner;
                    this.spawnParticles(p.x, p.y, p.color, 3);
                    this.spawnFloatingText(`-${p.damage}`, e.x, e.y - e.type.size, '#FF6347', 14);
                    this.projectiles.splice(j, 1);
                    hit = true;""",
    """                    e.hitTimer = 100;
                    lastHitter = p.heroOwner;
                    this.spawnParticles(p.x, p.y, p.color, 3);
                    this.spawnFloatingText(`-${p.damage}`, e.x, e.y - e.type.size, '#FF6347', 14);
                    this.projectiles.splice(j, 1);
                    Audio.playHit();
                    hit = true;"""
)

# Add playHit to castle damage
main_js_content = main_js_content.replace(
    """                this.triggerShake(10, 300);
                this.spawnParticles(e.x, e.y, '#FF0000', 20);
                this.enemies.splice(i, 1);""",
    """                this.triggerShake(10, 300);
                this.spawnParticles(e.x, e.y, '#FF0000', 20);
                Audio.playHit();
                this.enemies.splice(i, 1);"""
)

# Add audio to applyItem
target_applyItem = """    applyItem(itemType, heroOwner, x, y) {
        this.spawnFloatingText(itemType.name, x, y, itemType.color, 18);
        
        switch(itemType.id) {
            case 'bomb':
                this.triggerShake(20, 500);"""

replacement_applyItem = """    applyItem(itemType, heroOwner, x, y) {
        this.spawnFloatingText(itemType.name, x, y, itemType.color, 18);
        
        if (['bomb', 'freeze', 'heal', 'rapid', 'knockback', 'rich', 'multishot'].includes(itemType.id)) {
            if (itemType.id === 'bomb') Audio.playExplosion();
            else Audio.playGoodItem();
        } else {
            Audio.playBadItem();
        }

        switch(itemType.id) {
            case 'bomb':
                this.triggerShake(20, 500);"""
                
main_js_content = main_js_content.replace(target_applyItem, replacement_applyItem)

with open(main_js_path, 'w') as f:
    f.write(main_js_content)

print("Retro Audio API added and integrated!")
