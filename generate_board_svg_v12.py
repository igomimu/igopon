
def generate_board_svg(output_path):
    width, height = 512, 512
    board_color = "#DCB35C" # Kaya color
    line_color = "#000000"
    
    # SVG Header
    svg_content = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        f'<rect width="{width}" height="{height}" fill="{board_color}"/>'
    ]

    # GEOMETRY SETTINGS
    # User wanted "Double the size".
    # Previous was 6 lines (5 spaces).
    # Double size -> 3 lines (2 spaces)? Or 4 lines (3 spaces).
    # Let's try 4 lines visible.
    
    line_stroke = 12 # Thicker lines
    
    margin = 0 # Minimal margin to maximize size
    # Let's use a small margin so stones don't touch edge
    margin = 64
    available_width = width - (2 * margin)
    
    num_lines = 4
    num_spaces = num_lines - 1 # 3 spaces
    spacing = available_width / num_spaces # ~128px spacing
    
    # Draw Vertical Lines
    for i in range(num_lines):
        x = margin + (i * spacing)
        # Use simple formatting for float precision
        line_svg = f'<line x1="{x:.2f}" y1="0" x2="{x:.2f}" y2="{height}" stroke="{line_color}" stroke-width="{line_stroke}" />'
        svg_content.append(line_svg)

    # Draw Horizontal Lines
    for i in range(num_lines):
        y = margin + (i * spacing)  
        line_svg = f'<line x1="0" y1="{y:.2f}" x2="{width}" y2="{y:.2f}" stroke="{line_color}" stroke-width="{line_stroke}" />'
        svg_content.append(line_svg)

    # STONES
    # Intersections.
    # Gap: Minimal.
    gap = 4
    radius = (spacing - gap) / 2
    
    stones = [
        # (col_index, row_index, color)
        (0, 0, 'black'), (1, 0, 'white'), (2, 0, 'black'),
        (0, 1, 'white'), (1, 1, 'black'), (2, 1, 'white'),
        (0, 2, 'black'), (1, 2, 'white'), (2, 2, 'black'),
        (3, 1, 'black'), (3, 2, 'white')
    ]
    
    for cx, cy, color in stones:
        cx_px = margin + cx * spacing
        cy_px = margin + cy * spacing
        
        fill = "#111111" if color == 'black' else "#F8F8F8"
        stroke = "#333333" if color == 'black' else "#AAAAAA"
        
        # Draw stone
        stone_svg = f'<circle cx="{cx_px:.2f}" cy="{cy_px:.2f}" r="{radius:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="4" />'
        svg_content.append(stone_svg)
        
        # Simple highlight (reflection)
        if color == 'black':
            h_r = radius * 0.4
            h_cx = cx_px - radius * 0.3
            h_cy = cy_px - radius * 0.3
            hl_svg = f'<circle cx="{h_cx:.2f}" cy="{h_cy:.2f}" r="{h_r:.2f}" fill="rgba(255,255,255,0.15)" />'
            svg_content.append(hl_svg)

    svg_content.append('</svg>')
    
    with open(output_path, 'w') as f:
        f.write('\n'.join(svg_content))
    print(f"Generated {output_path}")

if __name__ == "__main__":
    generate_board_svg("/home/mimura/.gemini/antigravity/brain/434ced34-9a14-4c1f-b0ee-53e14ef8b719/programmatic_board_v12.svg")
