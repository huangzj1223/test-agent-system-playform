-- AlterTable
ALTER TABLE `base_sys_user` ADD COLUMN `positionId` INTEGER NULL;

-- CreateTable
CREATE TABLE `base_sys_position` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(200) NULL,
    `orderNum` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `base_sys_position_name_key`(`name`),
    INDEX `base_sys_position_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `base_sys_user_positionId_idx` ON `base_sys_user`(`positionId`);

-- AddForeignKey
ALTER TABLE `base_sys_user` ADD CONSTRAINT `base_sys_user_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `base_sys_position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
