import assert from "node:assert/strict";
import { flattenTree } from "./lib/rbac-utils.ts";

const tree = [
  {
    id: "root",
    name: "Root",
    children: [
      { id: "child", name: "Child", children: [{ id: "leaf", name: "Leaf", children: [] }] },
    ],
  },
];

assert.deepEqual(
  flattenTree(tree).map((item) => [item.id, item.depth]),
  [
    ["root", 0],
    ["child", 1],
    ["leaf", 2],
  ]
);
