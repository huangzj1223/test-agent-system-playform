-- CreateTable
CREATE TABLE `sys_agent_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configKey` VARCHAR(64) NOT NULL,
    `settings` JSON NOT NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_config_configKey_key`(`configKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
