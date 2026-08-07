# API Pipeline Learning Registry

该目录是跨项目 API 测试修正的中央候选箱和版本化规则库。

## 目录

```text
inbox/                 # 已泛化、待评审候选，不会自动生效
registry/active.json   # 当前全局规则，由 promote 生成
registry/versions/     # 不可变历史快照
```

## 门禁

1. 先在目标项目 `.codex/api-test/overrides.json` 修复并跑通。
2. `collect` 只保存脱敏证据。
3. `replay` 必须包含命中和不命中夹具，防止规则范围过大。
4. `propose` 只进入 `inbox`。
5. 负责人明确批准后才执行 `promote`。
6. 晋升后运行 Pipeline 单元测试和至少一个受影响项目试点。
7. 回退使用 `rollback`，保留完整版本历史。

全局规则不能覆盖当前项目的契约、源码或运行时事实，也不能直接修改 `backend/app/agents` 下的智能体实现。
