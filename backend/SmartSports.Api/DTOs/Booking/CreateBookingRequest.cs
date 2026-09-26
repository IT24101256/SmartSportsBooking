namespace SmartSportsFacilityBooking.Dtos.Booking;

public class CreateBookingRequest
{
    public int FacilityId { get; set; }
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int HoursNeeded { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string NicNumber { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "BankTransfer";
    public string? CardNumber { get; set; }
    public int? ExpiryMonth { get; set; }
    public int? ExpiryYear { get; set; }
    public string? Cvv { get; set; }
    public string? CardLastFour { get; set; }
    public IFormFile? BankSlip { get; set; }
}
 