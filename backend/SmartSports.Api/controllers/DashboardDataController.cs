using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Support;
using SmartSportsFacilityBooking.Models;

namespace SmartSportsFacilityBooking.Controllers;
  
[ApiController]
[Route("api/dashboard")]
public class DashboardDataController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardDataController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("schedule")]
    public async Task<IActionResult> GetSchedule()
    {
        var schedule = await _context.ScheduleEvents
            .OrderBy(item => item.EventDate)
            .ThenBy(item => item.StartTime)
            .ToListAsync();

        return Ok(schedule);
    }

    /// <summary>
    /// Returns real-time dashboard stats: bookings today, member satisfaction, and available facilities count.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        var bookingsToday = await _context.Bookings
            .CountAsync(b => b.BookingDate == today && b.Status != "Cancelled");

        var totalBookings = await _context.Bookings.CountAsync(b => b.Status != "Cancelled");
        var confirmedBookings = await _context.Bookings.CountAsync(b => b.Status == "Confirmed");

        // Member satisfaction = % of confirmed vs all non-cancelled bookings
        var satisfactionPct = totalBookings > 0
            ? (int)Math.Round((double)confirmedBookings / totalBookings * 100)
            : 96;

        var facilitiesCount = await _context.Facilities.CountAsync(f => f.IsAvailable);
        var bookingsByFacility = await _context.Bookings
            .Where(booking => booking.Status != "Cancelled")
            .GroupBy(booking => booking.Facility!.Name)
            .Select(group => new { facility = group.Key, bookings = group.Count() })
            .OrderByDescending(item => item.bookings)
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            bookingsToday,
            totalBookings,
            confirmedBookings,
            memberSatisfaction = $"{satisfactionPct}%",
            facilitiesCount,
            bookingsByFacility
        });
    }

    [HttpGet("support-requests")]
    [Authorize]
    public async Task<IActionResult> GetSupportRequests()
    {
        var requestsQuery = _context.SupportRequests.AsQueryable();
        if (!User.IsInRole("Admin") && !User.IsInRole("Manager") && !User.IsInRole("Staff"))
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();
            requestsQuery = requestsQuery.Where(request => request.UserId == userId.Value);
        }

        var requests = await requestsQuery
            .OrderByDescending(item => item.Id)
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost("support-requests")]
    [Authorize]
    public async Task<IActionResult> CreateSupportRequest(CreateSupportRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Detail))
        {
            return BadRequest("Title and detail are required.");
        }

        var supportRequest = new SupportRequest
        {
            UserId = userId.Value,
            Title = request.Title.Trim(),
            Detail = request.Detail.Trim(),
            Priority = request.Priority,
            Status = "Open"
        };
        _context.SupportRequests.Add(supportRequest);
        await _context.SaveChangesAsync();
        return Created($"/api/dashboard/support-requests/{supportRequest.Id}", supportRequest);
    }

    [HttpGet("team")]
    [Authorize]
    public async Task<IActionResult> GetTeam()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await _context.TeamMembers
            .Where(member => member.OwnerUserId == userId.Value)
            .OrderBy(member => member.Name)
            .Select(member => new { member.Id, member.Name })
            .ToListAsync());
    }

    [HttpPost("team")]
    [Authorize]
    public async Task<IActionResult> AddTeamMember(TeamMemberRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Player name is required.");

        var name = request.Name.Trim();
        if (await _context.TeamMembers.AnyAsync(member => member.OwnerUserId == userId.Value && member.Name == name))
            return Conflict("This player is already in your team.");

        var member = new TeamMember { OwnerUserId = userId.Value, Name = name };
        _context.TeamMembers.Add(member);
        await _context.SaveChangesAsync();
        return Created($"/api/dashboard/team/{member.Id}", new { member.Id, member.Name });
    }

    [HttpDelete("team/{id:int}")]
    [Authorize]
    public async Task<IActionResult> RemoveTeamMember(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var member = await _context.TeamMembers.FirstOrDefaultAsync(item => item.Id == id && item.OwnerUserId == userId.Value);
        if (member == null) return NotFound();
        _context.TeamMembers.Remove(member);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("rewards")]
    [Authorize]
    public async Task<IActionResult> GetRewards()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var confirmedBookings = await _context.Bookings.CountAsync(booking => booking.UserId == userId.Value && booking.Status == "Confirmed");
        var completedBookings = await _context.Bookings.CountAsync(booking => booking.UserId == userId.Value && booking.Status == "Confirmed" && booking.BookingDate < DateTime.UtcNow.Date);
        var points = confirmedBookings * 10;
        return Ok(new
        {
            points,
            confirmedBookings,
            completedBookings,
            nextRewardAt = 50,
            pointsToNextReward = Math.Max(50 - points, 0)
        });
    }

    public class TeamMemberRequest
    {
        public string Name { get; set; } = string.Empty;
    }

    private int? GetUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;
    }
}
