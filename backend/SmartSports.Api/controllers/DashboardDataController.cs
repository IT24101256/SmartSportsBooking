using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    [HttpGet("support-requests")]
    public async Task<IActionResult> GetSupportRequests()
    {
        var requests = await _context.SupportRequests
            .OrderByDescending(item => item.Id)
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost("support-requests")]
    public async Task<IActionResult> CreateSupportRequest(CreateSupportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Detail))
        {
            return BadRequest("Title and detail are required.");
        }

        var supportRequest = new SupportRequest
        {
            Title = request.Title.Trim(),
            Detail = request.Detail.Trim(),
            Priority = request.Priority,
            Status = "Open"
        };
        _context.SupportRequests.Add(supportRequest);
        await _context.SaveChangesAsync();
        return Created($"/api/dashboard/support-requests/{supportRequest.Id}", supportRequest);
    }
}
