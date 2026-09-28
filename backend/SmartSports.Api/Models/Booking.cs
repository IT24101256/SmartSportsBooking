// This namespace contains all application model classes.
namespace SmartSportsFacilityBooking.Models;

// This class represents a facility booking.
public class Booking
{
    // This is the unique ID of the booking.
    public int Id { get; set; }

    // This stores the ID of the user who made the booking.
    public int UserId { get; set; }

    // This represents the related user.
    public User? User { get; set; }

    // This stores the ID of the booked facility.
    public int FacilityId { get; set; }

    // This represents the related facility.
    public Facility? Facility { get; set; }

    // This stores the booking date.
    public DateTime BookingDate { get; set; }

    // This stores the booking start time.
    public TimeSpan StartTime { get; set; }

    // This stores the booking end time.
    public TimeSpan EndTime { get; set; }

    public int HoursNeeded { get; set; }

    public decimal TotalAmount { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string NicNumber { get; set; } = string.Empty;

    public string ContactNumber { get; set; } = string.Empty;

    public string PaymentMethod { get; set; } = "BankTransfer";

    public string PaymentStatus { get; set; } = "Pending";

    public string? BankSlipFileName { get; set; }

    public string? CardLastFour { get; set; }

    // This stores the current booking status.
    public string Status { get; set; } = "Pending";

    // This stores the management or customer cancellation reason if the booking is cancelled.
    public string? CancellationReason { get; set; }

    // Cancellation & Refund policy tracking
    public decimal? RefundAmount { get; set; }

    public int? RefundPercentage { get; set; }

    public string? RefundStatus { get; set; }

    public DateTime? CancelledAt { get; set; }

    public DateTime? RefundConfirmedAt { get; set; }

    public string? RefundConfirmedBy { get; set; }

    public string? RefundNotes { get; set; }

    // Admin reschedule request (e.g. adverse weather / heavy rain / maintenance)
    public bool IsRescheduleRequested { get; set; } = false;

    public string? RescheduleReason { get; set; }

    public DateTime? RescheduleRequestedAt { get; set; }
} 