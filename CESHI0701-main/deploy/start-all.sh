#!/usr/bin/env bash
# 一键启动 SDAD 全栈开发环境
#   后端 server(9001) + 管理端 backend(5173) + 前台 frontend(3006) + 移动端 mobile(3000)
# 用法：bash deploy/start-all.sh
# 停止：bash deploy/stop-all.sh
set -uo pipefail

# ---------- 路径 ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_DIR="$SCRIPT_DIR/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# ---------- 颜色日志 ----------
C_G='\033[0;32m'; C_B='\033[0;34m'; C_Y='\033[0;33m'; C_R='\033[0;31m'; C_0='\033[0m'
log()  { echo -e "${C_B}[$(date '+%H:%M:%S')]${C_0} $1"; }
ok()   { echo -e "${C_G}[$(date '+%H:%M:%S')] OK${C_0} $1"; }
warn() { echo -e "${C_Y}[$(date '+%H:%M:%S')] !!${C_0} $1"; }
err()  { echo -e "${C_R}[$(date '+%H:%M:%S')] XX${C_0} $1"; }

# ---------- 依赖检查 ----------
check_deps() {
  local miss=()
  for c in node npm npx docker pnpm; do
    command -v "$c" >/dev/null 2>&1 || miss+=("$c")
  done
  if [ ${#miss[@]} -gt 0 ]; then
    err "缺少依赖: ${miss[*]}"; exit 1
  fi
  docker info >/dev/null 2>&1 || { err "Docker 未运行，请先启动 Docker Desktop"; exit 1; }
  ok "依赖检查通过"
}

# ---------- 端口是否已被监听 ----------
port_used() { netstat -ano 2>/dev/null | grep -qE "[:.]$1[[:space:]]+.*LISTENING"; }

# ---------- 依赖安装（无 node_modules 时自动 npm install）----------
ensure_deps() {
  local dir="$1" name="$2"
  if [ ! -d "$ROOT_DIR/$dir/node_modules" ]; then
    warn "$name 缺少 node_modules，执行 npm install（首次较慢）..."
    ( cd "$ROOT_DIR/$dir" && npm install >"$LOG_DIR/$name-install.log" 2>&1 ) \
      && ok "$name 依赖安装完成" \
      || { err "$name 依赖安装失败，详见 $LOG_DIR/$name-install.log"; exit 1; }
  fi
}

# ---------- 启动一个 Vite 前端服务 ----------
# $1=目录 $2=服务名 $3=端口
start_vite() {
  local dir="$1" name="$2" port="$3"
  if port_used "$port"; then
    warn "$name 端口 $port 已被占用，跳过启动（可能已在运行）"
    return 0
  fi
  ensure_deps "$dir" "$name"
  log "启动 $name (端口 $port)..."
  ( cd "$ROOT_DIR/$dir" && nohup npm run dev >"$LOG_DIR/$name.log" 2>&1 & echo $! >"$PID_DIR/$name.pid" )
  ok "$name 已后台启动，日志: deploy/logs/$name.log"
}

# ---------- 启动后端（含容器/建表/种子）----------
start_server() {
  if port_used 9001; then
    warn "后端 server 端口 9001 已被占用，跳过启动（可能已在运行）"
    return 0
  fi
  log "启动后端 server (端口 9001)，首次会拉起 MySQL/Redis 容器并建表，请耐心等待..."
  ( cd "$ROOT_DIR/server" && nohup bash scripts/dev-setup.sh serve >"$LOG_DIR/server.log" 2>&1 & echo $! >"$PID_DIR/server.pid" )
  ok "后端 server 已后台启动，日志: deploy/logs/server.log"
}

# ---------- 等待端口就绪 ----------
wait_port() {
  local port="$1" name="$2" max="${3:-60}"
  log "等待 $name (端口 $port) 就绪..."
  for _ in $(seq 1 "$max"); do
    port_used "$port" && { ok "$name 已就绪 → http://localhost:$port"; return 0; }
    sleep 2
  done
  warn "$name 等待超时（${max}x2s），请查看日志: deploy/logs/$name.log"
  return 1
}

# ---------- 主流程 ----------
main() {
  echo "==================================================="
  echo "  SDAD 全栈开发环境 一键启动"
  echo "==================================================="
  check_deps

  # 后端优先：前端接口都依赖它
  start_server
  wait_port 9001 server 90 || true

  # 三个前端并行后台启动
  start_vite frontend frontend 3006
  start_vite backend  backend  5173
  start_vite mobile   mobile   3000

  wait_port 3006 frontend 40 || true
  wait_port 5173 backend  40 || true
  wait_port 3000 mobile   40 || true

  echo ""
  echo -e "${C_G}===================================================${C_0}"
  echo -e "${C_G}  启动完成${C_0}"
  echo "  后端 server   : http://localhost:9001  (API 文档 /docs)"
  echo "  前台 frontend : http://localhost:3006"
  echo "  管理端 backend: http://localhost:5173"
  echo "  移动端 mobile : http://localhost:3000"
  echo "  数据库 GUI    : http://localhost:5555  (Prisma Studio)"
  echo -e "${C_G}---------------------------------------------------${C_0}"
  echo "  查看日志: deploy/logs/<服务名>.log"
  echo "  停止全部: bash deploy/stop-all.sh"
  echo -e "${C_G}===================================================${C_0}"
  echo "  默认管理员: admin / 123456"
}

main "$@"
