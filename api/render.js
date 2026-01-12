const Busboy = require('busboy');
const { extractTable } = require('../lib/parser');
const { renderToImage } = require('../lib/renderer');

module.exports = async (req, res) => {
  // Chỉ chấp nhận POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    let htmlContent = '';
    let tableId = '';
    let className = '';

    // Case 1: Multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const result = await parseMultipart(req);
      htmlContent = result.html;
      tableId = result.tableId;
      className = result.className;
    }
    // Case 2: JSON body
    else if (contentType.includes('application/json')) {
      const body = req.body;
      htmlContent = body.html || '';
      tableId = body.table_id || body.tableId || '';
      className = body.class_name || body.className || '';
    }
    // Case 3: Raw text
    else if (contentType.includes('text/plain')) {
      htmlContent = req.body;
      tableId = req.query.table_id || req.query.tableId || '';
      className = req.query.class_name || req.query.className || '';
    }
    else {
      return res.status(400).json({ 
        error: 'Unsupported Content-Type. Use multipart/form-data, application/json, or text/plain' 
      });
    }

    // Validate input
    if (!htmlContent) {
      return res.status(400).json({ error: 'Missing HTML content' });
    }

    if (!tableId && !className) {
      return res.status(400).json({ error: 'Missing table_id or class_name' });
    }

    // Step 1: Extract table from HTML
    const extractedHtml = extractTable(htmlContent, tableId, className);
    
    if (!extractedHtml) {
      return res.status(404).json({ 
        error: 'Table not found',
        details: `Could not find table with id="${tableId}" or class="${className}"`
      });
    }

    // Step 2: Render to image
    const imageBuffer = await renderToImage(extractedHtml);

    // Check if debug mode
    const debug = req.query.debug === '1' || req.query.debug === 'true';

    if (debug) {
      // Return JSON with base64
      return res.status(200).json({
        success: true,
        image: imageBuffer.toString('base64'),
        width: 1024,
        height: 1024,
        format: 'png'
      });
    }

    // Default: Return binary image for iOS Shortcuts
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imageBuffer.length);
    return res.status(200).send(imageBuffer);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

// Parse multipart form data
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let html = '';
    let tableId = '';
    let className = '';

    busboy.on('file', (fieldname, file, info) => {
      if (fieldname === 'file') {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          html = Buffer.concat(chunks).toString('utf-8');
        });
      }
    });

    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'table_id' || fieldname === 'tableId') {
        tableId = value;
      } else if (fieldname === 'class_name' || fieldname === 'className') {
        className = value;
      }
    });

    busboy.on('finish', () => {
      resolve({ html, tableId, className });
    });

    busboy.on('error', reject);

    req.pipe(busboy);
  });
}