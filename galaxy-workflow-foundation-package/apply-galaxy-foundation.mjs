import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(process.argv[2] || process.cwd());
const payloadRoot = path.join(packageRoot, "payload");

const uiPackagePath = path.join(repositoryRoot, "ui", "package.json");
const globalsPath = path.join(repositoryRoot, "ui", "app", "globals.css");

if (!existsSync(uiPackagePath) || !existsSync(globalsPath)) {
  throw new Error(`目标目录不是预期仓库根目录：${repositoryRoot}`);
}

copyDirectory(payloadRoot, repositoryRoot, (source) => !source.endsWith("app-galaxy-foundation-overrides.css"));

const packageJson = JSON.parse(readFileSync(uiPackagePath, "utf8"));
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts["test:galaxy"] = "node --test tests/galaxy-workflow-contract.test.mjs";
packageJson.scripts["verify:galaxy"] = "npm run test:galaxy && npm run build";
writeFileSync(uiPackagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

const overridePath = path.join(payloadRoot, "ui", "app-galaxy-foundation-overrides.css");
const override = readFileSync(overridePath, "utf8").trim();
const currentGlobals = readFileSync(globalsPath, "utf8");
const startMarker = "/* galaxy visual foundation:start */";
const endMarker = "/* galaxy visual foundation:end */";
const markerPattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`, "m");
const nextGlobals = markerPattern.test(currentGlobals)
  ? currentGlobals.replace(markerPattern, override)
  : `${currentGlobals.trimEnd()}\n\n${override}\n`;
writeFileSync(globalsPath, nextGlobals, "utf8");

console.log(`Galaxy visual foundation applied to ${repositoryRoot}`);
console.log("Next: cd ui && npm run test:galaxy && npm run build");

function copyDirectory(sourceRoot, targetRoot, shouldCopy) {
  for (const entry of readdirSync(sourceRoot)) {
    const source = path.join(sourceRoot, entry);
    if (!shouldCopy(source)) continue;
    const target = path.join(targetRoot, entry);
    const stats = statSync(source);
    if (stats.isDirectory()) {
      mkdirSync(target, { recursive: true });
      copyDirectory(source, target, shouldCopy);
    } else {
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(source, target, { force: true });
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
