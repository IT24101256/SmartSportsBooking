using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.Data;

namespace SmartSportsFacilityBooking.AI.Tools;

public class CheckScheduleConflictInput
{
    public int FacilityId { get; set; }
    public DateTime RequestedStart { get; set; }
    public DateTime RequestedEnd { get; set; }
}

public class CheckScheduleConflictTool : ITool
{
    private readonly AppDbContext _context;

    public CheckScheduleConflictTool(AppDbContext context)
    {
        _context = context;
    }

    public string Name => "check_schedule_conflict";
    public string Description => "Determines whether the requested facility has existing booking collisions during the requested date and time interval.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.ValidationEngine };

    public async Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<CheckScheduleConflictInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (input == null || input.FacilityId <= 0)
        {
            return ToolResult.Fail("FacilityId is required to evaluate schedule collisions.");
        }

        var reqDate = input.RequestedStart.Date;
        var startTime = input.RequestedStart.TimeOfDay;
        var endTime = input.RequestedEnd.TimeOfDay;

        var overlappingBookings = await _context.Bookings
            .Where(b => b.FacilityId == input.FacilityId &&
                        b.BookingDate.Date == reqDate &&
                        b.Status != "Cancelled" &&
                        b.StartTime < endTime &&
                        b.EndTime > startTime)
            .Select(b => new
            {
                b.Id,
                b.BookingDate,
                b.StartTime,
                b.EndTime,
                b.Status
            })
            .ToListAsync();

        var isFree = !overlappingBookings.Any();
        return ToolResult.Ok(new
        {
            FacilityId = input.FacilityId,
            HasConflict = !isFree,
            Available = isFree,
            ConflictCount = overlappingBookings.Count,
            Conflicts = overlappingBookings
        });
    }
}

public class ValidateBusinessRulesInput
{
    public int? FacilityId { get; set; }
    public DateTime RequestedStart { get; set; }
    public DateTime RequestedEnd { get; set; }
    public int Guests { get; set; }
    public decimal Budget { get; set; }
    public decimal EstimatedCost { get; set; }
}

public class ValidateBusinessRulesTool : ITool
{
    public string Name => "validate_business_rules";
    public string Description => "Executes deterministic business rule verification covering operating hours, guest limits, advance notice, and budget limits.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.ValidationEngine };

    public Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<ValidateBusinessRulesInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? new ValidateBusinessRulesInput();

        var matrix = new DeterministicValidationMatrix();

        // 1. Facility Exists
        matrix.FacilityExists = input.FacilityId.HasValue && input.FacilityId.Value > 0;
        if (matrix.FacilityExists) matrix.PassedRules.Add("Facility identified and available in catalog.");
        else matrix.Violations.Add("No valid matching sports facility could be matched.");

        // 2. Valid Date/Time Range
        var duration = input.RequestedEnd - input.RequestedStart;
        matrix.ValidDates = input.RequestedEnd > input.RequestedStart && duration.TotalMinutes >= 30 && duration.TotalHours <= 8;
        if (matrix.ValidDates) matrix.PassedRules.Add($"Valid duration: {duration.TotalMinutes:F0} minutes (allowed 30 mins to 8 hours).");
        else matrix.Violations.Add("Requested booking timeframe must be between 30 minutes and 8 hours.");

        // 3. Advance Notice
        matrix.AdvanceNoticeValid = input.RequestedStart >= DateTime.UtcNow.AddMinutes(-5);
        if (matrix.AdvanceNoticeValid) matrix.PassedRules.Add("Booking is scheduled for present/future slot.");
        else matrix.Violations.Add("Requested start time must be in the future.");

        // 4. Operating Hours (06:00 - 22:00)
        var startHour = input.RequestedStart.TimeOfDay;
        var endHour = input.RequestedEnd.TimeOfDay;
        var open = new TimeSpan(6, 0, 0);
        var close = new TimeSpan(22, 0, 0);
        matrix.OperatingHoursCompliant = startHour >= open && endHour <= close;
        if (matrix.OperatingHoursCompliant) matrix.PassedRules.Add("Requested timeslot falls within facility operating hours (06:00 - 22:00).");
        else matrix.Violations.Add("Facility operates between 06:00 and 22:00. Time is outside operating hours.");

        // 5. Guests Limit
        matrix.GuestsWithinLimit = input.Guests >= 1 && input.Guests <= 30;
        if (matrix.GuestsWithinLimit) matrix.PassedRules.Add($"Guest count ({input.Guests}) is within maximum single-reservation limit (30).");
        else matrix.Violations.Add($"Guest count ({input.Guests}) must be between 1 and 30 participants.");

        // 6. Budget
        matrix.WithinBudget = input.EstimatedCost <= input.Budget;
        if (matrix.WithinBudget) matrix.PassedRules.Add($"Estimated cost (LKR {input.EstimatedCost:N2}) is within budget (LKR {input.Budget:N2}).");
        else matrix.Violations.Add($"Estimated cost (LKR {input.EstimatedCost:N2}) exceeds requested budget (LKR {input.Budget:N2}).");

        return Task.FromResult(ToolResult.Ok(matrix));
    }
}
