namespace SmartSportsFacilityBooking.Dtos.Support;

public class CreateSupportRequest
{
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
}
 