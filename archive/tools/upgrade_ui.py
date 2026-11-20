import re

with open("index.html", "r") as f:
    html = f.read()

new_style = """<style>
        :root {
            --bg-color: #050505;
            --surface-color: #111111;
            --surface-hover: #1a1a1a;
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --accent-color: #3b82f6;
            --border-color: rgba(255, 255, 255, 0.08);
            --card-radius: 20px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
            color: var(--text-primary);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 80px 24px;
        }

        header {
            text-align: center;
            margin-bottom: 80px;
        }
        
        h1.logo-title {
            font-size: 56px;
            font-weight: 800;
            letter-spacing: -2px;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .logo-subtitle {
            font-size: 18px;
            color: var(--text-secondary);
            font-weight: 400;
            letter-spacing: 0.5px;
            margin-bottom: 48px;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
        }

        .stat {
            text-align: center;
            padding: 24px 40px;
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(10px);
            border-radius: var(--card-radius);
            border: 1px solid var(--border-color);
            min-width: 160px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease, border-color 0.3s ease;
        }
        
        .stat:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.15);
        }

        .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: -1px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 500;
        }

        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 24px;
        }

        .game-card {
            background: var(--surface-color);
            border-radius: var(--card-radius);
            padding: 32px;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid var(--border-color);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .game-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }

        .game-card:hover {
            transform: translateY(-6px);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px var(--card-color-alpha);
            background: var(--surface-hover);
        }

        .game-card:hover::before {
            opacity: 1;
        }

        .game-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
        }

        .game-icon {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            flex-shrink: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.05);
            box-shadow: inset 0 0 20px var(--card-color-alpha);
            transition: transform 0.3s ease;
        }
        
        .game-card:hover .game-icon {
            transform: scale(1.05) rotate(-5deg);
        }

        .game-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            letter-spacing: -0.5px;
            line-height: 1.2;
        }

        .game-stats {
            display: flex;
            gap: 16px;
            margin-top: 8px;
            font-size: 13px;
            color: var(--text-secondary);
            font-variant-numeric: tabular-nums;
        }

        .game-desc {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 24px;
            flex-grow: 1;
        }

        .game-tags {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .tag {
            padding: 4px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            font-size: 11px;
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.2s ease;
        }
        
        .game-card:hover .tag {
            background: var(--card-color-alpha);
            color: #fff;
            border-color: transparent;
        }

        .play-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 14px 24px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            text-decoration: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .game-card:hover .play-btn {
            background: var(--text-primary);
            color: #000;
            box-shadow: 0 4px 15px rgba(255,255,255,0.2);
        }

        .play-btn:active {
            transform: scale(0.96);
        }

        .play-btn svg {
            width: 16px;
            height: 16px;
            transition: transform 0.3s ease;
        }

        .game-card:hover .play-btn svg {
            transform: translateX(4px);
        }

        .footer {
            text-align: center;
            padding: 64px 24px 32px;
            color: var(--text-secondary);
            font-size: 13px;
            letter-spacing: 0.5px;
        }

        .coffee-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px 32px;
            background: linear-gradient(135deg, #FFDD00 0%, #F5B700 100%);
            color: #000000;
            text-decoration: none;
            border-radius: 100px;
            font-size: 15px;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 24px rgba(255, 221, 0, 0.2);
            border: none;
            cursor: pointer;
            font-family: inherit;
        }

        .coffee-btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 12px 32px rgba(255, 221, 0, 0.4);
        }

        .coffee-btn:active {
            transform: translateY(0) scale(0.98);
        }

        /* Donate Modal */
        .donate-modal {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 999;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
        }
        .donate-content {
            background: #111;
            padding: 40px;
            border-radius: 24px;
            text-align: center;
            position: relative;
            max-width: 440px;
            width: 90%;
            box-shadow: 0 24px 48px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            animation: modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .donate-close {
            position: absolute;
            top: 20px; right: 24px;
            cursor: pointer;
            font-size: 32px;
            color: var(--text-secondary);
            line-height: 1;
            transition: color 0.2s;
        }
        .donate-close:hover { color: #fff; }
        .donate-qr {
            width: 180px; height: 180px;
            margin: 16px auto 12px;
            border-radius: 12px;
            object-fit: cover;
            object-position: top center;
            display: block;
            border: 2px solid rgba(255,255,255,0.1);
            transition: transform 0.3s;
        }
        .donate-qr:hover {
            transform: scale(1.05);
        }

        @media (max-width: 768px) {
            .container { padding: 40px 16px; }
            h1.logo-title { font-size: 40px; }
            .stats { gap: 16px; }
            .stat { padding: 16px 20px; min-width: 120px; }
            .stat-value { font-size: 28px; }
            .games-grid { grid-template-columns: 1fr; }
            .game-card { padding: 24px; }
        }
    </style>"""

html = re.sub(r'<style>.*?</style>', new_style, html, flags=re.DOTALL)

# Add hexToRgb alpha variable to game cards rendering
old_render = """<div class="game-card" style="--card-color: ${game.color}" onclick="window.open('${game.url}', '_blank')">"""
new_render = """<div class="game-card" style="--card-color: ${game.color}; --card-color-alpha: ${game.color}15;" onclick="window.open('${game.url}', '_blank')">"""
html = html.replace(old_render, new_render)

# Add glow mouse tracking effect script
glow_script = """
        document.getElementById('games-grid').onmousemove = e => {
            for(const card of document.getElementsByClassName('game-card')) {
                const rect = card.getBoundingClientRect(),
                      x = e.clientX - rect.left,
                      y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        };
"""
html = html.replace("renderGames();", "renderGames();\n" + glow_script)

# Add title to header
old_header = """<header>
            <div class="stats">"""
new_header = """<header>
            <h1 class="logo-title">ARCADE NEXUS</h1>
            <div class="logo-subtitle">Next-Generation HTML5 Gaming Experience</div>
            <div class="stats">"""
html = html.replace(old_header, new_header)

with open("index.html", "w") as f:
    f.write(html)
