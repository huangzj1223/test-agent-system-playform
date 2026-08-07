-- AlterTable: model_config.supportTools 默认值由 false 改为 true
-- 原因：多数模型支持工具调用，默认 false 会导致新建模型被静默剥夺工具能力。
-- 仅改默认值，不回填既有行（既有行的显式取值保持不变）。
ALTER TABLE `model_config` MODIFY `supportTools` BOOLEAN NOT NULL DEFAULT true;
