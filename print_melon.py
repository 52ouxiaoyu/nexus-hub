from PIL import Image
img = Image.open('pvz-web/assets/images/Plants/MelonPult/MelonPult.gif').convert("RGBA")
chars = " .:-=+*#%@"
for y in range(0, 50, 2):
    row_str = ""
    for x in range(0, 60, 2):
        r, g, b, a = img.getpixel((x, y))
        if a == 0:
            row_str += "  "
        else:
            if g > r + 10 and g > b + 10:
                row_str += "MM"  # Melon!
            else:
                row_str += "..  "
    print(row_str)
