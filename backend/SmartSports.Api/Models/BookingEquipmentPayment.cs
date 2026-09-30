namespace SmartSportsFacilityBooking.Models;

public class BookingEquipmentPayment
{
    public int Id { get; set; }

    public int BookingId { get; set; }

    public Booking? Booking { get; set; }

    public string EquipmentName { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;

    public decimal HourlyRate { get; set; }

    public int Hours { get; set; } = 1;

    public decimal TotalAmount { get; set; }

    // "Cash in hand" or "Card (Machine)"
    public string PaymentMethod { get; set; } = "Cash in hand";

    public string PaymentStatus { get; set; } = "Paid";

    public string CollectedBy { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
