namespace SmartSportsFacilityBooking.Dtos.Equipment;

public class UpdateEquipmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string SportCategory { get; set; } = string.Empty;
    public int SportCategoryId { get; set; }
    public decimal HourlyRate { get; set; }
    public int TotalStock { get; set; } = 10;
    public string? Description { get; set; }
    public bool IsAvailable { get; set; } = true;
}
