-- AlterTable: sys_agent_tool 新增 source 列
-- 原因：区分工具来源——manual=手动新建 / registry=前端注册表同步，
--       用于分辨真实运行时工具与手动配置项。
-- 说明：开发库此前经 `prisma db push` 已存在该列，本迁移用于生产环境
--       `prisma migrate deploy` 补齐；开发库通过 `migrate resolve --applied` 标记已应用，不重复执行。
ALTER TABLE `sys_agent_tool` ADD COLUMN `source` VARCHAR(16) NOT NULL DEFAULT 'manual';
