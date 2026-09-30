namespace SmartSportsFacilityBooking.Dtos.Booking;

public class AddEquipmentPaymentRequest
{
    public string EquipmentName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal HourlyRate { get; set; }
    public int Hours { get; set; } = 1;
    public string PaymentMethod { get; set; } = "Cash in hand"; // "Cash in hand" or "Card (Machine)"
    public string? Notes { get; set; }
}
