namespace SmartSportsFacilityBooking.Dtos.Support;

public class CreateSupportMessage
{
    public string Message { get; set; } = string.Empty;
}

public class UpdateSupportStatus
{
    public string Status { get; set; } = "UnderReview";
}