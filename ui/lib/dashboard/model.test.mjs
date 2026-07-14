import test from "node:test";
import assert from "node:assert/strict";

import { formatMetric } from "./model.ts";

test("缺失指标显示待接入", () => {
  assert.equal(formatMetric(null, "%"), "待接入");
  assert.equal(formatMetric(86, "%"), "86%");
  assert.equal(formatMetric(1200), "1,200");
});
