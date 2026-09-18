namespace SmartSportsFacilityBooking.Dtos.Booking;

public class UpdateBookingRequest
{
    public int FacilityId { get; set; }
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
}
