# Hướng dẫn thiết lập GitHub Actions cho Docker Build

## 📋 Tổng quan

Workflow này sẽ tự động build và push Docker image khi bạn push code vào branch `main`.

## 🔧 Thiết lập trên GitHub

### Bước 1: Thiết lập GitHub Container Registry

GitHub Container Registry (ghcr.io) sử dụng `GITHUB_TOKEN` tự động, không cần thiết lập secrets.

**Lưu ý:** Đảm bảo repository có quyền **Write packages** trong Settings → Actions → General → Workflow permissions.

### Bước 2: Kiểm tra Workflow Permissions

1. Vào **Settings** → **Actions** → **General**
2. Trong phần **Workflow permissions**, chọn:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

## 🚀 Sử dụng

### Tự động chạy

Workflow sẽ tự động chạy khi:
- Push code vào branch `main`
- Có thay đổi trong các file: `.js`, `.json`, `Dockerfile`, `.dockerignore`

### Chạy thủ công

1. Vào tab **Actions** trên GitHub
2. Chọn workflow **Build and Push Docker Image**
3. Click **Run workflow**
4. Chọn branch và click **Run workflow**

## 📦 Image Tags

Workflow sẽ tạo các tags sau:

- `latest` - Cho branch main
- `main-<commit-sha>` - Tag với commit SHA
- `<version>` - Nếu có git tag (ví dụ: `v1.0.0`)
- `<major>.<minor>` - Nếu có git tag (ví dụ: `1.0`)

## 🔍 Kiểm tra kết quả

### GitHub Container Registry
```bash
docker pull ghcr.io/<GITHUB_USERNAME>/jobhunter-ai-server:latest
```

Hoặc xem trên GitHub:
- Vào repository → **Packages** (bên phải)
- Tìm package `jobhunter-ai-server`

## ⚙️ Cấu hình nâng cao

### Thay đổi platform

Mặc định build cho `linux/amd64`. Để build multi-platform, sửa trong file workflow:

```yaml
platforms: linux/amd64,linux/arm64
```

## 🐛 Troubleshooting

### Lỗi: "permission denied"
- Kiểm tra Workflow permissions trong Settings → Actions → General
- Đảm bảo đã bật "Read and write permissions"

### Image không được push
- Kiểm tra logs trong tab Actions
- Đảm bảo workflow đã chạy thành công (green checkmark)

## 📝 Lưu ý

- Workflow sử dụng Docker Buildx với cache để tăng tốc độ build
- Image được build cho platform `linux/amd64` (phù hợp với hầu hết server)
- `.dockerignore` đã được cấu hình để loại bỏ file không cần thiết

