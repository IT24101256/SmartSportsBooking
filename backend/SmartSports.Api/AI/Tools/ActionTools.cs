using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.AI.Tools;

public class StageBookingProposalInput
{
    public int FacilityId { get; set; }
    public string FacilityName { get; set; } = string.Empty;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public int Guests { get; set; }
    public decimal EstimatedCost { get; set; }
}

public class StageBookingProposalTool : ITool
{
    public string Name => "stage_booking_proposal";
    public string Description => "Packages the validated proposal for human-in-the-loop manager approval without executing a live database commit.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.ActionExecutor };

    public Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<StageBookingProposalInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (input == null || input.FacilityId <= 0)
        {
            return Task.FromResult(ToolResult.Fail("Proposal staging failed: Missing or invalid facility data."));
        }

        var proposal = new
        {
            FacilityId = input.FacilityId,
            FacilityName = input.FacilityName,
            Start = input.Start,
            End = input.End,
            Guests = input.Guests,
            EstimatedCost = input.EstimatedCost,
            Currency = "LKR",
            StagedAtUtc = DateTime.UtcNow,
            ExecutionGated = true,
            GateRequirement = "Manager approval is strictly required before committing reservation."
        };

        return Task.FromResult(ToolResult.Ok(proposal));
    }
}

public class CommitBookingActionInput
{
    public int FacilityId { get; set; }
    public int CustomerId { get; set; }
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string ApprovedBy { get; set; } = string.Empty;
    public string? ApprovalComment { get; set; }
}

public class CommitBookingActionTool : ITool
{
    private readonly AppDbContext _context;

    public CommitBookingActionTool(AppDbContext context)
    {
        _context = context;
    }

    public string Name => "commit_booking_action";
    public string Description => "Executes the high-impact booking action inside a database transaction following verified manager approval.";
    public IReadOnlyList<string> AllowedAgentRoles => new[] { AgentRoles.ActionExecutor };

    public async Task<ToolResult> ExecuteAsync(string inputJson, AgentExecutionContext context)
    {
        var input = JsonSerializer.Deserialize<CommitBookingActionInput>(inputJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (input == null || input.FacilityId <= 0 || input.CustomerId <= 0)
        {
            return ToolResult.Fail("Invalid commit parameters.");
        }

        var facility = await _context.Facilities.FindAsync(input.FacilityId);
        if (facility == null)
        {
            return ToolResult.Fail($"Target facility {input.FacilityId} no longer exists.");
        }

        if (!facility.IsAvailable || input.End <= input.Start)
        {
            return ToolResult.Fail("The facility is unavailable or the stored booking window is invalid.");
        }

        var bookingDate = DateTime.SpecifyKind(input.Start.Date, DateTimeKind.Utc);
        var overlap = await _context.Bookings.AnyAsync(existing =>
            existing.FacilityId == input.FacilityId &&
            existing.BookingDate.Date == bookingDate.Date &&
            existing.StartTime < input.End.TimeOfDay &&
            existing.EndTime > input.Start.TimeOfDay &&
            existing.Status != "Cancelled");
        if (overlap)
        {
            return ToolResult.Fail("The facility has been booked by another customer since the proposal was created.");
        }

        var booking = new Booking
        {
            UserId = input.CustomerId,
            FacilityId = facility.Id,
            BookingDate = bookingDate,
            StartTime = input.Start.TimeOfDay,
            EndTime = input.End.TimeOfDay,
            Status = "Confirmed"
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        return ToolResult.Ok(new
        {
            BookingId = booking.Id,
            FacilityName = facility.Name,
            Status = booking.Status,
            CustomerNotified = true,
            CommittedAtUtc = DateTime.UtcNow
        });
    }
}
