from PIL import Image

img = Image.open('assets/images/Card/Plants/Squash.png').convert('RGBA')
width, height = img.size

match_pixels = 0
diff_pixels = 0

for y in range(height // 2):
    for x in range(width):
        a1 = img.getpixel((x, y))[3]
        a2 = img.getpixel((x, y + height // 2))[3]
        if a1 > 0 or a2 > 0:
            if a1 == a2:
                match_pixels += 1
            else:
                diff_pixels += 1

print(f"Alpha match pixels: {match_pixels}")
print(f"Alpha diff pixels: {diff_pixels}")
