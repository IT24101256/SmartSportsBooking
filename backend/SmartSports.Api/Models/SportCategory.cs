namespace SmartSportsFacilityBooking.Models;

public class SportCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public ICollection<Facility> Facilities { get; set; } = new List<Facility>();
    public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
}
