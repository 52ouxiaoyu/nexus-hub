import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

old_cleanup = """            if (this.fusionOverlay && this.fusionOverlay.parentNode) {
                this.fusionOverlay.parentNode.removeChild(this.fusionOverlay);
            }
            return;"""

new_cleanup = """            if (this.fusionOverlay && this.fusionOverlay.parentNode) {
                this.fusionOverlay.parentNode.removeChild(this.fusionOverlay);
            }
            if (this.ladderOverlay && this.ladderOverlay.parentNode) {
                this.ladderOverlay.parentNode.removeChild(this.ladderOverlay);
            }
            return;"""

content = content.replace(old_cleanup, new_cleanup)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
