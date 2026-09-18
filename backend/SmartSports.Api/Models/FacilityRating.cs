namespace SmartSportsFacilityBooking.Models;

public class FacilityRating
{
    public int Id { get; set; }
    public int FacilityId { get; set; }
    public Facility? Facility { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int Score { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
