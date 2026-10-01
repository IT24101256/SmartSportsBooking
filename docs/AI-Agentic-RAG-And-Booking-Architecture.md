# MySpot: Grounded Agentic RAG & "Book With AI" Multi-Agent Subsystem
## Architecture Analysis & Implementation Plan

### 1. Existing System Analysis

#### 1.1 ASP.NET Core Backend
- **Framework**: .NET 8.0 Web API (`SmartSports.Api`).
- **Database**: PostgreSQL with Entity Framework Core (`AppDbContext`, `Npgsql.EntityFrameworkCore.PostgreSQL`).
- **Configuration & Secrets**: Loaded via `.env` file at startup and merged into `builder.Configuration` (`JWT_KEY`, `SMARTSPORTS_DB_CONNECTION`, etc.).
- **Authentication**: JWT Bearer authentication. Claims:
  - `ClaimTypes.NameIdentifier` (`userId`: int)
  - `ClaimTypes.Name` (`fullName`: string)
  - `ClaimTypes.Email` (`email`: string)
  - `ClaimTypes.Role` (`Customer`, `Staff`, `Manager`, `Admin`)

#### 1.2 Existing Database Models & Migrations
- `User`: Id, FullName, Email, ContactNumber, NicNumber, PasswordHash, RoleId.
- `Facility`: Id, Name, HourlyRate, IsAvailable, Description, Faq, Images, EquipmentsProvided, CourtType.
- `Booking`: Id, UserId, FacilityId, BookingDate, StartTime, EndTime, HoursNeeded, TotalAmount, CustomerName, NicNumber, ContactNumber, PaymentMethod, PaymentStatus, Status, RefundAmount, RefundPercentage, RefundStatus, IsRescheduleRequested, RescheduleReason.
- `Equipment`: Id, Name, SportCategory, HourlyRate, FacilityId, TotalStock, IsAvailable.
- `BookingWorkflow`: Id, WorkflowId (Guid), CustomerId, Objective, FacilityType, RequestedStart, RequestedEnd, Guests, Budget, Status (`Planning`, `PendingManagerApproval`, `RevisionRequested`, `Approved`, `Rejected`, `ValidationFailed`, `FailedSafe`), PlanJson, ProposalJson, ValidationJson, ExecutionDurationMs, RevisionCount.
- `BookingWorkflowStep`: Id, BookingWorkflowId, AgentName, Responsibility, InputJson, OutputJson, ToolsCalledJson, Status, ExecutionDurationMs, Error, StartedAtUtc, CompletedAtUtc.
- `BookingWorkflowAuditEvent`: Id, BookingWorkflowId, EventType, Actor, DetailsJson, OccurredAtUtc.

#### 1.3 The Authoritative Three-Step Booking Process
From `BookingWizard.jsx`, `BookingsController.cs`, and `booking_wizard_sheet.dart`:
1. **Step 1: Venue & Slot Selection**:
   - Inputs: `facilityId`, `bookingDate` (UTC date), `startTime` (whole hour 08:00 - 23:00), `hoursNeeded` (integer >= 1, ending by 24:00).
   - Backend Authority: `GET /api/bookings/availability?facilityId=...&date=...`. Rejects overlapping bookings and past times.
2. **Step 2: Player Information**:
   - Inputs: `customerName`, `nicNumber` (`^(\d{9}[VvXx]|\d{12})$`), `contactNumber` (`^\d{10}$`).
3. **Step 3: Payment & Final Confirmation**:
   - Inputs: `paymentMethod` (`Card`, `BankTransfer`, or `Cash` for Admin/Manager).
   - If Card: card number (16 digits or last 4 digits), expiry month/year, 3-digit CVV.
   - If BankTransfer: bank slip upload.
   - Backend Authority: `POST /api/bookings`. Calculates total amount: `facility.HourlyRate * hoursNeeded`.

---

### 2. Proposed Architecture

```
                                  +---------------------------------------+
                                  |       Clients: React & Flutter        |
                                  +---------------------------------------+
                                       /                             \
                                      /                               \
                     POST /api/ai/chat                        POST /api/ai/booking/*
                                    /                                   \
                                   v                                     v
         +-------------------------------------+       +------------------------------------+
         |    Agentic RAG Assistant            |       |     Supervisor Orchestrator        |
         |    (MySpot Knowledge Assistant)     |       |     ("Book With AI" Workflow)      |
         +-------------------------------------+       +------------------------------------+
               |              |            |                     |             |            |
               v              v            v                     v             v            v
        +-------------+ +----------+ +-----------+       +------------+ +------------+ +------------+
        |  Retriever  | |  Grader  | |  Rewriter |       |  Facility  | |Availability| | Validation |
        | (Hybrid/RRF)| |  (Lab 6) | |  (Lab 6)  |       |   Agent    | |   Agent    | |   Agent    |
        +-------------+ +----------+ +-----------+       +------------+ +------------+ +------------+
               |                                                 |             |            |
               v                                                 v             v            v
        +----------------------------------------+       +------------------------------------------+
        | Authorized Real-Time Read Tools        |       | Gated Actions: Re-validate &             |
        | - get_facilities                       |       | Commit Booking (POST /api/bookings)      |
        | - get_facility_details                 |       +------------------------------------------+
        | - get_current_availability             |                     |
        | - get_user_bookings                    |                     v
        +----------------------------------------+       +------------------------------------------+
                                                         | Durable State: EF Core + PostgreSQL      |
                                                         | (BookingWorkflow, Steps, AuditEvents)    |
                                                         +------------------------------------------+
```

#### 2.1 Component 1: Grounded Agentic RAG AI Assistant
- **Knowledge Base Loader**: Reads `MySpot_Knowledge_Base.md`, splits into semantic chunks with metadata (source, category, title, last updated).
- **Hybrid Retrieval**:
  - Semantic vector retrieval using cosine similarity over embeddings.
  - BM25 / token matching for keyword precision.
  - Reciprocal Rank Fusion (RRF) to blend ranked candidate chunks.
- **Agentic Loop**:
  - Classify intent: dynamic inquiry vs. static policy vs. hybrid.
  - Call authorized tools if live status, pricing, or bookings are needed.
  - Grade retrieved knowledge chunks for relevance against the question.
  - Query rewriter if relevance is below threshold (enforced max 2 retries in code).
  - Return final answer with human-readable citations (e.g. `[Facility Information]`, `[Cancellation Policy]`).

#### 2.2 Component 2: "Book With AI" Multi-Agent Supervisor Workflow
- **Supervisor Agent**: Maintains the workflow state machine, extracts entities from conversational inputs, asks clarifying questions for missing fields.
- **Facility Agent**: Matches sports queries to facilities (e.g., Badminton -> Badminton Court).
- **Availability Agent**: Queries real-time availability via `AppDbContext`.
- **Validation Agent**: Enforces all business rules (NIC, phone, operating hours, durations).
- **Confirmation Gate**: Produces a structured `BookingSummary` and halts for explicit user confirmation.
- **Booking Agent**: Re-validates slot availability immediately before atomically creating the confirmed booking.
- **Durable Checkpointing**: Persists state across HTTP requests into `BookingWorkflows` table tied to the authenticated user ID.

---

### 3. API Contract Specifications

#### 3.1 AI Knowledge Chat APIs (`/api/ai/chat`)
- `POST /api/ai/chat`
  - **Headers**: `Authorization: Bearer <jwt>` (optional; enhances responses with user bookings).
  - **Request**: `{ "message": string, "conversationId": string? }`
  - **Response**: `{ "conversationId": string, "answer": string, "sources": string[], "suggestedFollowUps": string[] }`
- `GET /api/ai/chat/history/{conversationId}`
  - Returns past messages for the authenticated conversation.

#### 3.2 "Book With AI" Workflow APIs (`/api/ai/booking`)
- `POST /api/ai/booking/start`
  - **Headers**: `Authorization: Bearer <jwt>` (required).
  - **Response**: `{ "workflowId": string, "status": "collecting_requirements", "currentStep": 1, "message": string, "state": BookingWorkflowStateDto }`
- `POST /api/ai/booking/message`
  - **Headers**: `Authorization: Bearer <jwt>`.
  - **Request**: `{ "workflowId": string, "message": string }`
  - **Response**: `{ "workflowId": string, "status": string, "currentStep": int, "message": string, "summary": BookingSummaryDto?, "suggestedOptions": string[], "state": BookingWorkflowStateDto }`
- `POST /api/ai/booking/confirm`
  - **Headers**: `Authorization: Bearer <jwt>`.
  - **Request**: `{ "workflowId": string, "paymentDetails": { "paymentMethod": "Card"|"BankTransfer", "cardNumber": string?, "cardLastFour": string?, "cvv": string?, "expiryMonth": int?, "expiryYear": int? } }`
  - **Response**: `{ "workflowId": string, "status": "completed", "message": string, "bookingId": int, "booking": object }`
- `GET /api/ai/booking/{workflowId}`
  - Returns workflow snapshot and trajectory.
