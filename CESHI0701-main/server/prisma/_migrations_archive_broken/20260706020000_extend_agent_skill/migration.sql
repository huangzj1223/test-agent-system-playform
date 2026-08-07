-- AlterTable: 扩展 sys_agent_skill 新增管理台所需字段
ALTER TABLE `sys_agent_skill`
    ADD COLUMN `category` VARCHAR(32) NOT NULL DEFAULT 'operation',
    ADD COLUMN `riskLevel` VARCHAR(8) NOT NULL DEFAULT 'L1',
    ADD COLUMN `version` VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
    ADD COLUMN `cliCommand` VARCHAR(500) NULL,
    ADD COLUMN `triggerKeywords` JSON NULL,
    ADD COLUMN `applicableAgents` JSON NULL,
    ADD COLUMN `creator` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `sys_agent_skill_category_idx` ON `sys_agent_skill`(`category`);
CREATE INDEX `sys_agent_skill_riskLevel_idx` ON `sys_agent_skill`(`riskLevel`);

-- CreateTable: 技能运行日志
CREATE TABLE `sys_agent_skill_run_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skillId` INTEGER NOT NULL,
    `capabilityKey` VARCHAR(64) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `durationMs` INTEGER NOT NULL DEFAULT 0,
    `errorMsg` VARCHAR(500) NULL,
    `userId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_skill_run_log_skillId_idx`(`skillId`),
    INDEX `sys_agent_skill_run_log_createTime_idx`(`createTime`),
    INDEX `sys_agent_skill_run_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sys_agent_skill_run_log`
    ADD CONSTRAINT `sys_agent_skill_run_log_skillId_fkey`
    FOREIGN KEY (`skillId`) REFERENCES `sys_agent_skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
