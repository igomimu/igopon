
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
    # User wants EXACTLY 6 visible vertical lines.
    # To preserve V1 proportions (visually), we need to check what "V1 proportions" means.
    # In V1/V11, typically the stone diameter is almost equal to the grid spacing.
    
    # Let's define margins and grid.
    # We want 6 lines.
    # Lines at index 0, 1, 2, 3, 4, 5.
    # Spacing S.
    # Total width W = MarginL + 5*S + MarginR
    
    # Let's say we want the board to look "zoomed in".
    # Lines should be thick.
    line_stroke = 8
    
    # We define the view to encompass exactly 6 lines.
    margin = 32
    available_width = width - (2 * margin)
    num_spaces = 5 # for 6 lines
    spacing = available_width / num_spaces
    
    # Draw Vertical Lines
    for i in range(6):
        x = margin + (i * spacing)
        # Use simple formatting for float precision
        line_svg = f'<line x1="{x:.2f}" y1="0" x2="{x:.2f}" y2="{height}" stroke="{line_color}" stroke-width="{line_stroke}" />'
        svg_content.append(line_svg)

    # Draw Horizontal Lines
    # We fit as many as possible
    import math
    num_horiz = math.ceil(height / spacing) + 1
    start_y_offset = (height - (num_horiz-1)*spacing) / 2 # center vertically?
    # Or just start from top margin? Let's align with margin for symmetry if possible, 
    # but strictly we just need grid.
    
    # Let's just draw lines starting from margin similar to x
    for i in range(7): # Draw 7 lines to ensure coverage
        y = margin + (i * spacing)  
        line_svg = f'<line x1="0" y1="{y:.2f}" x2="{width}" y2="{y:.2f}" stroke="{line_color}" stroke-width="{line_stroke}" />'
        svg_content.append(line_svg)

    # STONES
    # "Intersection placement"
    # "Adjacent stones almost touch (minimal gap)"
    # "Uniform size"
    # "Double size" (implied by zoomed in view)
    
    # With 6 lines (5 spaces) in 512px, spacing is roughly (512-64)/5 = 89.6px.
    # Stone diameter should be close to spacing.
    # Let's say gap is 2px total (1px radius shrink).
    # Radius = (spacing - gap) / 2
    
    gap = 2
    radius = (spacing - gap) / 2
    
    stones = [
        # (col_index, row_index, color)
        (1, 1, 'black'), (2, 1, 'white'), (3, 1, 'black'),
        (1, 2, 'white'), (2, 2, 'black'), (3, 2, 'white'), (4, 2, 'black'),
        (1, 3, 'black'), (2, 3, 'white'), (3, 3, 'black'), (4, 3, 'white'),
        (3, 4, 'black'), (4, 4, 'white') 
    ]
    
    for cx, cy, color in stones:
        cx_px = margin + cx * spacing
        cy_px = margin + cy * spacing
        
        fill = "#111111" if color == 'black' else "#F8F8F8"
        stroke = "#333333" if color == 'black' else "#AAAAAA" # subtle outline
        
        # Draw stone
        stone_svg = f'<circle cx="{cx_px:.2f}" cy="{cy_px:.2f}" r="{radius:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="2" />'
        svg_content.append(stone_svg)
        
        # Simple highlight (reflection)
        if color == 'black':
            h_r = radius * 0.4
            h_cx = cx_px - radius * 0.3
            h_cy = cy_px - radius * 0.3
            hl_svg = f'<circle cx="{h_cx:.2f}" cy="{h_cy:.2f}" r="{h_r:.2f}" fill="rgba(255,255,255,0.15)" />'
            svg_content.append(hl_svg)
        else:
            # Maybe a slight gradient simulation or shadow? 
            # SVG radial gradient is verbose, let's skip for V1 script.
            pass

    svg_content.append('</svg>')
    
    with open(output_path, 'w') as f:
        f.write('\n'.join(svg_content))
    print(f"Generated {output_path}")

if __name__ == "__main__":
    generate_board_svg("/home/mimura/.gemini/antigravity/brain/434ced34-9a14-4c1f-b0ee-53e14ef8b719/programmatic_board.svg")
