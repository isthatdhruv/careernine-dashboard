import fs from 'fs/promises';
import puppeteer from 'puppeteer';

// Concurrency limiter: max 3 Chrome instances at a time
const MAX_CONCURRENT = 3;
let activeCount = 0;
const queue: Array<{ resolve: () => void }> = [];

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push({ resolve });
  });
}

function releaseSlot(): void {
  if (queue.length > 0) {
    const next = queue.shift()!;
    next.resolve();
  } else {
    activeCount--;
  }
}

export async function generatePdfFromHtml(fullPath: string): Promise<Buffer> {
  // Check if file exists
  try {
    await fs.access(fullPath);
  } catch {
    throw new Error(`File not found: ${fullPath}`);
  }

  await acquireSlot();

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--single-process',
    ],
  });

  try {
    const page = await browser.newPage();
    const fileUrl = `file://${fullPath}`;

    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      timeout: 30000,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
    releaseSlot();
  }
}
