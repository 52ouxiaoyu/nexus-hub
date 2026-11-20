from PIL import Image
import sys

img = Image.open('pvz-web/assets/images/Plants/MelonPult/MelonPult.gif').convert("RGBA")
pixels = img.load()

width, height = img.size

# Find the topmost-leftmost non-transparent pixel to start a flood fill
start_pixel = None
for y in range(height):
    for x in range(width):
        if pixels[x, y][3] > 10:
            start_pixel = (x, y)
            break
    if start_pixel:
        break

if not start_pixel:
    print("Empty image")
    sys.exit(1)

# Flood fill to find the contiguous blob (the melon)
blob_pixels = set()
queue = [start_pixel]
blob_pixels.add(start_pixel)

# Also let's try to constrain it to the top-left quadrant so we don't accidentally fill the whole plant if it's connected
while queue:
    cx, cy = queue.pop(0)
    
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
        nx, ny = cx + dx, cy + dy
        if 0 <= nx < 50 and 0 <= ny < 40: # constrain to top-left 50x40
            if (nx, ny) not in blob_pixels and pixels[nx, ny][3] > 10:
                blob_pixels.add((nx, ny))
                queue.append((nx, ny))

print(f"Found blob with {len(blob_pixels)} pixels")

# Create a new blank image
melon_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
melon_pixels = melon_img.load()

min_x = min(p[0] for p in blob_pixels)
max_x = max(p[0] for p in blob_pixels)
min_y = min(p[1] for p in blob_pixels)
max_y = max(p[1] for p in blob_pixels)

for x, y in blob_pixels:
    melon_pixels[x, y] = pixels[x, y]

# Crop to bounding box
crop_box = (min_x, min_y, max_x + 1, max_y + 1)
final_melon = melon_img.crop(crop_box)
final_melon.save('pvz-web/assets/images/Plants/MelonPult/Melon.gif', format='WebP')
print(f"Saved cropped melon with size {final_melon.width}x{final_melon.height}")

