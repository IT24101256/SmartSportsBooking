// This namespace contains all application model classes.
namespace SmartSportsFacilityBooking.Models;

// This class represents a sports facility.
public class Facility
{
    // This is the unique ID of the facility.
    public int Id { get; set; }

    // This stores the facility name.
    public string Name { get; set; } = string.Empty;

    // This stores the type of sports facility.
    public string Type { get; set; } = string.Empty;

    // This stores the location of the facility.
    public string Location { get; set; } = string.Empty;

    // This stores whether the facility is currently available.
    public bool IsAvailable { get; set; } = true;

    // This represents schedules belonging to the facility.
    public ICollection<FacilitySchedule> Schedules { get; set; } = new List<FacilitySchedule>();

    // This represents bookings made for the facility.
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
} 