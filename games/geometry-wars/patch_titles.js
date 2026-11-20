const fs = require('fs');

// Fix index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<span class="player-title">P1 - 核心战机</span>', '<span class="player-title">Player 1</span>');
html = html.replace('<span class="player-title">P2 - 护卫僚机</span>', '<span class="player-title">Player 2</span>');
fs.writeFileSync('index.html', html);

// Fix game.js MVP display
let js = fs.readFileSync('game.js', 'utf8');

let oldMvp = `function updateMVPDisplay() {
    let mvpDisplay = document.getElementById('mvp-display');
    if(!mvpDisplay) return;
    let p1 = players[0];
    let p2 = players[1];
    if(p1.score > p2.score) {
        mvpDisplay.innerHTML = \`🏆 MVP: P1 核心战机<br><span style="font-size: 16px; color: #aaa">得分领先 \${p1.score - p2.score} 分</span>\`;
    } else if(p2.score > p1.score) {
        mvpDisplay.innerHTML = \`🏆 MVP: P2 护卫僚机<br><span style="font-size: 16px; color: #aaa">得分领先 \${p2.score - p1.score} 分</span>\`;
    } else {
        mvpDisplay.innerHTML = \`🤝 势均力敌 (平局)<br><span style="font-size: 16px; color: #aaa">并肩作战的最佳拍档</span>\`;
    }
}`;

let newMvp = `function updateMVPDisplay() {
    let mvpDisplay = document.getElementById('mvp-display');
    if(!mvpDisplay) return;
    let p1 = players[0];
    let p2 = players[1];
    
    if(p1.score === p2.score) {
        mvpDisplay.innerHTML = \`🤝 势均力敌 (平局)<br><span style="font-size: 16px; color: #aaa">你们是并肩作战的最佳拍档！</span>\`;
        return;
    }

    let winner = p1.score > p2.score ? p1 : p2;
    let loser = p1.score > p2.score ? p2 : p1;
    let winnerName = p1.score > p2.score ? "Player 1" : "Player 2";
    let loserName = p1.score > p2.score ? "Player 2" : "Player 1";
    let diff = winner.score - loser.score;
    
    let winnerTitle = "";
    let loserTitle = "";
    
    if (diff > 50000) {
        winnerTitle = "✨ 银河孤星 (降维打击) ✨";
        loserTitle = "🛡️ 最佳挂件 (负责喊666)";
    } else if (diff > 20000) {
        winnerTitle = "⚔️ 战场主宰 (疯狂收割)";
        loserTitle = "🤝 护卫僚机 (边缘OB)";
    } else if (diff > 5000) {
        winnerTitle = "🏆 核心先锋 (略胜一筹)";
        loserTitle = "🛡️ 坚韧后卫 (不可或缺)";
    } else {
        winnerTitle = "🌟 绝代双骄";
        loserTitle = "🌟 绝代双骄";
    }

    mvpDisplay.innerHTML = \`
        <div style="margin-bottom: 10px;">🏆 MVP: \${winnerName} [\${winnerTitle}] <br><span style="font-size: 16px; color: #00ff00;">(领先 \${diff} 分)</span></div>
        <div style="font-size: 18px; color: #aaa;">🏅 队伍中坚: \${loserName} [\${loserTitle}]</div>
    \`;
}`;

if (js.includes(oldMvp)) {
    js = js.replace(oldMvp, newMvp);
    console.log("Patched MVP logic");
} else {
    console.log("MVP logic not found!");
}
fs.writeFileSync('game.js', js);
