from PIL import Image

img = Image.open('assets/images/Card/Plants/Squash.png').convert('RGBA')
width, height = img.size

# Check top half vs bottom half
top_pixels = 0
bottom_pixels = 0

for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        if a > 0:
            if y < height // 2:
                top_pixels += 1
            else:
                bottom_pixels += 1

print(f"Top half non-transparent pixels: {top_pixels}")
print(f"Bottom half non-transparent pixels: {bottom_pixels}")
