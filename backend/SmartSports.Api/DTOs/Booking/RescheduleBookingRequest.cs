namespace SmartSportsFacilityBooking.Dtos.Booking;

public class RescheduleBookingRequest
{
    public DateTime BookingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}
