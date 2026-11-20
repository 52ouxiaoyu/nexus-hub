import re

with open('pvz-web/haunted-dorm.html', 'r') as f:
    content = f.read()

old_html = """            <button class="back-btn" style="top:180px;" onclick="location.href='index.html'">返回主菜单</button>
            <button class="back-btn" style="top:236px; background:linear-gradient(180deg, #6d4c41, #4a2f1d);" onclick="document.getElementById('dorm-help').style.display='flex'">玩法说明</button>"""

new_html = """            <button class="back-btn" style="top:180px;" onclick="location.href='index.html'">返回主菜单</button>
            <button class="back-btn" style="top:216px;" onclick="document.getElementById('dorm-help').style.display='flex'">玩法说明</button>"""

content = content.replace(old_html, new_html)

with open('pvz-web/haunted-dorm.html', 'w') as f:
    f.write(content)
