#!/usr/bin/env bash
# 一键停止 start-all.sh 拉起的开发服务
#   停止：后端 server(9001)/Prisma Studio(5555)/frontend(3006)/backend(5173)/mobile(3000)
#   保留：MySQL/Redis Docker 容器（跨会话复用；如需停容器见文末提示）
# 用法：bash deploy/stop-all.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

C_G='\033[0;32m'; C_Y='\033[0;33m'; C_0='\033[0m'
log()  { echo -e "${C_G}[$(date '+%H:%M:%S')]${C_0} $1"; }
warn() { echo -e "${C_Y}[$(date '+%H:%M:%S')]${C_0} $1"; }

# 按 PID 杀进程树（Windows taskkill //T 连子进程一起杀）
kill_tree() {
  local pid="$1"
  [ -z "$pid" ] && return 0
  if command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
  else
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
}

# 按端口杀监听进程（兜底：npm 会派生子进程，PID 文件记的是父进程）
kill_by_port() {
  local port="$1" name="$2" pids
  pids=$(netstat -ano 2>/dev/null | grep -E "[:.]$port[[:space:]]+.*LISTENING" | awk '{print $NF}' | sort -u)
  if [ -n "$pids" ]; then
    for p in $pids; do kill_tree "$p"; done
    log "已停止 $name (端口 $port)"
  else
    warn "$name (端口 $port) 未在运行"
  fi
}

log "停止开发服务..."

# 先按 PID 文件杀父进程
if [ -d "$PID_DIR" ]; then
  for f in "$PID_DIR"/*.pid; do
    [ -e "$f" ] || continue
    kill_tree "$(cat "$f" 2>/dev/null)"
    rm -f "$f"
  done
fi

# 再按端口兜底清理
kill_by_port 9001 server
kill_by_port 5555 prisma-studio
kill_by_port 3006 frontend
kill_by_port 5173 backend
kill_by_port 3000 mobile

log "全部开发服务已停止"
warn "MySQL/Redis 容器仍在运行（供下次快速启动）"
warn "如需停止容器: cd server && docker compose -f docker/docker-compose.dev.yaml down"
