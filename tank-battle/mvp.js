async function generateMVPReview(game, p1, p2, mvp) {
    const defaultQuotes = {
        carry: ["真正的带飞局，你就是这局的绝对核心！", "走位风骚，意识超前，这波天秀！"],
        feeder: ["感谢你为敌方的击杀锦集提供了宝贵素材。", "你的存在，是对“合作”两个字最大的侮辱。"],
        friendlyFire: ["痛击我的队友，保护我的敌人！", "你对敌人的仁慈，就是对队友的残忍。"],
        brickBreaker: ["别人是来打坦克的，你是来搞房地产拆迁的。", "拆墙大队长，没有你拆不掉的死胡同。"],
        itemHoarder: ["装备全靠捡，输出全靠吼，你是属貔貅的吗？"],
        draw: ["菜鸡互啄，不分伯仲！", "你俩的默契程度，简直就像两个互不认识的 AI。"],
        win: ["基地没爆，你俩的感情先爆了 💔", "躺赢也是一种实力，但下次别躺了。"]
    };

    function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function getRuleBasedQuote(player, isMvp, isDraw) {
        if (!player) return "";
        if (isMvp && !isDraw) return ""; // 核心修改：MVP 玩家不需要任何评论
        let quote = "";
        const s = player.stats;
        if (isDraw) return pickRandom(defaultQuotes.draw);
        
        if (s.deaths > 5) quote = pickRandom(defaultQuotes.feeder);
        else if (s.powerups > 10 && s.kills < 5) quote = pickRandom(defaultQuotes.itemHoarder);
        else quote = pickRandom(defaultQuotes.feeder);
        
        return quote;
    }

    let p1Quote = p1 ? getRuleBasedQuote(p1, mvp === p1, mvp === 'DRAW') : "";
    let p2Quote = p2 ? getRuleBasedQuote(p2, mvp === p2, mvp === 'DRAW') : "";

    // Try AI
    if (window.ai && window.ai.languageModel) {
        try {
            const capabilities = await window.ai.languageModel.capabilities();
            if (capabilities.available === 'readily') {
                const session = await window.ai.languageModel.create({
                    systemPrompt: `你是一个毒舌又专业的电竞解说，现在要对一场《坦克大战》的失败玩家进行嘲讽（不超过30个字）。游戏规则是保护基地不被摧毁并击杀敌人。`
                });
                
                let prompt = `游戏结果：${mvp === 'DRAW' ? '平局' : (mvp ? `P${mvp.id} 是 MVP` : '两人都很菜')}。\n`;
                if (p1) prompt += `玩家1(P1)：得分为${p1.score}，击杀${p1.stats.kills}，死亡${p1.stats.deaths}，误伤队友${p1.stats.friendlyFires}次，吃道具${p1.stats.powerups}个，拆墙${p1.stats.blocks}块。\n`;
                if (p2) prompt += `玩家2(P2)：得分为${p2.score}，击杀${p2.stats.kills}，死亡${p2.stats.deaths}，误伤队友${p2.stats.friendlyFires}次，吃道具${p2.stats.powerups}个，拆墙${p2.stats.blocks}块。\n`;
                
                if (mvp === 'DRAW') {
                    prompt += `请分别给出P1和P2的嘲讽。格式：\nP1: [对P1的嘲讽]\nP2: [对P2的嘲讽]`;
                } else {
                    let loser = mvp === p1 ? 'P2' : 'P1';
                    prompt += `请**仅**对败者 ${loser} 给出犀利的嘲讽，不要评论MVP。格式要求：\n${loser}: [对${loser}的嘲讽]`;
                }

                const response = await session.prompt(prompt);
                
                const lines = response.split('\n');
                let aiP1 = lines.find(l => l.startsWith('P1:'))?.substring(3).trim();
                let aiP2 = lines.find(l => l.startsWith('P2:'))?.substring(3).trim();
                
                if (aiP1 && mvp !== p1) p1Quote = aiP1.replace(/["*]/g, '');
                if (aiP2 && mvp !== p2) p2Quote = aiP2.replace(/["*]/g, '');
                
                // Double safe cleanup
                if (mvp === p1 && mvp !== 'DRAW') p1Quote = "";
                if (mvp === p2 && mvp !== 'DRAW') p2Quote = "";
                
                session.destroy();
            }
        } catch (e) {
            console.error("AI Generation failed:", e);
        }
    }
    return { p1Quote, p2Quote };
}
window.generateMVPReview = generateMVPReview;
