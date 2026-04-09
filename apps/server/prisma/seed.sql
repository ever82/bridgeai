-- 初始化数据
-- 在运行 prisma migrate 后执行

-- 可选: 创建一些示例数据
-- 注意: 这些只是示例，实际项目中应该通过 API 或 seed 脚本创建

-- 添加 PostGIS 扩展 (如果还没有)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 设置时区
SET timezone = 'Asia/Shanghai';
