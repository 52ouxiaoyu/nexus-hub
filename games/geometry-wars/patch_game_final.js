const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. Insert replayHelpers globally
let replayHelpers = `
// Death Replay Globals
let mediaRecorder = null;
let recordedChunks = [];
let replayVideoUrl = null;

function startRecording() {
    try {
        let stream = canvas.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recordedChunks = [];
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
                if (recordedChunks.length > 60) recordedChunks.shift(); // Keep last 6 seconds
            }
        };
        mediaRecorder.start(100);
    } catch(e) { console.warn("MediaRecorder not supported", e); }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        setTimeout(() => {
            let blob = new Blob(recordedChunks, { type: 'video/webm' });
            replayVideoUrl = URL.createObjectURL(blob);
            let videoContainer = document.getElementById('replay-container');
            if (!videoContainer) {
                videoContainer = document.createElement('div');
                videoContainer.id = 'replay-container';
                videoContainer.style.marginTop = '20px';
                videoContainer.innerHTML = \`
                    <h3 style="color:#ff5555; text-shadow: 0 0 5px red;">💀 死亡回放 (Death Replay - Last 5s)</h3>
                    <video id="replay-video" width="600" controls autoplay loop style="border: 2px solid red; border-radius: 10px;"></video>
                \`;
                let goScreen = document.getElementById('game-over');
                goScreen.insertBefore(videoContainer, goScreen.firstChild);
            }
            if (replayVideoUrl) {
                document.getElementById('replay-video').src = replayVideoUrl;
            }
        }, 200);
    }
}
`;

if (!code.includes('function startRecording()')) {
    code = code.replace('const ctx = canvas.getContext(\'2d\');', 'const ctx = canvas.getContext(\'2d\');\n' + replayHelpers);
}

// 2. Add shapeSides to Zombie constructor
let zConstStr = `        this.tier = 1;
        this.type = 'normal'; // normal, fast, tank
        let rand = Math.random();`;
let zConstNew = `        this.tier = 1;
        this.type = 'normal'; // normal, fast, tank
        this.shapeSides = Math.floor(Math.random() * 5) + 3; // 3 to 7 sides
        let rand = Math.random();`;
if(code.includes(zConstStr)) {
    code = code.replace(zConstStr, zConstNew);
} else {
    console.log("Could not find zombie constructor block");
}

// 3. Replace Zombie manual draw with regular polygons
let zDrawOld = `            if (this.type === 'fast') {
                // Sleek Triangle pointing forward
                ctx.moveTo(s, 0);
                ctx.lineTo(-s, s * 0.8);
                ctx.lineTo(-s, -s * 0.8);
                ctx.closePath();
            } else if (this.type === 'tank') {
                // Hexagon
                for (let i = 0; i < 6; i++) {
                    let angle = (i * Math.PI) / 3;
                    if (i === 0) ctx.moveTo(Math.cos(angle) * s * 1.2, Math.sin(angle) * s * 1.2);
                    else ctx.lineTo(Math.cos(angle) * s * 1.2, Math.sin(angle) * s * 1.2);
                }
                ctx.closePath();
            } else {
                // Square
                ctx.rect(-s, -s, s * 2, s * 2);
            }
            ctx.fill();
            ctx.stroke();`;
let zDrawNew = `            let sides = this.shapeSides || 3;
            for (let i = 0; i < sides; i++) {
                let angle = (i * Math.PI * 2) / sides;
                if (sides === 4) angle += Math.PI / 4; 
                let px = Math.cos(angle) * s * 1.2;
                let py = Math.sin(angle) * s * 1.2;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();`;
if(code.includes(zDrawOld)) {
    code = code.replace(zDrawOld, zDrawNew);
} else {
    console.log("Could not find zombie draw block");
}

fs.writeFileSync('game.js', code);
console.log("Patch applied!");
