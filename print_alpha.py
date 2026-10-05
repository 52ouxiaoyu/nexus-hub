from PIL import Image
img = Image.open('pvz-web/assets/images/Plants/MelonPult/MelonPult.gif').convert("RGBA")
chars = " .:-=+*#%@"
for y in range(0, 60, 2):
    row_str = ""
    for x in range(0, 60, 2):
        r, g, b, a = img.getpixel((x, y))
        if a == 0:
            row_str += "  "
        else:
            # use intensity to pick char
            intensity = int((r+g+b)/3 / 255 * 9)
            row_str += chars[intensity]*2
    print(row_str)
