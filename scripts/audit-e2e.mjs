import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/lahar/.gemini/antigravity/brain/e9a7483d-03db-4543-90fe-0b69ae2bc142/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3000';
const errorsFound = [];
const consoleLogs = [];

async function captureRoute(page, name, url, options = {}) {
  console.log(`[Audit] Navigating to ${name}: ${url}`);
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const status = res ? res.status() : 'no-response';
    if (status >= 400) {
      errorsFound.push({ type: 'HTTP_ERROR', route: name, url, status });
    }
    await page.waitForTimeout(options.wait || 500);

    const desktopPath = path.join(SCREENSHOTS_DIR, `${name}-desktop.png`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: desktopPath, fullPage: options.fullPage !== false });

    const mobilePath = path.join(SCREENSHOTS_DIR, `${name}-mobile.png`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: mobilePath, fullPage: options.fullPage !== false });

    // Reset to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log(`  ✓ Captured ${name} (status: ${status})`);
  } catch (err) {
    console.error(`  ✗ Failed capturing ${name}:`, err.message);
    errorsFound.push({ type: 'NAV_ERROR', route: name, url, error: err.message });
  }
}

async function runAudit() {
  console.log('🚀 Starting PawNest Visual Audit & End-to-End Verification with Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PawNest-Audit/1.0',
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleLogs.push({ type: 'CONSOLE_ERROR', text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', (err) => {
    errorsFound.push({ type: 'PAGE_ERROR', message: err.message });
  });

  page.on('requestfailed', (req) => {
    errorsFound.push({
      type: 'REQUEST_FAILED',
      url: req.url(),
      failure: req.failure() ? req.failure().errorText : 'unknown',
    });
  });

  // 1. Public Pages
  await captureRoute(page, '01-homepage', `${BASE_URL}/`);
  await captureRoute(page, '02-sign-in', `${BASE_URL}/auth/sign-in`);
  await captureRoute(page, '03-sign-up', `${BASE_URL}/auth/sign-up`);
  await captureRoute(page, '04-grooming-list', `${BASE_URL}/grooming`);
  await captureRoute(page, '05-grooming-detail', `${BASE_URL}/grooming/the-velvet-hound-groomery`);
  await captureRoute(page, '06-boarding-list', `${BASE_URL}/boarding`);
  await captureRoute(page, '07-boarding-detail', `${BASE_URL}/boarding/meadowbrook-canine-retreat`);
  await captureRoute(page, '08-vet-list', `${BASE_URL}/vet`);
  await captureRoute(page, '09-vet-detail', `${BASE_URL}/vet/hudson-river-vet`);
  await captureRoute(page, '10-supplies-catalog', `${BASE_URL}/supplies`);
  await captureRoute(page, '11-supplies-detail', `${BASE_URL}/supplies/p/artisanal-stoneware-canine-bowl`);
  await captureRoute(page, '12-cart-empty', `${BASE_URL}/cart`);

  // 2. Authentication Flow
  console.log('\n[Audit] Performing Authenticated Customer Journey...');
  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'demo@pawnest.example');
  await page.fill('input[type="password"]', 'P@wnestDemo2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log(`  Current URL after sign-in: ${page.url()}`);

  // 3. Authenticated Dashboard & Features
  await captureRoute(page, '13-dashboard-overview', `${BASE_URL}/dashboard`);
  await captureRoute(page, '14-dashboard-pets', `${BASE_URL}/dashboard/pets`);
  await captureRoute(page, '15-dashboard-pet-new', `${BASE_URL}/dashboard/pets/new`);
  await captureRoute(page, '16-dashboard-bookings', `${BASE_URL}/dashboard/bookings`);
  await captureRoute(page, '17-dashboard-orders', `${BASE_URL}/dashboard/orders`);
  await captureRoute(page, '18-dashboard-favourites', `${BASE_URL}/dashboard/favourites`);

  // Test Notification Popover
  try {
    const bellBtn = await page.$('button[aria-label="View notifications"]');
    if (bellBtn) {
      await bellBtn.click();
      await page.waitForTimeout(500);
      const popoverPath = path.join(SCREENSHOTS_DIR, '19-notification-popover-desktop.png');
      await page.screenshot({ path: popoverPath });
      console.log('  ✓ Captured 19-notification-popover');
    }
  } catch (e) {
    console.warn('  Notification bell click note:', e.message);
  }

  // 4. Cart & Checkout Flow
  console.log('\n[Audit] Testing Supplies Cart & Checkout Flow...');
  try {
    await page.goto(`${BASE_URL}/supplies/p/artisanal-stoneware-canine-bowl`, { waitUntil: 'networkidle' });
    const addToCartBtn = await page.$('button:has-text("Add to Cart")');
    if (addToCartBtn) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
      const cartDrawerPath = path.join(SCREENSHOTS_DIR, '20-cart-drawer-open.png');
      await page.screenshot({ path: cartDrawerPath });
      console.log('  ✓ Captured 20-cart-drawer-open');
    }

    await captureRoute(page, '21-cart-with-items', `${BASE_URL}/cart`);
    await captureRoute(page, '22-checkout-page', `${BASE_URL}/checkout`);
  } catch (err) {
    console.error('  Cart/Checkout test error:', err.message);
  }

  await browser.close();

  // Report Summary
  console.log('\n================ AUDIT SUMMARY ================');
  console.log(`Total Errors / Page Errors: ${errorsFound.length}`);
  if (errorsFound.length > 0) {
    console.log(JSON.stringify(errorsFound, null, 2));
  }
  console.log(`Total Console Errors: ${consoleLogs.length}`);
  if (consoleLogs.length > 0) {
    console.log(JSON.stringify(consoleLogs.slice(0, 10), null, 2));
  }

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'audit-results.json'),
    JSON.stringify({ errorsFound, consoleLogs, timestamp: new Date().toISOString() }, null, 2)
  );

  console.log(`\nScreenshots saved in: ${SCREENSHOTS_DIR}`);
}

runAudit().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
