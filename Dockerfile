
# --- Stage 1: Base (Chuẩn bị môi trường chung) ---
FROM --platform=linux/amd64 node:20-alpine AS base 
WORKDIR /app
ENV NODE_ENV=production
    
# --- Stage 2: Dependencies (Cài thư viện) ---
FROM base AS deps
# Cài thêm các công cụ build native (python, make, g++) cho các thư viện như sharp
RUN apk add --no-cache python3 make g++ build-base vips-dev ghostscript
    
COPY package*.json ./
# Cài đặt dependencies (chỉ production)
RUN npm ci --omit=dev
    
# --- Stage 3: Runner (Chạy ứng dụng) ---
FROM base AS runner
    
# Chỉ cài những thư viện cần thiết để CHẠY (Runtime) - không cài công cụ build
RUN apk add --no-cache vips ghostscript
    
# Copy node_modules đã cài xong từ Stage 2 sang
COPY --from=deps /app/node_modules ./node_modules
    
# Copy source code
COPY . .
    
# Tối ưu bảo mật: Dùng user 'node' thay vì 'root'
RUN chown -R node:node /app
USER node
    
EXPOSE 3000
# Node.js tối ưu bộ nhớ cho container (giới hạn heap size nếu cần)
CMD ["node", "server.js"]