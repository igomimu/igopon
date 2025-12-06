from PIL import Image, ImageDraw

def generate_board(output_path):
    # Canvas setup
    width, height = 512, 512
    # Board color (approximating standard kaya wood)
    board_color = (220, 179, 92)
    line_color = (0, 0, 0)
    
    img = Image.new('RGB', (width, height), board_color)
    draw = ImageDraw.Draw(img)

    # User Requirement: Exactly 6 vertical lines visible
    # We need boundaries (composition). Let's assume we show a 5x5 square area 
    # which implies 6 lines covering 5 intervals.
    # But to make it look nice, we might want some margin.
    # If we want *exactly* 6 lines from edge to edge, we can set:
    num_lines_visible = 6
    # The space is divided into (num_lines_visible - 1) cells horizontally?
    # Or should we have margins?
    # "縦の罫線が6本になるように" -> Usually implies we see 6 lines.
    
    # Calculate grid size
    # Let's add a small margin so lines aren't cut off exactly at the edge, 
    # but the user said "zoom in", so maybe edge-to-edge is better for icon visibility.
    # Let's try to fit 6 lines with proper spacing.
    
    # If 6 lines are visible, we have 5 "squares" of width.
    # margin_left + 5 * cell_size + margin_right = width
    
    margin = 20 # small margin
    effective_width = width - (2 * margin)
    num_cells_x = 5 # 5 cells between 6 lines
    cell_size = effective_width / num_cells_x
    
    # Grid lines
    line_width = 4 # Thick lines for visibility
    
    # Draw Vertical Lines (6 lines)
    for i in range(6):
        x = margin + (i * cell_size)
        draw.line([(x, 0), (x, height)], fill=line_color, width=line_width)
        
    # Draw Horizontal Lines
    # Calculate how many fit vertically
    num_cells_y = int((height - 2 * margin) / cell_size) + 1
    # We just draw enough to fill the height
    for i in range(num_cells_y + 2): # Draw a few more to cover
        y = margin + (i * cell_size)
        draw.line([(0, y), (width, y)], fill=line_color, width=line_width)

    # Stones
    # Requirement: "Stones on intersections"
    # Requirement: "Adjacent stones almost touch (minimal gap)"
    # Requirement: "Uniform size"
    
    # Max radius would be half of cell_size.
    # Gap calculation: User said "1mm" or "minimal".
    # Let's say gap is 2 pixels on each side, so 4 pixels total between stones.
    stone_gap = 4
    stone_radius = (cell_size - stone_gap) / 2
    
    # Let's place some stones to demonstrate
    # We will place a mix of black and white to show contrast
    stones = [
        (1, 1, 'black'), (2, 1, 'white'), (3, 1, 'black'),
        (1, 2, 'white'), (2, 2, 'black'), (3, 2, 'white'),
        (1, 3, 'black'), (2, 3, 'white'), (3, 3, 'black'),
        (4, 2, 'black'), (4, 3, 'white')
    ]
    
    for cx, cy, color in stones:
        # map grid index to pixel
        px = margin + (cx * cell_size)
        py = margin + (cy * cell_size)
        
        # Bounding box for ellipse: (left, top, right, bottom)
        left = px - stone_radius
        top = py - stone_radius
        right = px + stone_radius
        bottom = py + stone_radius
        
        fill_color = (10, 10, 10) if color == 'black' else (245, 245, 245)
        outline_color = (200, 200, 200) if color == 'black' else (100, 100, 100) # slight outline for visibility
        
        draw.ellipse([left, top, right, bottom], fill=fill_color, outline=None)
        
        # Add simple shading/highlight to make it look like a stone
        # Highlight
        highlight_radius = stone_radius * 0.3
        h_left = px - stone_radius * 0.5
        h_top = py - stone_radius * 0.5
        h_right = h_left + highlight_radius
        h_bottom = h_top + highlight_radius
        
        if color == 'black':
            draw.ellipse([h_left, h_top, h_right, h_bottom], fill=(60, 60, 60))
        else:
             # shadow for white stone? maybe just simple is best for icon
             pass

    img.save(output_path)
    print(f"Generated {output_path}")

if __name__ == "__main__":
    generate_board("/home/mimura/.gemini/antigravity/brain/434ced34-9a14-4c1f-b0ee-53e14ef8b719/programmatic_board_sample.png")
