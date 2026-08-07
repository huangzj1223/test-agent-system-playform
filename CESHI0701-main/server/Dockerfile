# Build stage
# 使用官方 Playwright 镜像（Ubuntu jammy，glibc）：内置 Chromium 与全部系统依赖。
# 构建与运行同族镜像，保证 bcrypt / Prisma 等原生模块 ABI 一致（不可用 alpine musl 构建后拷进来）。
# 版本需与 package.json 的 playwright 版本对齐（当前 1.61.x）。
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS builder

WORKDIR /app

RUN npm install -g pnpm

# 安装依赖时跳过浏览器下载：运行镜像已自带 /ms-playwright 下的 Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .
RUN pnpm build

# CI=true 避免 pnpm 在非 TTY 环境下因确认提示中止 modules 目录清理
RUN CI=true pnpm prune --prod

# Production stage
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

ENV TZ="Asia/Shanghai"
# 浏览器已随基础镜像安装在 /ms-playwright，跳过运行时再次下载
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 官方 playwright 镜像已内置非 root 用户 pwuser
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# 启动入口：应用进程启动前先跑 prisma migrate deploy（确保表结构先于应用就绪）
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# 应用启动时会在工作目录创建 uploads 目录，预建并授权给非 root 运行用户
RUN mkdir -p /app/uploads && chown -R pwuser:pwuser /app/uploads

USER pwuser

EXPOSE 9001

ENTRYPOINT ["./docker-entrypoint.sh"]

