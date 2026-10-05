import re
import time

timestamp = int(time.time())

with open('pvz-web/index.html', 'r') as f:
    content = f.read()

content = re.sub(r'src="js/([^"]+)\.js(\?v=\d+)?"', f'src="js/\\1.js?v={timestamp}"', content)
content = re.sub(r'href="css/([^"]+)\.css(\?v=\d+)?"', f'href="css/\\1.css?v={timestamp}"', content)

with open('pvz-web/index.html', 'w') as f:
    f.write(content)
