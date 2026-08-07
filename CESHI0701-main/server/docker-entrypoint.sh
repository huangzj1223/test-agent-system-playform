#!/bin/sh
# 容器启动入口：在应用进程启动前先应用数据库迁移（主流容器做法）。
# 放在应用之前可保证表结构就绪，避免应用内的定时任务/初始化在建表前访问数据库。
# migrate deploy 幂等：已应用的迁移自动跳过。prisma CLI 在 dependencies 中，直接调本地二进制。
#
# ⚠️ 首次部署到「表已由 db push 建好、但迁移历史为空」的现存环境时，migrate deploy 会
#    试图重建已存在的表而失败。此类环境需先执行一次（只写历史、不执行 SQL）：
#        ./node_modules/.bin/prisma migrate resolve --applied 20260530000000_baseline_squash
#    详见 prisma/migrations/README.md。全新空库无需此步。
set -eu

echo "[entrypoint] 应用数据库迁移 (prisma migrate deploy)..."
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] 启动服务 (node dist/main)..."
exec node dist/main
