import re

with open('pvz-web/index.html', 'r') as f:
    content = f.read()

# Make Squash bigger in the modal
old_squash = """<img src="assets/images/Plants/Squash/0.gif" style="height:50px; margin-bottom:8px;">
                        <span class="diff-name" style="font-size:20px;">倭瓜</span>"""
new_squash = """<img src="assets/images/Plants/Squash/0.gif" style="height:50px; margin-bottom:8px; transform: scale(1.5);">
                        <span class="diff-name" style="font-size:20px;">倭瓜</span>"""
content = content.replace(old_squash, new_squash)

# Change dorm-back button style to match btn-back-gc
old_back = """<button id="dorm-back">返回主菜单</button>"""
new_back = """<button id="dorm-back" style="display:inline-flex; align-items:center; padding:6px 20px; font-family:'Kaiti SC',serif; font-size:16px; font-weight:700; letter-spacing:2px; color:#fff; cursor:pointer; background:#000; border:1px solid rgba(255,255,255,0.45); border-radius:8px; box-shadow:none;">返回</button>"""
content = content.replace(old_back, new_back)

with open('pvz-web/index.html', 'w') as f:
    f.write(content)
