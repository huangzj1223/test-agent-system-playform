-- AlterTable
ALTER TABLE `base_sys_department` ADD COLUMN `type` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `inspection_checklist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `deviceCategoryId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `inspection_checklist_deviceCategoryId_idx`(`deviceCategoryId`),
    INDEX `inspection_checklist_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspection_checklist_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `checklistId` INTEGER NOT NULL,
    `content` VARCHAR(100) NOT NULL,
    `standard` VARCHAR(200) NULL,
    `resultType` VARCHAR(30) NOT NULL DEFAULT 'normal_abnormal',
    `required` INTEGER NOT NULL DEFAULT 1,
    `unit` VARCHAR(20) NULL,
    `normalRange` VARCHAR(50) NULL,
    `orderNum` INTEGER NOT NULL DEFAULT 0,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `inspection_checklist_item_checklistId_idx`(`checklistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inspection_checklist_item` ADD CONSTRAINT `inspection_checklist_item_checklistId_fkey` FOREIGN KEY (`checklistId`) REFERENCES `inspection_checklist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
