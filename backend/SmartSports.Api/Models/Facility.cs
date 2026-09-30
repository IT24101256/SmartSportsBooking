// This namespace contains all application model classes.
namespace SmartSportsFacilityBooking.Models;

// This class represents a sports facility.
public class Facility
{
    // This is the unique ID of the facility.
    public int Id { get; set; }

    // This stores the facility name.
    public string Name { get; set; } = string.Empty;

    public decimal HourlyRate { get; set; }

    public string Description { get; set; } = string.Empty;

    public string Faq { get; set; } = string.Empty;

    public string Images { get; set; } = string.Empty;

    // This stores whether the facility is currently available.
    public bool IsAvailable { get; set; } = true;

    // Court setting type: "Indoor" or "Outdoor"
    public string CourtType { get; set; } = "Indoor";

    // Equipment provided with this facility (e.g. "Rackets, Shuttlecocks, Net")
    public string EquipmentsProvided { get; set; } = string.Empty;

    // This represents schedules belonging to the facility.
    public ICollection<FacilitySchedule> Schedules { get; set; } = new List<FacilitySchedule>();

    // This represents bookings made for the facility.
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
} 