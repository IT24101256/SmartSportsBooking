using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSportsFacilityBooking.AI.Models;
using SmartSportsFacilityBooking.AI.Services;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Authorize]
[Route("api/ai/booking")]
public class AiBookingController : ControllerBase
{
    private readonly IBookingWorkflowSupervisor _supervisor;

    public AiBookingController(IBookingWorkflowSupervisor supervisor)
    {
        _supervisor = supervisor;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartWorkflow([FromBody] StartBookingWorkflowRequest? request)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var response = await _supervisor.StartWorkflowAsync(userId.Value, request?.InitialGoal);
        return Ok(response);
    }

    [HttpPost("message")]
    public async Task<IActionResult> SendMessage([FromBody] BookingWorkflowMessageRequest request)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        if (request == null || request.WorkflowId == Guid.Empty || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("WorkflowId and Message are required.");
        }

        var response = await _supervisor.ProcessMessageAsync(userId.Value, request.WorkflowId, request.Message);
        return Ok(response);
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmBooking([FromBody] ConfirmBookingWorkflowRequest request)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        if (request == null || request.WorkflowId == Guid.Empty)
        {
            return BadRequest("Valid WorkflowId is required.");
        }

        var response = await _supervisor.ConfirmAndCommitBookingAsync(userId.Value, request);
        return Ok(response);
    }

    [HttpGet("{workflowId:guid}")]
    public async Task<IActionResult> GetStatus(Guid workflowId)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var response = await _supervisor.GetWorkflowStatusAsync(userId.Value, workflowId);
        if (response == null) return NotFound("Workflow not found or unauthorized.");

        return Ok(response);
    }

    private int? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
