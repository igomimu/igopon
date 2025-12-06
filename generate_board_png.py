from PIL import Image, ImageDraw

def generate_board_png(output_path):
    width, height = 512, 512
    board_color = (220, 179, 92) # Kaya
    line_color = (0, 0, 0)
    
    img = Image.new('RGB', (width, height), board_color)
    draw = ImageDraw.Draw(img)

    # GEOMETRY
    # Requirement: Exactly 6 Vertical Lines visible.
    # We want them to span the width with some margin.
    # Width = Margin + 5*Spacing + Margin
    
    # "Zoomed in" look.
    # Let's say we want to show a clean 5x5 square section plus margins.
    
    num_lines = 6
    num_spaces = num_lines - 1 # 5 spaces
    
    # Calculate spacing to fit width
    # If we use 0 margin, spacing = 512 / 5 = 102.4
    # Let's add a small margin to not have stones cut off at the very edge of the frame.
    # Stone radius will be ~50px.
    # Margin should be at least radius so outer stones are fully visible?
    # User said "Zoom in", "stones are large".
    # Usually icons can have elements bleeding off or cut.
    # BUT "Exactly 6 lines visible" implies we see the lines.
    
    # Margin was 40, reducing to 16 to maximize board area
    # User requested to keep "V1 design" (margin 40) but enlarge stones (gap 0)
    margin = 40
    avail_w = width - (2 * margin)
    spacing = avail_w / num_spaces # 5 spaces
    
    # Draw Vertical Lines
    line_w = 6
    for i in range(num_lines):
        x = margin + (i * spacing)
        draw.line([(x, 0), (x, height)], fill=line_color, width=line_w)
        
    # Draw Horizontal Lines
    # Fit as many as possible
    num_horiz = int(height / spacing) + 2
    start_y = margin
    # Align horizontal lines to start at same 'margin' so we have a grid intersection at (margin, margin)
    
    # We want to fill the height.
    # Let's calculate start point to center the grid vertically or just start from top.
    # Let's start from a y point that creates intersections aligned with x.
    # x starts at `margin`.
    # Let's make y start at `margin` too.
    # And we draw lines above and below if needed.
    
    for i in range(-2, 8): # Cover range
        y = margin + (i * spacing)
        if y > -spacing and y < height + spacing:
             draw.line([(0, y), (width, y)], fill=line_color, width=line_w)

    # STONES
    # Placement: Intersections ONLY.
    # Size: "Adjacent stones almost touch".
    # Gap: "Minimal" -> let's say 2px gap (1px radius reduction)
    
    stone_gap_total = 0 # Reduced to 0 for maximum size
    radius = (spacing - stone_gap_total) / 2
    
    # Stone Content
    # Let's make a nice pattern or shape.
    # Maybe a simple Atari shape or connected shape.
    stones = [
        (1, 1, 'black'), (2, 1, 'black'), (3, 1, 'white'),
        (1, 2, 'white'), (2, 2, 'white'), (3, 2, 'black'), (4, 2, 'black'),
        (1, 3, 'black'), (2, 3, 'black'), (3, 3, 'white'), (4, 3, 'white'),
        (2, 4, 'white'), (3, 4, 'black')
    ]
    # Note: indices are relative to the first line at x=margin
    
    for cx, cy, color in stones:
        px = margin + cx * spacing
        py = margin + cy * spacing
        
        # Check if point is within plausible bounds (even if partially out)
        # 512x512
        
        bounds = [px - radius, py - radius, px + radius, py + radius]
        
        if color == 'black':
            draw.ellipse(bounds, fill=(20, 20, 20), outline=(60,60,60))
            # Highlight
            hl_rad = radius * 0.25
            hl_x = px - radius * 0.4
            hl_y = py - radius * 0.4
            draw.ellipse([hl_x, hl_y, hl_x+hl_rad*2, hl_y+hl_rad*2], fill=(100, 100, 100))
        else:
            draw.ellipse(bounds, fill=(240, 240, 240), outline=(180,180,180))
            # Shadow?
            # kept simple for flat/icon look
            
    img.save(output_path)
    print(f"Generated {output_path}")

if __name__ == "__main__":
    generate_board_png("/home/mimura/projects/igopon/public/maskable-icon-512x512.png")
