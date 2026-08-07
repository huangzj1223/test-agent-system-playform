# 部署文档（admin 前端 + server 后端）

本项目采用「**CI 自动构建镜像、服务器手动拉取部署**」的方式。GitHub 全程不接触服务器，
服务器地址/密码不进 GitHub、不外泄。

---

## 一、工作原理

```
开发者推代码合并到 main
        │
        ▼
GitHub Actions 自动构建两个镜像并推送到 GHCR（GitHub 容器仓库）
  · ghcr.io/<owner>/<repo>-server   后端（NestJS）
  · ghcr.io/<owner>/<repo>-admin    前端（nginx + 静态产物 + 反代后端）
        │   只用 GitHub 自带的 GITHUB_TOKEN，不涉及任何服务器凭据
        ▼
你在服务器上手动执行 update.sh（docker compose pull && up -d）
  · 拉取最新镜像、重启容器、自动跑数据库迁移、健康检查
```

- 镜像名里的 `<owner>/<repo>` 就是你的 GitHub 仓库（如仓库是 `github.com/acme/xunjian`，
  镜像即 `ghcr.io/acme/xunjian-server`、`ghcr.io/acme/xunjian-admin`）。
- 数据库迁移（Prisma）在后端容器启动时自动执行，无需手动操作。

---

## 二、前提条件

| 项目 | 要求 |
|------|------|
| 服务器系统 | Linux（x86_64 / amd64） |
| Docker | 20.10+ |
| Docker Compose | v2（命令为 `docker compose`，带空格） |
| GitHub | 仓库已推送到 GitHub，且 Actions 已成功构建出镜像（仓库 → Actions 页面可见绿色 ✓） |

> 镜像默认构建 `linux/amd64`。若服务器是 arm64，修改两个 workflow 里的 `platforms: linux/arm64` 后重新构建。

---

## 三、服务器首次部署

### 1. 安装 Docker（如未安装）

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

### 2. 登录 GHCR（拉取私有镜像需要）

GHCR 镜像默认私有，服务器拉取前需登录。**用一个只读 Token，凭据只留在服务器**：

1. 在 GitHub 网页：`Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token`，
   勾选 **`read:packages`** 权限，生成后复制 Token。
2. 在服务器执行（把 `YOUR_GITHUB_USERNAME` 换成你的用户名，按提示粘贴 Token）：

```bash
echo "粘贴你的PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

> 看到 `Login Succeeded` 即可。Token 仅存于服务器本地的 `~/.docker/config.json`。

### 3. 准备部署目录

服务器**不需要源码**，只需要以下文件（从仓库的 `server/docker/` 目录复制过去即可）：

```
部署目录/
├── docker-compose.yaml
├── update.sh
├── .env                 ← 由 .env.example 复制并填写（下一步）
└── nginx/
    └── ssl/             ← 可选，放 HTTPS 证书；不用 HTTPS 可留空目录
```

可以用 git 拉仓库后进入 `server/docker/`，也可以只把上面几个文件传到服务器某目录。

### 4. 配置 .env

```bash
cp .env.example .env
vi .env   # 按下表逐项修改
```

| 变量 | 说明 |
|------|------|
| `BACKEND_IMAGE` | 改成 `ghcr.io/<owner>/<repo>-server:latest`（你的实际镜像地址） |
| `FRONTEND_IMAGE` | 改成 `ghcr.io/<owner>/<repo>-admin:latest` |
| `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD` | **改成强密码** |
| `REDIS_PASSWORD` | **改成强密码** |
| `JWT_SECRET` | **改成强随机串**（如 `openssl rand -hex 32` 生成） |
| `HTTP_PORT` | 对外访问端口，默认 `80`（如被占用改成 `8080` 等） |
| `BACKEND_PORT` / `MYSQL_PORT` / `REDIS_PORT` | 一般无需改；端口冲突时调整 |

### 5. 启动

```bash
chmod +x update.sh
./update.sh
```

`update.sh` 会：拉取最新镜像 → 启动 MySQL/Redis/后端/nginx → 后端启动时自动迁移数据库 →
等待健康检查 → 打印各服务状态。首次启动 MySQL 初始化约需 30~60 秒，请耐心等待。

### 6. 验证

```bash
# 后端健康检查（应返回 200）
curl -i http://localhost/admin/open/health
# 浏览器访问（把 服务器IP 换成实际地址）
# http://服务器IP/        ← 打开管理后台登录页
```

### 7. 首次登录并改密码

- 默认管理员：账号 `admin`，初始密码 `123456`
- **登录后立即修改默认密码**（种子数据创建，生产必须改）。

---

## 四、日常更新流程

以后每次发版，只需三步：

1. 开发者把改动合并到 `main`。
2. 等 GitHub 仓库 `Actions` 页面对应的构建变绿（镜像已推到 GHCR）。
3. 在服务器部署目录执行：

```bash
./update.sh
```

即可拉取新镜像、滚动重启、自动迁移、健康检查。前端或后端任一改动都会各自触发对应镜像构建。

---

## 五、版本管理与回滚

- 每次构建除了 `:latest`，还会打一个 `:sha-<提交短哈希>` 的不可变标签。
- **回滚**：把 `.env` 里的镜像标签从 `:latest` 改成某个历史 `:sha-xxxxxxx`，再执行 `./update.sh` 即可回到该版本。

```bash
# 例：回滚后端到指定版本
BACKEND_IMAGE=ghcr.io/acme/xunjian-server:sha-1a2b3c4
```

> 可在 GitHub 仓库 → Packages 里查看所有可用的镜像标签。

---

## 六、常见问题

| 现象 | 排查 |
|------|------|
| 拉镜像报 `denied` / `401` | 未登录 GHCR 或 Token 无 `read:packages`，重新执行第三步第 2 项 |
| `.env 缺少 BACKEND_IMAGE` | `.env` 未填镜像地址，按第四步补全 |
| 后端一直重启 | `docker compose logs backend` 查看日志；多为 DB 连接或 `.env` 配置问题 |
| 端口被占用 | 改 `.env` 的 `HTTP_PORT`/`MYSQL_PORT` 等后重跑 |
| 前端能开但接口 502 | 后端未就绪或异常，先确认 `curl localhost/admin/open/health` 为 200 |

常用命令：

```bash
docker compose -f docker-compose.yaml --env-file .env ps        # 查看状态
docker compose -f docker-compose.yaml --env-file .env logs -f backend   # 跟踪后端日志
docker compose -f docker-compose.yaml --env-file .env down      # 停止（保留数据卷）
```

> 数据存于 Docker 命名卷（`mysql_data`/`redis_data`/`backend_uploads`），`down` 不会删除。
> 仅当确实要清空数据时才用 `down -v`（**会删库，谨慎**）。

---

## 七、安全须知

- 上线前务必：改默认管理员密码、设强 `JWT_SECRET`、改数据库/Redis 强密码。
- 镜像保持 GHCR 私有；服务器登录 GHCR 的 PAT、服务器密码均不要提交到仓库。
- 生产建议不对外暴露 `MYSQL_PORT`/`REDIS_PORT`（仅容器内网互通即可），可在 `docker-compose.yaml` 中去掉这两个服务的 `ports` 映射。
- HTTPS：把证书放入 `nginx/ssl/` 并在前端 nginx 配置中启用 443（当前默认仅 80）。

---

## 八、升级已有数据库的注意事项

若服务器上**已有带数据的旧库**要升级，执行更新前先备份（全新部署可忽略）：

```bash
docker compose -f docker-compose.yaml --env-file .env exec mysql \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > backup_$(date +%Y%m%d).sql
```

> 说明：迁移中包含删除历史遗留表 `inspection_checklist` / `inspection_checklist_item` 的操作，
> 全新部署无影响；旧库升级前请确认这两张表无需保留或已备份。

### ⚠️ 迁移历史为空的旧库：先 resolve 基线，再更新

若旧库当初是用 `prisma db push` 建的（表齐全但**迁移历史表 `_prisma_migrations` 为空或不存在**），
直接跑 `migrate deploy` 会试图重建已存在的表而报“表已存在”。此类库**首次更新前必须先执行一次**
（只写迁移历史、不执行 SQL）：

```bash
docker compose -f docker-compose.yaml --env-file .env exec backend \
  ./node_modules/.bin/prisma migrate resolve --applied 20260530000000_baseline_squash
```

判断方法：容器内 `prisma migrate status`，若提示基线未应用但表已存在，即属此情况。
全新空库无需此步。详见 `prisma/migrations/README.md`。

---

## 九、用域名访问（通过服务器已有 nginx 反向代理）

适用场景：服务器上**已有一个 nginx 在跑别的网站**、占用了 80/443，本项目容器只能用非标端口（如 `HTTP_PORT=8080`）。
做法是让**已有的那个 nginx 当总入口**，按域名把请求反代到本项目容器，多个站点共用 80/443、按域名分流、互不影响。

### 前提
- 域名已添加 **A 记录**解析到服务器公网 IP。
- 国内服务器：域名需已完成 **ICP 备案**，否则 80/443 会被阻断。
- 已知本项目容器对外端口（`.env` 里的 `HTTP_PORT`，如 `8080`）。

### 步骤

1. **新建站点配置**（把 `xunjian.axuremart.com` 换成你的域名）：

   ```bash
   vi /etc/nginx/conf.d/xunjian.conf
   ```
   按 `i` 进入编辑，粘贴以下内容，再 `Esc` → `:wq` 保存：

   ```nginx
   server {
       listen 80;
       server_name xunjian.axuremart.com;
       client_max_body_size 50m;
       location / {
           proxy_pass http://127.0.0.1:8080;   # 指向 .env 里的 HTTP_PORT
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
   > ⚠️ 用编辑器（vi/nano）创建，**不要用 `cat <<'EOF'` 粘贴**——若复制时带了行首缩进，结束标记 `EOF` 不顶格会导致命令卡住。

2. **校验并重载**：
   ```bash
   nginx -t && nginx -s reload
   ```
   看到 `syntax is ok` / `test is successful` 即成功。

3. **访问**：`http://你的域名/`（80 端口，无需带端口号）。

> 上面的 `conf.d` 写法仅适用于**手动安装、用 `/etc/nginx/conf.d/` 结构**的 nginx。
> 若服务器 nginx 由**宝塔等面板**管理（配置在 `/www/server/nginx/`），见下方专门小节，**不要手动改文件**（会被面板覆盖）。

### HTTPS（手动 nginx，可选）

用 certbot 自动申请 Let's Encrypt 免费证书并改写上面的配置：

```bash
# Debian/Ubuntu
apt install -y certbot python3-certbot-nginx
certbot --nginx -d xunjian.axuremart.com
```
certbot 会自动加 443 配置、申请证书、配置 80→443 跳转，并设置自动续期。完成后用 `https://你的域名/` 访问。

---

## 九-B、用域名访问（服务器是宝塔面板管理 nginx）

判断依据：`nginx -V` 显示 `--prefix=/www/server/nginx`，且存在 `/www/server/panel`。
此时 nginx 由宝塔托管，**全部在面板里操作**，不要手动改配置文件。

### 步骤

1. **登录宝塔面板** → 左侧「网站」→「添加站点」
   - 域名：填你的域名，如 `xunjian.axuremart.com`
   - 数据库、FTP 都**不创建**；PHP 版本选「**纯静态**」
   - 提交（这会创建一个空站点，仅用来承接域名）

2. **配置反向代理**：点该站点右侧「设置」→「反向代理」标签 →「添加反向代理」
   - 代理名称：任意，如 `xunjian`
   - 目标 URL：`http://127.0.0.1:8080`（即 `.env` 里的 `HTTP_PORT`）
   - 发送域名：`$host`
   - 提交

3. **访问**：`http://你的域名/`（宝塔已用 80 端口，按域名分流到本项目容器）

### HTTPS（宝塔，已备案推荐）

该站点「设置」→「SSL」→「Let's Encrypt」→ 勾选域名 → 申请 → 开启「**强制 HTTPS**」。
比命令行 certbot 更省事，证书自动续期。完成后用 `https://你的域名/` 访问。

---

## 附：本次部署踩过的坑（排查参考）

| 现象 | 原因 | 解决 |
|------|------|------|
| `bind host port 0.0.0.0:3306 address already in use` | 服务器已装原生 MySQL 占用 3306 | `.env` 改 `MYSQL_PORT=13306`（容器内部仍 3306，不影响后端连接） |
| `bind host port 0.0.0.0:80 address already in use` | 服务器已有 nginx 占用 80/443 | `.env` 改 `HTTP_PORT=8080`/`HTTPS_PORT=8443`，再用本章反代到域名 |
| `redis is unhealthy` 连带 backend 不启动 | `.env` 的 `REDIS_PASSWORD` 为空 | Redis 开启了密码保护，必须设非空密码（纯字母数字） |
| 容器都起来了但浏览器打不开 | 阿里云安全组未放行端口 | 安全组入方向放行对应端口（80 或 8080） |
