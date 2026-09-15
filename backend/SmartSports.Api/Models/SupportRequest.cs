namespace SmartSportsFacilityBooking.Models;

public class SupportRequest
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
}
