// This namespace contains all application model classes.
namespace SmartSportsFacilityBooking.Models;

// This class represents a user role.
public class Role
{
    // This is the unique ID of the role.
    public int Id { get; set; }

    // This stores the role name.
    public string Name { get; set; } = string.Empty;

    // This represents users assigned to this role.
    public ICollection<User> Users { get; set; } = new List<User>();
} 