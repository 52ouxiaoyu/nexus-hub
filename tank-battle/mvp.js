async function generateMVPReview(game, p1, p2, mvp) {
    function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    const prefixes = [
        "讲个笑话，", "难以置信，", "我奶奶闭着眼也比你强，", "建议去挂个眼科，", 
        "叹为观止的操作，", "不出意外的话，", "看完你的操作，", "说实话，", 
        "兄弟，", "绝了！", "真没看懂，", "惊为天人，", "你确定键盘没坏？",
        "我把手绑起来，", "闭上眼睛，", "不得不说，", "恭喜你，", "朋友，"
    ];

    const bodies = [
        "全程在地图边上梦游", "炮弹全往空地上扔", "被小怪按在地上摩擦",
        "输出全靠挨打", "在基地门口当缩头乌龟", "走位像是在跳机器舞",
        "疯狂接对面的子弹", "见怪就跑的速度堪比博尔特", "吃道具比谁都快但就是不输出",
        "子弹连敌人的车尾灯都摸不到", "一直在墙角疯狂面壁思过", "逛街逛得像是在逛菜市场",
        "不仅送人头还挡队友子弹", "开炮的频率比树懒还慢", "迷之走位把自己送进包围圈",
        "一顿操作猛如虎，一看战绩零杠五", "躲在后面发呆", "全程仿佛在思考人生"
    ];

    const suffixes = [
        "堪称人体描边大师。", "看得我脑血栓都快犯了。", "简直是敌方派来的超级卧底。",
        "下把去玩连连看吧。", "电子竞技不需要视力，更不需要你。", "你这技术是跟门口大爷学的吧？",
        "这就是传说中的“退钱级”表现。", "我都替你感到尴尬。", "队友看了直呼内行（反义词）。",
        "这波真是令人窒息的操作。", "把游戏删了吧，省点电费。", "你成功让我见识到了人类的下限。",
        "求你别再坑队友了。", "建议把电脑捐给有需要的人。", "你是来做慈善的吗？",
        "这把输了你全责！", "看得让人直呼辣眼睛。", "完美诠释了什么是“重在参与”。"
    ];
    
    const specificBodies = {
        feeder: ["人头送得比外卖还快", "硬扛着对面火力冲锋", "化身为行走的提款机", "复活甲都救不回你的送死速度"],
        wall: ["把地图上的墙拆了个精光", "对墙壁有着迷之执着", "不打坦克专门拆家"],
        hoarder: ["贪吃蛇附体疯狂抢道具", "把地上的道具全舔干净了却不打怪", "捡神装打出刮痧伤害"],
        lowScore: ["全场存在感为零", "边缘OB的极限", "连个助攻都混不上"]
    };

    function getRuleBasedQuote(player, isMvp, isDraw) {
        if (!player) return "";
        if (isMvp && !isDraw) return ""; // MVP 免喷
        
        const s = player.stats;
        let p = pickRandom(prefixes);
        let b = pickRandom(bodies);
        let suf = pickRandom(suffixes);
        
        // Dynamic body based on performance
        if (s.deaths > 6) b = pickRandom(specificBodies.feeder);
        else if (s.blocks > 30) b = pickRandom(specificBodies.wall);
        else if (s.powerups > 8 && s.kills <= 3) b = pickRandom(specificBodies.hoarder);
        else if (player.score < 500) b = pickRandom(specificBodies.lowScore);

        if (isDraw) return `【平局】${p}${b}，两人${suf}`;
        
        return `${p}${b}，${suf}`;
    }

    let p1Quote = p1 ? getRuleBasedQuote(p1, mvp === p1, mvp === 'DRAW') : "";
    let p2Quote = p2 ? getRuleBasedQuote(p2, mvp === p2, mvp === 'DRAW') : "";

    // Try AI (Gemini Nano via window.ai)
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
