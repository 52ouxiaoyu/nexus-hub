import re

with open('pvz-web/js/GameLoop.js', 'r') as f:
    content = f.read()

old_start = """    startGame() {
        const seedBank = document.getElementById('seed-bank');
        seedBank.innerHTML = ''; // clear
        this.cooldowns = {};"""

new_start = """    startGame() {
        const seedBank = document.getElementById('seed-bank');
        seedBank.innerHTML = ''; // clear
        this.cooldowns = {};
        
        if (this.fusionMode) {
            document.getElementById('glove-bank').style.display = 'block';
            document.getElementById('recipe-book-btn').style.display = 'block';
            this.initFusionUI();
        } else {
            document.getElementById('glove-bank').style.display = 'none';
            document.getElementById('recipe-book-btn').style.display = 'none';
        }"""

content = content.replace(old_start, new_start)

# But wait, initFusionUI adds event listeners! If we call it every time startGame is called, it will add MULTIPLE event listeners (e.g. if they restart).
# Let's check if we can just initialize it once in constructor or prevent double binding.
