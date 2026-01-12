# Timetable to Image API

API serverless trên Vercel để chuyển đổi bảng thời khoá biểu HTML thành ảnh vuông.

## Deploy lên Vercel

1. **Tạo repo GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/timetable-api.git
   git push -u origin main
   ```

2. **Import vào Vercel**
   - Vào [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Chọn repo GitHub vừa tạo
   - Deploy (Vercel tự động cài dependencies)

3. **Lấy URL API**
   - Sau khi deploy xong, bạn sẽ có URL: `https://your-project.vercel.app`
   - Endpoint: `https://your-project.vercel.app/api/render`

## Cách sử dụng

### 1. Với curl (Multipart)
```bash
curl -X POST https://your-project.vercel.app/api/render \
  -F "file=@timetable.html" \
  -F "table_id=schedule-table" \
  -o output.png
```

### 2. Với curl (JSON)
```bash
curl -X POST https://your-project.vercel.app/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<table id=\"schedule\">...",
    "table_id": "schedule"
  }' \
  -o output.png
```

### 3. Với iOS Shortcuts
- Action: **Get Contents of URL**
- Method: POST
- URL: `https://your-project.vercel.app/api/render`
- Request Body: File (chọn HTML file)
- Headers: 
  - `Content-Type: multipart/form-data`
- Save response as image

### 4. Debug mode (trả JSON)
```bash
curl -X POST "https://your-project.vercel.app/api/render?debug=1" \
  -F "file=@timetable.html" \
  -F "class_name=Lớp 10A1"
```

## Parameters

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `file` | Có | File HTML (multipart) hoặc `html` (JSON) |
| `table_id` | Có* | ID của table cần trích xuất |
| `class_name` | Có* | Tên lớp trong caption/header |

*Cần ít nhất 1 trong 2: `table_id` hoặc `class_name`

## Response

- **Mặc định**: Binary PNG image (cho iOS Shortcuts)
- **Debug mode** (`?debug=1`): JSON với base64 image

## Lỗi thường gặp

- **404**: Không tìm thấy bảng → Kiểm tra `table_id` hoặc `class_name`
- **500**: Lỗi render → Kiểm tra HTML có hợp lệ không
- **405**: Phải dùng POST method