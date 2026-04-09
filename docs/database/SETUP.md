# Database Setup Guide

## 使用 Docker (推荐)

最简单的方法是使用 Docker Compose:

```bash
# 启动 PostgreSQL 和 Redis
docker-compose up -d

# 验证服务状态
docker-compose ps
```

## 本地安装

### macOS

```bash
# 使用 Homebrew
brew install postgresql@15
brew install postgis
brew services start postgresql@15

# 运行安装脚本
./scripts/install-postgis.sh visionshare_dev
```

### Ubuntu/Debian

```bash
# 安装 PostgreSQL 和 PostGIS
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-contrib-15 postgis

# 启动服务
sudo systemctl start postgresql

# 运行安装脚本
sudo -u postgres ./scripts/install-postgis.sh visionshare_dev
```

### Windows

```powershell
# 运行安装脚本
.\scripts\install-postgis.bat visionshare_dev
```

## 验证安装

```bash
# 连接数据库
psql -U visionshare -d visionshare_dev

# 检查 PostGIS
SELECT PostGIS_Version();

# 检查数据库列表
\l

# 退出
\q
```

## 常见问题

### 1. 连接被拒绝

```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 重启服务
sudo systemctl restart postgresql
```

### 2. PostGIS 未安装

```bash
# macOS
brew install postgis

# Ubuntu
sudo apt-get install postgresql-15-postgis-3
```

### 3. 权限问题

```bash
# 修改 pg_hba.conf 允许本地连接
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 添加或修改以下行
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust

# 重启服务
sudo systemctl restart postgresql
```

## Prisma 操作

```bash
# 生成 Prisma Client
pnpm prisma generate

# 创建迁移
pnpm prisma migrate dev --name init

# 应用迁移
pnpm prisma migrate deploy

# 查看数据库
pnpm prisma studio
```
