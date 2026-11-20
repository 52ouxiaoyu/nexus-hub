import re

with open('pvz-web/haunted-dorm.html', 'r') as f:
    content = f.read()

old_css = """.back-btn { position: absolute; top: 180px; right: 20px; pointer-events: auto; padding: 10px 24px; font-size: 18px; font-weight: bold; background: linear-gradient(180deg, #d32f2f, #9a0007); color: white; border: 3px solid #ffcccc; cursor: pointer; border-radius: 12px; text-shadow: 1px 1px 2px #000; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        .back-btn:hover { filter: brightness(1.2); transform: translateY(-2px); }"""

new_css = """.back-btn { 
            position: absolute; right: 20px; pointer-events: auto; 
            padding: 6px 16px; font-size: 15px; font-weight: bold; 
            background: linear-gradient(180deg, #6d4c41, #3e2723); 
            color: #f5e6c8; border: 2px solid #2e1a12; 
            cursor: pointer; border-radius: 6px; 
            text-shadow: 1px 1px 2px #000; 
            box-shadow: inset 0 0 6px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.6); 
            font-family: 'Kaiti SC', serif; letter-spacing: 1px;
        }
        .back-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }"""

content = content.replace(old_css, new_css)

with open('pvz-web/haunted-dorm.html', 'w') as f:
    f.write(content)
