-- CreateTable
CREATE TABLE `base_sys_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `departmentId` INTEGER NULL,
    `username` VARCHAR(100) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `passwordV` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(191) NULL,
    `nickName` VARCHAR(191) NULL,
    `headImg` VARCHAR(191) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `socketId` VARCHAR(191) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `base_sys_user_username_key`(`username`),
    INDEX `base_sys_user_departmentId_idx`(`departmentId`),
    INDEX `base_sys_user_phone_idx`(`phone`),
    INDEX `base_sys_user_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `relevance` INTEGER NOT NULL DEFAULT 1,
    `status` INTEGER NOT NULL DEFAULT 1,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `base_sys_role_label_key`(`label`),
    INDEX `base_sys_role_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_menu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `router` VARCHAR(191) NULL,
    `perms` VARCHAR(191) NULL,
    `type` INTEGER NOT NULL DEFAULT 0,
    `icon` VARCHAR(191) NULL,
    `orderNum` INTEGER NOT NULL DEFAULT 0,
    `viewPath` VARCHAR(191) NULL,
    `keepAlive` INTEGER NOT NULL DEFAULT 1,
    `isShow` INTEGER NOT NULL DEFAULT 1,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `base_sys_menu_parentId_idx`(`parentId`),
    INDEX `base_sys_menu_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `parentId` INTEGER NULL,
    `orderNum` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `base_sys_department_parentId_idx`(`parentId`),
    INDEX `base_sys_department_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_user_role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,

    UNIQUE INDEX `base_sys_user_role_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_role_menu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,

    UNIQUE INDEX `base_sys_role_menu_roleId_menuId_key`(`roleId`, `menuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_role_department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `departmentId` INTEGER NOT NULL,

    UNIQUE INDEX `base_sys_role_department_roleId_departmentId_key`(`roleId`, `departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(191) NULL,
    `ip` VARCHAR(50) NULL,
    `ipAddr` VARCHAR(191) NULL,
    `params` TEXT NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `base_sys_log_userId_idx`(`userId`),
    INDEX `base_sys_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `base_sys_param` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `keyName` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `data` TEXT NULL,
    `remark` VARCHAR(191) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `base_sys_param_keyName_key`(`keyName`),
    INDEX `base_sys_param_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dict_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dict_type_key_key`(`key`),
    INDEX `dict_type_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dict_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `typeId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `orderNum` INTEGER NOT NULL DEFAULT 0,
    `remark` VARCHAR(191) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `dict_info_typeId_idx`(`typeId`),
    INDEX `dict_info_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cron` VARCHAR(191) NULL,
    `every` INTEGER NULL,
    `limit` INTEGER NULL,
    `service` VARCHAR(191) NULL,
    `data` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `type` INTEGER NOT NULL DEFAULT 0,
    `taskType` INTEGER NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `nextRunTime` DATETIME(3) NULL,
    `lastExecuteTime` DATETIME(3) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `task_info_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `detail` TEXT NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `task_log_taskId_idx`(`taskId`),
    INDEX `task_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `space_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `classifyId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `space_info_classifyId_idx`(`classifyId`),
    INDEX `space_info_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `space_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `parentId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `space_type_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plugin_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `keyName` VARCHAR(191) NOT NULL,
    `hook` VARCHAR(191) NULL,
    `version` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `readme` TEXT NULL,
    `logo` TEXT NULL,
    `author` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `config` JSON NULL,
    `pluginJson` JSON NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plugin_info_keyName_key`(`keyName`),
    INDEX `plugin_info_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recycle_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entityName` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `data` JSON NOT NULL,
    `userId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `recycle_data_entityName_entityId_idx`(`entityName`, `entityId`),
    INDEX `recycle_data_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `base_sys_user` ADD CONSTRAINT `base_sys_user_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `base_sys_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_user_role` ADD CONSTRAINT `base_sys_user_role_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `base_sys_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_user_role` ADD CONSTRAINT `base_sys_user_role_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `base_sys_role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_role_menu` ADD CONSTRAINT `base_sys_role_menu_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `base_sys_role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_role_menu` ADD CONSTRAINT `base_sys_role_menu_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `base_sys_menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_role_department` ADD CONSTRAINT `base_sys_role_department_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `base_sys_role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_role_department` ADD CONSTRAINT `base_sys_role_department_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `base_sys_department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dict_info` ADD CONSTRAINT `dict_info_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `dict_type`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_log` ADD CONSTRAINT `task_log_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
