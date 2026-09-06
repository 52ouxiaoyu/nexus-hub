// 坦克大战 大招系统 (Ultimates System)

const ULTIMATES_POOL = [];

// Helper functions for ultimates
function spawnMeteors(game, count, damage, player) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const rx = Math.random() * (game.canvas.width - 64);
            const ry = Math.random() * (game.canvas.height - 64);
            game.effects.push(new Effect(rx + 32, ry + 32, 'EXPLOSION', 4));
            if(window.audio) window.audio.play('explosion');
            game.shakeScreen(15);
            game.enemies.forEach(e => {
                if (Math.hypot(e.x - rx, e.y - ry) < 150) {
                    e.destroy(player, damage);
                }
            });
        }, i * 300);
    }
}

function radialExplosion(game, player, bullets, type, level) {
    for (let i = 0; i < bullets; i++) {
        let angle = (i / bullets) * Math.PI * 2;
        let b = new Bullet(game, player, player.x + player.width/2, player.y + player.height/2, 'UP', level, type);
        b.vx = Math.cos(angle) * 12;
        b.vy = Math.sin(angle) * 12;
        game.bullets.push(b);
    }
}

// ========================
// 1. 毁天灭地类 (God Tier)
// ========================
ULTIMATES_POOL.push({
    name: "天降陨石群",
    desc: "全图随机降下15颗高伤害陨石",
    cd: 1200,
    effect: (p, g) => {
        g.showAnnouncement('🔥 天降陨石群！', '#ff0');
        spawnMeteors(g, 15, 20, p);
    }
});
ULTIMATES_POOL.push({
    name: "地毯式轰炸",
    desc: "呼叫空中支援，从天而降的毁灭打击",
    cd: 1500,
    effect: (p, g) => {
        g.showAnnouncement('✈️ 呼叫空中支援，地毯式轰炸！', '#f50');
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const rx = Math.random() * g.canvas.width;
                const ry = (i / 20) * g.canvas.height;
                g.effects.push(new Effect(rx, ry, 'EXPLOSION', 5));
                if(window.audio) window.audio.play('explosion');
                g.shakeScreen(20);
                g.enemies.forEach(e => {
                    if (Math.hypot(e.x - rx, e.y - ry) < 180) e.destroy(p, 50);
                });
            }, i * 150);
        }
    }
});
ULTIMATES_POOL.push({
    name: "电磁风暴",
    desc: "召唤强力闪电，持续劈向随机敌人",
    cd: 1200,
    effect: (p, g) => {
        g.showAnnouncement('⚡ 电磁风暴降临！', '#0ff');
        let strikes = 0;
        let interval = setInterval(() => {
            if (g.gameState !== 'PLAYING') return clearInterval(interval);
            let aliveEnemies = g.enemies.filter(e => e.alive);
            if (aliveEnemies.length > 0) {
                let target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                g.effects.push(new Effect(target.x + 32, target.y + 32, 'EXPLOSION', 3));
                if(window.audio) window.audio.play('explosion');
                target.destroy(p, 15);
                
                // Draw a fake lightning bolt next frame
                let ctx = g.ctx;
                if(ctx) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(target.x + 32, 0);
                    ctx.lineTo(target.x + 32, target.y + 32);
                    ctx.strokeStyle = '#0ff'; ctx.lineWidth = 4; ctx.stroke();
                    ctx.restore();
                }
            }
            strikes++;
            if (strikes >= 15) clearInterval(interval);
        }, 300);
    }
});
ULTIMATES_POOL.push({
    name: "点石成金",
    desc: "将场上所有普通敌人转化为星星道具！",
    cd: 2000,
    effect: (p, g) => {
        g.showAnnouncement('🌟 点石成金！天降财富！', '#ff0');
        g.enemies.forEach(e => {
            if (!e.isBoss) {
                g.powerUps.push(new PowerUp(g, e.x, e.y, POWERUP_TYPES.STAR));
                e.alive = false; // instantly remove without triggering normal drops
                g.enemiesRemaining--;
            } else {
                e.destroy(p, 20); // Just damage the boss
            }
        });
        if(window.audio) window.audio.play('powerup');
    }
});
ULTIMATES_POOL.push({
    name: "绝对零度",
    desc: "时间停止，冻结所有敌人10秒",
    cd: 1500,
    effect: (p, g) => {
        g.showAnnouncement('❄️ 绝对零度！时间停止！', '#0ff');
        g.enemyFrozenTimer = 600; 
    }
});
ULTIMATES_POOL.push({
    name: "万箭齐发",
    desc: "向四周发射36发高爆穿透弹",
    cd: 900,
    effect: (p, g) => {
        g.showAnnouncement('💥 万箭齐发！', '#f00');
        radialExplosion(g, p, 36, 'EXPLOSIVE', 5);
        if(window.audio) window.audio.play('shoot');
    }
});
ULTIMATES_POOL.push({
    name: "狂暴嗜血",
    desc: "获得15秒无敌，移速与火力拉满",
    cd: 1800,
    effect: (p, g) => {
        g.showAnnouncement('🩸 狂暴嗜血！', '#f00');
        p.setShield(900);
        p.level = 9;
        p.speed = 8;
        if (!p.perks) p.perks = [];
        p.perks.push('VAMPIRIC');
    }
});

// ========================
// 2. 强力增益类 (High Tier)
// ========================
ULTIMATES_POOL.push({
    name: "生命之光",
    desc: "复活死去的队友，全体满血并获得护盾",
    cd: 2000,
    effect: (p, g) => {
        g.showAnnouncement('💖 生命之光！神圣复苏！', '#f0f');
        g.players.forEach(player => {
            if (!player.alive) {
                player.alive = true;
                player.health = player.maxHealth;
            } else {
                player.health = Math.min(player.health + 5, player.maxHealth);
            }
            player.setShield(600);
        });
        g.baseHealth = g.maxBaseHealth; // Restore base health too!
        if(window.audio) window.audio.play('powerup');
    }
});
ULTIMATES_POOL.push({
    name: "基地终极护甲",
    desc: "基地被钢铁包围15秒",
    cd: 600,
    effect: (p, g) => {
        g.showAnnouncement('🛡️ 基地获得终极防御！', '#ccc');
        g.fortifyTimer = 900;
        g.map.setBaseWalls(TILE_TYPES.STEEL);
    }
});
ULTIMATES_POOL.push({
    name: "局部黑洞",
    desc: "立刻消灭距离自己最近的3个敌人",
    cd: 750,
    effect: (p, g) => {
        g.showAnnouncement('🕳️ 局部黑洞！', '#a0a');
        let sorted = [...g.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        for(let i=0; i<3; i++) {
            if(sorted[i]) sorted[i].destroy(p, 9999);
        }
    }
});
ULTIMATES_POOL.push({
    name: "全屏核聚变",
    desc: "清空屏幕上所有小怪，对Boss造成巨量伤害",
    cd: 2400,
    effect: (p, g) => {
        g.showAnnouncement('☢️ 全屏核聚变！', '#ff0');
        g.shakeScreen(60);
        if(window.audio) window.audio.play('explosion');
        g.enemies.forEach(e => {
            if (e.isBoss) e.destroy(p, 100);
            else e.destroy(p, 9999);
        });
    }
});
ULTIMATES_POOL.push({
    name: "火力倾泻",
    desc: "以自身为中心发射一圈激光穿透弹",
    cd: 600,
    effect: (p, g) => {
        g.showAnnouncement('🎇 激光散射！', '#0ff');
        radialExplosion(g, p, 16, 'LASER', 5);
        if(window.audio) window.audio.play('shoot');
    }
});

// ========================
// 3. 搞怪娱乐类 (Joke Tier) - 精简保留少数有趣的
// ========================
ULTIMATES_POOL.push({
    name: "炫彩皮肤",
    desc: "给你换个拉风的颜色！",
    cd: 300,
    effect: (p, g) => {
        const colors = ['#f0f', '#0ff', '#ff0', '#0f0', '#fff'];
        p.color = colors[Math.floor(Math.random() * colors.length)];
        g.showFloatingText('✨ 换装成功！', p.x, p.y, p.color);
    }
});
ULTIMATES_POOL.push({
    name: "我要隐身",
    desc: "自己变透明，虽然敌人还是能看见你",
    cd: 400,
    effect: (p, g) => {
        p.alpha = 0.2;
        g.showAnnouncement('👻 皇帝的新衣已激活', '#aaa');
        setTimeout(() => p.alpha = 1, 10000);
    }
});
ULTIMATES_POOL.push({
    name: "原地放屁",
    desc: "放出一团绿色毒气",
    cd: 200,
    effect: (p, g) => {
        g.showFloatingText('💨 噗~~~', p.x, p.y, '#0f0');
        for (let i = 0; i < 5; i++) {
            g.effects.push(new Effect(p.x + 32 + (Math.random()-0.5)*40, p.y + 32 + (Math.random()-0.5)*40, 'SPARK', 2));
        }
        if(window.audio) window.audio.play('shoot');
    }
});
ULTIMATES_POOL.push({
    name: "打赏主播",
    desc: "撒出一堆加分星星",
    cd: 300,
    effect: (p, g) => {
        g.showAnnouncement('🌟 感谢老铁送的穿云箭！', '#ff0');
        for (let i = 0; i < 5; i++) {
            g.powerUps.push(new PowerUp(g, p.x + (Math.random()-0.5)*150, p.y + (Math.random()-0.5)*150, POWERUP_TYPES.STAR));
        }
    }
});

// 暴露给全局
window.getTankUltimate = function() {
    return ULTIMATES_POOL[Math.floor(Math.random() * ULTIMATES_POOL.length)];
};
