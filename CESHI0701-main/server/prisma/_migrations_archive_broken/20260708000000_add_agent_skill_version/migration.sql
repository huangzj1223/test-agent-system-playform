-- CreateTable: 智能体技能版本历史（每次变更留全字段快照，支撑版本历史展示与回滚）
CREATE TABLE `sys_agent_skill_version` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skillId` INTEGER NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `snapshot` JSON NOT NULL,
    `changeType` VARCHAR(20) NOT NULL,
    `changeSummary` VARCHAR(300) NULL,
    `operator` VARCHAR(100) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_skill_version_skillId_idx`(`skillId`),
    INDEX `sys_agent_skill_version_createTime_idx`(`createTime`),
    INDEX `sys_agent_skill_version_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sys_agent_skill_version`
    ADD CONSTRAINT `sys_agent_skill_version_skillId_fkey`
    FOREIGN KEY (`skillId`) REFERENCES `sys_agent_skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
