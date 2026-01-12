const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

/**
 * Render HTML thành ảnh vuông (1:1)
 */
async function renderToImage(htmlContent) {
  let browser = null;

  try {
    // Khởi tạo browser với Chromium serverless
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set viewport lớn để đảm bảo không bị cắt
    await page.setViewport({
      width: 2048,
      height: 2048,
      deviceScaleFactor: 2, // High DPI
    });

    // Load HTML
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    // Đợi render hoàn tất
    await page.waitForTimeout(500);

    // Lấy kích thước thực của bảng
    const dimensions = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return { width: 0, height: 0 };
      
      const rect = table.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
      };
    });

    // Tính kích thước canvas vuông
    const padding = 80; // Padding xung quanh bảng
    const tableWidth = dimensions.width;
    const tableHeight = dimensions.height;
    const maxSize = Math.max(tableWidth, tableHeight) + padding * 2;

    // Screenshot toàn bộ body (bảng đã được căn giữa bởi CSS)
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: maxSize,
        height: maxSize,
      },
    });

    return screenshot;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { renderToImage };