/* 语文专项学习 · 精编题库（v2）
 * 结构说明：每条题目自带 rubric（评分细则），前端按细则让学生逐条自评，
 * 不再用"关键词命中"直接给分。新增题目只需往数组里追加对象即可。
 * source 字段如实标注来源：教材母句 / 原创改编 / 真题（凭记忆整理，未标年份卷别）。
 */
window.__CB_BANK__ = [
  /* ============================================================
     一、文言文阅读（CLASSICAL）—— 实词 / 虚词 / 翻译 / 断句
     ============================================================ */
  {
    id: 1001, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《师说》", sub_type: "实词多义·爱",
    question_no: "1",
    question_stem: "下列各句中加点词“爱”的意义和用法，与“爱其子，择师而教之”中的“爱”相同的一项是（3分）",
    options: [
      "A. 不爱珍器重宝肥饶之地，以致天下之士（《过秦论》）",
      "B. 秦爱纷奢，人亦念其家（《阿房宫赋》）",
      "C. 向使三国各爱其地（《六国论》）",
      "D. 使秦复爱六国之人（《阿房宫赋》）"
    ],
    max_score: 3,
    standard_answer: "选 D。“爱其子”的“爱”是“爱护、疼爱”。A、C 的“爱”是“吝惜、舍不得”；B 的“爱”是“喜爱、贪爱”；只有 D“爱六国之人”是“爱护”。",
    rubric: [
      { point: "选出 D", score: 2 },
      { point: "能指出 A、C 为“吝惜”，B 为“喜爱/贪爱”，D 为“爱护”", score: 1 }
    ],
    trap_types: ["一词多义", "实词积累"],
    recommended_minutes: 3
  },
  {
    id: 1002, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《石壕吏》《鸿门宴》", sub_type: "实词多义·走/去",
    question_no: "2",
    question_stem: "解释下列两句中加点词的含义，并说明二者古今义的差别。（4分）\n①老翁逾墙走（《石壕吏》）\n②欲呼张良与俱去（《鸿门宴》）",
    max_score: 4,
    standard_answer: "①“走”意为“跑、逃跑”，今义为“行走”，词义范围缩小。②“去”意为“离开”，今义为“前往”，词义方向相反。",
    rubric: [
      { point: "①释义为“跑/逃跑”", score: 1 },
      { point: "①指出与今义“行走”的差别（范围缩小）", score: 1 },
      { point: "②释义为“离开”", score: 1 },
      { point: "②指出与今义“前往”方向相反", score: 1 }
    ],
    trap_types: ["古今异义", "以今律古"],
    recommended_minutes: 3
  },
  {
    id: 1003, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《鸿门宴》《陈情表》", sub_type: "实词多义·谢/除",
    question_no: "3",
    question_stem: "下列对句中加点词的解释，不正确的一项是（3分）",
    options: [
      "A. 旦日不可不蚤自来谢项王　谢：道歉、谢罪",
      "B. 哙拜谢，起，立而饮之　谢：感谢",
      "C. 寻蒙国恩，除臣洗马　除：免除官职",
      "D. 后五年，吾妻来归　归：女子出嫁"
    ],
    max_score: 3,
    standard_answer: "选 C。“除”在“除臣洗马”中是“授予官职”（任命），不是“免除”。此句出自《陈情表》，意为不久蒙受国恩，任命我为太子洗马。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "能说明“除”为“授官、任命”", score: 1 }
    ],
    trap_types: ["一词多义", "以今律古"],
    recommended_minutes: 2
  },
  {
    id: 1004, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《烛之武退秦师》《廉颇蔺相如列传》", sub_type: "虚词·因/以",
    question_no: "4",
    question_stem: "下列各组句子中，加点虚词的意义和用法相同的一组是（3分）",
    options: [
      "A. 因人之力而敝之／因宾客至蔺相如门谢罪",
      "B. 以勇气闻于诸侯／愿以十五城请易璧",
      "C. 臣之壮也，犹不如人／邻之厚，君之薄也",
      "D. 而青于蓝／君子博学而日参省乎己"
    ],
    max_score: 3,
    standard_answer: "选 C。两句的“之”都用在主谓之间，取消句子独立性。A 前者“依靠”，后者“经由、通过”；B 前者“凭借”，后者“用、拿”；D 前者表比较的连词“比”，后者表递进“而且”。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "能说明 C 中两个“之”均为主谓之间取消独立性", score: 1 }
    ],
    trap_types: ["虚词辨析", "结构助词"],
    recommended_minutes: 3
  },
  {
    id: 1005, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《鸿门宴》", sub_type: "文言翻译",
    question_no: "5",
    question_stem: "把下面的句子翻译成现代汉语。（6分）\n所以遣将守关者，备他盗之出入与非常也。",
    max_score: 6,
    standard_answer: "之所以派遣将领把守函谷关，是为了防备其他盗贼的进入和意外的变故。（“所以……者”表原因；“出入”为偏义复词，取“入”；“非常”为古今异义，指“意外的变故”。三处各 2 分。）",
    rubric: [
      { point: "译出“所以……者”的原因句式（之所以……是因为……）", score: 2 },
      { point: "“出入”按偏义复词处理，译为“进入”", score: 2 },
      { point: "“非常”译为“意外的变故”，未误译为“十分、非常”", score: 2 }
    ],
    trap_types: ["偏义复词", "古今异义", "固定句式"],
    recommended_minutes: 4
  },
  {
    id: 1006, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《师说》", sub_type: "文言翻译",
    question_no: "6",
    question_stem: "把下面的句子翻译成现代汉语。（6分）\n句读之不知，惑之不解，或师焉，或不焉，小学而大遗，吾未见其明也。",
    max_score: 6,
    standard_answer: "不懂得断句，不能解决疑惑，有的向老师学习，有的却不向老师学习，小的方面学习了，大的方面却丢弃了，我看不出他们高明在哪里。（“句读之不知”为宾语前置；“不”通“否”；“小学而大遗”中“小学”为古今异义，指小的方面学习。）",
    rubric: [
      { point: "译出宾语前置“句读之不知”（不懂得断句）", score: 2 },
      { point: "“不”通“否”，译为“不（向老师学习）”", score: 2 },
      { point: "“小学”译为“小的方面学习”，未误译为“小学阶段”", score: 2 }
    ],
    trap_types: ["宾语前置", "通假字", "古今异义"],
    recommended_minutes: 4
  },
  {
    id: 1007, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《烛之武退秦师》", sub_type: "实词活用",
    question_no: "7",
    question_stem: "下列句中加点词的用法与“越国以鄙远”中“鄙”的用法相同的一项是（3分）",
    options: [
      "A. 既东封郑，又欲肆其西封",
      "B. 沛公军霸上",
      "C. 吾从而师之",
      "D. 项伯杀人，臣活之"
    ],
    max_score: 3,
    standard_answer: "选 C。“鄙远”是名词的意动用法，“把远方的郑国当作边邑”。“师之”的“师”也是意动，“以之为师”。A“封”为使动/名词作动词“把……当作疆界”；B“军”为名词作动词“驻军”；D“活”为使动“使……活”。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "能说明“鄙”与“师”均为意动用法", score: 1 }
    ],
    trap_types: ["词类活用", "意动与使动混淆"],
    recommended_minutes: 3
  },
  {
    id: 1008, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "精编·文言断句", sub_type: "文言断句",
    question_no: "8",
    question_stem: "用“／”给下面文段断句（限断 6 处）。（3分）\n太宗谓侍臣曰为政之要惟在得人用非其才必难致治今所任用必须以德行学识为本",
    max_score: 3,
    standard_answer: "太宗谓侍臣曰／为政之要／惟在得人／用非其才／必难致治／今所任用／必须以德行学识为本",
    rubric: [
      { point: "“曰”后断开（对话标志）", score: 1 },
      { point: "“为政之要／惟在得人”断对（“惟……也/矣”类判断语气）", score: 1 },
      { point: "“用非其才／必难致治”“今所任用／必须以……为本”断对（对偶与“必”“须”标志）", score: 1 }
    ],
    trap_types: ["断句标志", "对偶结构"],
    recommended_minutes: 4
  },
  {
    id: 1009, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《陈情表》", sub_type: "偏义复词",
    question_no: "9",
    question_stem: "“昼夜勤作息”（《孔雀东南飞》）与“陟罚臧否，不宜异同”（《出师表》）中，“作息”“异同”属于什么语言现象？请分别说明其实际含义。（4分）",
    max_score: 4,
    standard_answer: "均属偏义复词，即由两个意义相关或相反的语素构成，但整个词只取其中一个语素的含义。“作息”偏指“作”（劳作），不指休息；“异同”偏指“异”（不同），意为赏罚不该有差别。",
    rubric: [
      { point: "答出“偏义复词”这一术语", score: 2 },
      { point: "“作息”偏指“劳作”", score: 1 },
      { point: "“异同”偏指“不同/差别”", score: 1 }
    ],
    trap_types: ["偏义复词", "术语缺失"],
    recommended_minutes: 3
  },
  {
    id: 1010, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《过秦论》《六国论》", sub_type: "文意概括",
    question_no: "10",
    question_stem: "下列对《六国论》选段文意的理解，不正确的一项是（3分）",
    options: [
      "A. 作者认为六国破灭的原因在于“赂秦”，而非兵器不锋利、仗打得不好。",
      "B. 作者用“抱薪救火”比喻割地求和，说明赂秦之地有限而秦之欲无厌。",
      "C. 作者认为齐国未曾赂秦，因此齐国灭亡与赂秦无关，是孤立无援所致。",
      "D. 作者写六国赂秦而亡，最终落脚在借古讽今，警告北宋朝廷不要重蹈覆辙。"
    ],
    max_score: 3,
    standard_answer: "选 C。原文说“不赂者以赂者丧”，齐国虽不赂秦，但因其他诸侯国赂秦而失去强援，最终灭亡——齐国的灭亡仍与赂秦有间接关系，C 项将“无关”绝对化，与原文“盖失强援，不能独完”矛盾。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "能引用“不赂者以赂者丧／盖失强援，不能独完”作依据", score: 1 }
    ],
    trap_types: ["曲解文意", "绝对化", "强加因果"],
    recommended_minutes: 3
  },
  {
    id: 1011, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《劝学》", sub_type: "文意概括",
    question_no: "11",
    question_stem: "《劝学》中“君子生非异也，善假于物也”一句在全文中的作用，分析最恰当的一项是（3分）",
    options: [
      "A. 总结上文三个比喻，点明学习的作用在于弥补不足。",
      "B. 引出下文“积善成德”的论述，强调积累的重要性。",
      "C. 与开头“学不可以已”呼应，重申学习的必要性。",
      "D. 提出全文中心论点，统摄后文全部论证。"
    ],
    max_score: 3,
    standard_answer: "选 A。该句处在“登高而招／顺风而呼／假舆马／假舟楫”四个比喻之后，是对“学习能够弥补自身不足”这一层意思的收束，作用是“善于借助外物”。",
    rubric: [
      { point: "选出 A", score: 2 },
      { point: "能说明其位置在四个比喻之后、属该层收束", score: 1 }
    ],
    trap_types: ["句段作用", "层次误判"],
    recommended_minutes: 3
  },
  {
    id: 1012, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "精编·文言句式", sub_type: "特殊句式",
    question_no: "12",
    question_stem: "指出下列各句的句式特点，并翻译成现代汉语。（4分）\n①大王来何操？（《鸿门宴》）\n②夫晋，何厌之有？（《烛之武退秦师》）",
    max_score: 4,
    standard_answer: "①宾语前置（疑问代词作宾语前置），译为“大王来时带了什么”。②宾语前置（“之”为提宾标志），译为“晋国，有什么满足的呢”。",
    rubric: [
      { point: "①判定为宾语前置句", score: 1 },
      { point: "①译文准确（带了什么）", score: 1 },
      { point: "②判定为宾语前置（“之”作提宾标志）", score: 1 },
      { point: "②译文准确（有什么满足的）", score: 1 }
    ],
    trap_types: ["宾语前置", "提宾标志"],
    recommended_minutes: 3
  },
  {
    id: 1013, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "教材母句·《阿房宫赋》", sub_type: "实词多义·幸",
    question_no: "13",
    question_stem: "下列句中“幸”的意义与其他三项不同的一项是（3分）",
    options: [
      "A. 缦立远视，而望幸焉（《阿房宫赋》）",
      "B. 大王亦幸赦臣（《廉颇蔺相如列传》）",
      "C. 幸可广问讯，不得便相许（《孔雀东南飞》）",
      "D. 妇女无所幸（《鸿门宴》）"
    ],
    max_score: 3,
    standard_answer: "选 B。A“望幸”指盼望皇帝驾临（宠幸）；C“幸可”是“希望”；D“幸”指宠幸。B“幸赦臣”的“幸”是“幸而、幸亏”，表侥幸语气，与其余表“宠幸/希望”不同类。",
    rubric: [
      { point: "选出 B", score: 2 },
      { point: "能说明 B 为“幸而/幸亏”，其余为“宠幸/希望”", score: 1 }
    ],
    trap_types: ["一词多义", "语气副词"],
    recommended_minutes: 3
  },
  {
    id: 1014, module_code: "CLASSICAL", module_name: "文言文阅读",
    source: "精编·文化常识", sub_type: "文化常识",
    question_no: "14",
    question_stem: "下列对古代文化常识的解说，不正确的一项是（3分）",
    options: [
      "A. “察茂才”“举孝廉”中的“察”“举”都是选拔、推举的意思，是汉代选官方式。",
      "B. “拜”“除”“迁”“徙”都可表示官职变动，其中“迁”一般指提升。",
      "C. “乞骸骨”指官员因年老请求退休，“下车”指官员初到任。",
      "D. “丁忧”指遭遇父母丧事，“夺情”指丧期未满被朝廷强行起用。"
    ],
    max_score: 3,
    standard_answer: "选 B。“迁”既可指升迁（右迁、迁官），也常指贬谪（左迁、迁谪），不能笼统说“一般指提升”。其余三项均正确。",
    rubric: [
      { point: "选出 B", score: 2 },
      { point: "能指出“迁”有升有降（左迁为贬）", score: 1 }
    ],
    trap_types: ["文化常识", "绝对化表述"],
    recommended_minutes: 2
  },

  /* ============================================================
     二、名篇名句默写（DICTATION）—— 情境式，全部标易错字
     ============================================================ */
  {
    id: 1101, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《劝学》", sub_type: "情境默写",
    question_no: "1",
    question_stem: "《劝学》中以“木”“金”为喻，说明君子通过学习可以改变自己、提升境界的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "故木受绳则直，金就砺则利。",
    rubric: [
      { point: "写出“故木受绳则直”", score: 1 },
      { point: "写出“金就砺则利”（注意“砺”是石字旁，不写“励”）", score: 1 }
    ],
    trap_types: ["同音致误", "字形错误"],
    recommended_minutes: 1
  },
  {
    id: 1102, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《劝学》", sub_type: "情境默写",
    question_no: "2",
    question_stem: "《劝学》中用雕刻设喻，从反面强调坚持的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "锲而舍之，朽木不折；锲而不舍，金石可镂。",
    rubric: [
      { point: "写出“锲而舍之，朽木不折”", score: 1 },
      { point: "写出“锲而不舍，金石可镂”（“锲”不写“契”，“镂”不写“缕”）", score: 1 }
    ],
    trap_types: ["字形错误", "生僻字"],
    recommended_minutes: 1
  },
  {
    id: 1103, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《师说》", sub_type: "情境默写",
    question_no: "3",
    question_stem: "韩愈在《师说》中用“________，________”两句，直接否定了以地位、年龄为择师标准的世俗观念。（2分）",
    max_score: 2,
    standard_answer: "是故无贵无贱，无长无少，道之所存，师之所存也。",
    rubric: [
      { point: "写出“是故无贵无贱，无长无少”", score: 1 },
      { point: "写出“道之所存，师之所存也”（“所存”不误作“所从”）", score: 1 }
    ],
    trap_types: ["句子错位", "虚词漏写"],
    recommended_minutes: 1
  },
  {
    id: 1104, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《师说》", sub_type: "情境默写",
    question_no: "4",
    question_stem: "《师说》中“________，________”两句，说明弟子不一定不如老师、老师也不一定比弟子高明，含有辩证意味。（2分）",
    max_score: 2,
    standard_answer: "是故弟子不必不如师，师不必贤于弟子。",
    rubric: [
      { point: "写出“弟子不必不如师”", score: 1 },
      { point: "写出“师不必贤于弟子”（“贤于”介词结构不倒装）", score: 1 }
    ],
    trap_types: ["虚词漏写", "句序颠倒"],
    recommended_minutes: 1
  },
  {
    id: 1105, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《赤壁赋》", sub_type: "情境默写",
    question_no: "5",
    question_stem: "苏轼《赤壁赋》中以“蜉蝣”“一粟”极言人生短暂、个体渺小的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "寄蜉蝣于天地，渺沧海之一粟。",
    rubric: [
      { point: "写出“寄蜉蝣于天地”（“蜉蝣”二字不误写）", score: 1 },
      { point: "写出“渺沧海之一粟”（“沧海”不写“苍海”，“粟”不写“栗”）", score: 1 }
    ],
    trap_types: ["生僻字", "同音致误"],
    recommended_minutes: 1
  },
  {
    id: 1106, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《赤壁赋》", sub_type: "情境默写",
    question_no: "6",
    question_stem: "《赤壁赋》中“________，________”两句，用对比写出人生须臾与江水无穷的矛盾，是客感慨的核心。（2分）",
    max_score: 2,
    standard_answer: "哀吾生之须臾，羡长江之无穷。",
    rubric: [
      { point: "写出“哀吾生之须臾”（“须臾”不写“须叟”）", score: 1 },
      { point: "写出“羡长江之无穷”（“羡”字结构正确）", score: 1 }
    ],
    trap_types: ["生僻字", "字形错误"],
    recommended_minutes: 1
  },
  {
    id: 1107, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《念奴娇·赤壁怀古》", sub_type: "情境默写",
    question_no: "7",
    question_stem: "《念奴娇·赤壁怀古》中描写周瑜从容破敌、战果辉煌的句子是：“________，________，________。”（3分）",
    max_score: 3,
    standard_answer: "羽扇纶巾，谈笑间，樯橹灰飞烟灭。",
    rubric: [
      { point: "写出“羽扇纶巾”（“纶”读 guān，不写“伦/轮”）", score: 1 },
      { point: "写出“谈笑间”", score: 1 },
      { point: "写出“樯橹灰飞烟灭”（“樯橹”不写“墙橹”）", score: 1 }
    ],
    trap_types: ["生僻字", "同音致误"],
    recommended_minutes: 1
  },
  {
    id: 1108, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《永遇乐·京口北固亭怀古》", sub_type: "情境默写",
    question_no: "8",
    question_stem: "辛弃疾《永遇乐·京口北固亭怀古》中，写刘裕曾居住之地如今已成寻常街巷的三句是：“________，________，________。”（3分）",
    max_score: 3,
    standard_answer: "斜阳草树，寻常巷陌，人道寄奴曾住。",
    rubric: [
      { point: "写出“斜阳草树”", score: 1 },
      { point: "写出“寻常巷陌”（“陌”不写“漠”）", score: 1 },
      { point: "写出“人道寄奴曾住”（“寄奴”不误作其他）", score: 1 }
    ],
    trap_types: ["字形错误", "语序错误"],
    recommended_minutes: 1
  },
  {
    id: 1109, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《声声慢》", sub_type: "情境默写",
    question_no: "9",
    question_stem: "李清照《声声慢》中借秋雨梧桐反复渲染愁绪的句子是：“________，________、________。”（3分）",
    max_score: 3,
    standard_answer: "梧桐更兼细雨，到黄昏、点点滴滴。",
    rubric: [
      { point: "写出“梧桐更兼细雨”", score: 1 },
      { point: "写出“到黄昏”", score: 1 },
      { point: "写出“点点滴滴”（叠字不可漏）", score: 1 }
    ],
    trap_types: ["叠字漏写", "标点层次"],
    recommended_minutes: 1
  },
  {
    id: 1110, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《氓》", sub_type: "情境默写",
    question_no: "10",
    question_stem: "《氓》中以桑叶凋落起兴，暗示女子年老色衰、爱情衰败的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "桑之落矣，其黄而陨。",
    rubric: [
      { point: "写出“桑之落矣”", score: 1 },
      { point: "写出“其黄而陨”（“陨”不写“殒”）", score: 1 }
    ],
    trap_types: ["生僻字", "同音致误"],
    recommended_minutes: 1
  },
  {
    id: 1111, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《离骚》", sub_type: "情境默写",
    question_no: "11",
    question_stem: "屈原《离骚》中表达自己为理想虽死不悔的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "亦余心之所善兮，虽九死其犹未悔。",
    rubric: [
      { point: "写出“亦余心之所善兮”（“兮”字不可漏）", score: 1 },
      { point: "写出“虽九死其犹未悔”（“犹”不写“尤”）", score: 1 }
    ],
    trap_types: ["虚词漏写", "同音致误"],
    recommended_minutes: 1
  },
  {
    id: 1112, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《蜀道难》", sub_type: "情境默写",
    question_no: "12",
    question_stem: "李白《蜀道难》中用黄鹤、猿猱都难以逾越，侧面烘托蜀道高险的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "黄鹤之飞尚不得过，猿猱欲度愁攀援。",
    rubric: [
      { point: "写出“黄鹤之飞尚不得过”（“尚”不写“上”）", score: 1 },
      { point: "写出“猿猱欲度愁攀援”（“猱”不误写，“度”不写“渡”）", score: 1 }
    ],
    trap_types: ["生僻字", "形近致误"],
    recommended_minutes: 1
  },
  {
    id: 1113, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《登高》", sub_type: "情境默写",
    question_no: "13",
    question_stem: "杜甫《登高》中由落木、长江写出秋景苍茫、时光无穷的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "无边落木萧萧下，不尽长江滚滚来。",
    rubric: [
      { point: "写出“无边落木萧萧下”（“萧萧”叠字，不写“潇潇”）", score: 1 },
      { point: "写出“不尽长江滚滚来”", score: 1 }
    ],
    trap_types: ["叠字误写", "形近致误"],
    recommended_minutes: 1
  },
  {
    id: 1114, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《琵琶行》", sub_type: "情境默写",
    question_no: "14",
    question_stem: "白居易《琵琶行》中表达同病相怜、身世共鸣的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "同是天涯沦落人，相逢何必曾相识。",
    rubric: [
      { point: "写出“同是天涯沦落人”（“涯”不写“崖”）", score: 1 },
      { point: "写出“相逢何必曾相识”", score: 1 }
    ],
    trap_types: ["形近致误", "句序颠倒"],
    recommended_minutes: 1
  },
  {
    id: 1115, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《琵琶行》", sub_type: "情境默写",
    question_no: "15",
    question_stem: "《琵琶行》中以听众静默、冷月无声侧面烘托演奏效果的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "东船西舫悄无言，唯见江心秋月白。",
    rubric: [
      { point: "写出“东船西舫悄无言”（“舫”不写“坊”）", score: 1 },
      { point: "写出“唯见江心秋月白”（“唯”不写“惟”亦可，但需与教材版本一致）", score: 1 }
    ],
    trap_types: ["生僻字", "侧面对比混淆"],
    recommended_minutes: 1
  },
  {
    id: 1116, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《岳阳楼记》", sub_type: "情境默写",
    question_no: "16",
    question_stem: "范仲淹《岳阳楼记》中表现作者政治抱负、被后人广为传诵的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "先天下之忧而忧，后天下之乐而乐。",
    rubric: [
      { point: "写出“先天下之忧而忧”", score: 1 },
      { point: "写出“后天下之乐而乐”（“而”字不可漏）", score: 1 }
    ],
    trap_types: ["虚词漏写", "句序颠倒"],
    recommended_minutes: 1
  },
  {
    id: 1117, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《出师表》", sub_type: "情境默写",
    question_no: "17",
    question_stem: "诸葛亮《出师表》中追述自己临危受命的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "受任于败军之际，奉命于危难之间。",
    rubric: [
      { point: "写出“受任于败军之际”（“际”不写“祭”）", score: 1 },
      { point: "写出“奉命于危难之间”", score: 1 }
    ],
    trap_types: ["形近致误", "介词结构"],
    recommended_minutes: 1
  },
  {
    id: 1118, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《论语》", sub_type: "情境默写",
    question_no: "18",
    question_stem: "《论语·泰伯》中曾子说读书人必须有远大抱负和坚强意志的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "士不可以不弘毅，任重而道远。",
    rubric: [
      { point: "写出“士不可以不弘毅”（“弘”不写“宏”）", score: 1 },
      { point: "写出“任重而道远”", score: 1 }
    ],
    trap_types: ["同音致误", "虚词漏写"],
    recommended_minutes: 1
  },
  {
    id: 1119, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《谏太宗十思疏》", sub_type: "情境默写",
    question_no: "19",
    question_stem: "魏征《谏太宗十思疏》中用对比说明“竭诚”与“傲物”后果迥异的两句是：“________，________。”（2分）",
    max_score: 2,
    standard_answer: "竭诚则胡越为一体，傲物则骨肉为行路。",
    rubric: [
      { point: "写出“竭诚则胡越为一体”（“竭”不写“揭”）", score: 1 },
      { point: "写出“傲物则骨肉为行路”（“行路”指路人，不误译为道路）", score: 1 }
    ],
    trap_types: ["字形错误", "古今异义"],
    recommended_minutes: 1
  },
  {
    id: 1120, module_code: "DICTATION", module_name: "名篇名句默写",
    source: "教材·《阿房宫赋》", sub_type: "情境默写",
    question_no: "20",
    question_stem: "杜牧《阿房宫赋》中用十四个字写尽秦朝速亡惨状的三句是：“________，________，________。”（3分）",
    max_score: 3,
    standard_answer: "戍卒叫，函谷举，楚人一炬，可怜焦土。",
    rubric: [
      { point: "写出“戍卒叫”（“戍”不写“戌/戊”）", score: 1 },
      { point: "写出“函谷举”", score: 1 },
      { point: "写出“楚人一炬，可怜焦土”（“炬”不写“距”）", score: 1 }
    ],
    trap_types: ["形近致误", "生僻字"],
    recommended_minutes: 1
  },
  /* ============================================================
     三、古代诗歌鉴赏（POETRY）
     ============================================================ */
  {
    id: 1201, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·王维《山居秋暝》", sub_type: "写景手法·以动衬静",
    passage_title: "山居秋暝", passage_author: "〔唐〕王维",
    passage_content: "空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。\n竹喧归浣女，莲动下渔舟。\n随意春芳歇，王孙自可留。",
    question_no: "1",
    question_stem: "“竹喧归浣女，莲动下渔舟”一联在写景上很有特色，请简要赏析。（6分）",
    max_score: 6,
    standard_answer: "①语序倒装：正常语序应为“浣女归而竹喧，渔舟下而莲动”，诗人先写“竹喧”“莲动”的听觉与视觉结果，再交代“浣女归”“渔舟下”的原因，突出了先闻其声、后见其人的动态过程。②以动衬静：竹喧、莲动这些细微的动态，反衬出山居秋夜的空寂清幽。③视听结合、由远及近，画面富于层次，流露诗人对山居生活的喜爱与归隐之志。",
    rubric: [
      { point: "指出倒装（因果倒置）的语序并还原正常语序", score: 2 },
      { point: "说明倒装的表达效果（先声后人／突出动态）", score: 2 },
      { point: "点出以动衬静（或视听结合），并落到情感（喜爱／归隐）", score: 2 }
    ],
    trap_types: ["手法术语缺失", "只答情感不答手法"],
    recommended_minutes: 6
  },
  {
    id: 1202, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·杜甫《旅夜书怀》", sub_type: "意象·反衬",
    passage_title: "旅夜书怀", passage_author: "〔唐〕杜甫",
    passage_content: "细草微风岸，危樯独夜舟。\n星垂平野阔，月涌大江流。\n名岂文章著，官应老病休。\n飘飘何所似，天地一沙鸥。",
    question_no: "2",
    question_stem: "“星垂平野阔，月涌大江流”境界雄浑，与全诗的情感是否矛盾？请结合诗句分析。（6分）",
    max_score: 6,
    standard_answer: "不矛盾，这是以壮景写哀情（反衬）。①“星垂”“月涌”“平野阔”“大江流”构成雄浑阔大的境界；②而诗人此时正“危樯独夜舟”，孤舟一叶、漂泊无依，境界愈阔大，愈显个体之渺小孤独；③尾联“天地一沙鸥”直接把这种渺小感点破，壮阔之景恰是对孤苦之情的强化，属反衬。",
    rubric: [
      { point: "明确判断“不矛盾”，并点出反衬（以乐景/壮景写哀情）", score: 2 },
      { point: "具体分析壮阔之景（星垂、月涌、平野、大江）", score: 2 },
      { point: "落到“孤舟”“沙鸥”的孤独飘零，说明反衬效果", score: 2 }
    ],
    trap_types: ["景情关系误判", "只贴标签不分析"],
    recommended_minutes: 6
  },
  {
    id: 1203, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·陆游《书愤》", sub_type: "用典·对比",
    passage_title: "书愤", passage_author: "〔宋〕陆游",
    passage_content: "早岁那知世事艰，中原北望气如山。\n楼船夜雪瓜洲渡，铁马秋风大散关。\n塞上长城空自许，镜中衰鬓已先斑。\n出师一表真名世，千载谁堪伯仲间。",
    question_no: "3",
    question_stem: "尾联用“出师一表”的典故，表达了怎样的思想感情？请简要分析。（5分）",
    max_score: 5,
    standard_answer: "①以诸葛亮自比（或借诸葛亮的《出师表》），肯定其北伐中原、鞠躬尽瘁的功业；②“千载谁堪伯仲间”表面赞诸葛，实则慨叹当世无人能与之比肩、无人真正抗金；③既抒发自己空有报国之志却“衰鬓先斑”的悲愤，也暗含对朝廷苟安、主和派当道的不满。",
    rubric: [
      { point: "点明用典对象（诸葛亮／《出师表》）", score: 2 },
      { point: "分析“谁堪伯仲间”的慨叹（当世无人／讽刺朝廷）", score: 2 },
      { point: "落到自身壮志难酬的悲愤", score: 1 }
    ],
    trap_types: ["用典作用", "只答表层"],
    recommended_minutes: 5
  },
  {
    id: 1204, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·李商隐《锦瑟》", sub_type: "意象·朦胧诗境",
    passage_title: "锦瑟", passage_author: "〔唐〕李商隐",
    passage_content: "锦瑟无端五十弦，一弦一柱思华年。\n庄生晓梦迷蝴蝶，望帝春心托杜鹃。\n沧海月明珠有泪，蓝田日暖玉生烟。\n此情可待成追忆？只是当时已惘然。",
    question_no: "4",
    question_stem: "下列对这首诗的理解和赏析，不正确的一项是（3分）",
    options: [
      "A. 首联由锦瑟的弦柱触发对“华年”的追忆，“无端”二字已含怨怅。",
      "B. 颔联连用庄生梦蝶、望帝化鹃两个典故，写出迷离恍惚与哀怨执着。",
      "C. 颈联“珠有泪”“玉生烟”意象优美，写的是眼前实见的沧海与蓝田。",
      "D. 尾联以“惘然”收束，说明这种情感在当时就已难以把握，非事后才生。"
    ],
    max_score: 3,
    standard_answer: "选 C。“珠有泪”“玉生烟”是典故化、想象化的意象（鲛人泣珠、蓝田玉烟），并非眼前实景，C 项“眼前实见”属于误解。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "能说明其为想象/典故意象而非实景", score: 1 }
    ],
    trap_types: ["虚实混淆", "意象误读"],
    recommended_minutes: 3
  },
  {
    id: 1205, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·苏轼《定风波》", sub_type: "词眼·人生态度",
    passage_title: "定风波·莫听穿林打叶声", passage_author: "〔宋〕苏轼",
    passage_content: "莫听穿林打叶声，何妨吟啸且徐行。竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。\n料峭春风吹酒醒，微冷，山头斜照却相迎。回首向来萧瑟处，归去，也无风雨也无晴。",
    question_no: "5",
    question_stem: "“也无风雨也无晴”是全词的点睛之笔，请结合全词分析其含意。（6分）",
    max_score: 6,
    standard_answer: "①表层写雨过天晴后的自然景象，风雨与晴明都已过去；②深层是人生哲理的升华：风雨（逆境）与晴（顺境）在主观心境中已无差别，表现出宠辱不惊、随缘自适的旷达；③与上片“一蓑烟雨任平生”呼应，“任”字见其主动承受而非被动忍受；④“也无……也无……”的否定句式，正是对得失的超脱。",
    rubric: [
      { point: "表层：雨过天晴的自然实景", score: 1 },
      { point: "深层：逆境顺境在心境中无差别", score: 2 },
      { point: "联系“一蓑烟雨任平生”，指出旷达／超脱的人生态度", score: 2 },
      { point: "指出否定句式或“任”字的表达作用", score: 1 }
    ],
    trap_types: ["只答字面", "哲理与情感脱节"],
    recommended_minutes: 6
  },
  {
    id: 1206, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·杜甫《春望》", sub_type: "情景关系·炼字",
    passage_title: "春望", passage_author: "〔唐〕杜甫",
    passage_content: "国破山河在，城春草木深。\n感时花溅泪，恨别鸟惊心。\n烽火连三月，家书抵万金。\n白头搔更短，浑欲不胜簪。",
    question_no: "6",
    question_stem: "“感时花溅泪，恨别鸟惊心”两句，有人认为主语是诗人，有人认为主语是花鸟。你赞同哪一种？请说明理由。（5分）",
    max_score: 5,
    standard_answer: "两种解释都可通，关键在于说明依据。若以诗人为主语：诗人因感时伤别，见花而落泪、闻鸟而惊心，是移情于物，突出主观情感的强烈。若以花鸟为主语：花鸟本无情，却因时局残破而“溅泪”“惊心”，是拟人，以物之有情反衬人之悲痛，更显沉痛。答题时应先表明立场，再从手法（移情／拟人）与效果（强化悲痛）两方面说明理由。",
    rubric: [
      { point: "明确表态（任一立场均可）", score: 1 },
      { point: "指出相应手法：诗人为主语→移情于物；花鸟为主语→拟人", score: 2 },
      { point: "说明效果：强化国破家亡的悲痛", score: 2 }
    ],
    trap_types: ["开放题无立场", "手法与效果脱节"],
    recommended_minutes: 5
  },
  {
    id: 1207, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·陶渊明《饮酒》（其五）", sub_type: "诗眼·哲理",
    passage_title: "饮酒（其五）", passage_author: "〔东晋〕陶渊明",
    passage_content: "结庐在人境，而无车马喧。\n问君何能尔？心远地自偏。\n采菊东篱下，悠然见南山。\n山气日夕佳，飞鸟相与还。\n此中有真意，欲辨已忘言。",
    question_no: "7",
    question_stem: "“采菊东篱下，悠然见南山”中的“见”字，能否换成“望”？请说明理由。（4分）",
    max_score: 4,
    standard_answer: "不能。“见”是“无意中看到”，写出诗人采菊时心境悠闲、目光不经意触及南山，主客融为一体，恰好体现“心远”的自然无待；“望”是“有意远看”，带有明确的目的性与主动性，会把闲适变成刻意，破坏全诗冲淡自然的意境。",
    rubric: [
      { point: "明确“不能换”", score: 1 },
      { point: "辨析“见”为无意得之，“望”为有意为之", score: 2 },
      { point: "落到意境／心境（自然、闲适、无待）", score: 1 }
    ],
    trap_types: ["炼字", "只辨词义不辨意境"],
    recommended_minutes: 4
  },
  {
    id: 1208, module_code: "POETRY", module_name: "古代诗歌鉴赏",
    source: "教材·刘禹锡《酬乐天扬州初逢席上见赠》", sub_type: "哲理句·用典",
    passage_title: "酬乐天扬州初逢席上见赠", passage_author: "〔唐〕刘禹锡",
    passage_content: "巴山楚水凄凉地，二十三年弃置身。\n怀旧空吟闻笛赋，到乡翻似烂柯人。\n沉舟侧畔千帆过，病树前头万木春。\n今日听君歌一曲，暂凭杯酒长精神。",
    question_no: "8",
    question_stem: "“沉舟侧畔千帆过，病树前头万木春”历来为人称道，请分析其妙处。（6分）",
    max_score: 6,
    standard_answer: "①以“沉舟”“病树”自比，写自己被贬二十三年的沦落处境；②“千帆过”“万木春”写新人辈出、万象更新，两相对照，形成强烈的今昔与新旧对比；③诗人并未沉溺于自伤，反而在其中见出豁达：个人的沉滞不碍时代的向前，故能“暂凭杯酒长精神”；④景物中含有哲理，成为后世传诵的警句。",
    rubric: [
      { point: "指出“沉舟”“病树”自比（身世之感）", score: 2 },
      { point: "分析对比：个人沉滞 vs 时代更新", score: 2 },
      { point: "落到豁达情怀／哲理意味", score: 2 }
    ],
    trap_types: ["比喻义误读", "只答景不答情"],
    recommended_minutes: 6
  },

  /* ============================================================
     四、信息类阅读（INFO_READ）—— 九个设误陷阱
     ============================================================ */
  {
    id: 1301, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·AI 与写作", sub_type: "绝对化·以偏概全",
    passage_title: "AI 写作工具的能与不能", passage_author: "",
    passage_content: "AI 写作工具已能生成相当流畅的文本，但研究者提醒，这种“流畅”来自对海量语料的概率拟合，而非对意义的真正把握。当被要求论证一个反直觉的观点时，它往往倾向于复述训练语料中占多数的立场，很难主动构造反例来检验自己。因此，把 AI 用于初稿生成、格式整理是可行的，用于观点创新则风险较高。",
    question_no: "1",
    question_stem: "下列对材料内容的理解，不正确的一项是（3分）",
    options: [
      "A. AI 文本的流畅性来自对语料的概率拟合，而非对意义的把握。",
      "B. AI 难以主动构造反例，与其不真正把握意义有关。",
      "C. 只要用 AI 生成初稿，就不必担心观点雷同的问题。",
      "D. 作者对把 AI 用于观点创新持保留态度。"
    ],
    max_score: 3,
    standard_answer: "选 C。原文只说“初稿生成、格式整理可行”，并未承诺观点不会雷同；恰恰相反，原文指出 AI 会“复述语料中占多数的立场”，观点雷同正是其主要风险。C 项以“只要……就……”把有限结论绝对化。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "指出“只要……就……”属绝对化，且与原文“复述多数立场”矛盾", score: 1 }
    ],
    trap_types: ["绝对化", "以偏概全"],
    recommended_minutes: 3
  },
  {
    id: 1302, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·传统村落数字化", sub_type: "以偏概全",
    passage_title: "扫描之后，村落还剩什么", passage_author: "",
    passage_content: "传统村落的数字化保护近年提速，三维扫描可以把建筑形制完整记录下来。但有学者提醒：扫描记录的是“物”的几何信息，而村落的价值还在于人与空间的使用关系——节庆、耕作、邻里往来。这些“活”的部分一旦消失，模型再精确，也只是一具标本。",
    question_no: "2",
    question_stem: "下列对材料内容的理解，不正确的一项是（3分）",
    options: [
      "A. 三维扫描能够记录传统村落建筑的形制。",
      "B. 村落的价值包括人与空间之间的使用关系。",
      "C. 只要完成三维扫描，传统村落的保护就算完成。",
      "D. “标本”一词含有对“见物不见人”的批评意味。"
    ],
    max_score: 3,
    standard_answer: "选 C。原文明确说扫描只记录了“物”的几何信息，而村落价值还包括“活”的使用关系，因此扫描完成不等于保护完成。C 项以“只要……就算完成”以偏概全，与文意相反。",
    rubric: [
      { point: "选出 C", score: 2 },
      { point: "指出原文“活的部分一旦消失……只是标本”为反证", score: 1 }
    ],
    trap_types: ["以偏概全", "曲解文意"],
    recommended_minutes: 3
  },
  {
    id: 1303, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·城市绿地降温", sub_type: "混淆程度·强加因果",
    passage_title: "绿地不是越大越凉", passage_author: "",
    passage_content: "研究显示，城市绿地的降温效应并不随面积线性增长。当绿地面积超过约五公顷后，单位面积的降温幅度明显递减；而分散的小块绿地若能连成网络，反而可以改善整体通风与热交换。研究者因此建议：与其集中建一块大公园，不如优先打通绿地之间的连接。",
    question_no: "3",
    question_stem: "下列对材料内容的理解，不正确的一项是（3分）",
    options: [
      "A. 绿地面积与降温效应之间并非简单的线性关系。",
      "B. 绿地超过约五公顷后，单位面积降温幅度明显递减。",
      "C. 分散绿地连成网络，可以改善整体通风与热交换。",
      "D. 研究者认为大公园的降温效果不如小块绿地。",
    ],
    max_score: 3,
    standard_answer: "选 D。原文只说“与其集中建一块大公园，不如优先打通绿地之间的连接”，比较的是建设策略的优先次序，并未断言大公园的降温效果不如小块绿地。D 项把“策略优先级”偷换为“效果优劣”。",
    rubric: [
      { point: "选出 D", score: 2 },
      { point: "指出原文比较的是“策略优先”，非“降温效果”", score: 1 }
    ],
    trap_types: ["偷换概念", "混淆程度"],
    recommended_minutes: 3
  },
  {
    id: 1304, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·睡眠与记忆", sub_type: "混淆已然未然",
    passage_title: "睡眠不是硬盘", passage_author: "",
    passage_content: "睡眠对记忆的作用不是简单“保存”，而是“重组”。实验发现，受试者在睡眠之后，对所学材料的要点记得更牢，但对细节的准确回忆反而下降。研究者据此推测，睡眠在做一种“抽象化”加工：提取规律、舍弃枝节。这也意味着，考前通宵背诵细节，未必划算。",
    question_no: "4",
    question_stem: "下列对材料内容的理解，不正确的一项是（3分）",
    options: [
      "A. 睡眠对记忆的作用可以概括为“重组”而非单纯“保存”。",
      "B. 受试者睡眠后要点记得更牢，细节回忆却有所下降。",
      "C. 研究者认为睡眠可能在进行“抽象化”加工。",
      "D. 材料已证实睡眠必然导致细节记忆的永久丧失。"
    ],
    max_score: 3,
    standard_answer: "选 D。原文的“推测”“未必”都是推测性表述，且说的是“准确回忆下降”，并非“永久丧失”。D 项把推测说成“已证实”、把“下降”夸大为“永久丧失”，属混淆已然未然并绝对化。",
    rubric: [
      { point: "选出 D", score: 2 },
      { point: "指出原文用“推测”“未必”，属未然；且“下降”≠“永久丧失”", score: 1 }
    ],
    trap_types: ["混淆已然未然", "绝对化", "夸大程度"],
    recommended_minutes: 3
  },
  {
    id: 1305, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·方言保护", sub_type: "强加因果",
    passage_title: "两种方言保护", passage_author: "",
    passage_content: "方言保护常见两种做法：一是录音存档，建立语料库；二是推动方言进课堂。前者能保存“样本”，但录音里的方言是脱离交际的；后者让方言回到使用场景，却可能因课时有限而流于表演。二者并非替代关系，而是各有其位。",
    question_no: "5",
    question_stem: "下列对材料内容的理解，不正确的一项是（3分）",
    options: [
      "A. 录音存档可以保存方言样本，但样本脱离交际场景。",
      "B. 方言进课堂一定比录音存档更能真实地保存方言。",
      "C. 两种做法不是互相替代的关系。",
      "D. 作者对方言进课堂的实际效果有所保留。"
    ],
    max_score: 3,
    standard_answer: "选 B。原文说进课堂“可能因课时有限而流于表演”，只是一种可能的风险，并未断言它“一定”更真实；且原文明确二者“各有其位”，不做高下判断。B 项以“一定”绝对化并且强加优劣比较。",
    rubric: [
      { point: "选出 B", score: 2 },
      { point: "指出原文用“可能”，且“各有其位”不作高下判断", score: 1 }
    ],
    trap_types: ["绝对化", "强加因果"],
    recommended_minutes: 3
  },
  {
    id: 1306, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·碳汇渔业", sub_type: "概括与推断",
    passage_title: "碳汇渔业能算“负排放”吗", passage_author: "",
    passage_content: "海水养殖的贝类、藻类在生长过程中吸收碳，被称为“碳汇渔业”。但有研究指出，贝类的呼吸与钙化过程会释放二氧化碳，计算净碳汇量时必须扣除这部分；此外，养殖设施的能耗、饲料投入的碳排放也应计入。因此，把碳汇渔业简单等同于“负排放”，并不严谨。",
    question_no: "6",
    question_stem: "请概括作者对“碳汇渔业等于负排放”这一说法的态度，并分条说明其理由。（4分）",
    max_score: 4,
    standard_answer: "态度：不赞同（认为不严谨）。理由：①贝类呼吸与钙化过程会释放二氧化碳，净碳汇须扣除；②养殖设施的能耗与饲料投入的碳排放也应计入；③只有完成上述扣除与计入后的核算，才能判断是否为负排放。",
    rubric: [
      { point: "明确态度为“不赞同/认为不严谨”", score: 1 },
      { point: "理由一：呼吸与钙化释放 CO₂，净碳汇须扣除", score: 1 },
      { point: "理由二：设施能耗与饲料投入的排放应计入", score: 1 },
      { point: "能归纳出“须核算后才能判断”的结论", score: 1 }
    ],
    trap_types: ["概括不全", "只抄原文不分条"],
    recommended_minutes: 4
  },
  {
    id: 1307, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·博物馆文创", sub_type: "概念界定",
    passage_title: "文创不是印个纹样", passage_author: "",
    passage_content: "博物馆文创走红之后，不少馆把重心放在“爆款”开发上。但文创的本质是让藏品“被理解”，而不只是“被消费”。一个印着纹样的帆布包，如果不能让人追问纹样从何而来，它的传播就止于商品本身。真正有效的文创，往往附带可读的说明与可参与的活动。",
    question_no: "7",
    question_stem: "材料认为“文创的本质是让藏品‘被理解’”，请结合文本说明这一判断的依据。（4分）",
    max_score: 4,
    standard_answer: "①从反面看，只印纹样而无解释的帆布包，“传播止于商品”，说明单纯消费不足以实现文创价值；②从正面看，有效文创“附带可读的说明与可参与的活动”，正是让人理解藏品来历与内涵的途径；③因此文创的核心不是销量或爆款，而是理解的发生。",
    rubric: [
      { point: "反面论据：只印纹样的商品传播止于商品", score: 2 },
      { point: "正面论据：有效文创附说明与活动", score: 1 },
      { point: "归纳出“核心在理解而非消费/销量”", score: 1 }
    ],
    trap_types: ["论据与观点错配", "概括不全"],
    recommended_minutes: 4
  },
  {
    id: 1308, module_code: "INFO_READ", module_name: "信息类阅读",
    source: "原创材料·深阅读", sub_type: "因果谬误",
    passage_title: "碎片化不该全怪屏幕", passage_author: "",
    passage_content: "数字阅读常被批评导致注意力碎片化。但研究也显示，媒介本身并非决定因素：在同一块屏幕上，读长文与刷短消息的注意力模式差异显著。真正影响阅读质量的，是读者是否带着问题、是否愿意停留。把碎片化一概归咎于屏幕，可能遮蔽了更关键的习惯问题。",
    question_no: "8",
    question_stem: "材料对“屏幕导致碎片化”这一流行说法持什么态度？请简要分析其论证思路。（5分）",
    max_score: 5,
    standard_answer: "态度：不完全认同（认为归因过于简单）。思路：①先承认现象——数字阅读确实常伴随注意力碎片化；②再以同一屏幕下长文与短消息注意力模式不同作反证，说明媒介非决定因素；③进而提出真正变量是阅读习惯（是否带问题、是否愿停留）；④最后指出“一概归咎屏幕”会遮蔽更关键的问题。属先让步、再反证、后立论的思路。",
    rubric: [
      { point: "态度：不完全认同／认为归因简单化", score: 1 },
      { point: "指出“同屏幕不同模式”的反证作用", score: 2 },
      { point: "指出真正变量是阅读习惯", score: 1 },
      { point: "能概括“让步—反证—立论”的思路", score: 1 }
    ],
    trap_types: ["论证思路不清", "态度判断偏激"],
    recommended_minutes: 5
  },
  /* ============================================================
     五、文学类阅读（LIT_READ）—— 表-中-深三层
     ============================================================ */
  {
    id: 1401, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创小说片段·《修伞》", sub_type: "细节描写·人物心理",
    passage_title: "修伞（节选）", passage_author: "原创",
    passage_content: "老周把伞骨一根根掰直，铜丝在指间绕了三圈，剪断，压平。他不抬头，只问：“急用？”\n“不急。”来人说得很快。\n老周“唔”了一声，把伞撑开，对着门口的光转了一下，又合上：“明天来取。”\n来人站着没走。老周这才抬眼，看见那双鞋的鞋帮已经开了口，泥一直糊到脚踝。他把伞往柜台里一收，从抽屉底下摸出一双旧胶鞋，推到台面上：“雨还要下三天。”",
    question_no: "1",
    question_stem: "小说结尾老周“摸出一双旧胶鞋”这一细节，对刻画人物有什么作用？请简要分析。（5分）",
    max_score: 5,
    standard_answer: "①以动作细节代替语言，写出老周的善解人意：他早看出来人窘迫，却不点破，避免对方难堪；②“推到台面上”而非“递过去”，动作随意，是替人留体面的方式；③与前文“不抬头”“这才抬眼”的冷淡形成反差，使人物由“疏离的手艺人”转为“沉默的体贴者”，形象更立体；④“雨还要下三天”一句以天气作结，把关心藏在事实里，含蓄而有味。",
    rubric: [
      { point: "指出细节体现的体贴/善解人意（不点破、留体面）", score: 2 },
      { point: "指出与前面冷淡态度的反差，使形象立体", score: 2 },
      { point: "点出“雨还要下三天”的含蓄表达效果", score: 1 }
    ],
    trap_types: ["细节作用题空泛", "只答性格不答手法"],
    recommended_minutes: 5
  },
  {
    id: 1402, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创小说片段·《修伞》", sub_type: "物象作用",
    passage_title: "修伞（节选）", passage_author: "原创",
    passage_content: "老周把伞骨一根根掰直，铜丝在指间绕了三圈，剪断，压平。他不抬头，只问：“急用？”\n“不急。”来人说得很快。\n老周“唔”了一声，把伞撑开，对着门口的光转了一下，又合上：“明天来取。”\n来人站着没走。老周这才抬眼，看见那双鞋的鞋帮已经开了口，泥一直糊到脚踝。他把伞往柜台里一收，从抽屉底下摸出一双旧胶鞋，推到台面上：“雨还要下三天。”",
    question_no: "2",
    question_stem: "“伞”在文中反复出现，请探究其作用。（6分）",
    max_score: 6,
    standard_answer: "①结构上，“伞”是全文的线索：掰伞骨、撑伞看光、收伞，动作链由伞串起，使短小的情节集中完整。②人物上，修伞的专注（绕三圈、剪断、压平）见其手艺与性情，伞成为人物形象的载体。③意蕴上，伞是“遮护”的象征，与后文送胶鞋形成呼应——他修的是伞，做的是替人挡雨的事，主题由此深化。④“把伞往柜台里一收”这一动作，正是把“分内之事”收束，转而做“分外之事”，是情节的转折点。",
    rubric: [
      { point: "结构：线索作用，串联动作与情节", score: 2 },
      { point: "人物：修伞动作见手艺与性情", score: 1 },
      { point: "意蕴：伞的“遮护”象征与送鞋呼应", score: 2 },
      { point: "指出“收伞”是情节转折", score: 1 }
    ],
    trap_types: ["物象作用只答线索", "象征义空泛"],
    recommended_minutes: 6
  },
  {
    id: 1403, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创散文片段·《旧墙》", sub_type: "语言特色",
    passage_title: "旧墙（节选）", passage_author: "原创",
    passage_content: "墙是旧的了。青砖一层层往上垒，缝里长着草，草也不高，风一来就伏下去，风一走又直起来。墙根有一道水痕，是梅雨留下的，深一块浅一块，像谁用淡墨随手抹了一笔，抹完就忘了。我小时候在这儿量过身高，用碎瓦片划一道，划完还要退后两步看看，仿佛那一横就是长大的凭证。",
    question_no: "3",
    question_stem: "赏析文中画线部分（“墙根有一道水痕……抹完就忘了”）的语言特色。（5分）",
    max_score: 5,
    standard_answer: "①用“淡墨”“抹了一笔”作比，把水痕的深浅不匀写成随意的笔墨痕迹，化实为虚，富有画面感；②“像谁……抹完就忘了”以拟人化的揣测出之，语气轻淡，带出时光无心、人事无常的意味；③句式短促而舒缓，与追忆的语调相合；④口语化的“谁”“忘了”与文言的“淡墨”相融，雅俗兼具，形成冲淡自然的语言风格。",
    rubric: [
      { point: "指出比喻（水痕如淡墨）及其画面效果", score: 2 },
      { point: "指出拟人化揣测（“像谁……忘了”）的意味", score: 2 },
      { point: "点出语言风格（冲淡自然/雅俗相融）或句式作用", score: 1 }
    ],
    trap_types: ["语言题只答修辞名", "风格词空贴"],
    recommended_minutes: 5
  },
  {
    id: 1404, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创散文片段·《旧墙》", sub_type: "句意理解·情感",
    passage_title: "旧墙（节选）", passage_author: "原创",
    passage_content: "墙是旧的了。青砖一层层往上垒，缝里长着草，草也不高，风一来就伏下去，风一走又直起来。墙根有一道水痕，是梅雨留下的，深一块浅一块，像谁用淡墨随手抹了一笔，抹完就忘了。我小时候在这儿量过身高，用碎瓦片划一道，划完还要退后两步看看，仿佛那一横就是长大的凭证。",
    question_no: "4",
    question_stem: "结尾说“仿佛那一横就是长大的凭证”，这句话包含了作者怎样的情感？请结合全文分析。（5分）",
    max_score: 5,
    standard_answer: "①表层是童年量身高时的郑重与期待，“退后两步看看”写出孩子对成长的急切；②“仿佛”二字又透出成年后的清醒——那些划痕早已被风雨抹平，并不能真的证明什么；③因此句中既有对童真的温情怀念，也有对时光流逝、旧物难留的怅惘；④与上文“抹完就忘了”的水痕相呼应，形成“留痕—消痕”的情感结构。",
    rubric: [
      { point: "表层：童年量身高的郑重与期待", score: 2 },
      { point: "深层：“仿佛”透出的清醒与怅惘", score: 2 },
      { point: "联系“水痕/忘了”指出呼应结构", score: 1 }
    ],
    trap_types: ["只答怀念不答怅惘", "忽略“仿佛”"],
    recommended_minutes: 5
  },
  {
    id: 1405, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创小说片段·《渡口》", sub_type: "叙述视角",
    passage_title: "渡口（节选）", passage_author: "原创",
    passage_content: "船到河心，雾还没散。父亲把篙插进水里，水面上只露出一截，像一根没写完的竖。\n“你回去吧。”他说。\n我没动。我看见他的背驼下去，又直起来，篙也跟着起落。雾里看不见对岸，只有水声一下一下，像有人在很远的地方敲钟。\n后来我才知道，那天他并没有到对岸。他在河心把船停了一炷香的工夫，又撑了回来。",
    question_no: "5",
    question_stem: "小说采用第一人称“我”的视角叙述，有什么表达效果？（5分）",
    max_score: 5,
    standard_answer: "①“我”是亲历者，所见限于雾中河心，无法看清全貌，天然形成限制视角，制造悬念与含蓄；②“后来我才知道”一句让成年的“我”介入，形成回溯性叙述，使童年的不解与成年的了然并置，情感更厚重；③“我”只能看见父亲的背影与动作，看不见他的神情，父亲沉默的爱因此不被说破，符合人物性格；④读者与“我”同步受限，结尾的补叙才产生震动。",
    rubric: [
      { point: "限制视角：所见有限，制造悬念/含蓄", score: 2 },
      { point: "回溯叙述：“后来我才知道”的成熟视角介入", score: 2 },
      { point: "父亲形象因“看不见神情”而更含蓄，或读者同步受限的效果", score: 1 }
    ],
    trap_types: ["视角术语混用", "效果与文本脱节"],
    recommended_minutes: 5
  },
  {
    id: 1406, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创小说片段·《渡口》", sub_type: "结尾效果",
    passage_title: "渡口（节选）", passage_author: "原创",
    passage_content: "船到河心，雾还没散。父亲把篙插进水里，水面上只露出一截，像一根没写完的竖。\n“你回去吧。”他说。\n我没动。我看见他的背驼下去，又直起来，篙也跟着起落。雾里看不见对岸，只有水声一下一下，像有人在很远的地方敲钟。\n后来我才知道，那天他并没有到对岸。他在河心把船停了一炷香的工夫，又撑了回来。",
    question_no: "6",
    question_stem: "小说以“他在河心把船停了一炷香的工夫，又撑了回来”结尾，这样写有什么好处？（6分）",
    max_score: 6,
    standard_answer: "①情节上出人意料：前文写“你回去吧”，读者以为父亲要渡河，结尾却揭示他只是停在河心又折返，形成反转；②人物上，这一停一返把父亲“想送又不舍、最终放手”的心理具象化，无声胜有声；③主题上，河心成了一个悬置的空间，父爱的克制与告别的不忍都停在那里，比直抒更动人；④结构上照应开头的雾与“看不见对岸”，留下余味，言有尽而意无穷。",
    rubric: [
      { point: "情节反转：以为渡河，实为折返", score: 2 },
      { point: "人物心理：想送又不舍、最终放手的具象化", score: 2 },
      { point: "主题或结构：余味/照应开头的雾", score: 2 }
    ],
    trap_types: ["结尾效果套话", "忽略伏笔照应"],
    recommended_minutes: 6
  },
  {
    id: 1407, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创散文片段·《灯》", sub_type: "环境描写作用",
    passage_title: "灯（节选）", passage_author: "原创",
    passage_content: "巷子很窄，两边的墙把天挤成一条。天黑得早，五点刚过，各家窗子就次第亮起来，黄的、白的、隔着一层旧纱的，都糊成一团。我站在巷口，忽然不敢往里走——那些灯没有一盏是为我留的。\n后来有一盏亮了。在巷子最里头，第三家的窗，光很弱，像有人在里面举着一支快燃尽的蜡烛。我知道那是母亲。她总是最后一个开灯，因为要等我把钥匙插进锁孔，她才肯相信今天真的回来了。",
    question_no: "7",
    question_stem: "文中对巷中灯火的描写有什么作用？请简要分析。（5分）",
    max_score: 5,
    standard_answer: "①营造氛围：窄巷、早黑、糊成一团的灯光，写出老巷的昏暗与拥挤，也烘托“我”站在巷口的迟疑；②反衬心境：别人的灯“没有一盏是为我留的”，以万家灯火反衬归人的孤独；③推动转折：最后第三家窗的弱光出现，由“无灯为我”转为“有灯等我”，情绪由冷转暖；④象征：母亲的灯是“等”的具象，为下文“她才肯相信”作铺垫。",
    rubric: [
      { point: "营造氛围（昏暗/拥挤），烘托迟疑", score: 2 },
      { point: "以万家灯火反衬孤独", score: 1 },
      { point: "推动情绪转折（由冷到暖）", score: 1 },
      { point: "灯的象征义（等待）并与下文呼应", score: 1 }
    ],
    trap_types: ["环境作用只答氛围", "忽略情绪转折"],
    recommended_minutes: 5
  },
  {
    id: 1408, module_code: "LIT_READ", module_name: "文学类阅读",
    source: "原创散文片段·《灯》", sub_type: "标题含义",
    passage_title: "灯（节选）", passage_author: "原创",
    passage_content: "巷子很窄，两边的墙把天挤成一条。天黑得早，五点刚过，各家窗子就次第亮起来，黄的、白的、隔着一层旧纱的，都糊成一团。我站在巷口，忽然不敢往里走——那些灯没有一盏是为我留的。\n后来有一盏亮了。在巷子最里头，第三家的窗，光很弱，像有人在里面举着一支快燃尽的蜡烛。我知道那是母亲。她总是最后一个开灯，因为要等我把钥匙插进锁孔，她才肯相信今天真的回来了。",
    question_no: "8",
    question_stem: "文章以“灯”为题，有多重含义，请结合全文探究。（6分）",
    max_score: 6,
    standard_answer: "①实指：巷中各家窗里的灯火，是具体的物象；②指母亲的等待：第三家窗那盏“很弱”的灯，是母亲守候的具象，灯亮着即人还在等；③指归家的确认：“要等我把钥匙插进锁孔，她才肯相信”，灯是母子之间确认平安的信号；④象征层面的温暖与牵挂：在“没有一盏是为我留”的冷里，那一盏弱光成为归处的意义。",
    rubric: [
      { point: "实指：巷中灯火", score: 1 },
      { point: "母亲的等待（弱光/最后一个开灯）", score: 2 },
      { point: "归家确认的信号（钥匙与锁孔）", score: 2 },
      { point: "象征：温暖、牵挂、归处的意义", score: 1 }
    ],
    trap_types: ["标题含义只答一层", "实虚不分"],
    recommended_minutes: 6
  },

  /* ============================================================
     六、语言文字运用（LANG_USE）
     ============================================================ */
  {
    id: 1501, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·成语辨析", sub_type: "望文生义",
    question_no: "1",
    question_stem: "下列各句中加点成语的使用，不正确的一项是（3分）",
    options: [
      "A. 这篇评论观点持平，虽不惊险，却也不失为一家之言，算得上差强人意。",
      "B. 洪水袭来，沿河几个村子首当其冲，房屋被淹，损失惨重。",
      "C. 他的这番考证材料翔实、逻辑严密，堪称不刊之论。",
      "D. 七月的江南酷热难当，真是七月流火，暑气逼人。"
    ],
    max_score: 3,
    standard_answer: "选 D。“七月流火”出自《诗经》，指农历七月大火星西沉、天气转凉，不能用来形容炎热，属望文生义。A“差强人意”指大体上还能使人满意，使用正确；B“首当其冲”指最先受到攻击或遭遇灾难，正确；C“不刊之论”指不可改动的言论，正确。",
    rubric: [
      { point: "选出 D", score: 2 },
      { point: "能指出“七月流火”本义为天气转凉", score: 1 }
    ],
    trap_types: ["望文生义", "成语误用"],
    recommended_minutes: 2
  },
  {
    id: 1502, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·病句辨析", sub_type: "成分残缺",
    question_no: "2",
    question_stem: "下列各句中，没有语病的一项是（3分）",
    options: [
      "A. 通过这次社区调研，使我真正理解了基层工作的复杂与琐碎。",
      "B. 针对老旧小区停车难的问题，街道办组织居民进行了多轮协商。",
      "C. 能否培养学生的审辨思维，是衡量一所学校教学质量优良的重要标志。",
      "D. 随着城市更新项目的推进，让许多老街区重新焕发了生机。"
    ],
    max_score: 3,
    standard_answer: "选 B。A 项“通过……使……”导致主语残缺；C 项“能否”是两面，“优良”是一面，两面对一面不搭配；D 项“随着……让……”同样造成主语残缺。B 项成分完整，表意明确。",
    rubric: [
      { point: "选出 B", score: 2 },
      { point: "能指出 A、D 为“通过/随着……使/让”造成的主语残缺，C 为两面对一面", score: 1 }
    ],
    trap_types: ["成分残缺", "两面对一面"],
    recommended_minutes: 3
  },
  {
    id: 1503, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·病句辨析", sub_type: "搭配不当",
    question_no: "3",
    question_stem: "下列各句中，没有语病的一项是（3分）",
    options: [
      "A. 经过一学期的训练，他的阅读速度和理解水平都有了明显改进。",
      "B. 这部纪录片以细腻的镜头语言，展现了黄河沿岸普通人的生活变迁。",
      "C. 我们要努力提高全社会对非遗保护的意识，杜绝不再发生类似破坏。",
      "D. 能否坚持长期主义，决定了一个企业走得稳、走得远。"
    ],
    max_score: 3,
    standard_answer: "选 B。A 项“水平”与“改进”搭配不当，应为“提高”；C 项“杜绝不再发生”否定不当，属多重否定误用；D 项“能否”为两面，“走得稳、走得远”为一面，两面对一面。",
    rubric: [
      { point: "选出 B", score: 2 },
      { point: "能指出 A 搭配不当、C 否定失当、D 两面对一面", score: 1 }
    ],
    trap_types: ["搭配不当", "否定失当", "两面对一面"],
    recommended_minutes: 3
  },
  {
    id: 1504, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·语句补写", sub_type: "语境衔接",
    question_no: "4",
    question_stem: "请在下面文段横线处补写恰当的语句，使整段文字语意完整连贯，内容贴切，逻辑严密，每处不超过 15 字。（6分）\n读书的方法有很多，但有一条常被忽略：__①__。读得快，未必读得懂；读得慢，也未必读得深。真正要紧的，是读完之后能否用自己的话复述出来。__②__，说明你只是“过了一遍眼”；__③__，才算真正读进去了。",
    max_score: 6,
    standard_answer: "①读的速度并不等于读的质量（或：读得快慢与读懂与否无关）　②如果复述不出来　③如果能把要点讲清楚（或：如果能用自己的话讲明白）",
    rubric: [
      { point: "①能承上启下，指出“速度≠质量”", score: 2 },
      { point: "②与后文“只是过了一遍眼”构成假设/因果，且为否定情形", score: 2 },
      { point: "③与②形成对照，且为肯定情形，衔接“才算真正读进去”", score: 2 }
    ],
    trap_types: ["补写不照应", "字数超限"],
    recommended_minutes: 4
  },
  {
    id: 1505, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·句式变换", sub_type: "长句化短",
    question_no: "5",
    question_stem: "把下面的长句改写成三个短句，可以增删个别词语，但不得改变原意。（5分）\n那种在长期的生活实践中形成的、以朴素经验为基础、往往通过口耳相传延续下来的民间智慧，在今天依然有着不可替代的价值。",
    max_score: 5,
    standard_answer: "①民间智慧往往通过口耳相传延续下来。②它以朴素经验为基础，在长期的生活实践中形成。③这种民间智慧在今天依然有着不可替代的价值。",
    rubric: [
      { point: "拆出“口耳相传延续”一层，独立成句", score: 2 },
      { point: "拆出“以朴素经验为基础／长期实践中形成”一层，独立成句", score: 2 },
      { point: "保留“今天依然有不可替代的价值”一层，且原意未变", score: 1 }
    ],
    trap_types: ["改写后成分残缺", "改变原意"],
    recommended_minutes: 4
  },
  {
    id: 1506, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·语句衔接", sub_type: "语句复位",
    question_no: "6",
    question_stem: "填入下面文段横线处的语句，衔接最恰当的一项是（3分）\n传统技艺的传承，往往依赖师徒之间的长期相处。师傅不只是在教手艺，__________。因此，单纯的“技艺培训速成班”，很难真正延续一门手艺。",
    options: [
      "A. 而且手艺本身也在不断发生变化",
      "B. 更是在日常起居中传递一种做事的分寸与耐心",
      "C. 但徒弟的天赋也起着决定性作用",
      "D. 因为手艺的工序通常十分繁复"
    ],
    max_score: 3,
    standard_answer: "选 B。前句“不只是”要求后句用“更是/还在”构成递进，B 项不仅在句式上呼应，且“分寸与耐心”正与后文“速成班难以延续”构成因果——速成班缺的正是长期相处中的熏陶。",
    rubric: [
      { point: "选出 B", score: 2 },
      { point: "能说明“不只是……更是”的递进呼应，以及与后文的因果", score: 1 }
    ],
    trap_types: ["关联词不照应", "忽略后文因果"],
    recommended_minutes: 2
  },
  {
    id: 1507, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·标点符号", sub_type: "书名号与引号",
    question_no: "7",
    question_stem: "下列各句中，标点符号使用正确的一项是（3分）",
    options: [
      "A. 他最近在读《论语译注》和《史记》，还写了一篇题为《君子不器》的读后感。",
      "B. 学校开展了以“《青春之歌》”为主题的读书节活动。",
      "C. 会上讨论了“如何提高课堂效率？”这一问题。",
      "D. 他说：“我今天读完了《红楼梦》，其中“黛玉葬花”一节最动人”。"
    ],
    max_score: 3,
    standard_answer: "选 A。B 项主题名已用引号，其中再套书名号虽不算错，但“以《青春之歌》为主题”不应整体加引号，属滥用；C 项引文作句子成分（“这一问题”），问号应改为逗号或删去；D 项引号内再套引号应改用单引号（‘黛玉葬花’），且句号应在引号内。",
    rubric: [
      { point: "选出 A", score: 2 },
      { point: "能指出 C 的问号误用或 D 的引号嵌套错误", score: 1 }
    ],
    trap_types: ["标点误用", "引号嵌套"],
    recommended_minutes: 2
  },
  {
    id: 1508, module_code: "LANG_USE", module_name: "语言文字运用",
    source: "精编·修辞仿写", sub_type: "仿写",
    question_no: "8",
    question_stem: "仿照下面画线的句子，在横线处续写两句，要求句式一致、语意连贯。（5分）\n时间是最公平的裁判：它让浮躁的喧嚣渐渐沉底，________________，________________。",
    max_score: 5,
    standard_answer: "示例：它让沉默的坚持慢慢显出分量，它让仓促的结论最终露出破绽。（句式须为“它让+偏正短语+副词+动词+宾语”，语意须与前句“公平裁判”的褒贬平衡相承，且两句形成对照。）",
    rubric: [
      { point: "句式与画线句一致（“它让……的……渐渐/慢慢/最终……”）", score: 2 },
      { point: "续写两句，且两句之间形成对照或递进", score: 2 },
      { point: "语意与“最公平的裁判”相承（褒贬平衡、评判意味）", score: 1 }
    ],
    trap_types: ["句式不一致", "语意断裂"],
    recommended_minutes: 4
  },

  /* ============================================================
     七、作文微格（ESSAY）—— 200 字主体段
     ============================================================ */
  {
    id: 1601, module_code: "ESSAY", module_name: "作文（含书写）",
    source: "原创命题·长期主义", sub_type: "主体段·例证分析",
    question_no: "1",
    question_stem: "【微格任务】以“时间的复利”为话题，写一个 200 字左右的主体段。要求：①首句为分论点；②举一个具体事例（人、事、结果须具体）；③对事例作因果分析，不得只叙述；④末句回扣分论点。",
    max_score: 10,
    standard_answer: "参考段落：时间的复利，来自对同一件事的反复投入。敦煌研究院的樊锦诗在莫高窟一待五十余年，从清理积沙、编号建档做起，把散乱的洞窟变成可检索的数字档案。她的成果并非某一天的灵感，而是把“每天多做一点”累积成“不可替代”——正因为在同一坐标上持续叠加，琐碎的工作才产生了复利。可见，复利不在起点的高低，而在能否把时间押在同一处。",
    rubric: [
      { point: "首句是明确的分论点（判断句，非话题重复）", score: 2 },
      { point: "事例具体：有具体人物、具体行为、具体结果", score: 3 },
      { point: "有事例分析：解释“为什么能产生复利”，而非复述事迹", score: 3 },
      { point: "末句回扣分论点，且与首句不完全重复", score: 2 }
    ],
    trap_types: ["以叙代议", "事例空泛", "首尾不呼应"],
    recommended_minutes: 15
  },
  {
    id: 1602, module_code: "ESSAY", module_name: "作文（含书写）",
    source: "原创命题·技术与人文", sub_type: "主体段·对比论证",
    question_no: "2",
    question_stem: "【微格任务】以“工具越便利，人越需要自觉”为分论点，写一个 200 字左右的对比论证段。要求：①先立后破或先破后立；②对比的两方须在同一维度上；③结尾给出条件或边界。",
    max_score: 10,
    standard_answer: "参考段落：工具越便利，人越需要自觉。导航软件能在三秒内给出最优路线，人却因此失去了辨认方向的能力；搜索引擎能瞬间调出千万条答案，人却因此少了推演过程的耐心。二者对比可见：便利节省的是“操作成本”，削弱的却是“能力本身”。这并非否定工具，而是提醒——当工具替代了过程，人必须主动把过程补回来：查到的答案要自己再推一遍，走过的路要自己再认一次。便利是外援，自觉是内功。",
    rubric: [
      { point: "对比双方在同一维度（同为“便利 vs 能力”）", score: 3 },
      { point: "有“先立后破”或“先破后立”的结构层次", score: 2 },
      { point: "给出条件或边界（并非否定工具，而是……）", score: 3 },
      { point: "语言有概括力，末句有收束", score: 2 }
    ],
    trap_types: ["对比不同维度", "一边倒无论证", "无边界表述"],
    recommended_minutes: 15
  },
  {
    id: 1603, module_code: "ESSAY", module_name: "作文（含书写）",
    source: "原创命题·材料作文", sub_type: "审题立意",
    question_no: "3",
    question_stem: "【微格任务】阅读下面材料，写出你的中心论点与两个分论点（不必成文，共 120 字以内）。（10分）\n有人说，年轻人应当“先站稳，再出发”；也有人说，正因为年轻，才该“边走边找方向”。",
    max_score: 10,
    standard_answer: "示例：中心论点——站稳与出发并非先后关系，而是互为条件：以最小成本的行动获取方向，以方向校准站稳的位置。分论点一：不出发的“站稳”容易变成原地踏步，因为方向的判断需要真实反馈。分论点二：不站稳的“出发”容易变成盲目漂流，因为每一次转向都需要一个可退回的立足点。（评分要点：论点须统摄两则材料，不可只取一边；两个分论点须各自成立且不重复。）",
    rubric: [
      { point: "中心论点统摄两则材料（不做简单二选一）", score: 4 },
      { point: "分论点一成立，且能支撑中心论点", score: 2 },
      { point: "分论点二成立，且与分论点一不交叉重复", score: 2 },
      { point: "表述简洁，总字数不超过 120 字", score: 2 }
    ],
    trap_types: ["立意偏取一边", "分论点重复", "论点与材料脱节"],
    recommended_minutes: 12
  },
  {
    id: 1604, module_code: "ESSAY", module_name: "作文（含书写）",
    source: "原创命题·概念辨析", sub_type: "概念界定",
    question_no: "4",
    question_stem: "【微格任务】有人认为“坚持就是不动摇”，有人认为“坚持是不断修正方向”。请先界定“坚持”的内涵，再据此写一个 150 字左右的辨析段。（8分）",
    max_score: 8,
    standard_answer: "参考段落：坚持的实质不是姿态的固定，而是目标的守持。若把坚持理解为“不动摇”，则一切修正都成了背叛，可现实中方向本身常需依据反馈调整；若把坚持理解为“不断修正”，又容易滑向随波逐流，失去判断的锚点。二者的分野在于：守住的是“为何出发”，可变的是“如何抵达”。目标的守持允许路径的改换，路径的固执反而可能背离初衷。因此，真正的坚持是锚定目的、松动手段。",
    rubric: [
      { point: "先给出“坚持”的内涵界定（非循环定义）", score: 2 },
      { point: "辨析两种理解各自的合理与偏失", score: 3 },
      { point: "给出分野标准（守目的／变手段）", score: 2 },
      { point: "末句收束有力，语言简洁", score: 1 }
    ],
    trap_types: ["概念循环定义", "只辨不立", "两端各打五十大板"],
    recommended_minutes: 12
  },
  {
    id: 1605, module_code: "ESSAY", module_name: "作文（含书写）",
    source: "原创命题·开头升格", sub_type: "开头升格",
    question_no: "5",
    question_stem: "【微格任务】下面是一个开头，请把它升格为 100 字以内的开头，要求去掉套话、以具体场景或矛盾切入。（8分）\n原开头：“随着时代的发展，科技越来越发达，人工智能已经深入到我们生活的方方面面，这引起了人们的广泛讨论。”",
    max_score: 8,
    standard_answer: "参考升格：一道作文题，学生三十秒写完，老师却要花三分钟判断该不该给分——这大概是今天最尴尬的“效率”。当写作可以被生成，“写得好”这件事，第一次需要重新定义。\n（评分要点：删净“随着……发展”“引起广泛讨论”类套话；以具体场景、细节或矛盾句切入；末句能自然引出论题。）",
    rubric: [
      { point: "完全删除“随着时代的发展”“引起广泛讨论”等套话", score: 2 },
      { point: "以具体场景／细节／矛盾切入", score: 3 },
      { point: "100 字以内，且能自然引出论题", score: 3 }
    ],
    trap_types: ["套话开头", "空洞铺陈", "字数超限"],
    recommended_minutes: 10
  },
  {
    id: 1606, module_code: "ESSAY", module_name: "作文（含书写）",
    source: "原创命题·结尾升格", sub_type: "结尾升格",
    question_no: "6",
    question_stem: "【微格任务】请为“慢下来，也是一种前进”这一观点写一个 80 字以内的结尾。要求：①不得重复开头观点；②不得用“让我们……吧”式号召；③须有具体意象或反向收束。（8分）",
    max_score: 8,
    standard_answer: "参考结尾：河在转弯处最慢，也最深。人不必时时向前，有时停下来，是为了让脚下的水积够深度。\n（评分要点：无“让我们”式空喊；有具体意象；与观点构成呼应而非复述。）",
    rubric: [
      { point: "未使用“让我们……吧”式号召", score: 2 },
      { point: "有具体意象（河、水、季节等）", score: 3 },
      { point: "与观点呼应而不复述，有反向或延展意味", score: 3 }
    ],
    trap_types: ["空喊口号", "重复观点", "无意象"],
    recommended_minutes: 8
  },
  // __BANK_TAIL__
];
