-- AlterTable: 扩展 model_config 支撑模型配置页新表单字段
ALTER TABLE `model_config`
    ADD COLUMN `poolGroup` VARCHAR(50) NULL,
    ADD COLUMN `defaultTemperature` DOUBLE NULL,
    ADD COLUMN `defaultTopP` DOUBLE NULL,
    ADD COLUMN `timeoutSec` INTEGER NULL,
    ADD COLUMN `retryCount` INTEGER NULL,
    ADD COLUMN `supportCode` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `supportLongText` BOOLEAN NOT NULL DEFAULT false;
