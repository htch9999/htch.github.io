const { JSDOM } = require('jsdom');

/**
 * Trích xuất bảng từ HTML dựa trên id hoặc tên lớp
 */
function extractTable(htmlContent, tableId, className) {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  
  let table = null;

  // Tìm theo id trước
  if (tableId) {
    table = document.getElementById(tableId);
  }

  // Nếu không tìm thấy, tìm theo className trong caption/header
  if (!table && className) {
    const tables = document.querySelectorAll('table');
    for (const t of tables) {
      const caption = t.querySelector('caption');
      const firstHeader = t.querySelector('th');
      
      if (caption && caption.textContent.includes(className)) {
        table = t;
        break;
      }
      
      if (firstHeader && firstHeader.textContent.includes(className)) {
        table = t;
        break;
      }
    }
  }

  if (!table) {
    return null;
  }

  // Tạo HTML standalone với CSS inline
  const styledHtml = createStyledHtml(table.outerHTML);
  return styledHtml;
}

/**
 * Tạo HTML hoàn chỉnh với CSS inline
 */
function createStyledHtml(tableHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 40px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    }
    
    table {
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    th, td {
      border: 2px solid #333;
      padding: 12px 16px;
      text-align: center;
      font-size: 14px;
      line-height: 1.5;
    }
    
    th {
      background: #f5f5f5;
      font-weight: 600;
      color: #333;
    }
    
    td {
      background: white;
      color: #333;
    }
    
    caption {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #333;
    }
  </style>
</head>
<body>
  ${tableHtml}
</body>
</html>
  `.trim();
}

module.exports = { extractTable };