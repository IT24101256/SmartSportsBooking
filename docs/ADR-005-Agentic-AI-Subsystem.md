# ADR-005: Autonomous Agentic AI Subsystem Architecture

- **Status**: Accepted / Implemented
- **Date**: 2026-09-17
- **Module**: SE3090 – Software Engineering Frameworks (Year 3, Semester 1)
- **Component**: SmartSports Booking System – Part 5: Agentic AI Subsystem
- **Authors**: SmartSports Engineering Team

---

## 1. Context and Problem Statement

Modern sports facility management platforms frequently encounter complex, multi-variable customer requests such as multi-team tournaments, youth training camps, corporate sports days, and recurring league match schedules. These requests involve:
1. **Unstructured Domain Objectives**: Ambiguous customer goals requiring decomposition into concrete actionable steps.
2. **Catalog & Inventory Constraints**: Sport-specific court requirements, amenities (lighting, turf grading, locker rooms), and dynamic pricing.
3. **Hard Deterministic Rules**: Hard constraints that cannot be left to probabilistic LLM hallucinations (schedule overlap prevention, operating hours 06:00–22:00, maximum single-session participant limits of 30, and financial budget bounds).
4. **High-Impact Actions**: Creation of binding calendar reservations and financial commitments requiring human authorization before state mutation.

A simple single-prompt chatbot or text generator is strictly insufficient for this domain. The system requires an **Autonomous Multi-Agent Architecture** integrated into ASP.NET Core that guarantees deterministic safety, least-privilege tool execution, state persistence, human-in-the-loop oversight, and auditable observability.

---

## 2. Decision and Architecture Overview

We have designed and implemented a **Coordinated Multi-Agent Orchestration Architecture** built on ASP.NET Core (.NET 8) with Entity Framework Core and PostgreSQL.

```
                      +-------------------------------------------------------------+
                      |         Customer / Event Organizer (Web & Mobile UI)         |
                      +-------------------------------------------------------------+
                                                     | 1. Submit Goal & Constraints
                                                     v
                      +-------------------------------------------------------------+
                      |             ASP.NET Core REST API Controller                 |
                      |           [BookingWorkflowsController (JWT Auth)]           |
                      +-------------------------------------------------------------+
                                                     |
                                                     v
+------------------------------------------------------------------------------------------------------------------+
|                                      Agentic Workflow Orchestrator                                               |
|                                                                                                                  |
|  +---------------------------+   +---------------------------+   +-----------------------+   +-------------------+  |
|  |  1. Planning &            |-->| 2. Domain & Facility      |-->| 3. Scheduling &       |-->| 4. Inventory &    |  |
|  |     Coordination Agent    |   |    Analysis Agent         |   |    Validation Agent   |   |    Action Agent   |  |
|  |                           |   |                           |   |                       |   |                   |  |
|  | (Goal Decomposition & DAG)|   | (Catalog Match & Pricing) |   | (Hard Rules Engine)   |   | (Proposal Staging)|  |
|  +---------------------------+   +---------------------------+   +-----------------------+   +-------------------+  |
|               |                                |                             |                         |         |
|         (No Direct Tools)         [search_facilities]           [check_schedule_conflict]   [stage_booking_proposal]     |
|                                  [get_facility_details]        [validate_business_rules]   [commit_booking_action]       |
+--------------------------------------------------------------------------------------------------------|---------+
                                                                                                         |
                                                                                                5. PAUSE (Gated)
                                                                                                         v
                                                                                   +---------------------------------------+
                                                                                   |       PendingManagerApproval          |
                                                                                   |   (Durable State in PostgreSQL)       |
                                                                                   +---------------------------------------+
                                                                                                         |
                                                                                                         | 6. Review & Decide
                                                                                                         v
                                                                                   +---------------------------------------+
                                                                                   |       Authorized Manager / Admin      |
                                                                                   +---------------------------------------+
                                                                                      /              |               \
                                                                       Approve       /       Revise  |   Reject       \
                                                                                    v                v                 v
                                                                           [Commit Booking]  [Request Revision] [Safe Rejection]
                                                                           (ACID Transaction)  (Feedback Loop)    (Audit Logged)
```

---

## 3. Four Specialized Agents & Contract Specifications

Each agent in the subsystem is an independent class implementing the `IAgent` interface with distinct responsibilities, explicit input/output contracts, and role-based tool execution boundaries.

| Agent Name | Role Identifier | Responsibility | Allowed Tools | Input Contract | Output Contract |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Planning & Coordination Agent** | `Planning & Coordination Agent` | Analyzes unstructured domain objectives, constructs sequential DAG execution graph, delegates tasks with step dependencies. | *None* (Pure reasoning / orchestrator) | `WorkflowPlanRequest` (Objective, Sport, Time, Budget, Guests) | `StructuredWorkflowPlan` (Step sequence, assigned roles, strategy) |
| **Domain & Facility Analysis Agent** | `Domain & Facility Analysis Agent` | Evaluates sport requirements, queries inventory catalog, calculates hourly quotations, and validates amenities. | `search_facilities`, `get_facility_details` | `FacilityAnalysisInput` (SportType, Capacity, Date/Time) | `FacilityProposalInfo` (FacilityId, Rate, Quotation, Amenities, Match Rationale) |
| **Scheduling & Validation Agent** | `Scheduling & Deterministic Validation Agent` | Performs deterministic business-rule validation, checks schedule collisions, verifies operating hours and budget limits. | `check_schedule_conflict`, `validate_business_rules` | `ValidationInput` (FacilityId, TimeSlot, Budget, Guests) | `DeterministicValidationMatrix` (PassedRules, Violations, AllPassed boolean) |
| **Inventory & Action Execution Agent** | `Inventory & Action Execution Agent` | Stages the validated proposal, enforces the human-in-the-loop approval gate, and executes transactional booking upon manager approval. | `stage_booking_proposal`, `commit_booking_action` | `ProposalData` + Manager JWT Claims & Comment | `ActionExecutionResult` (BookingId, Status, Confirmation, Audit Trail) |

---

## 4. Allow-Listed Tool Registry & Least-Privilege Security

All external operations are abstracted behind the `ITool` interface and managed centrally by `IToolRegistry`.

### Allow-Listed Tools:
1. `search_facilities`:
   - **Allowed Roles**: `Domain & Facility Analysis Agent`
   - **Input Validation**: `SportType` (string), `MinCapacity` (int > 0).
   - **Behavior**: Filters available sports grounds without mutating database state.
2. `get_facility_details`:
   - **Allowed Roles**: `Domain & Facility Analysis Agent`
   - **Input Validation**: `FacilityId` (int > 0).
   - **Behavior**: Retrieves hourly rates, amenities, and ground specifications.
3. `check_schedule_conflict`:
   - **Allowed Roles**: `Scheduling & Deterministic Validation Agent`
   - **Input Validation**: `FacilityId`, `RequestedStart`, `RequestedEnd`.
   - **Behavior**: Queries PostgreSQL `Bookings` table for overlapping non-cancelled time intervals.
4. `validate_business_rules`:
   - **Allowed Roles**: `Scheduling & Deterministic Validation Agent`
   - **Input Validation**: Full request parameters and calculated quotation.
   - **Behavior**: Evaluates 6 deterministic rules (Operating hours 06:00-22:00, Advance notice, Max guests <= 30, Cost <= Budget).
5. `stage_booking_proposal`:
   - **Allowed Roles**: `Inventory & Action Execution Agent`
   - **Input Validation**: Structured proposal payload.
   - **Behavior**: Packages proposed reservation and flags execution as **gated**.
6. `commit_booking_action`:
   - **Allowed Roles**: `Inventory & Action Execution Agent` (*strictly gated*)
   - **Security Precondition**: Only executable after verification of Manager JWT token and workflow status `PendingManagerApproval` / `RevisionRequested`.
   - **Behavior**: Atomically creates confirmed booking inside an EF Core database transaction.

---

## 5. Deterministic Validation Engine (Hard Constraints)

To prevent LLM hallucination in critical business logic, the **Scheduling & Validation Agent** executes deterministic C# logic:

```csharp
// Deterministic Verification Ruleset
1. Facility Exists: Catalog lookup confirms active ground exists.
2. Schedule Collision: Overlap query ensures no duplicate booking on court.
3. Valid Duration: Between 30 minutes and 8 hours.
4. Operating Hours: Requested slot falls within complex operating hours (06:00 - 22:00).
5. Guest Limit: 1 <= Guests <= 30 per court session.
6. Budget Bounds: Estimated quotation <= Customer budget ceiling.
7. Advance Notice: Start time must be in the present/future.
```

If **any** rule fails, the workflow transitions immediately to `ValidationFailed`, recording the exact violation reasons in persistent storage and notifying the customer without consuming administrative approval time.

---

## 6. Shared State Persistence & Durability

The entire lifecycle is persisted in PostgreSQL using Entity Framework Core across three normalized tables:

1. **`BookingWorkflows`**:
   - `WorkflowId` (UUID, Unique Index)
   - `CustomerId` (Foreign Key -> `Users`)
   - `Objective`, `FacilityType`, `RequestedStart`, `RequestedEnd`, `Guests`, `Budget`
   - `Status`: `Planning` | `PendingManagerApproval` | `RevisionRequested` | `Approved` | `Rejected` | `ValidationFailed` | `FailedSafe`
   - `PlanJson`: Decomposed multi-step plan
   - `ProposalJson`: Selected facility, pricing, and amenities
   - `ValidationJson`: Rule-by-rule verification breakdown
   - `ExecutionDurationMs`: Total multi-agent pipeline runtime in milliseconds
   - `RevisionCount`: Number of review iterations
   - `DecisionBy`, `ApprovalComment`, `FinalOutcome`, `CreatedAtUtc`, `UpdatedAtUtc`

2. **`BookingWorkflowSteps`**:
   - Stores step-level execution records: `AgentName`, `Responsibility`, `InputJson`, `OutputJson`, `ToolsCalledJson`, `Status`, `ExecutionDurationMs`, `StartedAtUtc`, `CompletedAtUtc`.

3. **`BookingWorkflowAuditEvents`**:
   - Immutable audit trail recording every state transition (`WorkflowInitiated`, `ApprovalRequested`, `RevisionRequested`, `ApprovedAndCommitted`, `RejectedSafely`).

---

## 7. Human-in-the-Loop Approval & Revision Lifecycle

High-impact actions (allocating calendar slots and committing bookings) **never execute autonomously**.

```
[Draft Request]
       │
       ▼
[4-Agent Processing]
       │
  (Validation OK?)
   ├── No ──► [ValidationFailed] (Safe failure recorded)
   └── Yes ─► [PendingManagerApproval] (Execution Paused)
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
   [Approve]    [Revise]     [Reject]
       │            │            │
       ▼            ▼            ▼
  [Confirmed]   [Revision    [Rejected]
  (DB Commit)   Requested]  (Safe Audit)
```

1. **Approval**: An authorized Manager/Admin provides an audit comment and triggers `POST /api/booking-workflows/{id}/approve`. The system commits the booking in a transaction and issues a confirmation.
2. **Revision Request**: The Manager enters feedback notes and calls `POST /api/booking-workflows/{id}/revise`. The status transitions to `RevisionRequested`, notifying the customer to update constraints.
3. **Rejection**: The Manager provides a rejection justification and calls `POST /api/booking-workflows/{id}/reject`. The workflow records the safe termination.

---

## 8. Observability & User Experience

Both the **Web Dashboard** (React + Vite) and the **Mobile Application** (Flutter) provide comprehensive observability into the multi-agent execution:
- **Pipeline Visualizer**: Real-time display of each of the 4 agents with status badges and execution timings in milliseconds.
- **Tool Invocations Inspector**: Collapsible viewer showing exact JSON input and structured output for each tool call.
- **Validation Checklist**: Clear green/red indicators for all 6 deterministic business rules.
- **Manager Review Panel**: One-click action buttons with mandatory audit justification notes.
- **Domain Presets**: One-tap demo presets for Badminton Championship, Football Tournament, and Swimming Gala.

---

## 9. Security & Safety Boundaries

- **Role-Based Access Control (RBAC)**: Workflows can only be initiated by authenticated users (`Customer`), while review and commit actions strictly require `Manager` or `Admin` roles.
- **Input Sanitization**: All objective strings, date bounds, guest limits, and budget numbers are strictly validated before orchestrator execution.
- **Secret Protection**: Database credentials and JWT signing keys are loaded from environment variables/secrets.
- **Graceful Failure**: Any unexpected tool failure or validation error halts the pipeline safely without partial database mutations.

---

## 10. Alignment with SE3090 Part 5 Requirements

| Requirement Item | Specification Rule | Implementation Proof |
| :--- | :--- | :--- |
| **Minimum Assessed Workflow** | Receive objective, create plan, delegate to agents, call allow-listed tools, deterministic validation, pause high-impact action, produce auditable outcome. | Satisfied via `AgenticWorkflowOrchestrator`, `BookingWorkflowsController`, and full UI suite. |
| **Distinct Agent Count** | At least four distinct agents with identifiable responsibilities, I/O contracts, and controlled tool access. | 4 distinct agents: `PlanningCoordinationAgent`, `FacilityAnalysisAgent`, `DeterministicValidationAgent`, `ActionExecutionAgent`. |
| **Controlled Tools** | Allow-listed tools only, validated inputs, structured outputs, least-privilege role matrix. | Enforced by `DefaultToolRegistry` and typed `ITool` implementations. |
| **Shared State & Persistence** | Workflow ID, objective, plan, steps, tool traces, validation, audit stored durably. | Stored in PostgreSQL with EF Core models `BookingWorkflow`, `BookingWorkflowStep`, `BookingWorkflowAuditEvent`. |
| **Deterministic Validation** | Schema checks and business rules before allowing high-impact action. | Enforced by `DeterministicValidationAgent` and `validate_business_rules` tool. |
| **Human Approval** | High-impact action must pause for authorized approval/rejection/revision. | `PendingManagerApproval` state pauses action until Manager invokes `/approve`, `/reject`, or `/revise`. |
| **Observability** | Auditable execution summaries, tool calls, timings, validation results, audit trail. | Visualized in Web (React) and Mobile (Flutter) with execution time in ms, tool call inspector, and audit history. |
