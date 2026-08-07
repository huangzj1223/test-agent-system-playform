#!/bin/bash
# 开发环境一键启动：起容器 → 建表 → 刷注释 → 种子数据 →（可选）启动服务
# 用法：
#   bash scripts/dev-setup.sh         仅初始化环境，不启动服务（= pnpm setup）
#   bash scripts/dev-setup.sh serve   初始化后接着启动开发服务（= pnpm dev）
set -euo pipefail

# 项目根（脚本在 server/scripts/ 下，上两级）
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

MYSQL_CONTAINER="agentpm-mysql-dev"
# 开发环境固定密码，与 docker/docker-compose.dev.yaml 的 MYSQL_ROOT_PASSWORD 一致；
# 本脚本仅用于本地开发，禁止用于生产环境
MYSQL_PWD="123456"
DEV_COMPOSE="docker/docker-compose.dev.yaml"

COLOR_GREEN='\033[0;32m'; COLOR_BLUE='\033[0;34m'; COLOR_YELLOW='\033[0;33m'; COLOR_RED='\033[0;31m'; COLOR_RESET='\033[0m'

log() {
    local level=${2:-INFO}; local color
    case $level in
        INFO) color="${COLOR_BLUE}" ;; WARN) color="${COLOR_YELLOW}" ;;
        ERROR) color="${COLOR_RED}" ;; SUCCESS) color="${COLOR_GREEN}" ;;
        *) color="${COLOR_RESET}" ;;
    esac
    echo -e "${color}[$(date '+%H:%M:%S')] [${level}] ${1}${COLOR_RESET}"
}

# 1. 依赖检查
check_deps() {
    local missing=()
    for cmd in docker pnpm npx; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    docker compose version &>/dev/null || missing+=("docker compose")
    if [ ${#missing[@]} -gt 0 ]; then
        log "缺少依赖: ${missing[*]}" "ERROR"; exit 1
    fi
    log "依赖检查通过" "SUCCESS"
}

# 2. 起 MySQL + Redis 容器
start_containers() {
    log "启动 MySQL + Redis 容器..."
    docker compose -f "$DEV_COMPOSE" up -d
    log "容器已启动" "SUCCESS"
}

# 3. 等 MySQL 就绪（最多 60s）
wait_mysql() {
    log "等待 MySQL 就绪..."
    for i in $(seq 1 30); do
        if docker exec "$MYSQL_CONTAINER" mysqladmin ping -uroot -p"$MYSQL_PWD" --silent &>/dev/null; then
            log "MySQL 已就绪" "SUCCESS"; return 0
        fi
        sleep 2
    done
    log "MySQL 等待超时（60s），请检查容器日志：docker logs $MYSQL_CONTAINER" "ERROR"
    exit 1
}

# 4. 生成 Prisma client + 建表 + 刷库注释
init_schema() {
    export NODE_ENV=development
    log "生成 Prisma Client 并同步表结构..."
    npx prisma db push
    log "刷新数据库注释..."
    npx ts-node scripts/sync-db-comments.ts
    log "表结构已同步" "SUCCESS"
}

# 5. 种子数据（幂等：已有 admin 用户则跳过）
init_seed() {
    export NODE_ENV=development
    local count
    count=$(docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$MYSQL_PWD" -N -e \
        "USE agentpm; SELECT COUNT(*) FROM base_sys_user;" 2>/dev/null || echo "0")
    # 净化为纯数字（剥离可能的空白/警告行），非数字兜底为 0，避免 -gt 比较触发 set -e
    count=$(printf '%s' "$count" | grep -oE '[0-9]+' | head -1 || echo "0")
    count=${count:-0}
    if [ "$count" -gt 0 ]; then
        log "种子数据已存在（base_sys_user 有 $count 条），跳过" "WARN"
        return 0
    fi
    log "初始化种子数据..."
    npx prisma db seed
    log "种子数据已初始化（默认管理员 admin / 123456）" "SUCCESS"
}

main() {
    local mode="${1:-init}"
    log "===== AgentPM 开发环境初始化 ====="
    check_deps
    start_containers
    wait_mysql
    init_schema
    init_seed
    echo ""
    log "===== 初始化完成 =====" "SUCCESS"
    log "默认管理员：admin / 123456（请尽快修改）" "WARN"

    if [ "$mode" = "serve" ]; then
        local studio_port=5555
        # 释放可能被占用的端口（无占用时跳过）：9001=nest 服务，$studio_port=prisma studio
        local pids
        pids=$(lsof -t -i:9001 -i:"$studio_port" 2>/dev/null || true)
        [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true

        # 后台静默启动 Prisma Studio（数据库可视化 GUI），随 dev 一起拉起
        export NODE_ENV=development
        npx prisma studio --port "$studio_port" --browser none >/dev/null 2>&1 &
        # studio_pid 不用 local——EXIT trap 在 main 返回后触发，需全局作用域才能读到
        studio_pid=$!
        # dev 退出（Ctrl+C / 进程结束）时一并关闭 studio，避免孤儿进程占用 5555
        trap 'kill "$studio_pid" 2>/dev/null || true' EXIT INT TERM
        # 把 studio 端口传给 nest 子进程，让其在启动日志里一并提示数据库 GUI 地址
        export PRISMA_STUDIO_PORT="$studio_port"
        log "Prisma Studio 已启动：http://localhost:${studio_port}（数据库可视化）" "SUCCESS"

        # 前台启动 watch 服务（不用 exec，保证退出时触发上面的 trap 清理 studio）
        log "启动开发服务（watch 模式）..." "INFO"
        npx nest start --watch
    else
        log "启动开发服务：pnpm dev" "INFO"
    fi
}

main "${1:-init}"

