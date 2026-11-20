import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# We need to swap the order so it checks for cherrybomb+snowpea first
explosion_logic = """
                    if (this.hasTrait('cherrybomb') && this.hasTrait('snowpea')) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 100) {
                            z.takeDamage(900); // half damage
                            z.isSlowed = true;
                            z.slowTimer = 10.0;
                        }
                    } else if (this.hasTrait('cherrybomb')) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 150) {
                            z.takeDamage(1800);
                        }
                    } else if (this.hasTrait('jalapeno')) {
"""

# Let's replace the block from `if (this.hasTrait('cherrybomb'))` up to `} else if (this.hasTrait('jalapeno')) {`
# Or rather just do a manual replace using regex
pattern = r"                    if \(this\.hasTrait\('cherrybomb'\)\) \{[\s\S]*?\} else if \(this\.hasTrait\('jalapeno'\)\) \{[\s\S]*?\} else if \(this\.hasTrait\('cherrybomb'\) && this\.hasTrait\('snowpea'\)\) \{[\s\S]*?\n                    \}"

replacement = """                    if (this.hasTrait('cherrybomb') && this.hasTrait('snowpea')) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 100) {
                            z.takeDamage(900); // half damage
                            z.isSlowed = true;
                            z.slowTimer = 10.0;
                        }
                    } else if (this.hasTrait('cherrybomb')) {
                        if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) < 150) {
                            z.takeDamage(1800);
                        }
                    } else if (this.hasTrait('jalapeno')) {
                        if (z.row === this.row) {
                            z.takeDamage(1800);
                        }
                    }"""

content = re.sub(pattern, replacement, content)

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
