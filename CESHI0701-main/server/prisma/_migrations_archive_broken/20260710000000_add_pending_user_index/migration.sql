-- CreateIndex: 待确认记忆按 userId+status 查询加索引
-- createPending 的去重/配额查询按 (userId, status) 过滤；缺此索引时 Serializable 事务内的
-- 加锁读退化为全表扫描，锁范围从"同用户"放大到"任意并发请求"，随队列增长而恶化。
CREATE INDEX `sys_agent_memory_pending_userId_status_idx`
    ON `sys_agent_memory_pending`(`userId`, `status`);
