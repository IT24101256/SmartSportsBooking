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

    [HttpGet("revenue")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetRevenue([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
    {
        var today = DateTime.UtcNow.Date;
        var start = DateTime.SpecifyKind((fromDate ?? new DateTime(today.Year, today.Month, 1)).Date, DateTimeKind.Utc);
        var end = DateTime.SpecifyKind((toDate ?? today).Date.AddDays(1), DateTimeKind.Utc);
        if (end <= start) return BadRequest("The to date must be on or after the from date.");

        var bookings = await _context.Bookings
            .Where(booking => booking.BookingDate >= start && booking.BookingDate < end &&
                booking.Status != "Cancelled" && (booking.PaymentStatus == "Paid" || booking.PaymentStatus == "Approved" || booking.Status == "Confirmed"))
            .Include(booking => booking.Facility)
            .Include(booking => booking.EquipmentPayments)
            .OrderByDescending(booking => booking.BookingDate)
            .ThenByDescending(booking => booking.StartTime)
            .ToListAsync();

        var equipmentPaymentsQuery = await _context.BookingEquipmentPayments
            .Include(ep => ep.Booking)
            .ThenInclude(b => b!.Facility)
            .Where(ep => ep.CreatedAtUtc >= start && ep.CreatedAtUtc < end)
            .OrderByDescending(ep => ep.CreatedAtUtc)
            .ToListAsync();

        var equipmentPaymentsSum = equipmentPaymentsQuery.Sum(ep => ep.TotalAmount);
        var bookingEquipmentsSum = bookings.Sum(b => b.EquipmentPayments?.Sum(ep => ep.TotalAmount) ?? 0);
        var totalEquipmentRevenue = Math.Max(equipmentPaymentsSum, bookingEquipmentsSum);
        var totalGrossRevenue = bookings.Sum(booking => booking.TotalAmount);
        if (equipmentPaymentsSum > 0 && bookingEquipmentsSum == 0)
        {
            totalGrossRevenue += equipmentPaymentsSum;
        }
        var courtRevenue = Math.Max(0, totalGrossRevenue - totalEquipmentRevenue);

        return Ok(new
        {
            fromDate = start,
            toDate = end.AddDays(-1),
            startDate = start,
            endDate = end.AddDays(-1),
            totalRevenue = totalGrossRevenue,
            courtRevenue = courtRevenue,
            equipmentRevenue = totalEquipmentRevenue,
            bookingCount = bookings.Count,
            equipmentTransactionsCount = equipmentPaymentsQuery.Count,
            items = bookings.Select(booking => new
            {
                booking.Id,
                booking.BookingDate,
                facility = booking.Facility!.Name,
                customer = booking.CustomerName,
                booking.TotalAmount,
                booking.PaymentMethod,
                paymentStatus = booking.PaymentStatus,
                booking.Status,
                equipmentPayments = booking.EquipmentPayments?.Select(ep => new
                {
                    ep.Id,
                    ep.EquipmentName,
                    ep.Quantity,
                    ep.HourlyRate,
                    ep.Hours,
                    ep.TotalAmount,
                    ep.PaymentMethod,
                    ep.PaymentStatus,
                    ep.CollectedBy,
                    ep.Notes,
                    ep.CreatedAtUtc
                }).ToList() ?? new()
            }),
            equipmentTransactions = equipmentPaymentsQuery.Select(ep => new
            {
                ep.Id,
                bookingId = ep.BookingId,
                facility = ep.Booking?.Facility?.Name ?? "General Venue",
                customer = ep.Booking?.CustomerName ?? "Member",
                equipmentName = ep.EquipmentName,
                quantity = ep.Quantity,
                hourlyRate = ep.HourlyRate,
                hours = ep.Hours,
                totalAmount = ep.TotalAmount,
                paymentMethod = ep.PaymentMethod,
                paymentStatus = ep.PaymentStatus,
                collectedBy = ep.CollectedBy,
                notes = ep.Notes,
                createdAtUtc = ep.CreatedAtUtc
            })
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
            Status = "Pending"
        };
        _context.SupportRequests.Add(supportRequest);
        await _context.SaveChangesAsync();
        return Created($"/api/dashboard/support-requests/{supportRequest.Id}", supportRequest);
    }

    [HttpPut("support-requests/{id:int}/status")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<IActionResult> UpdateSupportStatus(int id, UpdateSupportStatus request)
    {
        var supportRequest = await _context.SupportRequests.FindAsync(id);
        if (supportRequest == null) return NotFound();

        var allowedStatuses = new[] { "Pending", "UnderReview", "Resolved" };
        if (!allowedStatuses.Contains(request.Status)) return BadRequest("Invalid support request status.");
        if (request.Status == "UnderReview" && supportRequest.Status != "Pending") return Conflict("Only pending requests can be opened for review.");
        if (request.Status == "Resolved" && supportRequest.Status != "UnderReview") return Conflict("Only requests under review can be resolved.");

        supportRequest.Status = request.Status;
        await _context.SaveChangesAsync();
        return Ok(supportRequest);
    }

    [HttpGet("support-requests/{id:int}/messages")]
    [Authorize]
    public async Task<IActionResult> GetSupportMessages(int id)
    {
        var supportRequest = await _context.SupportRequests.FindAsync(id);
        if (supportRequest == null) return NotFound();
        if (!CanAccessSupportRequest(supportRequest)) return Forbid();

        return Ok(await _context.SupportMessages
            .Where(message => message.SupportRequestId == id)
            .OrderBy(message => message.CreatedAtUtc)
            .Select(message => new { message.Id, message.Message, message.CreatedAtUtc, senderName = message.SenderUser!.FullName })
            .ToListAsync());
    }

    [HttpPost("support-requests/{id:int}/messages")]
    [Authorize]
    public async Task<IActionResult> AddSupportMessage(int id, CreateSupportMessage request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var supportRequest = await _context.SupportRequests.FindAsync(id);
        if (supportRequest == null) return NotFound();
        if (!CanAccessSupportRequest(supportRequest)) return Forbid();
        if (supportRequest.Status != "UnderReview") return Conflict("Chat is available only while the request is under review.");
        if (string.IsNullOrWhiteSpace(request.Message)) return BadRequest("Message is required.");

        var message = new SupportMessage { SupportRequestId = id, SenderUserId = userId.Value, Message = request.Message.Trim() };
        _context.SupportMessages.Add(message);
        await _context.SaveChangesAsync();
        await _context.Entry(message).Reference(item => item.SenderUser).LoadAsync();
        return Created($"/api/dashboard/support-requests/{id}/messages/{message.Id}", new { message.Id, message.Message, message.CreatedAtUtc, senderName = message.SenderUser?.FullName });
    }

    private bool CanAccessSupportRequest(SupportRequest request)
    {
        return User.IsInRole("Admin") || User.IsInRole("Manager") || User.IsInRole("Staff") || request.UserId == GetUserId();
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
