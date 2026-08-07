# 数据库迁移说明

## 基线（baseline）

`20260530000000_baseline_squash` 是当前唯一的基线迁移，由当前 `schema.prisma`
一次性生成，包含**全部表结构**（40 张表）。它取代了历史上一批残缺、无法从零重放的
旧迁移（这些旧迁移已归档到 `../_migrations_archive_broken/`，仅作追溯，不再参与部署）。

- **全新空库**：`prisma migrate deploy` 直接跑基线即可建好全部表，一次成功。
- 之所以要重建基线：旧迁移目录里 `model_config` 等表从未被任何迁移 `CREATE`
  （只靠 `db push` 建过），导致空库 `migrate deploy` 会中途报“表不存在”而失败。

## ⚠️ 已有数据的现存环境（生产 / 预发 / 他人开发库）必读

如果某个环境的表结构是早先用 `prisma db push` 建的（不是靠迁移建的），
**首次切换到这套迁移之前，必须先执行一次**：

```bash
prisma migrate resolve --applied 20260530000000_baseline_squash
```

这只会往迁移历史表 `_prisma_migrations` 写一条“已应用”记录、**不执行任何 SQL**，
从而避免随后的 `migrate deploy` 试图重建已存在的表而报错。

- 开发库已在重建基线时执行过这一步，无需重复。
- 每个“表已存在但迁移历史为空”的环境都需各自执行一次。
- 判断某环境是否需要：`prisma migrate status`，若提示基线未应用且表已存在，则执行上面的命令。

## 新增迁移

基线之后正常用 `prisma migrate dev --name <描述>` 生成增量迁移，
不要再手工编辑 `schema.prisma` 后只跑 `db push`（那样会重新制造“库与迁移历史不一致”的问题）。
