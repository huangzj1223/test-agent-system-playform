#!/bin/bash
# 手动部署：拉取 GHCR 上的最新前后端镜像并重启容器。
# 前提：已 docker login ghcr.io、已配置好同目录下的 .env（含 BACKEND_IMAGE / FRONTEND_IMAGE 等）。
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "错误：未找到 .env，请先 cp .env.example .env 并填写配置" >&2
  exit 1
fi

# 校验必填的镜像变量（compose 未设默认值，缺失会导致 invalid reference 报错）
# shellcheck disable=SC1091
set -a; . ./.env; set +a
for v in BACKEND_IMAGE FRONTEND_IMAGE; do
  eval "val=\${$v:-}"
  if [ -z "$val" ]; then
    echo "错误：.env 缺少 $v，请填写 GHCR 镜像地址" >&2
    exit 1
  fi
done

COMPOSE="docker compose -f docker-compose.yaml --env-file .env"

echo "==> 拉取最新镜像..."
$COMPOSE pull

echo "==> 重建并启动容器..."
$COMPOSE up -d

echo "==> 等待后端健康检查..."
healthy=false
for _ in $(seq 1 30); do
  status="$($COMPOSE ps backend --format '{{.Status}}' 2>/dev/null || true)"
  if echo "$status" | grep -q "healthy"; then
    echo "后端已就绪：$status"
    healthy=true
    break
  fi
  sleep 3
done

echo "==> 当前服务状态："
$COMPOSE ps

if [ "$healthy" != "true" ]; then
  echo "错误：后端在 90s 内未就绪，请查看日志：$COMPOSE logs backend" >&2
  exit 1
fi
