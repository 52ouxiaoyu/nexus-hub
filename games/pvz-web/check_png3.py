from PIL import Image

img = Image.open('assets/images/Card/Plants/Squash.png').convert('RGBA')
width, height = img.size

left_pixels = 0
right_pixels = 0

for y in range(height // 2): # Top half
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        if a > 0:
            if x < width // 2:
                left_pixels += 1
            else:
                right_pixels += 1

print(f"Top-Left non-transparent pixels: {left_pixels}")
print(f"Top-Right non-transparent pixels: {right_pixels}")
