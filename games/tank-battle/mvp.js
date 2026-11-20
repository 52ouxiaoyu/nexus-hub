async function generateMVPReview(game, p1, p2, mvp) {
    function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // 锐评总长度硬上限（按字符计）；绘制端另有折行 + 字号自适应兜底，双保险防出屏
    const MAX_QUOTE_LEN = 28;

    const prefixes = [
        "讲个笑话，", "难以置信，", "建议挂个眼科，",
        "叹为观止，", "不出意外的话，", "看完你的操作，", "说实话，", 
        "兄弟，", "绝了！", "真没看懂，", "你键盘没坏？",
        "我把手绑起来，", "闭上眼睛，", "不得不说，", "恭喜你，", "朋友，"
    ];

    const bodies = [
        "全程在地图边上梦游", "炮弹全往空地上扔", "被小怪按在地上摩擦",
        "输出全靠挨打", "在基地门口当乌龟", "走位像在跳机器舞",
        "疯狂接对面的子弹", "见怪就跑得比谁都快", "吃道具最快就是不输出",
        "连敌人车尾灯都摸不到", "在墙角疯狂面壁思过", "逛街像在逛菜市场",
        "又送人头又挡队友子弹", "开炮比树懒还慢", "把自己走位进包围圈",
        "操作猛如虎，战绩零杠五", "躲在后面发呆", "全程仿佛在思考人生"
    ];

    const suffixes = [
        "堪称人体描边大师。", "看得我脑血栓都犯了。", "简直是敌方派来的卧底。",
        "下把去玩连连看吧。", "电子竞技不需要视力。", "跟门口大爷学的吧？",
        "这真是“退钱级”表现。", "我都替你尴尬。", "队友看了直呼内行。",
        "真是令人窒息。", "把游戏删了吧。", "见识到人类下限了。",
        "求你别坑队友。", "电脑捐给需要的人吧。", "你是来做慈善的？",
        "这把输了你全责！", "看得人直呼辣眼睛。", "完美诠释重在参与。"
    ];
    
    const specificBodies = {
        feeder: ["人头送得比外卖还快", "硬扛着对面火力冲锋", "行走的提款机", "复活甲都救不回你"],
        wall: ["把地图上的墙拆了个精光", "对墙壁有着迷之执着", "不打坦克专门拆家"],
        hoarder: ["贪吃蛇附体狂抢道具", "道具舔干净了却不打怪", "捡神装打出刮痧伤害"],
        lowScore: ["全场存在感为零", "边缘OB的极限", "连个助攻都混不上"]
    };

    // 优先保留完整三段（prefix + body + suffix），超长时逐级降级，最后硬截断
    function composeQuote(p, b, suf) {
        const fit = (s) => [...s].length <= MAX_QUOTE_LEN;
        const full = `${p}${b}，${suf}`;
        if (fit(full)) return full;
        const twoClause = `${b}，${suf}`;
        if (fit(twoClause)) return twoClause;
        const twoPart = `${p}${b}`;
        if (fit(twoPart)) return twoPart;
        return [...b].slice(0, MAX_QUOTE_LEN - 1).join('') + '…';
    }

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

        if (isDraw) return `【平局】` + composeQuote(p, b, suf);
        
        return composeQuote(p, b, suf);
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
                
                let prompt = `游戏结果：${mvp === 'DRAW' ? '平局' : (mvp ? `P${mvp.id} 是 MVP` : '两人都很菜')}。\n`;                if (p1) prompt += `玩家1(P1)：得分为${p1.score}，击杀${p1.stats.kills}，死亡${p1.stats.deaths}，误伤队友${p1.stats.friendlyFires}次，吃道具${p1.stats.powerups}个，拆墙${p1.stats.blocks}块。\n`;
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
                
                // AI 可能超长/带引号星号，统一清洗并硬截断，避免溢出结算画面
                const sanitize = (s) => {
                    let t = String(s).replace(/["*“”]/g, '').replace(/\s+/g, '').trim();
                    if ([...t].length > MAX_QUOTE_LEN) t = [...t].slice(0, MAX_QUOTE_LEN - 1).join('') + '…';
                    return t;
                };
                if (aiP1 && mvp !== p1) p1Quote = sanitize(aiP1);
                if (aiP2 && mvp !== p2) p2Quote = sanitize(aiP2);
                
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
