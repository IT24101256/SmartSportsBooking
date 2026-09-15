using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos.Workflow;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.Controllers;
  
[ApiController]
[Route("api/booking-workflows")]
[Authorize]
public class BookingWorkflowsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly BookingWorkflowService _service;

    public BookingWorkflowsController(AppDbContext context, BookingWorkflowService service)
    {
        _context = context;
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Start(StartBookingWorkflowRequest request)
    {
        var customerId = GetUserId();
        if (customerId == null) return Unauthorized();
        try
        {
            var workflow = await _service.StartAsync(request, customerId.Value);
            return CreatedAtAction(nameof(Get), new { workflowId = workflow.WorkflowId }, workflow);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{workflowId:guid}")]
    public async Task<IActionResult> Get(Guid workflowId)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId);
        if (workflow == null) return NotFound();
        if (!CanReview(workflow.CustomerId)) return Forbid();
        return Ok(workflow);
    }

    [HttpGet("pending-approval")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> PendingApproval()
    {
        return Ok(await _context.BookingWorkflows
            .Where(w => w.Status == "PendingManagerApproval")
            .Include(w => w.Steps)
            .OrderBy(w => w.CreatedAtUtc)
            .ToListAsync());
    }

    [HttpGet("history")]
    public async Task<IActionResult> History()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        return Ok(await _context.BookingWorkflows
            .Where(workflow => workflow.CustomerId == userId.Value)
            .Include(workflow => workflow.Steps)
            .OrderByDescending(workflow => workflow.CreatedAtUtc)
            .ToListAsync());
    }

    [HttpGet("admin-history")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> AdminHistory()
    {
        return Ok(await _context.BookingWorkflows
            .Include(workflow => workflow.Steps)
            .OrderByDescending(workflow => workflow.CreatedAtUtc)
            .ToListAsync());
    }

    [HttpPost("{workflowId:guid}/approve")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Approve(Guid workflowId, ApprovalRequest request)
    {
        try
        {
            var workflow = await _service.ApproveAsync(workflowId, User.Identity?.Name ?? "manager", request.Comment);
            return workflow == null ? NotFound() : Ok(workflow);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPost("{workflowId:guid}/reject")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Reject(Guid workflowId, ApprovalRequest request)
    {
        try
        {
            var workflow = await _service.RejectAsync(workflowId, User.Identity?.Name ?? "manager", request.Comment);
            return workflow == null ? NotFound() : Ok(workflow);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    private int? GetUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    }

    private bool CanReview(int customerId)
    {
        return User.IsInRole("Manager") || User.IsInRole("Admin") || GetUserId() == customerId;
    }
}
