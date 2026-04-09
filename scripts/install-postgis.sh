#!/bin/bash
# PostgreSQL + PostGIS 安装脚本 for Linux/Mac

set -e

echo "============================================"
echo "VisionShare PostgreSQL + PostGIS 安装脚本"
echo "============================================"

# 检查 PostgreSQL 是否安装
if ! command -v psql &> /dev/null; then
    echo "[错误] 未找到 PostgreSQL。请先安装 PostgreSQL 15+。"
    echo "Mac: brew install postgresql@15"
    echo "Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# 检查参数
if [ -z "$1" ]; then
    echo "用法: ./install-postgis.sh <数据库名称>"
    echo "示例: ./install-postgis.sh visionshare_dev"
    exit 1
fi

DB_NAME=$1
PGUSER=${PGUSER:-postgres}

echo "[1/5] 创建数据库 ${DB_NAME} ..."
psql -U $PGUSER -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
psql -U $PGUSER -d postgres -c "CREATE DATABASE ${DB_NAME};"

echo "[2/5] 创建 PostGIS 扩展 ..."
psql -U $PGUSER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;" || {
    echo "[警告] 创建 PostGIS 扩展失败，请手动安装 PostGIS"
    echo "Mac: brew install postgis"
    echo "Ubuntu: sudo apt-get install postgis"
}

echo "[3/5] 验证 PostGIS 安装 ..."
psql -U $PGUSER -d $DB_NAME -c "SELECT PostGIS_Version();"

echo "[4/5] 创建应用用户 ..."
psql -U $PGUSER -d postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'visionshare') THEN CREATE USER visionshare WITH PASSWORD 'visionshare123'; END IF; END \$\$;"
psql -U $PGUSER -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO visionshare;"

echo "[5/5] 配置完成"
echo ""
echo "============================================"
echo "数据库配置信息:"
echo "  数据库: ${DB_NAME}"
echo "  用户名: visionshare"
echo "  密码: visionshare123"
echo "  连接字符串: postgresql://visionshare:visionshare123@localhost:5432/${DB_NAME}"
echo "============================================"
echo ""
echo "提示: 请更新 .env.dev 中的数据库配置"
