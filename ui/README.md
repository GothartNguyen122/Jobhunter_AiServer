# PDF Extractor Test UI

Giao diện đơn giản để test PDF Extractor API của Jobhunter AI Server.

## 📁 Cấu trúc thư mục

```
ui/
├── index.html              # File HTML chính (tất cả trong 1 file)
├── index-separated.html  # File HTML tách biệt CSS/JS
├── styles.css           # File CSS riêng
├── script.js            # File JavaScript riêng
└── README.md            # Hướng dẫn sử dụng
```

## 🚀 Cách sử dụng

### 1. Chạy AI Server
```bash
cd /path/to/Jobhunter_AiServer/Jobhunter_AiServer
npm start
```

### 2. Mở giao diện test
- **Main UI**: `ui/index.html` - All-in-one interface
- **Separated UI**: `ui/index-separated.html` - CSS/JS separated
- **Test Page**: `ui/test.html` - API testing interface
- **Demo Page**: `ui/demo.html` - Demo and instructions

### 3. Quick Test
```bash
# Mở test page để kiểm tra API
open ui/test.html
```

### 3. Test PDF Extractor
1. **Chọn file PDF**: Click "Select PDF File" hoặc drag & drop file PDF
2. **Extract data**: Click "Extract Data" để trích xuất dữ liệu
3. **Xem kết quả**: JSON data sẽ hiển thị trong khung kết quả
4. **Copy JSON**: Click "Copy JSON" để copy kết quả

## 🎯 Tính năng

### ✅ Upload PDF
- Chọn file PDF từ máy tính
- Drag & drop file PDF
- Hiển thị thông tin file (tên, kích thước)
- Validate file type và size

### ✅ Extract Data
- Gọi API `/api/v1/pdf/extract`
- Hiển thị loading spinner
- Xử lý lỗi và thông báo

### ✅ Display Results
- Hiển thị JSON data được format đẹp
- Syntax highlighting cho JSON
- Copy to clipboard
- Responsive design

### ✅ Error Handling
- Network errors
- API errors
- File validation errors
- User-friendly error messages

## 🎨 UI Features

- **Modern Design**: Gradient backgrounds, smooth animations
- **Responsive**: Hoạt động tốt trên mobile và desktop
- **Drag & Drop**: Kéo thả file PDF trực tiếp
- **Loading States**: Spinner và progress indicators
- **Status Messages**: Success/error notifications
- **Copy Function**: One-click copy JSON results

## 🔧 API Endpoints

### POST /api/v1/pdf/extract
**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: PDF file

**Response:**
```json
{
  "success": true,
  "message": "PDF extracted successfully",
  "data": {
    "full_name": "John Doe",
    "objective": "...",
    "phone_number": "...",
    "email": "...",
    "github": "...",
    "university": "...",
    "technical_skills": [...],
    "certificate": "...",
    "projects": [...]
  }
}
```

## 🐛 Troubleshooting

### Server không chạy
```bash
# Kiểm tra port 3001 có bị chiếm không
lsof -i :3001

# Restart server
npm start
```

### CORS errors
- Đảm bảo AI Server chạy trên port 3001
- Kiểm tra CORS configuration trong `config/index.js`

### File upload errors
- Kiểm tra file size (max 10MB)
- Đảm bảo file là PDF format
- Kiểm tra network connection

## 📝 Notes

- UI này chỉ để test PDF extractor functionality
- Không có authentication/authorization
- Chỉ hỗ trợ PDF files
- Kết quả JSON có thể rất dài, sử dụng scroll để xem
