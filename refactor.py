import re

with open('pvz-web/js/entities/Plant.js', 'r') as f:
    content = f.read()

# Replace ['a', 'b'].includes(this.type) with this.hasTrait('a') || this.hasTrait('b') etc?
# Actually, it's easier to replace `this.type === '...'` with `this.hasTrait('...')`
content = re.sub(r"this\.type === '([^']+)'", r"this.hasTrait('\1')", content)

# Replace array includes:
def repl_includes(m):
    arr_str = m.group(1)
    # arr_str is like 'peashooter', 'snowpea', ...
    items = re.findall(r"'([^']+)'", arr_str)
    return "(" + " || ".join(f"this.hasTrait('{item}')" for item in items) + ")"

content = re.sub(r"\[(.*?)\]\.includes\(this\.type\)", repl_includes, content)

# But wait, what if `this.type` is used for assignment?
# e.g., this.type = 'crater';
# The regex `this.type === ` safely avoids assignment `this.type = `.

with open('pvz-web/js/entities/Plant.js', 'w') as f:
    f.write(content)
