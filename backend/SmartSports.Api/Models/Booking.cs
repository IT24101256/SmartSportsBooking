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

    // This stores the current booking status.
    public string Status { get; set; } = "Pending";
} 