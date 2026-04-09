@echo off
chcp 65001 >nul
REM PostgreSQL + PostGIS 安装脚本 for Windows

echo ============================================
echo VisionShare PostgreSQL + PostGIS 安装脚本
echo ============================================

REM 检查 PostgreSQL 是否安装
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 PostgreSQL。请先安装 PostgreSQL 15+。
    echo 下载地址: https://www.postgresql.org/download/windows/
    exit /b 1
)

REM 检查参数
if "%~1"=="" (
    echo 用法: install-postgis.bat ^<数据库名称^>
    echo 示例: install-postgis.bat visionshare_dev
    exit /b 1
)

set DB_NAME=%~1
set PGUSER=postgres

REM 输入密码
echo.
echo 请输入 PostgreSQL 用户密码:
set /p PGPASSWORD="密码: "

set PGPASSWORD=%PGPASSWORD%
echo.

echo [1/5] 创建数据库 %DB_NAME% ...
psql -U %PGUSER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
psql -U %PGUSER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 创建数据库失败
    exit /b 1
)

echo [2/5] 创建 PostGIS 扩展 ...
psql -U %PGUSER% -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS postgis;"
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 创建 PostGIS 扩展失败，可能需要手动安装 PostGIS
)

echo [3/5] 验证 PostGIS 安装 ...
psql -U %PGUSER% -d %DB_NAME% -c "SELECT PostGIS_Version();"

echo [4/5] 创建应用用户 ...
psql -U %PGUSER% -d postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'visionshare') THEN CREATE USER visionshare WITH PASSWORD 'visionshare123'; END IF; END \$\$;"
psql -U %PGUSER% -d %DB_NAME% -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO visionshare;"

echo [5/5] 配置完成
echo.
echo ============================================
echo 数据库配置信息:
echo   数据库: %DB_NAME%
echo   用户名: visionshare
echo   密码: visionshare123
echo   连接字符串: postgresql://visionshare:visionshare123@localhost:5432/%DB_NAME%
echo ============================================
echo.
echo 提示: 请更新 .env.dev 中的数据库配置
echo.

pause
