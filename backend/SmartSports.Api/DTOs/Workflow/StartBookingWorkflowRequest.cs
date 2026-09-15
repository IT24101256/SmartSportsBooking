namespace SmartSportsFacilityBooking.Dtos.Workflow;

public class StartBookingWorkflowRequest
{
    public string Objective { get; set; } = string.Empty;
    public string FacilityType { get; set; } = string.Empty;
    public DateTime RequestedStart { get; set; }
    public DateTime RequestedEnd { get; set; }
    public int Guests { get; set; }
    public decimal Budget { get; set; }
}
 