# API Dependency Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic API dependency-graph generation, topological execution planning, and preflight readiness checks to the cross-project testing skills without changing existing agents.

**Architecture:** A standalone Python CLI reads OpenAPI or normalized JSON, emits stable `.codex/api-test` artifacts, validates trusted dependency edges, and builds a topological execution plan. The pipeline skill defines the control gates; the platform skill consumes the artifacts and delegates semantic test generation to the existing API agent.

**Tech Stack:** Python 3 standard library, optional PyYAML for YAML OpenAPI input, `unittest`, Markdown Skill instructions, Codex skill validator.

## Global Constraints

- Do not modify any file under `backend/app/agents` or `.agents/skills`.
- Do not store base URLs, tokens, passwords, or account secrets in generated artifacts.
- REST uses OpenAPI 3.x; non-REST protocols use native contracts normalized to the internal operation shape.
- Only trusted blocking edges affect topology.
- Missing required prerequisites must return a non-zero exit code.
- Do not commit because the repository contains unrelated user changes and no commit was requested.

---

### Task 1: Dependency Tool Tests

**Files:**
- Create: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/tests/test_api_dependency_graph.py`
- Test: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/tests/test_api_dependency_graph.py`

**Interfaces:**
- Consumes: `build_artifacts(spec, source_path)`, `build_execution_plan(graph)`, and `check_prerequisites(document, environ, base_dir)`.
- Produces: regression coverage for parsing, inference, topology, cycles, and readiness.

- [ ] **Step 1: Add failing parser and inference tests**

```python
def test_matches_dataset_id_but_rejects_unrelated_generic_id():
    artifacts = build_artifacts(OPENAPI_SPEC, "openapi.json")
    pairs = {(edge["producer"], edge["consumer"]) for edge in artifacts["graph"]["edges"]}
    assert ("createDataset", "getDataset") in pairs
    assert ("createUser", "getOrder") not in pairs
```

- [ ] **Step 2: Add failing explicit-link and topology tests**

```python
def test_explicit_link_is_blocking_and_orders_consumer_after_producer():
    artifacts = build_artifacts(OPENAPI_SPEC_WITH_LINK, "openapi.json")
    edge = artifacts["graph"]["edges"][0]
    assert edge["status"] == "contract_explicit"
    assert edge["blocking"] is True
    assert artifacts["plan"]["execution_levels"] == [["createDataset"], ["getDataset"]]
```

- [ ] **Step 3: Add failing cycle and preflight tests**

```python
def test_cycle_blocks_plan_and_missing_env_blocks_preflight():
    plan = build_execution_plan(CYCLIC_GRAPH)
    assert plan["status"] == "blocked"
    readiness = check_prerequisites(PREREQUISITES, {}, Path.cwd())
    assert readiness["ready"] is False
    assert "API_BASE_URL" in readiness["missing_env"]
```

- [ ] **Step 4: Run tests and confirm RED**

```powershell
python -m unittest discover C:\Users\huang\.codex\skills\api-contract-test-pipeline\tests -v
```

Expected: import failure because `scripts/api_dependency_graph.py` does not exist.

### Task 2: Deterministic Graph and Preflight CLI

**Files:**
- Create: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/scripts/api_dependency_graph.py`
- Test: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/tests/test_api_dependency_graph.py`

**Interfaces:**
- `load_document(path: Path) -> dict[str, Any]`
- `normalize_openapi(spec: dict[str, Any], source_path: str) -> dict[str, Any]`
- `infer_edges(contract: dict[str, Any], spec: dict[str, Any]) -> list[dict[str, Any]]`
- `build_execution_plan(graph: dict[str, Any]) -> dict[str, Any]`
- `build_artifacts(spec: dict[str, Any], source_path: str) -> dict[str, Any]`
- `check_prerequisites(document: dict[str, Any], environ: Mapping[str, str], base_dir: Path) -> dict[str, Any]`
- CLI commands: `build`, `plan`, and `preflight`.

- [ ] **Step 1: Implement OpenAPI loading and normalization**

Support JSON directly and YAML through optional `yaml.safe_load`. Resolve local component schemas, flatten request fields and successful response fields, and preserve unresolved references as evidence instead of guessing.

- [ ] **Step 2: Implement explicit and inferred dependency edges**

Create blocking `contract_explicit` edges from OpenAPI Links. Create non-blocking candidate edges only when normalized field names and compatible types match; require resource context for generic field names.

- [ ] **Step 3: Implement trusted-edge topology**

Use Kahn's algorithm over trusted blocking edges. Sort each ready level by business priority, confirmed fan-out, method, path, and operation ID. Return explicit cycle members and `status: blocked` when the trusted graph is cyclic.

- [ ] **Step 4: Implement prerequisite generation and validation**

Generate environment-variable references from OpenAPI security schemes and a base URL reference. Check required environment variables and seed-data files without reading or serializing secret values.

- [ ] **Step 5: Implement artifact and prompt output**

`build` writes `contract.json`, `dependency-graph.json`, `prerequisites.json`, `execution-plan.json`, and `platform-request.md` using stable key and list ordering.

- [ ] **Step 6: Run tests and confirm GREEN**

```powershell
python -m unittest discover C:\Users\huang\.codex\skills\api-contract-test-pipeline\tests -v
```

Expected: all tests pass.

### Task 3: Skill Workflow and Handoff

**Files:**
- Modify: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/SKILL.md`
- Modify: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/references/methodology.md`
- Create: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/references/artifacts.md`
- Modify: `C:/Users/huang/.codex/skills/api-contract-test-pipeline/agents/openai.yaml`
- Modify: `C:/Users/huang/.codex/skills/test-agent-platform/SKILL.md`
- Modify: `C:/Users/huang/.codex/skills/test-agent-platform/agents/openai.yaml`

**Interfaces:**
- Consumes: five `.codex/api-test` artifacts.
- Produces: an enforced pipeline from contract discovery through preflight, graph-aware generation, platform invocation, execution, attribution, and cleanup.

- [ ] **Step 1: Update pipeline triggers and required workflow**

Require protocol-appropriate contracts, graph generation, evidence promotion, separate dependency/business priority, preflight success, dependency-blocked reporting, and reverse cleanup.

- [ ] **Step 2: Add the artifact contract reference**

Document required fields, trusted statuses, seed-data strategies, failure states, and exact CLI commands.

- [ ] **Step 3: Update platform handoff**

Require `platform-request.md` for API generation and instruct the platform agent to consume confirmed facts without inventing exact assertions.

- [ ] **Step 4: Refresh UI metadata**

Ensure both `default_prompt` values explicitly mention `$api-contract-test-pipeline` or `$test-agent-platform`.

### Task 4: Repository Documentation and Verification

**Files:**
- Modify: `docs/AGENT_CROSS_PROJECT_CALLING.md`

**Interfaces:**
- Consumes: graph CLI and updated skills.
- Produces: complete instructions for this platform and any target project.

- [ ] **Step 1: Document target-project commands**

Include contract discovery, graph build, prerequisite completion, preflight, platform invocation, ordered execution, blocked-dependency handling, and cleanup.

- [ ] **Step 2: Run skill validation**

```powershell
python C:\Users\huang\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\huang\.codex\skills\api-contract-test-pipeline
python C:\Users\huang\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\huang\.codex\skills\test-agent-platform
```

Expected: both skills are valid.

- [ ] **Step 3: Run representative build and preflight checks**

```powershell
python C:\Users\huang\.codex\skills\api-contract-test-pipeline\scripts\api_dependency_graph.py build --contract C:\Users\huang\.codex\skills\api-contract-test-pipeline\tests\fixtures\openapi.json --output-dir .tmp-api-test
python C:\Users\huang\.codex\skills\api-contract-test-pipeline\scripts\api_dependency_graph.py preflight --prerequisites .tmp-api-test\prerequisites.json
```

Expected: build succeeds; preflight reports blocked until required environment variables are supplied.

- [ ] **Step 4: Confirm agent files are unchanged**

```powershell
git status --short -- backend/app/agents .agents/skills
```

Expected: no changes introduced by this implementation.
