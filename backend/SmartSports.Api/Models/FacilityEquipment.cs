namespace SmartSportsFacilityBooking.Models;

public class FacilityEquipment
{
    public int FacilityId { get; set; }
    public Facility Facility { get; set; } = null!;
    public int EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}
