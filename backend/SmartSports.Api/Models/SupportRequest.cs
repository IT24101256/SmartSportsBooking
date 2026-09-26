namespace SmartSportsFacilityBooking.Models;

public class SupportRequest
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Pending";
    public ICollection<SupportMessage> Messages { get; set; } = new List<SupportMessage>();
}

public class SupportMessage
{
    public int Id { get; set; }
    public int SupportRequestId { get; set; }
    public SupportRequest? SupportRequest { get; set; }
    public int SenderUserId { get; set; }
    public User? SenderUser { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
