import re
with open('pvz-web/haunted-dorm.html', 'r') as f:
    content = f.read()

content = content.replace('<canvas id="minimap" width="176" height="132"></canvas>', '<canvas id="minimap" width="320" height="240"></canvas>')
# add red slash style for physical avatar in world
css_add = """
        /* 红斜杠（阵亡） */
        .dead-slash::after {
            content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(to top right, transparent 45%, red 45%, red 55%, transparent 55%);
            z-index: 1000; pointer-events: none;
        }
"""
content = content.replace("/* UI 层 */", css_add + "        /* UI 层 */")

with open('pvz-web/haunted-dorm.html', 'w') as f:
    f.write(content)
