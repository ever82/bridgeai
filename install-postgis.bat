@echo off
chcp 65001 >nul
echo ============================================
echo 安装 PostGIS 3.6.2 for PostgreSQL 16
echo ============================================
echo.

set "PG_DIR=D:\program files\PostgreSQL\16"
set "POSTGIS_DIR=C:\msys64\tmp\postgis"

echo 检查权限...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 需要管理员权限
    echo 请右键以管理员身份运行此脚本
    pause
    exit /b 1
)

echo 停止 PostgreSQL 服务...
net stop postgresql-x64-16 2>nul

echo 复制 PostGIS 文件...
echo - 复制 bin 文件...
xcopy /E /I /Y "%POSTGIS_DIR%\bin\*" "%PG_DIR%\bin\" >nul 2>&1

echo - 复制 lib 文件...
xcopy /E /I /Y "%POSTGIS_DIR%\lib\*" "%PG_DIR%\lib\" >nul 2>&1

echo - 复制 share/extension 文件...
if not exist "%PG_DIR%\share\extension" mkdir "%PG_DIR%\share\extension"
xcopy /E /I /Y "%POSTGIS_DIR%\share\extension\postgis*" "%PG_DIR%\share\extension\" >nul 2>&1
xcopy /E /I /Y "%POSTGIS_DIR%\share\extension\address_standardizer*" "%PG_DIR%\share\extension\" >nul 2>&1
xcopy /E /I /Y "%POSTGIS_DIR%\share\extension\postgis_tiger_geocoder*" "%PG_DIR%\share\extension\" >nul 2>&1
xcopy /E /I /Y "%POSTGIS_DIR%\share\extension\postgis_topology*" "%PG_DIR%\share\extension\" >nul 2>&1

echo - 复制 share/contrib 文件...
if not exist "%PG_DIR%\share\contrib" mkdir "%PG_DIR%\share\contrib"
xcopy /E /I /Y "%POSTGIS_DIR%\share\contrib\*" "%PG_DIR%\share\contrib\" >nul 2>&1

echo 启动 PostgreSQL 服务...
net start postgresql-x64-16 2>nul

echo.
echo ============================================
echo PostGIS 安装完成!
echo ============================================
echo.
echo 现在可以启用 PostGIS 扩展了:
echo   psql -U postgres -d visionshare_dev -c "CREATE EXTENSION postgis;"
echo.
pause
