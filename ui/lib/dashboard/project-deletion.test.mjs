import test from "node:test";
import assert from "node:assert/strict";

import { canConfirmProjectDeletion } from "./project-deletion.ts";

test("只有完整输入项目名称才允许永久删除", () => {
  assert.equal(canConfirmProjectDeletion("数据工厂", "数据工厂"), true);
  assert.equal(canConfirmProjectDeletion("数据工厂", "数据"), false);
  assert.equal(canConfirmProjectDeletion("数据工厂", " 数据工厂 "), false);
  assert.equal(canConfirmProjectDeletion("数据工厂", ""), false);
});
