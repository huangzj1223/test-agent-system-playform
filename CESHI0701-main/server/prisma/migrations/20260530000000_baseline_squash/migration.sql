
-- CreateTable
CREATE TABLE `base_sys_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `departmentId` INTEGER NULL,
    `positionId` INTEGER NULL,
    `username` VARCHAR(100) NOT NULL,
    `workId` VARCHAR(30) NULL,
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
    UNIQUE INDEX `base_sys_user_workId_key`(`workId`),
    INDEX `base_sys_user_departmentId_idx`(`departmentId`),
    INDEX `base_sys_user_positionId_idx`(`positionId`),
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
    `type` VARCHAR(20) NULL,
    `leader` VARCHAR(50) NULL,
    `phone` VARCHAR(20) NULL,
    `orderNum` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
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

-- CreateTable
CREATE TABLE `model_provider_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `apiEndpoint` VARCHAR(500) NOT NULL,
    `apiKeyCipher` TEXT NULL,
    `protocolType` VARCHAR(50) NOT NULL,
    `apiVersion` VARCHAR(50) NULL,
    `remark` VARCHAR(500) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `model_provider_config_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerConfigId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `modelId` VARCHAR(100) NOT NULL,
    `contextWindow` INTEGER NULL,
    `maxOutputTokens` INTEGER NULL,
    `poolGroup` VARCHAR(50) NULL,
    `defaultTemperature` DOUBLE NULL,
    `defaultTopP` DOUBLE NULL,
    `timeoutSec` INTEGER NULL,
    `retryCount` INTEGER NULL,
    `supportText` BOOLEAN NOT NULL DEFAULT true,
    `supportImageInput` BOOLEAN NOT NULL DEFAULT false,
    `supportImageOutput` BOOLEAN NOT NULL DEFAULT false,
    `supportTools` BOOLEAN NOT NULL DEFAULT true,
    `supportStream` BOOLEAN NOT NULL DEFAULT true,
    `supportCode` BOOLEAN NOT NULL DEFAULT false,
    `supportLongText` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `model_config_providerConfigId_idx`(`providerConfigId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `skillKey` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `capabilities` JSON NOT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'operation',
    `riskLevel` VARCHAR(8) NOT NULL DEFAULT 'L1',
    `version` VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
    `cliCommand` VARCHAR(500) NULL,
    `triggerKeywords` JSON NULL,
    `applicableAgents` JSON NULL,
    `creator` VARCHAR(100) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `builtin` BOOLEAN NOT NULL DEFAULT false,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_skill_skillKey_key`(`skillKey`),
    INDEX `sys_agent_skill_tenantId_idx`(`tenantId`),
    INDEX `sys_agent_skill_category_idx`(`category`),
    INDEX `sys_agent_skill_riskLevel_idx`(`riskLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `sys_agent_chat_setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `settings` JSON NOT NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_chat_setting_userId_key`(`userId`),
    INDEX `sys_agent_chat_setting_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `sys_agent_risk_policy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` VARCHAR(8) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(500) NULL,
    `examples` JSON NOT NULL,
    `approvalRequirement` VARCHAR(200) NULL,
    `defaultAction` VARCHAR(20) NOT NULL DEFAULT 'allow',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_risk_policy_level_key`(`level`),
    INDEX `sys_agent_risk_policy_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_approval_rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `scope` VARCHAR(50) NOT NULL,
    `riskLevels` JSON NOT NULL,
    `approvalMode` VARCHAR(20) NOT NULL DEFAULT 'manual',
    `approverRole` VARCHAR(100) NOT NULL,
    `timeoutMinutes` INTEGER NOT NULL DEFAULT 30,
    `timeoutAction` VARCHAR(20) NOT NULL DEFAULT 'deny',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `sys_agent_approval_rule_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_security_list` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listType` VARCHAR(20) NOT NULL,
    `value` VARCHAR(300) NOT NULL,
    `description` VARCHAR(300) NULL,
    `riskLevel` VARCHAR(8) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `sys_agent_security_list_listType_idx`(`listType`),
    INDEX `sys_agent_security_list_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_sensitive_rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(50) NOT NULL,
    `pattern` VARCHAR(300) NOT NULL,
    `action` VARCHAR(20) NOT NULL DEFAULT 'mask',
    `scopes` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `sys_agent_sensitive_rule_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_security_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configKey` VARCHAR(64) NOT NULL,
    `settings` JSON NOT NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_security_config_configKey_key`(`configKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_approval_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ruleId` INTEGER NULL,
    `actionType` VARCHAR(20) NOT NULL,
    `targetDesc` VARCHAR(300) NOT NULL,
    `riskLevel` VARCHAR(8) NOT NULL,
    `payload` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `requesterId` INTEGER NULL,
    `approverId` INTEGER NULL,
    `approveRemark` VARCHAR(500) NULL,
    `expireAt` DATETIME(3) NULL,
    `decidedAt` DATETIME(3) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `sys_agent_approval_request_status_idx`(`status`),
    INDEX `sys_agent_approval_request_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actionType` VARCHAR(20) NOT NULL,
    `actionDesc` VARCHAR(300) NOT NULL,
    `riskLevel` VARCHAR(8) NOT NULL,
    `allowed` BOOLEAN NOT NULL,
    `requireApproval` BOOLEAN NOT NULL DEFAULT false,
    `matchedPolicies` JSON NULL,
    `blockedReason` VARCHAR(300) NULL,
    `userId` INTEGER NULL,
    `skillKey` VARCHAR(64) NULL,
    `toolKey` VARCHAR(64) NULL,
    `maskedPayload` JSON NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_audit_log_actionType_idx`(`actionType`),
    INDEX `sys_agent_audit_log_createTime_idx`(`createTime`),
    INDEX `sys_agent_audit_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_tool` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toolKey` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `description` VARCHAR(500) NULL,
    `riskLevel` VARCHAR(8) NOT NULL DEFAULT 'L1',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `requireConfirm` BOOLEAN NOT NULL DEFAULT false,
    `applicableAgents` JSON NULL,
    `config` JSON NOT NULL,
    `source` VARCHAR(16) NOT NULL DEFAULT 'manual',
    `sort` INTEGER NOT NULL DEFAULT 0,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_agent_tool_toolKey_key`(`toolKey`),
    INDEX `sys_agent_tool_type_idx`(`type`),
    INDEX `sys_agent_tool_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_tool_call_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toolId` INTEGER NOT NULL,
    `toolKey` VARCHAR(64) NOT NULL,
    `agent` VARCHAR(100) NULL,
    `skill` VARCHAR(100) NULL,
    `params` JSON NULL,
    `success` BOOLEAN NOT NULL,
    `durationMs` INTEGER NOT NULL DEFAULT 0,
    `operatorId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_tool_call_log_toolId_idx`(`toolId`),
    INDEX `sys_agent_tool_call_log_createTime_idx`(`createTime`),
    INDEX `sys_agent_tool_call_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_memory_file` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memoryKey` VARCHAR(64) NOT NULL,
    `userId` INTEGER NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(200) NULL,
    `subtitle` VARCHAR(200) NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(32) NOT NULL DEFAULT 'internal',
    `riskLevel` VARCHAR(8) NOT NULL DEFAULT 'L1',
    `version` VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `canRead` BOOLEAN NOT NULL DEFAULT true,
    `canSuggest` BOOLEAN NOT NULL DEFAULT true,
    `canAutoWrite` BOOLEAN NOT NULL DEFAULT false,
    `needConfirm` BOOLEAN NOT NULL DEFAULT true,
    `auditLog` BOOLEAN NOT NULL DEFAULT true,
    `relatedIds` JSON NULL,
    `builtin` BOOLEAN NOT NULL DEFAULT false,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `creator` VARCHAR(100) NULL,
    `updater` VARCHAR(100) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateTime` DATETIME(3) NOT NULL,

    INDEX `sys_agent_memory_file_userId_idx`(`userId`),
    INDEX `sys_agent_memory_file_tenantId_idx`(`tenantId`),
    INDEX `sys_agent_memory_file_riskLevel_idx`(`riskLevel`),
    INDEX `sys_agent_memory_file_enabled_idx`(`enabled`),
    UNIQUE INDEX `sys_agent_memory_file_memoryKey_userId_key`(`memoryKey`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_memory_version` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memoryId` INTEGER NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `content` TEXT NOT NULL,
    `changeType` VARCHAR(20) NOT NULL,
    `note` VARCHAR(300) NULL,
    `updater` VARCHAR(100) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_memory_version_memoryId_idx`(`memoryId`),
    INDEX `sys_agent_memory_version_createTime_idx`(`createTime`),
    INDEX `sys_agent_memory_version_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_memory_pending` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(1000) NOT NULL,
    `targetKey` VARCHAR(64) NOT NULL,
    `source` VARCHAR(300) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `userId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `handleTime` DATETIME(3) NULL,

    INDEX `sys_agent_memory_pending_status_idx`(`status`),
    INDEX `sys_agent_memory_pending_tenantId_idx`(`tenantId`),
    INDEX `sys_agent_memory_pending_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_memory_suggestion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memoryId` INTEGER NOT NULL,
    `text` VARCHAR(1000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `source` VARCHAR(300) NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `handleTime` DATETIME(3) NULL,

    INDEX `sys_agent_memory_suggestion_memoryId_idx`(`memoryId`),
    INDEX `sys_agent_memory_suggestion_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_memory_read_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memoryId` INTEGER NULL,
    `memoryKey` VARCHAR(64) NULL,
    `sessionId` VARCHAR(64) NULL,
    `hit` BOOLEAN NOT NULL DEFAULT true,
    `userId` INTEGER NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_memory_read_log_memoryId_idx`(`memoryId`),
    INDEX `sys_agent_memory_read_log_createTime_idx`(`createTime`),
    INDEX `sys_agent_memory_read_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_agent_run_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(64) NULL,
    `requestId` VARCHAR(64) NULL,
    `agentName` VARCHAR(100) NULL,
    `type` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `durationMs` INTEGER NOT NULL DEFAULT 0,
    `userId` INTEGER NULL,
    `userName` VARCHAR(100) NULL,
    `sourcePage` VARCHAR(100) NULL,
    `riskLevel` VARCHAR(8) NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `detail` JSON NULL,
    `tenantId` INTEGER NULL,
    `createTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sys_agent_run_log_type_idx`(`type`),
    INDEX `sys_agent_run_log_status_idx`(`status`),
    INDEX `sys_agent_run_log_sessionId_idx`(`sessionId`),
    INDEX `sys_agent_run_log_startedAt_idx`(`startedAt`),
    INDEX `sys_agent_run_log_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `base_sys_user` ADD CONSTRAINT `base_sys_user_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `base_sys_department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `base_sys_user` ADD CONSTRAINT `base_sys_user_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `base_sys_position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `model_config` ADD CONSTRAINT `model_config_providerConfigId_fkey` FOREIGN KEY (`providerConfigId`) REFERENCES `model_provider_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_agent_skill_version` ADD CONSTRAINT `sys_agent_skill_version_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `sys_agent_skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_agent_skill_run_log` ADD CONSTRAINT `sys_agent_skill_run_log_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `sys_agent_skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_agent_tool_call_log` ADD CONSTRAINT `sys_agent_tool_call_log_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `sys_agent_tool`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_agent_memory_version` ADD CONSTRAINT `sys_agent_memory_version_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `sys_agent_memory_file`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_agent_memory_suggestion` ADD CONSTRAINT `sys_agent_memory_suggestion_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `sys_agent_memory_file`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_agent_memory_read_log` ADD CONSTRAINT `sys_agent_memory_read_log_memoryId_fkey` FOREIGN KEY (`memoryId`) REFERENCES `sys_agent_memory_file`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

