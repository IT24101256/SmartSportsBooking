using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Workflow;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Services;

public class BookingWorkflowService
{
    private readonly AppDbContext _context;

    public BookingWorkflowService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BookingWorkflow> StartAsync(StartBookingWorkflowRequest request, int customerId)
    {
        ValidateRequest(request);
        var workflow = new BookingWorkflow
        {
            CustomerId = customerId,
            Objective = request.Objective.Trim(),
            FacilityType = request.FacilityType.Trim(),
            RequestedStart = request.RequestedStart,
            RequestedEnd = request.RequestedEnd,
            Guests = request.Guests,
            Budget = request.Budget
        };

        AddAudit(workflow, "WorkflowStarted", customerId.ToString(), new { request });
        AddStep(workflow, "Planning Agent", "Creates the structured plan and delegates domain steps.", request, new
        {
            steps = new[] { "Analyze facility", "Check availability", "Validate proposal", "Request manager approval" }
        });

        var facility = await _context.Facilities
            .FirstOrDefaultAsync(f => f.Type.ToLower() == request.FacilityType.Trim().ToLower() && f.IsAvailable);
        AddStep(workflow, "Facility Analysis Agent", "Finds a suitable facility and checks its operating rules.", request, new
        {
            facilityId = facility?.Id,
            facilityName = facility?.Name,
            found = facility != null
        });

        var overlaps = facility == null
            ? true
            : await _context.Bookings.AnyAsync(b =>
                b.FacilityId == facility.Id &&
                b.BookingDate.Date == request.RequestedStart.Date &&
                b.StartTime < request.RequestedEnd.TimeOfDay &&
                b.EndTime > request.RequestedStart.TimeOfDay &&
                b.Status != "Cancelled");
        var estimatedCost = facility == null ? 0 : 1500m;
        var validation = new
        {
            facilityExists = facility != null,
            slotAvailable = !overlaps,
            validDates = request.RequestedEnd > request.RequestedStart,
            withinBudget = estimatedCost <= request.Budget,
            guestsWithinLimit = request.Guests <= 30
        };
        AddStep(workflow, "Scheduling and Validation Agent", "Checks time overlap, capacity, budget and business rules.", request, validation);
        AddStep(workflow, "Inventory and Action Agent", "Prepares the booking action but cannot commit before approval.", request, new
        {
            facilityId = facility?.Id,
            estimatedCost,
            action = "Awaiting manager approval"
        });

        workflow.PlanJson = JsonSerializer.Serialize(new
        {
            workflow = "SmartSports facility booking proposal",
            steps = new[] { "Facility analysis", "Availability check", "Proposal validation", "Manager approval", "Transactional booking" }
        });
        workflow.ProposalJson = JsonSerializer.Serialize(new
        {
            facilityId = facility?.Id,
            facilityName = facility?.Name,
            start = request.RequestedStart,
            end = request.RequestedEnd,
            estimatedCost
        });
        workflow.ValidationJson = JsonSerializer.Serialize(validation);
        workflow.Status = validation.facilityExists && validation.slotAvailable && validation.validDates &&
            validation.withinBudget && validation.guestsWithinLimit
            ? "PendingManagerApproval"
            : "ValidationFailed";
        workflow.FinalOutcome = workflow.Status == "ValidationFailed"
            ? "Proposal rejected by deterministic validation."
            : null;
        AddAudit(workflow, workflow.Status == "PendingManagerApproval" ? "ApprovalRequested" : "ValidationFailed",
            "system", validation);

        _context.BookingWorkflows.Add(workflow);
        await _context.SaveChangesAsync();
        return workflow;
    }

    public async Task<BookingWorkflow?> ApproveAsync(Guid workflowId, string actor, string? comment)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId);
        if (workflow == null) return null;
        if (workflow.Status != "PendingManagerApproval")
            throw new InvalidOperationException("Only proposals pending manager approval can be approved.");

        using var transaction = await _context.Database.BeginTransactionAsync();
        var proposal = JsonSerializer.Deserialize<ProposalData>(workflow.ProposalJson)
            ?? throw new InvalidOperationException("Stored proposal is invalid.");
        var facility = await _context.Facilities.FindAsync(proposal.FacilityId)
            ?? throw new InvalidOperationException("The proposed facility no longer exists.");
        var booking = new Booking
        {
            UserId = workflow.CustomerId,
            FacilityId = facility.Id,
            BookingDate = proposal.Start.Date,
            StartTime = proposal.Start.TimeOfDay,
            EndTime = proposal.End.TimeOfDay,
            Status = "Confirmed"
        };
        _context.Bookings.Add(booking);
        workflow.Status = "Approved";
        workflow.ApprovalComment = comment;
        workflow.FinalOutcome = $"Booking {facility.Name} confirmed.";
        workflow.UpdatedAtUtc = DateTime.UtcNow;
        AddAudit(workflow, "ApprovedAndExecuted", actor, new { bookingId = booking.Id, comment });
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return workflow;
    }

    public async Task<BookingWorkflow?> RejectAsync(Guid workflowId, string actor, string? comment)
    {
        var workflow = await _context.BookingWorkflows.FirstOrDefaultAsync(w => w.WorkflowId == workflowId);
        if (workflow == null) return null;
        if (workflow.Status != "PendingManagerApproval")
            throw new InvalidOperationException("Only proposals pending manager approval can be rejected.");
        workflow.Status = "Rejected";
        workflow.ApprovalComment = comment;
        workflow.FinalOutcome = "Manager rejected the proposal.";
        workflow.UpdatedAtUtc = DateTime.UtcNow;
        AddAudit(workflow, "Rejected", actor, new { comment });
        await _context.SaveChangesAsync();
        return workflow;
    }

    private static void ValidateRequest(StartBookingWorkflowRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Objective) || string.IsNullOrWhiteSpace(request.FacilityType))
            throw new ArgumentException("Objective and facility type are required.");
        if (request.RequestedEnd <= request.RequestedStart)
            throw new ArgumentException("The requested end must be after the requested start.");
        if (request.RequestedStart < DateTime.UtcNow.AddMinutes(-5))
            throw new ArgumentException("The requested start must be in the future.");
        if (request.Guests is < 1 or > 30 || request.Budget <= 0)
            throw new ArgumentException("Guests must be between 1 and 30 and budget must be positive.");
    }

    private static void AddStep(BookingWorkflow workflow, string agent, string responsibility, object input, object output)
    {
        workflow.Steps.Add(new BookingWorkflowStep
        {
            AgentName = agent,
            Responsibility = responsibility,
            InputJson = JsonSerializer.Serialize(input),
            OutputJson = JsonSerializer.Serialize(output),
            Status = "Completed",
            CompletedAtUtc = DateTime.UtcNow
        });
    }

    private static void AddAudit(BookingWorkflow workflow, string type, string actor, object details)
    {
        workflow.AuditEvents.Add(new BookingWorkflowAuditEvent
        {
            EventType = type,
            Actor = actor,
            DetailsJson = JsonSerializer.Serialize(details)
        });
    }

    private sealed class ProposalData
    {
        public int? FacilityId { get; set; }
        public DateTime Start { get; set; }
        public DateTime End { get; set; }
    }
}
