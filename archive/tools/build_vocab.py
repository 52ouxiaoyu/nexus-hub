import base64
import os

md_3500_path = '/Users/clawbox/obsidian/wiki/高考_3500_核心词汇.md'
md_1600_path = '/Users/clawbox/obsidian/wiki/初中英语 1600 核心词汇.md'
html_path = '/Users/clawbox/game-portal/VocabSwipe.html'
local_html_path = '/Users/clawbox/obsidian/VocabSwipe.html'

with open(md_3500_path, 'r', encoding='utf-8') as f:
    b64_3500 = base64.b64encode(f.read().encode('utf-8')).decode('utf-8')

with open(md_1600_path, 'r', encoding='utf-8') as f:
    b64_1600 = base64.b64encode(f.read().encode('utf-8')).decode('utf-8')

html_content = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VocabSwipe - 极速词汇过滤</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Outfit:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-gradient: linear-gradient(135deg, #131b2c, #1f2b45, #29395a);
            --card-bg: rgba(255, 255, 255, 0.08);
            --card-border: rgba(255, 255, 255, 0.15);
            --text-main: #ffffff;
            --text-muted: #94a3b8;
            --accent-keep: #ef4444;
            --accent-discard: #22c55e;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Inter', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-main);
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }
        h1, h2, h3 { font-family: 'Outfit', sans-serif; }
        .screen {
            display: none;
            flex-direction: column;
            align-items: center;
            width: 100%;
            height: 100%;
            padding: 2rem;
        }
        .screen.active {
            display: flex;
        }
        
        /* Setup Screen */
        .setup-container {
            text-align: center;
            background: var(--card-bg);
            padding: 3rem;
            border-radius: 24px;
            border: 1px solid var(--card-border);
            backdrop-filter: blur(12px);
            box-shadow: 0 16px 40px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 100%;
        }
        .setup-container h1 { font-size: 3rem; margin-top: 0; margin-bottom: 1rem; background: -webkit-linear-gradient(#fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .setup-container p { color: var(--text-muted); margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.6; }
        .file-label {
            background: rgba(255, 255, 255, 0.1);
            border: 2px dashed var(--text-muted);
            padding: 1.2rem 2rem;
            border-radius: 16px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: 500;
            transition: all 0.2s;
            display: block;
            width: 100%;
        }
        .file-label:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: #fff;
        }
        #file-input { display: none; }
        
        /* Swipe Screen */
        .header-bar {
            width: 100%;
            max-width: 800px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 1rem;
            margin-bottom: auto;
        }
        .progress-wrapper {
            flex-grow: 1;
            margin: 0 2rem;
        }
        .progress-text {
            font-size: 0.9rem;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            text-align: center;
            font-weight: 500;
        }
        .progress-bar-bg {
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            width: 0%;
            transition: width 0.3s ease;
        }
        .export-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid var(--card-border);
            color: #fff;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }
        .export-btn:hover { background: rgba(255,255,255,0.2); }
        .export-btn.large {
            font-size: 1.2rem;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border: none;
            border-radius: 12px;
        }
        .export-btn.large:hover {
            transform: scale(1.02);
        }
        
        .card-container {
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            position: relative;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            backdrop-filter: blur(20px);
            border-radius: 32px;
            padding: 4rem 3rem;
            width: 100%;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 24px 48px rgba(0,0,0,0.3);
            position: absolute;
            will-change: transform, opacity;
        }
        .word {
            font-family: 'Outfit', sans-serif;
            font-size: 3.5rem;
            font-weight: 700;
            margin: 0 0 1rem 0;
            line-height: 1.1;
            word-break: break-word;
        }
        .pron {
            font-size: 1.5rem;
            color: #a78bfa;
            margin-bottom: 2rem;
            font-family: monospace;
            letter-spacing: 1px;
            cursor: pointer;
            display: inline-block;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            transition: background 0.2s;
        }
        .pron:hover {
            background: rgba(255,255,255,0.1);
        }
        .meaning {
            font-size: 1.3rem;
            color: var(--text-muted);
            line-height: 1.5;
        }
        
        .controls {
            display: flex;
            gap: 2rem;
            margin-bottom: 2rem;
            margin-top: auto;
        }
        .control-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            background: var(--card-bg);
            border: 2px solid var(--card-border);
            color: white;
            backdrop-filter: blur(10px);
        }
        .control-btn .icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .btn-left { border-color: rgba(239, 68, 68, 0.5); }
        .btn-left:hover {
            transform: scale(1.05);
            background: rgba(239, 68, 68, 0.2);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }
        .btn-right { border-color: rgba(34, 197, 94, 0.5); }
        .btn-right:hover {
            transform: scale(1.05);
            background: rgba(34, 197, 94, 0.2);
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
        }
        
        .hint {
            color: var(--text-muted);
            font-size: 0.95rem;
            opacity: 0.8;
            margin-bottom: 1rem;
            text-align: center;
            line-height: 1.5;
        }
        
        /* Done Screen */
        #done-screen { justify-content: center; text-align: center; }
        #done-screen h1 { font-size: 4rem; margin-bottom: 1rem; }
        #done-screen p { font-size: 1.5rem; color: var(--text-muted); }

        .float-back {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .float-back:hover {
            background: rgba(255,255,255,0.2);
        }
    </style>
</head>
<body>
    <a href="learning.html" class="float-back">⬅️ 返回学习天地</a>

    <div id="setup-screen" class="screen active">
        <div class="setup-container">
            <h1>VocabSwipe</h1>
            
            <div id="resume-container" style="display: none; margin-bottom: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.1); border-radius: 16px; border: 1px solid var(--card-border);">
                <p style="margin-top:0; color: #fff; font-weight: 500;">发现上次未完成的进度：<strong id="resume-progress" style="color: #a78bfa;"></strong></p>
                <div style="display: flex; justify-content: center; gap: 1rem;">
                    <button id="resume-btn" class="export-btn" style="background: var(--accent-discard); border:none; padding: 0.8rem 1.5rem;">继续上次的进度</button>
                    <button id="clear-btn" class="export-btn" style="background: transparent; padding: 0.8rem 1.5rem;">重新开始</button>
                </div>
            </div>

            <div id="file-select-container">
                <p>你可以选择内置的词库，或者导入自定义的 Markdown 笔记。</p>
                
                <button id="btn-default-3500" class="export-btn large" style="width: 100%; margin-bottom: 1rem;">🚀 刷高考 3500 词</button>
                <button id="btn-default-1600" class="export-btn large" style="width: 100%; margin-bottom: 1.5rem; background: linear-gradient(135deg, #10b981, #059669);">🎒 刷初中 1600 词</button>
                
                <div style="margin-bottom: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">— 或者 —</div>
                
                <label for="file-input" class="file-label">📂 导入自定义 Markdown</label>
                <input type="file" id="file-input" accept=".md, .txt" />
            </div>
        </div>
    </div>

    <div id="swipe-screen" class="screen">
        <div class="header-bar">
            <button class="export-btn" id="undo-btn" title="快捷键: ↑ 或 Backspace">↶ 撤销上一条</button>
            <div class="progress-wrapper">
                <div class="progress-text" id="progress-text">0 / 0</div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" id="progress-fill"></div>
                </div>
            </div>
            <button id="export-midway-btn" class="export-btn">💾 随时保存导出</button>
        </div>

        <div class="card-container" id="card-container">
            <div class="card" id="current-card">
                <div class="word" id="card-word">Word</div>
                <div class="pron" id="card-pron" onclick="playAudio()" title="点击或按空格键朗读">/pron/ 🔊</div>
                <div class="meaning" id="card-meaning">meaning</div>
            </div>
        </div>

        <div class="hint">快捷键： <b>←</b> 保留 | <b>→</b> 剔除 | <b>空格键</b> 朗读单词 | <b>↑</b> 撤销</div>
        <div class="controls">
            <button class="control-btn btn-left" id="btn-keep">
                <div class="icon">←</div>
                <div>不熟 (保留)</div>
            </button>
            <button class="control-btn btn-right" id="btn-discard">
                <div class="icon">→</div>
                <div>认识 (剔除)</div>
            </button>
        </div>
    </div>

    <div id="done-screen" class="screen">
        <h1>🎉 全刷完了！</h1>
        <p>太棒了，你已经过滤完所有的单词。</p>
        <button id="export-final-btn" class="export-btn large" style="margin-top:2rem;">下载过滤后的笔记</button>
    </div>

    <script>
        const DEFAULT_B64_3500 = "{B64_3500}";
        const DEFAULT_B64_1600 = "{B64_1600}";
        
        function decodeBase64Markdown(b64) {
            const byteCharacters = atob(b64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(byteArray);
        }

        let parsedData = [];
        let vocabItems = [];
        let currentIndex = 0;
        let originalFileName = '过滤后的笔记.md';

        const setupScreen = document.getElementById('setup-screen');
        const swipeScreen = document.getElementById('swipe-screen');
        const doneScreen = document.getElementById('done-screen');
        
        const fileInput = document.getElementById('file-input');
        const currentCard = document.getElementById('current-card');
        const wordEl = document.getElementById('card-word');
        const pronEl = document.getElementById('card-pron');
        const meaningEl = document.getElementById('card-meaning');
        
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        
        const resumeContainer = document.getElementById('resume-container');
        const fileSelectContainer = document.getElementById('file-select-container');
        
        // --- 本地存储持久化功能 ---
        function saveProgress() {
            try {
                localStorage.setItem('vocabSwipe_data', JSON.stringify(parsedData));
                localStorage.setItem('vocabSwipe_index', currentIndex.toString());
                localStorage.setItem('vocabSwipe_fileName', originalFileName);
            } catch(e) {
                console.warn("无法保存进度到本地存储", e);
            }
        }
        
        function clearProgress() {
            localStorage.removeItem('vocabSwipe_data');
            localStorage.removeItem('vocabSwipe_index');
            localStorage.removeItem('vocabSwipe_fileName');
        }

        function checkSavedProgress() {
            const savedData = localStorage.getItem('vocabSwipe_data');
            if (savedData) {
                try {
                    const tempParsed = JSON.parse(savedData);
                    const tempIndex = parseInt(localStorage.getItem('vocabSwipe_index') || "0");
                    const tempVocab = tempParsed.filter(d => d.type === 'vocab');
                    
                    if (tempVocab.length > 0) {
                        resumeContainer.style.display = 'block';
                        fileSelectContainer.style.display = 'none';
                        document.getElementById('resume-progress').textContent = `${tempIndex} / ${tempVocab.length}`;
                        
                        document.getElementById('resume-btn').onclick = () => {
                            parsedData = tempParsed;
                            vocabItems = tempVocab;
                            currentIndex = tempIndex;
                            originalFileName = localStorage.getItem('vocabSwipe_fileName') || '词汇过滤_已完成.md';
                            
                            setupScreen.classList.remove('active');
                            swipeScreen.classList.add('active');
                            showCard();
                            updateProgress();
                        };
                        
                        document.getElementById('clear-btn').onclick = () => {
                            clearProgress();
                            resumeContainer.style.display = 'none';
                            fileSelectContainer.style.display = 'block';
                        };
                    }
                } catch(e) {
                    clearProgress();
                }
            }
        }
        
        window.addEventListener('DOMContentLoaded', checkSavedProgress);
        
        // --- 朗读 (TTS) 功能 ---
        let availableVoices = [];
        function loadVoices() {
            availableVoices = window.speechSynthesis.getVoices();
        }
        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        function playAudio() {
            if (currentIndex >= vocabItems.length) return;
            const text = vocabItems[currentIndex].word;
            window.speechSynthesis.cancel(); 
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.0; 
            
            if (availableVoices.length === 0) loadVoices();
            
            let bestVoice = availableVoices.find(v => v.name === 'Samantha' || v.name === 'Alex' || v.name === 'Google US English');
            if (!bestVoice) {
                bestVoice = availableVoices.find(v => v.lang === 'en-US' && !['Zarvox', 'Bubbles', 'Trinoids', 'Whisper', 'Deranged', 'Fred'].includes(v.name));
            }
            if (!bestVoice) {
                bestVoice = availableVoices.find(v => v.lang === 'en-US');
            }
            if (bestVoice) utterance.voice = bestVoice;
            
            window.speechSynthesis.speak(utterance);
        }

        // --- 文件解析 ---
        function handleMarkdownText(text) {
            parseMarkdown(text);
            if (vocabItems.length > 0) {
                setupScreen.classList.remove('active');
                swipeScreen.classList.add('active');
                showCard();
                updateProgress();
                saveProgress();
            } else {
                alert('没有找到符合格式的单词！请确认文件内容是以 "- **单词**" 这种格式开头的。');
            }
        }

        document.getElementById('btn-default-3500').addEventListener('click', () => {
            originalFileName = '高考_3500_核心词汇_已过滤.md';
            handleMarkdownText(decodeBase64Markdown(DEFAULT_B64_3500));
        });

        document.getElementById('btn-default-1600').addEventListener('click', () => {
            originalFileName = '初中英语_1600_核心词汇_已过滤.md';
            handleMarkdownText(decodeBase64Markdown(DEFAULT_B64_1600));
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            originalFileName = file.name.replace('.md', '_已过滤.md');
            
            const reader = new FileReader();
            reader.onload = (event) => {
                handleMarkdownText(event.target.result);
            };
            reader.readAsText(file);
        });

        function parseMarkdown(text) {
            const lines = text.split('\\n');
            parsedData = [];
            vocabItems = [];
            
            for (const line of lines) {
                if (line.trim().startsWith('- **')) {
                    const match = line.match(/^- \*\*(.*?)\*\*(?:\s*`([^`]+)`\s*)?(.*)$/);
                    if (match) {
                        const item = {
                            type: 'vocab',
                            original: line,
                            word: match[1].trim(),
                            pron: match[2] ? (match[2].startsWith('/') ? match[2] : `/${match[2]}/`) : '',
                            meaning: match[3].trim(),
                            keep: true
                        };
                        parsedData.push(item);
                        vocabItems.push(item);
                    } else {
                        const fallbackWord = line.replace(/^- \*\*/, '').split('**')[0];
                        const item = {
                            type: 'vocab',
                            original: line,
                            word: fallbackWord || line,
                            pron: '',
                            meaning: line,
                            keep: true
                        };
                        parsedData.push(item);
                        vocabItems.push(item);
                    }
                } else {
                    parsedData.push({ type: 'text', content: line });
                }
            }
        }

        // --- 核心展示与交互逻辑 ---
        function showCard() {
            if (currentIndex >= vocabItems.length) {
                swipeScreen.classList.remove('active');
                doneScreen.classList.add('active');
                return;
            }
            
            const item = vocabItems[currentIndex];
            currentCard.style.transition = 'none';
            currentCard.style.transform = 'translateY(20px) scale(0.95)';
            currentCard.style.opacity = '0';
            
            wordEl.textContent = item.word;
            pronEl.innerHTML = (item.pron || '') + ' 🔊';
            meaningEl.textContent = item.meaning;
            
            void currentCard.offsetWidth; 
            
            currentCard.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            currentCard.style.transform = 'translateY(0) scale(1)';
            currentCard.style.opacity = '1';
        }

        function swipe(direction) {
            if (currentIndex >= vocabItems.length) return;
            
            const angle = direction === 'left' ? -15 : 15;
            const x = direction === 'left' ? -100 : 100;
            
            currentCard.style.transition = 'all 0.4s ease-in';
            currentCard.style.transform = `translateX(${x}vw) rotate(${angle}deg)`;
            currentCard.style.opacity = '0';
            
            currentIndex++;
            updateProgress();
            saveProgress(); 
            
            setTimeout(() => {
                showCard();
            }, 400); 
        }

        function undo() {
            if (currentIndex > 0) {
                currentIndex--;
                vocabItems[currentIndex].keep = true; 
                updateProgress();
                saveProgress(); 
                
                currentCard.style.transition = 'none';
                currentCard.style.transform = 'translateY(-30px) scale(1.05)';
                currentCard.style.opacity = '0';
                
                wordEl.textContent = vocabItems[currentIndex].word;
                pronEl.innerHTML = (vocabItems[currentIndex].pron || '') + ' 🔊';
                meaningEl.textContent = vocabItems[currentIndex].meaning;
                
                void currentCard.offsetWidth;
                
                currentCard.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
                currentCard.style.transform = 'translateY(0) scale(1)';
                currentCard.style.opacity = '1';
                
                if (doneScreen.classList.contains('active')) {
                    doneScreen.classList.remove('active');
                    swipeScreen.classList.add('active');
                }
            }
        }

        function updateProgress() {
            progressText.textContent = `${currentIndex} / ${vocabItems.length}`;
            const percent = vocabItems.length === 0 ? 0 : (currentIndex / vocabItems.length) * 100;
            progressFill.style.width = `${percent}%`;
        }

        document.getElementById('btn-keep').addEventListener('click', () => {
            if (currentIndex < vocabItems.length) {
                vocabItems[currentIndex].keep = true;
                swipe('left');
            }
        });

        document.getElementById('btn-discard').addEventListener('click', () => {
            if (currentIndex < vocabItems.length) {
                vocabItems[currentIndex].keep = false;
                swipe('right');
            }
        });
        
        document.getElementById('undo-btn').addEventListener('click', undo);

        document.addEventListener('keydown', (e) => {
            if (!swipeScreen.classList.contains('active') && !doneScreen.classList.contains('active')) return;
            
            if (e.code === 'Space') {
                e.preventDefault(); 
                playAudio();
            } else if (e.key === 'ArrowLeft') {
                document.getElementById('btn-keep').click();
            } else if (e.key === 'ArrowRight') {
                document.getElementById('btn-discard').click();
            } else if (e.key === 'ArrowUp' || e.key === 'Backspace') {
                undo();
            }
        });

        function exportMarkdown() {
            const finalLines = parsedData
                .filter(d => d.type === 'text' || (d.type === 'vocab' && d.keep))
                .map(d => d.type === 'text' ? d.content : d.original);
                
            const newText = finalLines.join('\\n');
            const blob = new Blob([newText], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        document.getElementById('export-midway-btn').addEventListener('click', exportMarkdown);
        document.getElementById('export-final-btn').addEventListener('click', exportMarkdown);

    </script>
</body>
</html>"""

html_content = html_content.replace("{B64_3500}", b64_3500).replace("{B64_1600}", b64_1600)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(local_html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)
