-- DropForeignKey
ALTER TABLE `inspection_checklist_item` DROP FOREIGN KEY `inspection_checklist_item_checklistId_fkey`;

-- AlterTable
ALTER TABLE `base_sys_department` ADD COLUMN `leader` VARCHAR(50) NULL,
    ADD COLUMN `phone` VARCHAR(20) NULL,
    ADD COLUMN `status` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `base_sys_user` ADD COLUMN `workId` VARCHAR(30) NULL;

-- DropTable
DROP TABLE `inspection_checklist`;

-- DropTable
DROP TABLE `inspection_checklist_item`;

-- CreateIndex
CREATE UNIQUE INDEX `base_sys_user_workId_key` ON `base_sys_user`(`workId`);

