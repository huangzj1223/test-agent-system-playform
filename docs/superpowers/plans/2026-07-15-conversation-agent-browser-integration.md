# CESHI0701 Conversation Agent and Browser Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the migrated AG-UI chat skeleton into a real test-management assistant that can use configured models, invoke existing testing agents, run browser-testing workflows with approval, and persist auditable execution results.

**Architecture:** Keep `AgUiService` as the SSE protocol boundary and inject focused collaborators for model streaming, skill routing, agent execution, approval, and audit persistence. Reuse `app.agents.bridge.invoke_agent` for API, testcase, security, web_cli, and web_mcp execution. Treat browser activity as an isolated agent run; do not expose arbitrary shell or desktop-program execution.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, LangChain/LangGraph, SSE, Next.js 14, React 18, SWR, Playwright.

## Global Constraints

- Preserve the current FastAPI/Next.js architecture and existing uncommitted migration work.
- Do not introduce Vue, NestJS, a Chrome extension, or general desktop control in this implementation.
- Every state-changing or browser-execution action must be risk classified, auditable, and explicitly approved.
- Model provider secrets remain server-side and encrypted; the browser sends only provider/model identifiers.
- Agent and model calls require explicit timeouts, cancellation-safe cleanup, and user-readable failures.
- Each task follows RED -> GREEN -> regression verification before the next task starts.
- No commit, push, deployment, or production configuration change is authorized.

---

### Task 1: Real Model Conversation Adapter

**Files:**
- Create: `backend/app/services/model_chat_service.py`
- Modify: `backend/app/schemas/agui.py`
- Modify: `backend/app/services/agui_service.py`
- Modify: `backend/app/api/v2/agui.py`
- Modify: `ui/lib/api/agui.ts`
- Test: `backend/test_agui_model_runtime.py`

**Interfaces:**
- Produces: `ModelChatService.stream_reply(messages, memory_context, provider_id, model_id) -> AsyncIterator[str]`.
- `AgUiRunRequest` gains optional `provider_id` and `model_id` and never accepts a key or endpoint.

- [ ] Write tests proving normal chat delegates to an injected model stream and emits multiple `TEXT_MESSAGE_CONTENT` events.
- [ ] Run `uv run --with pytest python -m pytest backend/test_agui_model_runtime.py -q` and confirm failure because the adapter contract is absent.
- [ ] Implement `ModelChatService` using `get_text_model_from_config` when IDs are supplied and `get_text_model()` otherwise; normalize LangChain chunks to text.
- [ ] Inject the adapter into `AgUiService`, preserve memory context as a system message, and persist the final assembled assistant message.
- [ ] Run Task 1 tests plus `backend/test_agui_phase3.py`; both must pass.

### Task 2: Real Skill-to-Agent Execution

**Files:**
- Create: `backend/app/services/agent_execution_service.py`
- Modify: `backend/app/services/agent_skill_service.py`
- Modify: `backend/app/services/agui_service.py`
- Modify: `backend/app/schemas/agent_skill.py`
- Modify: `backend/app/api/v2/agent_skills.py`
- Test: `backend/test_agent_execution_runtime.py`

**Interfaces:**
- Produces: `resolve_bridge_agent(skill) -> str` and `AgentExecutionService.execute(agent_name, prompt, context, timeout_seconds) -> AgentExecutionResult`.
- Supported bridge names are exactly `api`, `testcase`, `security`, `web_cli`, and `web_mcp`.

- [ ] Write tests proving a matched skill invokes the bridge, propagates project context, times out deterministically, and never executes an unknown entrypoint.
- [ ] Run the new test and confirm the missing service failure.
- [ ] Implement the adapter around `app.agents.bridge.invoke_agent` with `asyncio.wait_for` and normalized errors.
- [ ] Replace “已路由到技能” placeholder output with real execution output and AG-UI agent-run events.
- [ ] Run the new tests, `backend/test_skills_phase6.py`, and `backend/test_agent_bridge.py`.

### Task 3: Approval and Auditable Agent Runs

**Files:**
- Create: `backend/app/models/agent_run.py`
- Create: `backend/app/schemas/agent_run.py`
- Create: `backend/app/services/agent_run_service.py`
- Create: `backend/app/api/v2/agent_runs.py`
- Create: `backend/alembic/versions/0016_add_agent_runs.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/api/__init__.py`
- Modify: `backend/app/services/agui_service.py`
- Test: `backend/test_agent_run_approval.py`

**Interfaces:**
- Produces persisted states `pending_approval`, `running`, `succeeded`, `failed`, `cancelled`.
- Produces `classify_agent_risk(agent_name, prompt) -> L1|L2|L3|L4`; L2/L3 require approval and L4 is blocked.
- Produces `POST /api/v2/agent-runs/{id}/approve`, `/reject`, and `/cancel`.

- [ ] Write state-machine tests for allowed transitions, cross-user access rejection, blocked destructive prompts, timeout failure, and cancellation.
- [ ] Run tests and confirm failure before model/service creation.
- [ ] Implement the model, migration, service, API, and AG-UI `ACTION_REQUIRES_APPROVAL` event.
- [ ] Ensure persisted prompts/results are bounded and errors do not contain secrets.
- [ ] Upgrade Alembic to head and run Task 3 tests plus migration-current verification.

### Task 4: Browser-Test Agent Integration

**Files:**
- Modify: `backend/app/services/agent_skill_service.py`
- Modify: `backend/app/services/agent_execution_service.py`
- Modify: `backend/app/services/agui_service.py`
- Modify: `backend/app/agents/bridge.py`
- Test: `backend/test_browser_agent_chat.py`

**Interfaces:**
- Browser requests route to `web_cli` by default; `web_mcp` remains explicitly selectable.
- Runtime context accepts bounded `project_identifier`, `project_id`, `target_url`, and `test_run_id` only.

- [ ] Write tests proving browser intent routes to `web_cli`, requires approval, forwards only allowlisted context, and returns screenshots/report paths as artifacts.
- [ ] Run the tests and verify the missing behavior failure.
- [ ] Add browser skill metadata and artifact extraction without exposing arbitrary command execution through AG-UI.
- [ ] Reuse the existing Playwright agents; do not add a second browser engine.
- [ ] Run Task 4 tests and existing web-agent validation/import checks.

### Task 5: Conversation UI, Model Selection, Approval, and Run History

**Files:**
- Modify: `ui/components/chat/chat-container.tsx`
- Modify: `ui/hooks/use-agui-chat.ts`
- Modify: `ui/lib/api/agui.ts`
- Create: `ui/lib/api/agent-run.ts`
- Create: `ui/components/chat/model-selector.tsx`
- Create: `ui/components/chat/agent-run-card.tsx`
- Modify: `ui/components/layout/sidebar.tsx`
- Test: `ui/output/playwright/conversation-agent-browser.spec.ts`

**Interfaces:**
- Model selector sends only `provider_id` and `model_id`.
- `AgentRunCard` renders pending/running/succeeded/failed/cancelled and approve/reject/cancel actions.

- [ ] Add a browser test that fails because model selection and approval cards are absent.
- [ ] Implement model selection from existing model-config API, persisted locally per user.
- [ ] Parse agent-run and approval SSE events, render progress and artifacts, and wire approval endpoints.
- [ ] Add discoverable sidebar links for chat, memory, tools, skills, model configuration, and RBAC administration according to permissions.
- [ ] Run `npm run build` and the focused Playwright spec against live backend/frontend services.

### Task 6: Governance Completion and Full Regression

**Files:**
- Modify: `backend/app/api/v2/model_configs.py`
- Modify: `backend/app/api/v2/memories.py`
- Modify: `backend/app/api/v2/agent_tools.py`
- Modify: `backend/app/api/v2/agent_skills.py`
- Modify: `backend/app/middleware/auth_guard.py`
- Modify: `docs/迁移方案-CESHI0701/00-总体方案.md`
- Create: `backend/test_migration_governance.py`

**Interfaces:**
- Administrative mutations use explicit permission dependencies.
- Migration documentation distinguishes `implemented`, `verified`, `deferred`, and `not_applicable`.

- [ ] Write permission tests proving authenticated users without required perms receive 403 for administrative mutations.
- [ ] Replace model connection probing with a minimal model request when a model is specified, preserving an eight-second connection timeout.
- [ ] Add bounded list filters for agent runs and make run/tool/skill logs user-scoped.
- [ ] Update the migration matrix with actual implementation and verification evidence; mark Chrome extension and desktop automation as deferred by approved design.
- [ ] Run all root backend tests, frontend utility tests, production build, Alembic current, HTTP smoke tests, and Playwright end-to-end tests.
- [ ] Review the final diff for unrelated changes and report exact pass/fail/skip counts without committing.

## Plan Self-Review

- Spec coverage: real model, real agents, browser execution, approval, audit, UI, RBAC, and staged verification are each mapped to a task.
- Scope: Chrome extension and arbitrary desktop control are deliberately excluded because the approved recommendation deferred them.
- Type consistency: provider/model IDs remain UUID/string pairs; bridge agent names use the existing stable registry.
- Placeholder scan: no implementation placeholder or unresolved decision remains.

