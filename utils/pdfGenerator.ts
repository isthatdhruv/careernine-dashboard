import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(fullPath: string): Promise<Buffer> {
  // Check if file exists
  try {
    await fs.access(fullPath);
  } catch {
    throw new Error(`File not found: ${fullPath}`);
  }

  // Read HTML content
  // const htmlContent = await fs.readFile(fullPath, 'utf-8'); // Not strictly needed if we use file:// url

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const fileUrl = `file://${fullPath}`;
    
    // Increase timeout for complex pages
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
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
  }
}
