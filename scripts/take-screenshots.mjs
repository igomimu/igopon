import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'screenshots');
const BASE = 'http://localhost:5173/igopon/?lang=en';

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function skipTutorial(page) {
  // Skip tutorial if it appears
  try {
    const skipBtn = page.locator('#tutorialSkipBtn');
    if (await skipBtn.isVisible({ timeout: 1500 })) {
      await skipBtn.click();
      await delay(500);
    }
  } catch { /* no tutorial */ }
}

async function startGame(page) {
  await skipTutorial(page);
  // Click GO! button (id=restartBtn)
  const goBtn = page.locator('#restartBtn');
  await goBtn.waitFor({ state: 'visible', timeout: 5000 });
  await goBtn.click();
  await delay(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // --- Screenshot 1: Title / Standby screen ---
  {
    const page = await browser.newPage({ viewport: { width: 420, height: 740 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(2000);
    await skipTutorial(page);
    await delay(500);
    await page.screenshot({ path: path.join(outDir, '01_title.png'), fullPage: false });
    console.log('✓ 01_title.png (title/standby)');
    await page.close();
  }

  // --- Screenshot 2: Early gameplay ---
  {
    const page = await browser.newPage({ viewport: { width: 420, height: 740 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(1500);
    await startGame(page);

    for (let i = 0; i < 8; i++) {
      const actions = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
      for (const key of actions.slice(0, 2 + Math.floor(Math.random() * 3))) {
        await page.keyboard.press(key);
        await delay(100);
      }
      await page.keyboard.press(' ');
      await delay(800);
    }
    await delay(500);
    await page.screenshot({ path: path.join(outDir, '02_gameplay.png'), fullPage: false });
    console.log('✓ 02_gameplay.png (early game)');
    await page.close();
  }

  // --- Screenshot 3: Mid-game with fuller board ---
  {
    const page = await browser.newPage({ viewport: { width: 420, height: 740 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(1500);
    await startGame(page);

    for (let i = 0; i < 25; i++) {
      const patterns = [
        ['ArrowLeft', 'ArrowLeft'],
        ['ArrowRight', 'ArrowRight', 'ArrowUp'],
        ['ArrowUp', 'ArrowLeft'],
        ['ArrowRight'],
        ['ArrowLeft', 'ArrowUp', 'ArrowUp'],
      ];
      const pattern = patterns[i % patterns.length];
      for (const key of pattern) {
        await page.keyboard.press(key);
        await delay(80);
      }
      await page.keyboard.press(' ');
      await delay(600);
    }
    await delay(500);
    await page.screenshot({ path: path.join(outDir, '03_midgame.png'), fullPage: false });
    console.log('✓ 03_midgame.png (mid game)');
    await page.close();
  }

  // --- Screenshot 4: Menu screen ---
  {
    const page = await browser.newPage({ viewport: { width: 420, height: 740 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(1500);
    await startGame(page);

    // Drop a few pieces first
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press(' ');
      await delay(600);
    }

    // Open menu
    await page.locator('#menuBtn').click();
    await delay(800);
    await page.screenshot({ path: path.join(outDir, '04_menu.png'), fullPage: false });
    console.log('✓ 04_menu.png (menu)');
    await page.close();
  }

  // --- Screenshot 5: Desktop wide view ---
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(1500);
    await startGame(page);

    for (let i = 0; i < 15; i++) {
      const dir = i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.press(dir);
      await delay(80);
      if (i % 3 === 0) await page.keyboard.press('ArrowUp');
      await delay(80);
      await page.keyboard.press(' ');
      await delay(600);
    }
    await delay(500);
    await page.screenshot({ path: path.join(outDir, '05_desktop.png'), fullPage: false });
    console.log('✓ 05_desktop.png (desktop)');
    await page.close();
  }

  // --- Video recording for GIF ---
  {
    const context = await browser.newContext({
      viewport: { width: 420, height: 740 },
      recordVideo: { dir: outDir, size: { width: 420, height: 740 } }
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(2000);
    await skipTutorial(page);

    // Show title briefly
    await delay(1000);

    // Start game
    const goBtn = page.locator('#restartBtn');
    await goBtn.waitFor({ state: 'visible', timeout: 5000 });
    await goBtn.click();
    await delay(1000);

    // Play ~15 seconds of varied gameplay
    for (let i = 0; i < 15; i++) {
      const patterns = [
        ['ArrowLeft', 'ArrowLeft'],
        ['ArrowRight', 'ArrowRight', 'ArrowUp'],
        ['ArrowUp', 'ArrowLeft'],
        ['ArrowRight'],
        ['ArrowLeft', 'ArrowUp', 'ArrowUp'],
      ];
      const pattern = patterns[i % patterns.length];
      for (const key of pattern) {
        await page.keyboard.press(key);
        await delay(150);
      }
      await page.keyboard.press(' ');
      await delay(1000);
    }

    await delay(1000);
    const videoPath = await page.video()?.path();
    await context.close();
    console.log('✓ Video recorded:', videoPath);
  }

  await browser.close();
  console.log('\nAll saved to:', outDir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
