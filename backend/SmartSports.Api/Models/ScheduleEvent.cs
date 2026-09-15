namespace SmartSportsFacilityBooking.Models;

public class ScheduleEvent
{
    public int Id { get; set; }
    public DateTime EventDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Coach { get; set; } = string.Empty;
}
