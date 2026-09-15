// This namespace contains all application model classes.
namespace SmartSportsFacilityBooking.Models;

// This class represents the available schedule of a facility.
public class FacilitySchedule
{
    // This is the unique ID of the schedule.
    public int Id { get; set; }

    // This stores the facility ID.
    public int FacilityId { get; set; }

    // This represents the related facility.
    public Facility? Facility { get; set; }

    // This stores the day of the week.
    public DayOfWeek DayOfWeek { get; set; }

    // This stores the opening time.
    public TimeSpan StartTime { get; set; }

    // This stores the closing time.
    public TimeSpan EndTime { get; set; }
} 