# API Dependency Pipeline Design

## Goal

Extend the cross-project API testing workflow with deterministic dependency-graph generation, dependency-aware script generation and execution, and a mandatory preflight gate for environment, authentication, permissions, and seed data.

## Scope

- Update the user-level `api-contract-test-pipeline` skill.
- Update the user-level `test-agent-platform` skill so it consumes pipeline artifacts.
- Add reusable deterministic scripts under the pipeline skill.
- Update the repository cross-project usage guide.
- Do not modify existing platform agents, agent skills, API tools, services, or database models.

## Core Boundary

Codex and the platform agent perform semantic work: contract extraction, source analysis, candidate-edge explanation, business scenario selection, and failure attribution.

Deterministic code owns graph validation, trusted-edge filtering, topological levels, cycle detection, readiness checks, execution manifests, failure propagation rules, and cleanup ordering.

## Contract Strategy

Use a machine-readable contract as the source of endpoint facts.

- REST/HTTP: prefer OpenAPI 3.0 or 3.1.
- GraphQL: use SDL or introspection and normalize operations before graph construction.
- gRPC: use protobuf descriptors and normalize RPCs before graph construction.
- Event APIs: use AsyncAPI and normalize channels/operations before graph construction.
- SOAP: use WSDL and normalize operations before graph construction.

Unknown information belongs in internal contract metadata such as `contract_status: unknown`; do not write invalid OpenAPI field types.

## Artifacts

Every target project uses one stable artifact directory:

```text
.codex/api-test/
|-- contract.json
|-- dependency-graph.json
|-- prerequisites.json
|-- execution-plan.json
`-- platform-request.md
```

`contract.json` contains normalized operations, request inputs, successful response outputs, security requirements, source location, and unresolved fields.

`dependency-graph.json` contains endpoint nodes and typed edges. Each edge records producer and consumer operation IDs, extraction and injection paths, relation type, evidence, confidence, confirmation status, and whether it is allowed to block execution.

`prerequisites.json` contains environment, auth roles and environment-variable references, seed data, external services, destructive-test permissions, verification probes, and cleanup ownership. Secret values are never stored in the artifact.

`execution-plan.json` contains generation order, topological execution levels, blocked dependencies, cycles, cleanup order, and the scheduling policy.

`platform-request.md` is the structured handoff to `test-agent-platform`. It embeds the relevant contract and graph summary so the platform agent does not need direct filesystem access to infer the project facts again.

## Dependency Evidence

Edges use three evidence levels:

- `candidate`: name/type or semantic similarity only. Never blocks execution.
- `strong`: at least two independent signals agree. Blocks only after manual acceptance.
- `confirmed`: explicit contract link, verified source data flow, or successful runtime value transfer. May block execution.

Trusted blocking statuses are `contract_explicit`, `source_confirmed`, `runtime_confirmed`, and `manual_confirmed`.

Generic fields such as `id`, `name`, `status`, `type`, `value`, and `code` require matching resource context. A generic field match alone does not create an edge.

Edge relation types are `data`, `auth`, `state`, `control`, and `cleanup`. Cleanup relationships are excluded from the creation DAG.

## Scheduling

Dependency order and business priority are separate dimensions.

- Dependency level is a hard constraint.
- Business priority (`P0` to `P3`) orders nodes within the same ready level.
- Confirmed outgoing-edge count breaks remaining ties so foundational producers are generated first.

Execution phases are:

1. Contract validation.
2. Environment/auth/seed-data preflight.
3. Authentication, configuration, and root resource producers.
4. Dependent endpoint tests in topological levels.
5. End-to-end scenarios following confirmed graph paths.
6. State, permission, idempotency, and concurrency tests.
7. Cleanup in reverse dependency order, including after failures.

Tests should create isolated resources through fixtures or setup APIs. The graph determines setup order; independent tests must not rely on residual state from earlier tests.

When a prerequisite fails, downstream tests receive `BLOCKED_BY_DEPENDENCY`. They are not product failures. Parallel execution is allowed only within one ready level when tests do not share mutable resources.

## Preflight Gate

Generation may continue with missing runtime prerequisites, but full execution is forbidden until preflight succeeds.

The preflight validator checks:

- required environment variables
- base URL configuration
- auth credentials by environment-variable reference
- required roles or tenants declared for manual verification
- seed data provided as setup APIs, stable reference IDs, environment variables, or files
- external-service declarations
- permission to perform writes, deletes, concurrency, and destructive tests

Seed data uses one of three strategies:

- `auto_create`: create through setup APIs and clean up after the test.
- `reference`: use stable read-only environment data.
- `user_provided`: require an environment variable or file before execution.

Missing prerequisites produce a machine-readable list and a non-zero process exit code.

## Platform Handoff

`api-contract-test-pipeline` owns contract normalization, dependency evidence, preflight, and execution planning.

`test-agent-platform` consumes the five artifacts, calls the platform `api` agent for specialist test planning and generation, and requires Codex to adapt the output to the target repository and verify it.

The platform agent must not invent status codes, schema fields, auth behavior, IDs, or lifecycle states. Exact assertions require contract, source, or runtime evidence.

## Validation

- Unit-test OpenAPI parsing, field matching, generic-ID suppression, explicit OpenAPI links, topological ordering, cycle detection, and preflight behavior.
- Run the skill validator for both user-level skills.
- Run the graph tool against a representative OpenAPI fixture.
- Verify that missing prerequisites block execution and supplied prerequisites pass.
- Inspect generated artifacts for deterministic ordering and absence of secret values.

## Success Metrics

- Percentage of blocking edges with confirmed evidence.
- Dependency-edge false-positive rate.
- Percentage of generated suites passing preflight on the first submission.
- First-run script success rate after Codex integration.
- Downstream tests correctly classified as dependency-blocked rather than product failures.
- Coverage of critical resource lifecycle paths.
