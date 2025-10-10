# 🚀 Quick Start - PDF Extractor Test UI

## ✅ Server đã sẵn sàng!

AI Server đang chạy trên: `http://localhost:3001`

## 🎯 Cách test PDF Extractor:

### 1. Mở giao diện test
```bash
# Mở file HTML trong trình duyệt
open ui/index.html
# hoặc
open ui/demo.html
```

### 2. Test với file PDF
1. **Chọn file PDF** từ máy tính
2. **Click "Extract Data"**
3. **Xem kết quả JSON** được trích xuất

### 3. API Endpoints có sẵn
- `GET /api/v1/health` - Health check
- `POST /api/v1/pdf/extract` - Extract PDF data
- `GET /api/v1/chatboxes` - List chatboxes
- `POST /api/v1/chat/:id/message` - Send chat message

## 📁 Files có sẵn:
- `ui/index.html` - All-in-one UI
- `ui/index-separated.html` - Separated CSS/JS
- `ui/demo.html` - Demo page
- `ui/README.md` - Full documentation

## 🔧 Troubleshooting:

### Nếu gặp lỗi CORS:
- Đảm bảo AI Server chạy trên port 3001
- Kiểm tra CORS config trong `config/index.js`

### Nếu file upload không hoạt động:
- Kiểm tra file size (max 10MB)
- Đảm bảo file là PDF format
- Kiểm tra network connection

## 🎉 Ready to test!

Mở `ui/index.html` trong trình duyệt và bắt đầu test PDF extractor!
