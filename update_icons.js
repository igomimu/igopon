import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const sourcePath = "/home/mimura/.gemini/antigravity/brain/d2bbc4c0-12fc-42bc-ab01-c9b0d7380029/igopon_var_japanese_stones_1764283378725.png";
const publicDir = "/home/mimura/projects/igopon/public";

const targets = [
    { name: "pwa-192x192.png", width: 192, height: 192 },
    { name: "pwa-512x512.png", width: 512, height: 512 },
    { name: "maskable-icon-512x512.png", width: 512, height: 512 },
    { name: "favicon.png", width: 64, height: 64 },
    { name: "apple-touch-icon.png", width: 180, height: 180 }
];

async function processImages() {
    try {
        if (!fs.existsSync(sourcePath)) {
            console.error(`Source image not found at ${sourcePath}`);
            return;
        }

        const image = await Jimp.read(sourcePath);
        console.log(`Opened source image: ${sourcePath}`);

        for (const target of targets) {
            const targetPath = path.join(publicDir, target.name);
            const resized = image.clone().resize({ w: target.width, h: target.height });
            await resized.write(targetPath);
            console.log(`Saved ${target.name} (${target.width}x${target.height}) to ${targetPath}`);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

processImages();
