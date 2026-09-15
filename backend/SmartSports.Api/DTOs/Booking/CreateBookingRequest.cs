namespace SmartSportsFacilityBooking.Dtos.Booking;

public class CreateBookingRequest
{
    public int FacilityId { get; set; }
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Status { get; set; } = "Confirmed";
}
 