namespace SmartSportsFacilityBooking.AI.Models;

public class BookingWorkflowState
{
    public Guid WorkflowId { get; set; } = Guid.NewGuid();
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string NicNumber { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;

    // Step 1: Venue & Slot
    public string Sport { get; set; } = string.Empty;
    public int? FacilityId { get; set; }
    public string? FacilityName { get; set; }
    public decimal? HourlyRate { get; set; }
    public string? BookingDate { get; set; } // yyyy-MM-dd
    public string? StartTime { get; set; } // HH:00
    public string? EndTime { get; set; } // HH:00
    public int HoursNeeded { get; set; } = 1;
    public decimal TotalAmount { get; set; }

    // Step 2 & 3: Player Details & Payment
    public string PaymentMethod { get; set; } = "Card"; // Card, BankTransfer, Cash
    public string? CardLastFour { get; set; }

    // Workflow State Machine
    // Status: "collecting_requirements", "awaiting_confirmation", "completed", "failed"
    public string Status { get; set; } = "collecting_requirements";
    public int CurrentStep { get; set; } = 1; // 1 = Venue & Slot, 2 = Player Details, 3 = Payment & Confirmation, 4 = Confirmed
    public bool AwaitingConfirmation { get; set; }
    public List<string> MissingFields { get; set; } = new();
    public List<string> AvailableSlots { get; set; } = new();
    public List<string> Trajectory { get; set; } = new();
    public int? ConfirmedBookingId { get; set; }
    public string? ErrorMessage { get; set; }
}

public class BookingSummaryDto
{
    public string Sport { get; set; } = string.Empty;
    public string FacilityName { get; set; } = string.Empty;
    public int FacilityId { get; set; }
    public string BookingDate { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int HoursNeeded { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal TotalAmount { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string NicNumber { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "Card";
    public string ConfirmationPrompt { get; set; } = "Please review your booking details above and click 'Confirm & Book' to finalize.";
}

public class StartBookingWorkflowRequest
{
    public string? InitialGoal { get; set; }
}

public class BookingWorkflowMessageRequest
{
    public Guid WorkflowId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class ConfirmBookingWorkflowRequest
{
    public Guid WorkflowId { get; set; }
    public string PaymentMethod { get; set; } = "Card";
    public string? CardNumber { get; set; }
    public string? CardLastFour { get; set; }
    public string? Cvv { get; set; }
    public int? ExpiryMonth { get; set; }
    public int? ExpiryYear { get; set; }
}

public class BookingWorkflowResponse
{
    public Guid WorkflowId { get; set; }
    public string Status { get; set; } = "collecting_requirements";
    public int CurrentStep { get; set; } = 1;
    public string Message { get; set; } = string.Empty;
    public BookingSummaryDto? Summary { get; set; }
    public List<string> SuggestedOptions { get; set; } = new();
    public List<string> AvailableSlots { get; set; } = new();
    public List<string> MissingFields { get; set; } = new();
    public List<string> Trajectory { get; set; } = new();
    public int? BookingId { get; set; }
    public object? Booking { get; set; }
}
