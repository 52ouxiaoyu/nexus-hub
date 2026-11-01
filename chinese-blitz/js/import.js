/* =============================================================================
 * 语文专项 · 试卷导入与 AI 分析
 * -----------------------------------------------------------------------------
 * 流程：PDF（试题卷）-> pdf.js 抽文本 -> 按大题切分 -> 逐大题调 AI 结构化
 *       -> 校验采分点分值 -> 校对表 -> 写入题库
 * 可选：PDF（答题卷）-> 抽每题得分
 *
 * 设计取舍：
 *  1) 不把整卷塞给模型。语文卷 6000~9000 字，一次性长上下文必然漏题、截断。
 *     按"大题"分块，每块 1~5 小题，逐块请求。
 *  2) 强制 JSON 输出 + 本地校验（采分点分值之和必须等于满分），不合格重试。
 *  3) AI 结果一律进校对表，绝不直接入库。机器判分不可信，人必须过一眼。
 * ========================================================================== */
(function () {
  "use strict";

  const PDFJS_VER = "3.11.174";
  const PDFJS_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@" + PDFJS_VER + "/build/";
  const CFG_KEY = "chinese_blitz_ai_cfg";

  const PRESETS = [
    { name: "DeepSeek", base: "https://api.deepseek.com", model: "deepseek-chat" },
    { name: "通义千问", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
    { name: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  ];

  const MODULES = [
    { code: "INFO_READ", name: "信息类阅读" },
    { code: "LIT_READ", name: "文学类阅读" },
    { code: "CLASSICAL", name: "文言文阅读" },
    { code: "POETRY", name: "古代诗歌鉴赏" },
    { code: "DICTATION", name: "名句默写" },
    { code: "LANG_USE", name: "语言文字运用" },
    { code: "ESSAY", name: "作文" },
  ];
  const MODULE_NAME = Object.fromEntries(MODULES.map((m) => [m.code, m.name]));

  const S = {
    paperText: "",
    sheetText: "",
    paperName: "",
    sections: [],
    parsed: [],
    busy: false,
    scoreMap: {},
  };

  // ---------------------------------------------------------------- 工具

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toast(msg, kind) {
    const el = $("cb-imp-toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "cb-imp-toast show " + (kind || "info");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.className = "cb-imp-toast";
    }, kind === "error" ? 6000 : 3200);
  }

  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      const c = raw ? JSON.parse(raw) : null;
      if (c && c.base && c.model) return c;
    } catch (e) {}
    return { base: PRESETS[0].base, model: PRESETS[0].model, key: "" };
  }
  function saveCfg(cfg) {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }
  let AI = loadCfg();

  // ---------------------------------------------------------------- PDF

  let pdfReady = null;
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfReady) return pdfReady;
    pdfReady = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = PDFJS_BASE + "pdf.min.js";
      sc.onload = () => {
        if (!window.pdfjsLib) return reject(new Error("pdf.js 加载异常"));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      sc.onerror = () => reject(new Error("pdf.js 加载失败，请检查网络"));
      document.head.appendChild(sc);
    });
    return pdfReady;
  }

  // 把 pdf.js 的逐字符 textItem 还原成段落：按 y 分组、按 x 排序
  function rebuildText(items) {
    const lines = [];
    let cur = null;
    const flush = () => {
      if (cur && cur.text.trim()) lines.push(cur.text.trim());
      cur = null;
    };

    for (const it of items) {
      if (typeof it.str !== "string") continue;
      const tr = it.transform || [];
      const x = tr[4] || 0;
      const y = tr[5] || 0;
      const h = it.height || 10;

      if (!cur || Math.abs(cur.y - y) > Math.max(2, h * 0.5)) {
        flush();
        cur = { y, x, text: it.str };
      } else {
        // 同一行：按 x 间距决定要不要补空格
        if (x - cur.x > h * 1.6 && !/[\s，。、；：？！）】」』]$/.test(cur.text)) cur.text += " ";
        cur.text += it.str;
        cur.x = x + (it.width || 0);
      }
    }
    flush();

    // 关键坑：不少中文字体把「一」「文」「高」这类常用字编码成康熙部首
    // （U+2E80–U+2FDF），肉眼一模一样但正则和模型都不认。对这一段做 NFKC。
    // 不能全篇 NFKC——那会把「Ⅰ」「Ⅱ」变成 "I"/"II"，破坏题干。
    const joined = lines
      .join("\n")
      .replace(/[\u2E80-\u2EFF\u2F00-\u2FDF]/g, (ch) => ch.normalize("NFKC"));
    return joined.replace(/[ \t]+/g, " ");
  }

  async function extractPdf(file, onProgress) {
    const lib = await ensurePdfJs();
    const buf = await file.arrayBuffer();
    const doc = await lib.getDocument({ data: buf }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(rebuildText(content.items));
      if (onProgress) onProgress(i, doc.numPages);
    }
    return pages.join("\n\n");
  }

  // ---------------------------------------------------------------- 切分大题

  const CN_NUM = "一二三四五六七八九十";
  const SECTION_RE = new RegExp("^\\s*([" + CN_NUM + "]+)\\s*[、.．]\\s*(.{0,40})$");
  const SUB_RE = new RegExp("^\\s*[（(]([" + CN_NUM + "]{1,3})[）)]\\s*(.{0,50})$");

  // 大题标题 -> 模块编码。题号对不上时靠这里兜底。
  function guessModule(title) {
    const t = title || "";
    if (/写作|作文/.test(t)) return "ESSAY";
    if (/默写|名篇名句|名句/.test(t)) return "DICTATION";
    if (/文言文|文言/.test(t)) return "CLASSICAL";
    if (/古代诗歌|诗歌鉴赏|古诗/.test(t)) return "POETRY";
    if (/语言文字运用|语用/.test(t)) return "LANG_USE";
    if (/文学类|现代文阅读\s*(Ⅱ|II|2|二)/.test(t)) return "LIT_READ";
    if (/信息类|实用类|论述类|现代文阅读\s*(Ⅰ|I|1|一)/.test(t)) return "INFO_READ";
    if (/现代文阅读/.test(t)) return "INFO_READ";
    return "";
  }

  function splitSections(text) {
    const lines = text.split(/\r?\n/);

    const l1 = [];
    const l2 = [];
    lines.forEach((ln, i) => {
      const t = ln.trim();
      if (t.length > 44) return;
      let m = t.match(SECTION_RE);
      if (m) {
        l1.push({ line: i, no: m[1], title: (m[2] || "").trim() });
        return;
      }
      m = t.match(SUB_RE);
      // 排除「（1）」「（2）」这种小题号——只认中文数字的二级标题
      if (m) l2.push({ line: i, no: m[1], title: (m[2] || "").trim() });
    });

    if (l1.length < 2) {
      return [{ no: "全卷", title: "", text: text.trim(), module: "" }];
    }

    const out = [];
    for (let i = 0; i < l1.length; i += 1) {
      const start = l1[i].line;
      const end = i + 1 < l1.length ? l1[i + 1].line : lines.length;

      // 这一级区间内若有 >=2 个中文数字二级标题，说明是「现代文阅读（一）（二）」
      // 这种分组，必须切细，否则信息类和文学类会被并成一块，模块判错。
      const subs = l2.filter((x) => x.line > start && x.line < end);
      if (subs.length >= 2) {
        for (let j = 0; j < subs.length; j += 1) {
          const s2 = subs[j].line;
          const e2 = j + 1 < subs.length ? subs[j + 1].line : end;
          const body = lines.slice(s2, e2).join("\n").trim();
          if (body.length < 25) continue;
          out.push({
            no: l1[i].no + "(" + subs[j].no + ")",
            title: subs[j].title || l1[i].title,
            text: body,
            module: guessModule(subs[j].title) || guessModule(l1[i].title),
          });
        }
        continue;
      }

      const body = lines.slice(start, end).join("\n").trim();
      if (body.length < 25) continue;
      out.push({
        no: l1[i].no,
        title: l1[i].title,
        text: body,
        module: guessModule(l1[i].title),
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- AI

  const SYSTEM_PROMPT = [
    "你是一位有二十年高考语文阅卷经验的特级教师，正在帮学生把一份试卷切成可训练的题目。",
    "",
    "硬性规则：",
    "1. 题干必须保留原文（含全部选项），不得改写、概括或补写原文没有的题。",
    "2. 参考答案要具体到能照着答题：写清「手法—内容—效果」或「分点—依据」的链条，",
    "   禁止只写「生动形象」「表达了作者情感」「承上启下」这类不给分的套话。",
    "3. 每条采分点必须写明「答到什么程度才给分」，并分配分值；",
    "   所有采分点分值之和必须严格等于该题满分。",
    "4. 选择题只给 1 条采分点，分值为满分。",
    "5. 默写题：采分点按句子拆分，写错一个字该句不得分。",
    "6. 作文题：不给参考范文，只给「立意方向 + 评分档位（一类/二类/三类各看什么）」。",
    "7. 宁可少切一题，不要凭空造题。",
    "",
    "只输出 JSON，不要任何解释性文字。",
  ].join("\n");

  function buildUserPrompt(section) {
    const hint = section.module
      ? `这个大题从标题看属于「${MODULE_NAME[section.module]}」，module_code 用 ${section.module}。`
      : "请自行判断 module_code。";
    return [
      hint,
      "可用的 module_code：" + MODULES.map((m) => `${m.code}（${m.name}）`).join("、"),
      "",
      "试卷原文如下（这是一整道大题）：",
      "-----",
      section.text.slice(0, 9000),
      "-----",
      "",
      "输出 JSON 格式：",
      JSON.stringify(
        {
          module_code: "INFO_READ",
          questions: [
            {
              question_no: "1",
              question_type: "选择|简答|翻译|默写|作文",
              question_stem: "完整题干（含选项，用 A. B. C. D. 分行）",
              max_score: 3,
              standard_answer: "具体参考答案",
              rubric: [{ point: "答到什么程度给分", score: 1 }],
              trap: "这题最常见的失分点（一句话）",
            },
          ],
        },
        null,
        1
      ),
    ].join("\n");
  }

  function extractJson(raw) {
    if (!raw) throw new Error("模型没有返回内容");
    let s = String(raw).trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return JSON.parse(s);
  }

  async function callAI(messages, opts) {
    if (!AI.key) throw new Error("还没有填 API Key，点右上角「AI 设置」");
    const url = AI.base.replace(/\/+$/, "") + "/chat/completions";
    const body = {
      model: AI.model,
      messages,
      temperature: (opts && opts.temperature) != null ? opts.temperature : 0.2,
      max_tokens: (opts && opts.maxTokens) || 4000,
    };
    if (!(opts && opts.noJsonMode)) body.response_format = { type: "json_object" };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + AI.key },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let detail = "";
      try {
        const j = await res.json();
        detail = (j.error && (j.error.message || j.error.code)) || JSON.stringify(j).slice(0, 160);
      } catch (e) {
        detail = (await res.text().catch(() => "")).slice(0, 160);
      }
      if (res.status === 401) throw new Error("API Key 无效（401），请检查是否复制完整");
      if (res.status === 402) throw new Error("账户余额不足（402），请先充值");
      if (res.status === 429) throw new Error("请求太频繁（429），等几秒再试");
      throw new Error(`接口报错 ${res.status}：${detail}`);
    }
    const j = await res.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
  }

  // 校验 + 兜底修正：采分点分值之和必须等于满分
  function normalizeQuestion(q, fallbackModule) {
    const out = {
      question_no: String(q.question_no || "").trim(),
      question_type: String(q.question_type || "").trim(),
      question_stem: String(q.question_stem || "").trim(),
      max_score: Number(q.max_score) || 0,
      standard_answer: String(q.standard_answer || "").trim(),
      rubric: [],
      trap: String(q.trap || "").trim(),
      module_code: String(q.module_code || fallbackModule || "INFO_READ"),
      warn: "",
    };

    if (!MODULE_NAME[out.module_code]) out.module_code = fallbackModule || "INFO_READ";

    const raw = Array.isArray(q.rubric) ? q.rubric : [];
    out.rubric = raw
      .map((r) => ({
        point: String((r && r.point) || "").trim(),
        score: Number(r && r.score) || 0,
      }))
      .filter((r) => r.point || r.score);

    if (!out.rubric.length) {
      out.rubric = [{ point: "参考答案要点（AI 未拆分，请人工补充）", score: out.max_score || 1 }];
      out.warn = "采分点缺失";
    }

    const sum = out.rubric.reduce((s, r) => s + r.score, 0);
    if (out.max_score && Math.abs(sum - out.max_score) > 0.51) {
      // 按比例缩放，并把尾差补给最后一条
      const k = out.max_score / (sum || 1);
      out.rubric = out.rubric.map((r) => ({ point: r.point, score: Math.round(r.score * k * 2) / 2 }));
      const s2 = out.rubric.reduce((s, r) => s + r.score, 0);
      out.rubric[out.rubric.length - 1].score += Math.round((out.max_score - s2) * 2) / 2;
      out.warn = `采分点分值已按比例校正（原 ${sum} 分 → ${out.max_score} 分）`;
    }
    if (!out.max_score) {
      out.max_score = sum || 1;
      out.warn = out.warn || "满分缺失，按采分点合计推定";
    }
    return out;
  }

  async function analyzeSection(section, idx, total) {
    setProgress(`正在分析第 ${idx + 1}/${total} 个大题：${section.title || section.no}…`);

    let attempt = 0;
    let lastErr = null;
    while (attempt < 2) {
      attempt += 1;
      try {
        const raw = await callAI(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(section) },
          ],
          { temperature: attempt === 1 ? 0.2 : 0, maxTokens: 4000 }
        );
        const j = extractJson(raw);
        const list = Array.isArray(j.questions) ? j.questions : [];
        if (!list.length) throw new Error("没有切出题目");
        const mod = j.module_code && MODULE_NAME[j.module_code] ? j.module_code : section.module;
        return list.map((q) => normalizeQuestion(q, mod));
      } catch (e) {
        lastErr = e;
        if (/API Key|余额|401|402/.test(e.message)) throw e;
      }
    }
    throw new Error(`「${section.title || section.no}」分析失败：${lastErr ? lastErr.message : "未知错误"}`);
  }

  // ---------------------------------------------------------------- 答题卷：抽每题得分

  // 逐行解析，不要用全文正则——「1．得分：3」这种写法，
  // 全文正则会把「得分」两字当分隔符一路贪到下一行，抽出 3:2 这种鬼分数。
  function parseScoresFromText(text) {
    const map = {};
    const lines = String(text || "").split(/\r?\n/);

    lines.forEach((line) => {
      const t = line.trim();
      if (!t || t.length > 60) return;

      // 行首题号：1． / 2、 / 9(1)． / 第3题
      const noM = t.match(/^(?:第\s*)?(\d{1,2})\s*(?:[（(]\s*\d{1,2}\s*[）)])?\s*[．.、:：]/);
      if (!noM) return;
      const no = Number(noM[1]);
      if (!(no >= 1 && no <= 40)) return;

      let sc = null;
      let m;

      // ① 明写「得分 3」「扣 1 分」「3/4 分」——最可靠
      m = t.match(/(?:得分|实得|应得)\s*[:：]?\s*(\d{1,2}(?:\.\d)?)/);
      if (m) sc = Number(m[1]);
      if (sc === null) {
        m = t.match(/(\d{1,2}(?:\.\d)?)\s*[/／]\s*\d{1,2}(?:\.\d)?\s*分?/);
        if (m) sc = Number(m[1]);
      }
      // ② 只有「X 分」且整行很短（题号 + 分数），才认；
      //    长句里的「（3 分）」是满分，不是得分，不能拿来当分数。
      if (sc === null && t.length <= 14) {
        m = t.match(/[^\d](\d{1,2}(?:\.\d)?)\s*分?\s*$/);
        if (m) sc = Number(m[1]);
      }

      if (sc !== null && sc >= 0 && sc <= 70) map[no] = sc;
    });

    return map;
  }

  async function aiExtractScores(sheetText, questions) {
    const brief = questions
      .map((q) => `${q.question_no}. 满分 ${q.max_score} 分`)
      .join("\n");
    const raw = await callAI(
      [
        {
          role: "system",
          content:
            "你从教师的批改记录里抽取每道题的得分。只输出 JSON：{\"scores\":{\"1\":3,\"2\":1.5}}。没有明确写出的题不要猜，直接省略。",
        },
        {
          role: "user",
          content: `题目清单：\n${brief}\n\n批改文本：\n-----\n${sheetText.slice(0, 7000)}\n-----`,
        },
      ],
      { temperature: 0, maxTokens: 1200 }
    );
    const j = extractJson(raw);
    const map = {};
    Object.entries(j.scores || {}).forEach(([k, v]) => {
      const no = parseInt(k, 10);
      const sc = Number(v);
      if (no && !isNaN(sc)) map[no] = sc;
    });
    return map;
  }

  // ---------------------------------------------------------------- 界面

  function setProgress(msg, kind) {
    const el = $("cb-imp-progress");
    if (!el) return;
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.className = "cb-imp-progress " + (kind || "");
    el.textContent = msg;
  }

  function renderSteps() {
    const app = $("cb-imp-app");
    if (!app) return;
    const hasPaper = !!S.paperText;
    const hasParsed = S.parsed.length > 0;
    app.innerHTML = `
      <div class="cb-imp-grid">
        <div class="cb-imp-col">
          <div class="card cb-imp-card">
            <div class="card-title"><span>① 试题卷</span>
              <span class="badge ${hasPaper ? "badge-jade" : "badge-gold"}">${hasPaper ? S.paperText.length + " 字" : "未导入"}</span>
            </div>
            <div class="cb-imp-drop" id="cb-imp-drop-paper">
              <input type="file" accept="application/pdf" id="cb-imp-file-paper" hidden />
              <div class="cb-imp-drop-inner">
                <div style="font-size:26px;">📄</div>
                <div><strong>拖入或点击选择试题卷 PDF</strong></div>
                <div class="cb-imp-hint">需要带文字层的电子版；扫描件请先做 OCR</div>
              </div>
            </div>
            ${
              hasPaper
                ? `<div class="cb-imp-preview">${esc(S.paperText.slice(0, 300))}…</div>
                   <div class="cb-imp-meta">共识别 ${S.sections.length} 个大题：${S.sections
                     .map((s) => esc(s.no + "、" + (s.title || "")))
                     .join("　")}</div>`
                : ""
            }
          </div>

          <div class="card cb-imp-card">
            <div class="card-title"><span>② 答题卷（可选）</span>
              <span class="badge ${S.sheetText ? "badge-jade" : ""}">${S.sheetText ? "已导入" : "用来抽每题得分"}</span>
            </div>
            <div class="cb-imp-drop" id="cb-imp-drop-sheet">
              <input type="file" accept="application/pdf" id="cb-imp-file-sheet" hidden />
              <div class="cb-imp-drop-inner">
                <div style="font-size:22px;">📝</div>
                <div><strong>拖入答题卷 PDF</strong></div>
                <div class="cb-imp-hint">只对「电子批改、分数在文字层」的卷子有效；手写扫描件请手动填分</div>
              </div>
            </div>
            ${S.sheetText ? `<div class="cb-imp-preview">${esc(S.sheetText.slice(0, 240))}…</div>` : ""}
          </div>
        </div>

        <div class="cb-imp-col">
          <div class="card cb-imp-card">
            <div class="card-title"><span>③ 让 AI 拆题</span></div>
            <p class="cb-imp-hint" style="line-height:1.9;margin:0 0 12px;">
              逐个大题交给模型：抽题干、写参考答案、拆采分点并分配分值。<br/>
              模型不直接往题库写，结果一律进下面的校对表。
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary" ${hasPaper && !S.busy ? "" : "disabled"} onclick="cbImpAnalyze()">
                ${S.busy ? "分析中…" : "开始分析"}
              </button>
              <button class="btn btn-outline" onclick="cbImpOpenSettings()">AI 设置</button>
              ${hasParsed ? `<button class="btn btn-outline" onclick="cbImpReset()">清空重来</button>` : ""}
            </div>
            <div id="cb-imp-progress" class="cb-imp-progress" style="display:none;"></div>
            <div class="cb-imp-hint" style="margin-top:10px;">
              模型：${esc(AI.model)} · ${esc(AI.base.replace(/^https?:\/\//, ""))} ·
              ${AI.key ? "Key 已配置" : "<span style='color:#b45309;'>Key 未配置</span>"}
            </div>
          </div>
        </div>
      </div>

      <div id="cb-imp-review"></div>
    `;

    bindDrop("cb-imp-drop-paper", "cb-imp-file-paper", "paper");
    bindDrop("cb-imp-drop-sheet", "cb-imp-file-sheet", "sheet");
    renderReview();
  }

  function bindDrop(dropId, inputId, kind) {
    const drop = $(dropId);
    const input = $(inputId);
    if (!drop || !input) return;
    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) handleFile(input.files[0], kind);
    });
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("over");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("over");
      })
    );
    drop.addEventListener("drop", (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f, kind);
    });
  }

  async function handleFile(file, kind) {
    if (!/\.pdf$/i.test(file.name)) return toast("目前只支持 PDF", "error");
    try {
      setProgress(`正在读取 ${file.name}…`);
      const text = await extractPdf(file, (i, n) => setProgress(`解析第 ${i}/${n} 页…`));
      setProgress("");
      if (text.replace(/\s/g, "").length < 80) {
        toast("这份 PDF 几乎抽不到文字，可能是扫描件（需要 OCR）", "error");
        return;
      }
      if (kind === "paper") {
        S.paperText = text;
        S.paperName = file.name;
        S.sections = splitSections(text);
        S.parsed = [];
        toast(`试题卷已解析：${S.sections.length} 个大题，${text.length} 字`, "ok");
      } else {
        S.sheetText = text;
        S.scoreMap = parseScoresFromText(text);
        toast("答题卷已解析", "ok");
      }
      renderSteps();
    } catch (e) {
      setProgress("");
      toast("读取失败：" + e.message, "error");
    }
  }

  // ---------------------------------------------------------------- 分析主流程

  async function analyze() {
    if (S.busy) return;
    if (!AI.key) {
      toast("先配置 API Key", "error");
      openSettings();
      return;
    }
    S.busy = true;
    S.parsed = [];
    renderSteps();

    const out = [];
    const errors = [];
    try {
      for (let i = 0; i < S.sections.length; i += 1) {
        try {
          const qs = await analyzeSection(S.sections[i], i, S.sections.length);
          qs.forEach((q) => out.push(q));
          S.parsed = out.slice();
          renderReview();
        } catch (e) {
          errors.push(e.message);
        }
      }

      // 答题卷分数：先用正则抽到的，抽不到再问模型
      if (S.sheetText && out.length) {
        let map = S.scoreMap;
        if (!Object.keys(map).length) {
          setProgress("正在从答题卷里抽取每题得分…");
          try {
            map = await aiExtractScores(S.sheetText, out);
          } catch (e) {
            map = {};
          }
        }
        out.forEach((q) => {
          const no = parseInt(q.question_no, 10);
          if (map[no] != null) q.earned = map[no];
        });
      }

      S.parsed = out;
      setProgress("");
      renderReview();
      toast(
        `分析完成：${out.length} 道题` + (errors.length ? `，${errors.length} 个大题失败` : ""),
        errors.length ? "warn" : "ok"
      );
      if (errors.length) {
        const box = $("cb-imp-errors");
        if (box) box.innerHTML = errors.map((e) => `<div>· ${esc(e)}</div>`).join("");
      }
    } finally {
      S.busy = false;
      renderSteps();
    }
  }

  // ---------------------------------------------------------------- 校对表

  function renderReview() {
    const box = $("cb-imp-review");
    if (!box) return;
    if (!S.parsed.length) {
      box.innerHTML = "";
      return;
    }
    const totalScore = S.parsed.reduce((s, q) => s + Number(q.max_score || 0), 0);

    // 题号冲突检测：同一份卷里题号不该重复。重复说明 AI 切错了或漏切了，
    // 这是最容易被忽略、又最影响后面训练的一种错。
    const noCount = {};
    S.parsed.forEach((q) => {
      const k = String(q.question_no || "").trim();
      if (k) noCount[k] = (noCount[k] || 0) + 1;
    });
    const dupNos = Object.keys(noCount).filter((k) => noCount[k] > 1);

    box.innerHTML = `
      <div class="card" style="margin-top:14px;">
        <div class="card-title">
          <span>④ 校对（AI 给的东西必须过一眼再入库）</span>
          <span class="badge badge-indigo">${S.parsed.length} 题 · 合计 ${totalScore} 分</span>
          ${dupNos.length ? `<span class="badge badge-red">题号冲突 ${dupNos.length} 处</span>` : ""}
        </div>
        <div id="cb-imp-errors" class="cb-imp-errors"></div>
        <div class="cb-imp-table-wrap">
          <table class="data-table cb-imp-table">
            <thead>
              <tr>
                <th style="width:62px;">题号</th>
                <th style="width:118px;">模块</th>
                <th style="width:64px;">满分</th>
                <th style="width:64px;">得分</th>
                <th>题干 / 参考答案 / 采分点</th>
                <th style="width:44px;"></th>
              </tr>
            </thead>
            <tbody>
              ${S.parsed
                .map((q, i) => {
                  const sum = q.rubric.reduce((s, r) => s + Number(r.score || 0), 0);
                  const bad = Math.abs(sum - Number(q.max_score || 0)) > 0.51;
                  return `
                <tr${dupNos.includes(String(q.question_no || "").trim()) ? ' style="background:#fdf6e8;"' : ""}>
                  <td><input class="cb-imp-in" data-i="${i}" data-f="question_no" value="${esc(q.question_no)}" style="width:100%;" /></td>
                  <td>
                    <select class="cb-imp-in" data-i="${i}" data-f="module_code" style="width:100%;">
                      ${MODULES.map(
                        (m) =>
                          `<option value="${m.code}" ${m.code === q.module_code ? "selected" : ""}>${m.name}</option>`
                      ).join("")}
                    </select>
                  </td>
                  <td><input class="cb-imp-in" type="number" step="0.5" data-i="${i}" data-f="max_score" value="${q.max_score}" style="width:100%;" /></td>
                  <td><input class="cb-imp-in" type="number" step="0.5" data-i="${i}" data-f="earned" value="${q.earned != null ? q.earned : ""}" placeholder="—" style="width:100%;" /></td>
                  <td>
                    ${dupNos.includes(String(q.question_no || "").trim()) ? `<div class="cb-imp-warn">⚠ 题号「${esc(q.question_no)}」在本卷出现 ${noCount[String(q.question_no || "").trim()]} 次，多半是切分错了</div>` : ""}
                    ${q.warn ? `<div class="cb-imp-warn">⚠ ${esc(q.warn)}</div>` : ""}
                    ${bad ? `<div class="cb-imp-warn">⚠ 采分点合计 ${sum} 分 ≠ 满分 ${q.max_score}</div>` : ""}
                    <details>
                      <summary>${esc((q.question_stem || "").slice(0, 60))}${(q.question_stem || "").length > 60 ? "…" : ""}</summary>
                      <div class="cb-imp-detail">
                        <label>题干</label>
                        <textarea class="cb-imp-in" data-i="${i}" data-f="question_stem" rows="3">${esc(q.question_stem)}</textarea>
                        <label>参考答案</label>
                        <textarea class="cb-imp-in" data-i="${i}" data-f="standard_answer" rows="4">${esc(q.standard_answer)}</textarea>
                        <label>采分点</label>
                        <div class="cb-imp-rubric">
                          ${q.rubric
                            .map(
                              (r, ri) => `<div class="cb-imp-rubric-row">
                                <span class="cb-imp-pt">${esc(r.point)}</span>
                                <span class="cb-imp-sc">${r.score} 分</span>
                              </div>`
                            )
                            .join("")}
                        </div>
                        ${q.trap ? `<label>常见失分</label><div class="cb-imp-trap">${esc(q.trap)}</div>` : ""}
                      </div>
                    </details>
                  </td>
                  <td><button class="cb-imp-del" title="删掉这题" onclick="cbImpDrop(${i})">✕</button></td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="cb-imp-actions">
          <div class="cb-imp-hint">导入后可以在「训练舱 → 做题」里按模块筛到这些题。</div>
          <button class="btn btn-primary" onclick="cbImpCommit()">确认入库（${S.parsed.length} 题）</button>
        </div>
      </div>
    `;

    box.querySelectorAll(".cb-imp-in").forEach((el) => {
      el.addEventListener("input", (e) => {
        const i = Number(e.target.dataset.i);
        const f = e.target.dataset.f;
        const v = e.target.value;
        if (f === "module_code" || f === "question_no") S.parsed[i][f] = v;
        else if (f === "question_stem" || f === "standard_answer") S.parsed[i][f] = v;
        else S.parsed[i][f] = v === "" ? null : Number(v);
      });
    });
  }

  function dropRow(i) {
    S.parsed.splice(i, 1);
    renderReview();
  }

  function resetAll() {
    S.paperText = "";
    S.sheetText = "";
    S.sections = [];
    S.parsed = [];
    S.scoreMap = {};
    renderSteps();
  }

  // ---------------------------------------------------------------- 入库

  function commit() {
    if (!S.parsed.length) return;
    const bad = S.parsed.filter((q) => !q.question_stem.trim());
    if (bad.length) return toast(`有 ${bad.length} 道题没有题干，先补上再入库`, "error");

    if (!window.cbImportQuestions) return toast("写入接口未就绪，请刷新页面", "error");

    const payload = S.parsed.map((q) => ({
      module_code: q.module_code,
      module_name: MODULE_NAME[q.module_code] || "未分类",
      question_no: String(q.question_no || ""),
      question_stem: q.question_stem,
      question_type: q.question_type || "",
      max_score: Number(q.max_score) || 1,
      standard_answer: q.standard_answer,
      rubric: q.rubric,
      trap: q.trap || "",
      source_name: S.paperName || "导入试卷",
    }));

    const res = window.cbImportQuestions(payload);
    toast(`已入库 ${res.added} 题` + (res.skipped ? `，跳过重复 ${res.skipped} 题` : ""), "ok");
    S.parsed = [];
    renderSteps();
    // 题库变了要整页刷新：STATE.questions 是 refreshAllData 时才拉的，
    // 只调筛题函数会拿旧缓存，表现为"入库了但做题页看不到"。
    if (typeof window.refreshAllData === "function") window.refreshAllData();
  }

  // ---------------------------------------------------------------- AI 设置

  function openSettings() {
    const box = $("cb-imp-settings");
    if (!box) return;
    box.style.display = "flex";
    $("cb-ai-base").value = AI.base;
    $("cb-ai-model").value = AI.model;
    $("cb-ai-key").value = AI.key || "";
    $("cb-ai-status").textContent = "";
  }
  function closeSettings() {
    const box = $("cb-imp-settings");
    if (box) box.style.display = "none";
  }
  function applyPreset(name) {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    $("cb-ai-base").value = p.base;
    $("cb-ai-model").value = p.model;
  }
  function saveSettings() {
    AI = {
      base: $("cb-ai-base").value.trim() || PRESETS[0].base,
      model: $("cb-ai-model").value.trim() || PRESETS[0].model,
      key: $("cb-ai-key").value.trim(),
    };
    saveCfg(AI);
    closeSettings();
    renderSteps();
    toast("已保存", "ok");
  }

  async function testConn() {
    const st = $("cb-ai-status");
    const probe = {
      base: $("cb-ai-base").value.trim(),
      model: $("cb-ai-model").value.trim(),
      key: $("cb-ai-key").value.trim(),
    };
    if (!probe.key) {
      st.textContent = "先填 Key";
      st.className = "cb-ai-status bad";
      return;
    }
    st.textContent = "测试中…";
    st.className = "cb-ai-status";
    const backup = AI;
    AI = probe;
    try {
      const out = await callAI(
        [
          { role: "system", content: '只输出 JSON {"ok":true}' },
          { role: "user", content: "连通性测试" },
        ],
        { temperature: 0, maxTokens: 20 }
      );
      st.textContent = "连通正常：" + String(out).slice(0, 40);
      st.className = "cb-ai-status good";
    } catch (e) {
      st.textContent = e.message;
      st.className = "cb-ai-status bad";
      AI = backup;
    }
  }

  // ---------------------------------------------------------------- 对外

  window.cbImpAnalyze = analyze;
  window.cbImpReset = resetAll;
  window.cbImpDrop = dropRow;
  window.cbImpCommit = commit;
  window.cbImpOpenSettings = openSettings;
  window.cbImpCloseSettings = closeSettings;
  window.cbImpApplyPreset = applyPreset;
  window.cbImpSaveSettings = saveSettings;
  window.cbImpTestConn = testConn;

  window.cbImpMount = function () {
    renderSteps();
  };
  // 测试用：注入已解析文本，跳过 PDF
  window.cbImpInject = function (paperText, sheetText) {
    S.paperText = paperText || "";
    S.sheetText = sheetText || "";
    S.paperName = "手动注入";
    S.sections = splitSections(S.paperText);
    S.parsed = [];
    S.scoreMap = sheetText ? parseScoresFromText(sheetText) : {};
    renderSteps();
  };
  window.cbImpState = S;
  window.cbImpSplit = splitSections;
})();
