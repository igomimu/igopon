from PIL import Image, ImageDraw

def enlarge_stones_overlay(input_path, output_path, stone_gap_total):
    try:
        img = Image.open(input_path).convert("RGBA")
    except FileNotFoundError:
        print(f"Error: Input file {input_path} not found.")
        return

    draw = ImageDraw.Draw(img)
    width, height = img.size

    # Geometry Matching V1
    margin = 40
    num_spaces = 5
    avail_w = width - (2 * margin)
    spacing = avail_w / num_spaces
    
    radius = (spacing - stone_gap_total) / 2
    
    stones = [
        (1, 1, 'black'), (2, 1, 'black'), (3, 1, 'white'),
        (1, 2, 'white'), (2, 2, 'white'), (3, 2, 'black'), (4, 2, 'black'),
        (1, 3, 'black'), (2, 3, 'black'), (3, 3, 'white'), (4, 3, 'white'),
        (2, 4, 'white'), (3, 4, 'black')
    ]

    for cx, cy, color in stones:
        px = margin + cx * spacing
        py = margin + cy * spacing
        bounds = [px - radius, py - radius, px + radius, py + radius]
        
        if color == 'black':
            draw.ellipse(bounds, fill=(30, 30, 30), outline=(60,60,60))
            hl_rad = radius * 0.25
            hl_x = px - radius * 0.4
            hl_y = py - radius * 0.4
            draw.ellipse([hl_x, hl_y, hl_x+hl_rad*2, hl_y+hl_rad*2], fill=(100, 100, 100, 200))
        else:
            draw.ellipse(bounds, fill=(245, 245, 245), outline=(180,180,180))
            
    img.save(output_path)
    print(f"Generated overlay icon at {output_path} (Gap: {stone_gap_total}px)")

if __name__ == "__main__":
    # Input: The preserved V1 icon
    input_file = "/home/mimura/.gemini/antigravity/brain/f05844ec-3113-4909-a523-4f544028b2cb/original_maskable-icon-512x512.png"
    # Output: The public icon location
    output_file = "/home/mimura/projects/igopon/public/maskable-icon-512x512.png"
    
    # Applying Pattern B (Gap 0px) - Maximized size without overlap, preserving V1 design
    enlarge_stones_overlay(input_file, output_file, 0)
