
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
