-- CreateTable
CREATE TABLE `sys_agent_skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skillKey` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `capabilities` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `builtin` BOOLEAN NOT NULL DEFAULT false,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_skill_skillKey_key`(`skillKey`),
    INDEX `sys_agent_skill_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
