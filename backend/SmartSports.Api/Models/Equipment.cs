namespace SmartSportsFacilityBooking.Models;

public class Equipment
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string SportCategory { get; set; } = string.Empty;

    public decimal HourlyRate { get; set; }

    public int? FacilityId { get; set; }

    public Facility? Facility { get; set; }

    public int TotalStock { get; set; } = 10;

    public string? Description { get; set; }

    public bool IsAvailable { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
