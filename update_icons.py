import os
from PIL import Image

# Source image path
source_path = "/home/mimura/.gemini/antigravity/brain/d2bbc4c0-12fc-42bc-ab01-c9b0d7380029/igopon_text_icon_1764282064857.png"
public_dir = "/home/mimura/projects/igopon/public"

# Target sizes and filenames
targets = [
    ("pwa-192x192.png", (192, 192)),
    ("pwa-512x512.png", (512, 512)),
    ("maskable-icon-512x512.png", (512, 512)),
    ("favicon.png", (64, 64)),
    ("apple-touch-icon.png", (180, 180))
]

def process_images():
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    try:
        with Image.open(source_path) as img:
            print(f"Opened source image: {source_path}")
            
            for filename, size in targets:
                target_path = os.path.join(public_dir, filename)
                # Resize using LANCZOS for high quality downsampling
                resized_img = img.resize(size, Image.Resampling.LANCZOS)
                resized_img.save(target_path, "PNG")
                print(f"Saved {filename} ({size[0]}x{size[1]}) to {target_path}")
                
    except ImportError:
        print("Error: PIL (Pillow) is not installed. Please install it with 'pip install Pillow'.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    process_images()
