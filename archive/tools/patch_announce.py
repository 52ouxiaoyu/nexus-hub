import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_announce = """            this.announcementUI.style.position = 'absolute';
            this.announcementUI.style.top = '30%';
            this.announcementUI.style.left = '50%';
            this.announcementUI.style.transform = 'translate(-50%, -50%)';
            this.announcementUI.style.fontSize = '60px';"""
new_announce = """            this.announcementUI.style.position = 'absolute';
            this.announcementUI.style.bottom = '10%';
            this.announcementUI.style.left = '50%';
            this.announcementUI.style.transform = 'translate(-50%, 0)';
            this.announcementUI.style.fontSize = '24px';"""
content = content.replace(old_announce, new_announce)

with open('pvz-web/js/GameLoop.js', 'w') as f:
    f.write(content)
