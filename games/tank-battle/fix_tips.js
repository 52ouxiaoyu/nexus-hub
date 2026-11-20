const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

code = code.replace(/直接升至满级30级/g, "直接升至满级4级（紫色追踪）");
code = code.replace(/if \(killer\.killStreak === 3\) this\.game\.showTip\('💡 TIP: 连续击杀不仅能获得分数，连击10次还可以直升1级并获得天赋！', 400\);/g, 
    "if (killer.killStreak === 5) this.game.showTip('💡 TIP: 连续击杀不仅能获得分数，连击10次还可以直升1级并获得天赋！', 400);");

fs.writeFileSync('game.js', code);
