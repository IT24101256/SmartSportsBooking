namespace SmartSportsFacilityBooking.Models;

public class TeamMember
{
    public int Id { get; set; }
    public int OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
