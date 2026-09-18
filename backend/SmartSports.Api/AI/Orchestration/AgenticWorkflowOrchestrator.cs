using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Agents;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Workflow;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.AI.Orchestration;

public class AgenticWorkflowOrchestrator
{
    private readonly AppDbContext _context;
    private readonly PlanningCoordinationAgent _planningAgent;
    private readonly FacilityAnalysisAgent _facilityAgent;
    private readonly DeterministicValidationAgent _validationAgent;
    private readonly ActionExecutionAgent _actionAgent;
    private readonly IToolRegistry _toolRegistry;

    public AgenticWorkflowOrchestrator(
        AppDbContext context,
        PlanningCoordinationAgent planningAgent,
        FacilityAnalysisAgent facilityAgent,
        DeterministicValidationAgent validationAgent,
        ActionExecutionAgent actionAgent,
        IToolRegistry toolRegistry)
    {
        _context = context;
        _planningAgent = planningAgent;
        _facilityAgent = facilityAgent;
        _validationAgent = validationAgent;
        _actionAgent = actionAgent;
        _toolRegistry = toolRegistry;
    }

    public async Task<BookingWorkflow> ExecuteNewWorkflowAsync(StartBookingWorkflowRequest request, int customerId)
    {
        ValidateInputRequest(request);

        var workflow = new BookingWorkflow
        {
            CustomerId = customerId,
            Objective = request.Objective.Trim(),
            FacilityType = request.FacilityType.Trim(),
            RequestedStart = request.RequestedStart,
            RequestedEnd = request.RequestedEnd,
            Guests = request.Guests,
            Budget = request.Budget,
            Status = "Planning",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        AddAudit(workflow, "WorkflowInitiated", $"Customer:{customerId}", new
        {
            request.Objective,
            request.FacilityType,
            request.RequestedStart,
            request.RequestedEnd,
            request.Guests,
            request.Budget
        });

        var totalSw = Stopwatch.StartNew();

        var context = new AgentExecutionContext
        {
            WorkflowId = workflow.WorkflowId,
            CustomerId = customerId,
            Objective = workflow.Objective,
            FacilityType = workflow.FacilityType,
            RequestedStart = workflow.RequestedStart,
            RequestedEnd = workflow.RequestedEnd,
            Guests = workflow.Guests,
            Budget = workflow.Budget
        };

        // --- STEP 1: Planning & Coordination Agent ---
        var planResult = await _planningAgent.ExecuteStepAsync(context);
        RecordStep(workflow, _planningAgent.Name, _planningAgent.Responsibility, request, planResult);

        if (!planResult.Success)
        {
            totalSw.Stop();
            workflow.Status = "FailedSafe";
            workflow.FinalOutcome = $"Planning failed: {planResult.ErrorMessage}";
            workflow.ExecutionDurationMs = totalSw.ElapsedMilliseconds;
            AddAudit(workflow, "WorkflowFailedSafe", "PlanningCoordinator", new { error = planResult.ErrorMessage });
            _context.BookingWorkflows.Add(workflow);
            await _context.SaveChangesAsync();
            return workflow;
        }

        workflow.PlanJson = planResult.OutputJson;

        // --- STEP 2: Domain & Facility Analysis Agent ---
        var facilityResult = await _facilityAgent.ExecuteStepAsync(context);
        RecordStep(workflow, _facilityAgent.Name, _facilityAgent.Responsibility, new { context.FacilityType, context.Guests }, facilityResult);

        if (!facilityResult.Success)
        {
            totalSw.Stop();
            workflow.Status = "ValidationFailed";
            workflow.FinalOutcome = $"Domain analysis could not match requirement: {facilityResult.ErrorMessage}";
            workflow.ExecutionDurationMs = totalSw.ElapsedMilliseconds;
            AddAudit(workflow, "ValidationFailed", "FacilityAnalyst", new { error = facilityResult.ErrorMessage });
            _context.BookingWorkflows.Add(workflow);
            await _context.SaveChangesAsync();
            return workflow;
        }

        var proposalInfo = context.GetMemory<FacilityProposalInfo>("FacilityProposalInfo");
        workflow.ProposalJson = JsonSerializer.Serialize(proposalInfo);

        // --- STEP 3: Scheduling & Deterministic Validation Agent ---
        var validationResult = await _validationAgent.ExecuteStepAsync(context);
        RecordStep(workflow, _validationAgent.Name, _validationAgent.Responsibility, new
        {
            proposalInfo?.FacilityId,
            context.RequestedStart,
            context.RequestedEnd,
            context.Guests,
            context.Budget
        }, validationResult);

        var matrix = context.GetMemory<DeterministicValidationMatrix>("ValidationMatrix");
        workflow.ValidationJson = JsonSerializer.Serialize(matrix);

        if (!validationResult.Success || matrix == null || !matrix.AllPassed)
        {
            totalSw.Stop();
            workflow.Status = "ValidationFailed";
            workflow.FinalOutcome = $"Deterministic validation rejected the proposal: {validationResult.ErrorMessage}";
            workflow.ExecutionDurationMs = totalSw.ElapsedMilliseconds;
            AddAudit(workflow, "ValidationFailed", "ValidationEngine", matrix?.Violations ?? (object)new[] { validationResult.ErrorMessage });
            _context.BookingWorkflows.Add(workflow);
            await _context.SaveChangesAsync();
            return workflow;
        }

        // --- STEP 4: Inventory & Action Execution Agent (Human-in-the-Loop Gate) ---
        var actionResult = await _actionAgent.ExecuteStepAsync(context);
        RecordStep(workflow, _actionAgent.Name, _actionAgent.Responsibility, proposalInfo, actionResult);

        totalSw.Stop();
        workflow.ExecutionDurationMs = totalSw.ElapsedMilliseconds;

        if (actionResult.Success)
        {
            workflow.Status = "PendingManagerApproval";
            workflow.FinalOutcome = "Deterministic validation passed. High-impact action paused pending authorized manager approval.";
            AddAudit(workflow, "ApprovalRequested", "ActionExecutor", new
            {
                proposal = proposalInfo,
                actionGate = "Human-in-the-Loop Required"
            });
        }
        else
        {
            workflow.Status = "FailedSafe";
            workflow.FinalOutcome = $"Action staging failed: {actionResult.ErrorMessage}";
            AddAudit(workflow, "WorkflowFailedSafe", "ActionExecutor", new { error = actionResult.ErrorMessage });
        }

        _context.BookingWorkflows.Add(workflow);
        await _context.SaveChangesAsync();
        return workflow;
    }

    public async Task<BookingWorkflow?> ApproveWorkflowAsync(Guid workflowId, string actor, string? comment)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId);

        if (workflow == null) return null;
        if (workflow.Status != "PendingManagerApproval" && workflow.Status != "RevisionRequested")
        {
            throw new InvalidOperationException($"Workflow in '{workflow.Status}' status cannot be approved.");
        }

        var proposal = JsonSerializer.Deserialize<FacilityProposalInfo>(
                workflow.ProposalJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Stored proposal is invalid.");

        if (!proposal.FacilityId.HasValue)
        {
            throw new InvalidOperationException("Stored proposal lacks a valid facility ID.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var commitInput = JsonSerializer.Serialize(new
            {
                FacilityId = proposal.FacilityId.Value,
                CustomerId = workflow.CustomerId,
                Start = proposal.Start,
                End = proposal.End,
                ApprovedBy = actor,
                ApprovalComment = comment
            });

            var dummyContext = new AgentExecutionContext
            {
                WorkflowId = workflow.WorkflowId,
                CustomerId = workflow.CustomerId,
                RequestedStart = proposal.Start,
                RequestedEnd = proposal.End
            };

            var commitRecord = await _toolRegistry.ExecuteToolAsync("commit_booking_action", AgentRoles.ActionExecutor, commitInput, dummyContext);

            if (!commitRecord.Success)
            {
                throw new InvalidOperationException($"Tool commit failed: {commitRecord.Error}");
            }

            workflow.Status = "Approved";
            workflow.DecisionBy = actor;
            workflow.ApprovalComment = comment;
            workflow.FinalOutcome = $"Approved by {actor}. Confirmed reservation for {proposal.FacilityName}.";
            workflow.UpdatedAtUtc = DateTime.UtcNow;

            workflow.Steps.Add(new BookingWorkflowStep
            {
                BookingWorkflowId = workflow.Id,
                AgentName = AgentRoles.ActionExecutor,
                Responsibility = "Executes transactional booking commit upon verified manager authorization.",
                InputJson = commitInput,
                OutputJson = commitRecord.OutputJson,
                ToolsCalledJson = JsonSerializer.Serialize(new[] { commitRecord }),
                Status = "Completed",
                ExecutionDurationMs = commitRecord.ExecutionTimeMs,
                StartedAtUtc = DateTime.UtcNow,
                CompletedAtUtc = DateTime.UtcNow
            });

            AddAudit(workflow, "ApprovedAndCommitted", actor, new
            {
                approvedBy = actor,
                comment,
                toolExecution = commitRecord
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return workflow;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<BookingWorkflow?> RejectWorkflowAsync(Guid workflowId, string actor, string? comment)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId);

        if (workflow == null) return null;
        if (workflow.Status != "PendingManagerApproval" && workflow.Status != "RevisionRequested")
        {
            throw new InvalidOperationException($"Workflow in '{workflow.Status}' status cannot be rejected.");
        }

        workflow.Status = "Rejected";
        workflow.DecisionBy = actor;
        workflow.ApprovalComment = comment;
        workflow.FinalOutcome = $"Rejected by {actor}. Reason: {comment ?? "No reason specified."}";
        workflow.UpdatedAtUtc = DateTime.UtcNow;

        AddAudit(workflow, "RejectedSafely", actor, new { decision = "Rejected", comment });

        await _context.SaveChangesAsync();
        return workflow;
    }

    public async Task<BookingWorkflow?> RequestRevisionAsync(Guid workflowId, string actor, string? revisionComment)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId);

        if (workflow == null) return null;
        if (workflow.Status != "PendingManagerApproval")
        {
            throw new InvalidOperationException("Only workflows currently pending approval can be sent for revision.");
        }

        workflow.Status = "RevisionRequested";
        workflow.DecisionBy = actor;
        workflow.ApprovalComment = revisionComment;
        workflow.RevisionCount += 1;
        workflow.FinalOutcome = $"Revision requested by {actor}: {revisionComment ?? "Please adjust constraints and resubmit."}";
        workflow.UpdatedAtUtc = DateTime.UtcNow;

        AddAudit(workflow, "RevisionRequested", actor, new { revisionNote = revisionComment, revisionNumber = workflow.RevisionCount });

        await _context.SaveChangesAsync();
        return workflow;
    }

    private static void ValidateInputRequest(StartBookingWorkflowRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Objective) || string.IsNullOrWhiteSpace(request.FacilityType))
            throw new ArgumentException("Domain objective and facility type are mandatory.");
        if (request.RequestedEnd <= request.RequestedStart)
            throw new ArgumentException("The requested end time must be after the start time.");
        if (request.RequestedStart < DateTime.UtcNow.AddMinutes(-5))
            throw new ArgumentException("The requested booking time must be in the future.");
        if (request.Guests is < 1 or > 30)
            throw new ArgumentException("Guests must be between 1 and 30 participants.");
        if (request.Budget <= 0)
            throw new ArgumentException("Budget must be a positive amount.");
    }

    private static void RecordStep(BookingWorkflow workflow, string agentName, string responsibility, object? input, AgentResult result)
    {
        workflow.Steps.Add(new BookingWorkflowStep
        {
            AgentName = agentName,
            Responsibility = responsibility,
            InputJson = input != null ? JsonSerializer.Serialize(input) : "{}",
            OutputJson = result.OutputJson,
            ToolsCalledJson = JsonSerializer.Serialize(result.ToolCalls),
            Status = result.Success ? "Completed" : "Failed",
            Error = result.ErrorMessage,
            ExecutionDurationMs = result.ExecutionTimeMs,
            StartedAtUtc = DateTime.UtcNow.AddMilliseconds(-result.ExecutionTimeMs),
            CompletedAtUtc = DateTime.UtcNow
        });
    }

    private static void AddAudit(BookingWorkflow workflow, string eventType, string actor, object details)
    {
        workflow.AuditEvents.Add(new BookingWorkflowAuditEvent
        {
            EventType = eventType,
            Actor = actor,
            DetailsJson = JsonSerializer.Serialize(details),
            OccurredAtUtc = DateTime.UtcNow
        });
    }
}
