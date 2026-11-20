from PIL import Image

img = Image.open('assets/images/Card/Plants/TallNut.png').convert('RGBA')
width, height = img.size

# Check the alpha sum of each row
for y in range(height):
    alpha_sum = sum(img.getpixel((x, y))[3] for x in range(width))
    if alpha_sum == 0:
        print(f"Row {y} is completely transparent!")

