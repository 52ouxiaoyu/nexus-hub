from PIL import Image

img = Image.open('assets/images/Card/Plants/Squash.png').convert('RGBA')
width, height = img.size

# Check if bottom half is grayscale version of top half
is_grayscale = True
for y in range(height // 2):
    for x in range(width):
        r1, g1, b1, a1 = img.getpixel((x, y))
        r2, g2, b2, a2 = img.getpixel((x, y + height // 2))
        
        if a1 != a2:
            is_grayscale = False
            break
        if a1 > 0:
            # Check if bottom is roughly grayscale
            gray = int(r1 * 0.3 + g1 * 0.59 + b1 * 0.11)
            if abs(r2 - gray) > 20 or abs(g2 - gray) > 20 or abs(b2 - gray) > 20:
                # It might just be desaturated, check if r2==g2==b2
                if abs(r2 - g2) > 10 or abs(r2 - b2) > 10:
                    is_grayscale = False
                    break
    if not is_grayscale:
        break

print(f"Is bottom half a grayscale copy? {is_grayscale}")
