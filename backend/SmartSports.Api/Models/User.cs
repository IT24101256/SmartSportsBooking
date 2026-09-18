// This namespace contains all application model classes.
namespace SmartSportsFacilityBooking.Models;

// This class represents a system user.
public class User
{
    // This is the unique ID of the user.
    public int Id { get; set; }

    // This stores the user's full name.
    public string FullName { get; set; } = string.Empty;

    // This stores the user's email address.
    public string Email { get; set; } = string.Empty;

    // This stores the hashed password.
    public string PasswordHash { get; set; } = string.Empty;

    // This stores the role ID of the user.
    public int RoleId { get; set; }

    // This represents the role associated with the user.
    public Role? Role { get; set; }

    // This represents bookings made by the user.
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<SupportRequest> SupportRequests { get; set; } = new List<SupportRequest>();
}