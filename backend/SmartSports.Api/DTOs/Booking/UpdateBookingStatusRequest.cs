namespace SmartSportsFacilityBooking.Dtos.Booking;

public class UpdateBookingStatusRequest
{
    public string Status { get; set; } = "Confirmed";
    public string? Reason { get; set; }
}
