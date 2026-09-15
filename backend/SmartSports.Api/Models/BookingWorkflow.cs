namespace SmartSportsFacilityBooking.Models;

public class BookingWorkflow
{
    public int Id { get; set; }
    public Guid WorkflowId { get; set; } = Guid.NewGuid();
    public int CustomerId { get; set; }
    public User? Customer { get; set; }
    public string Objective { get; set; } = string.Empty;
    public string FacilityType { get; set; } = string.Empty;
    public DateTime RequestedStart { get; set; }
    public DateTime RequestedEnd { get; set; }
    public int Guests { get; set; }
    public decimal Budget { get; set; }
    public string Status { get; set; } = "Planning";
    public string PlanJson { get; set; } = "{}";
    public string ProposalJson { get; set; } = "{}";
    public string ValidationJson { get; set; } = "{}";
    public string? ApprovalComment { get; set; }
    public string? FinalOutcome { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<BookingWorkflowStep> Steps { get; set; } = new List<BookingWorkflowStep>();
    public ICollection<BookingWorkflowAuditEvent> AuditEvents { get; set; } = new List<BookingWorkflowAuditEvent>();
}
 
public class BookingWorkflowStep
{
    public int Id { get; set; }
    public int BookingWorkflowId { get; set; }
    public BookingWorkflow? BookingWorkflow { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string Responsibility { get; set; } = string.Empty;
    public string InputJson { get; set; } = "{}";
    public string OutputJson { get; set; } = "{}";
    public string Status { get; set; } = "Pending";
    public string? Error { get; set; }
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
}

public class BookingWorkflowAuditEvent
{
    public int Id { get; set; }
    public int BookingWorkflowId { get; set; }
    public BookingWorkflow? BookingWorkflow { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string DetailsJson { get; set; } = "{}";
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
