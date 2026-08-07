#!/bin/bash
set -euo pipefail

PROJECT_NAME="agentpm-server"
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="${WORK_DIR}/docker"
ENV_FILE="${DOCKER_DIR}/.env"

COLOR_GREEN='\033[0;32m'; COLOR_BLUE='\033[0;34m'; COLOR_YELLOW='\033[0;33m'; COLOR_RED='\033[0;31m'; COLOR_RESET='\033[0m'

log() {
    local color; local level=${2:-INFO}
    case $level in
        INFO) color="${COLOR_BLUE}" ;; WARN) color="${COLOR_YELLOW}" ;;
        ERROR) color="${COLOR_RED}" ;; SUCCESS) color="${COLOR_GREEN}" ;;
        *) color="${COLOR_RESET}" ;;
    esac
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${1}${COLOR_RESET}"
}

load_env() {
    if [ -f "${ENV_FILE}" ]; then
        set -a; source "${ENV_FILE}"; set +a
    elif [ -f "${DOCKER_DIR}/.env.example" ]; then
        log ".env 不存在，从 .env.example 复制（请确认生产配置）" "WARN"
        cp "${DOCKER_DIR}/.env.example" "${ENV_FILE}"
        set -a; source "${ENV_FILE}"; set +a
    else
        log ".env 文件不存在: ${ENV_FILE}" "ERROR"; exit 1
    fi
    log "环境变量已加载" "SUCCESS"
}

check_deps() {
    # 自动创建数据卷目录
    for dir in "${DOCKER_DIR}/data/mysql" "${DOCKER_DIR}/data/redis"; do
        [ -d "$dir" ] || mkdir -p "$dir"
    done
    local missing=()
    for cmd in docker node pnpm; do
        command -v $cmd &>/dev/null || missing+=($cmd)
    done
    if ! docker compose version &>/dev/null; then
        missing+=("docker compose")
    fi
    if [ ${#missing[@]} -gt 0 ]; then
        log "缺少依赖: ${missing[*]}" "ERROR"; exit 1
    fi
    log "依赖检查通过" "SUCCESS"
}

# 拉取最新代码（仅当为 git 仓库时执行，对齐 fastapi）
pull_code() {
    cd "${WORK_DIR}"
    if [ -d "${WORK_DIR}/.git" ] || git -C "${WORK_DIR}" rev-parse --git-dir &>/dev/null; then
        log "检测到 git 仓库，拉取最新代码..."
        git pull || { log "git pull 失败，使用当前代码继续" "WARN"; }
        log "代码已更新至 $(git -C "${WORK_DIR}" log -1 --oneline 2>/dev/null || echo '未知')" "SUCCESS"
    else
        log "非 git 仓库，跳过代码拉取（使用当前目录代码）" "INFO"
    fi
}

build_image() {
    cd "${WORK_DIR}"
    export DOCKER_BUILDKIT=1
    docker compose -f docker/docker-compose.yaml build --no-cache || { log "镜像构建失败" "ERROR"; exit 1; }
    log "镜像构建完成" "SUCCESS"
}

start_service() {
    cd "${WORK_DIR}"
    docker compose -f docker/docker-compose.yaml --env-file "${ENV_FILE}" up -d --force-recreate || { log "容器启动失败" "ERROR"; exit 1; }
    log "等待服务就绪..."
    for i in $(seq 1 30); do
        if docker compose -f docker/docker-compose.yaml ps mysql --format '{{.Status}}' 2>/dev/null | grep -q "healthy"; then
            log "MySQL 已就绪" "SUCCESS"; break
        fi
        sleep 2
    done
    docker compose -f docker/docker-compose.yaml ps
    log "服务启动完成" "SUCCESS"
}

stop_service() {
    cd "${WORK_DIR}" 2>/dev/null || true
    docker compose -f docker/docker-compose.yaml down 2>/dev/null || true
    log "服务已停止" "SUCCESS"
}

show_logs() {
    cd "${WORK_DIR}"
    docker compose -f docker/docker-compose.yaml ps --format "table {{.Service}}\t{{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo "--- 最近 50 行日志 ---"
    docker compose -f docker/docker-compose.yaml logs --tail=50 2>/dev/null
}

verify() {
    cd "${WORK_DIR}"
    local ok=true
    for svc in mysql redis backend nginx; do
        local st=$(docker compose -f docker/docker-compose.yaml ps "${svc}" --format '{{.Status}}' 2>/dev/null || echo "not found")
        if echo "$st" | grep -qE "Up|healthy"; then
            log "$svc: $st" "SUCCESS"
        else
            log "$svc: $st" "ERROR"; ok=false
        fi
    done
    $ok && log "所有服务正常" "SUCCESS" || log "部分服务异常" "WARN"
}

full_deploy() {
    log "========== 开始完整部署 ==========" "INFO"
    load_env
    check_deps
    pull_code
    stop_service
    build_image
    start_service
    verify
    log "========== 部署完成 ==========" "SUCCESS"
}

# 部署中断时停止容器，避免半启动状态
trap 'log "部署中断，停止容器..." "WARN"; stop_service; exit 130' INT TERM

case ${1:-} in
    start)   load_env; start_service ;;
    stop)    stop_service ;;
    restart) load_env; stop_service; start_service ;;
    logs)    show_logs ;;
    verify)  load_env; verify ;;
    dev)     docker compose -f docker/docker-compose.dev.yaml up -d ;;
    dev:stop) docker compose -f docker/docker-compose.dev.yaml down ;;
    help|-h|--help)
        echo "用法: $0 [命令]"
        echo "  无参数     完整部署（构建→启动→验证）"
        echo "  start      启动服务"
        echo "  stop       停止服务"
        echo "  restart    重启服务"
        echo "  logs       查看日志"
        echo "  verify     验证服务"
        echo "  dev        启动开发环境（MySQL + Redis）"
        echo "  dev:stop   停止开发环境"
        ;;
    *) full_deploy ;;
esac
