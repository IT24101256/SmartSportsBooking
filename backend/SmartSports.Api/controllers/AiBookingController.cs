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
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> ConfirmBooking()
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        ConfirmBookingWorkflowRequest? request = null;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            request = new ConfirmBookingWorkflowRequest
            {
                WorkflowId = Guid.TryParse(form["workflowId"], out var wid) ? wid : Guid.Empty,
                PaymentMethod = string.IsNullOrWhiteSpace(form["paymentMethod"]) ? "Card" : form["paymentMethod"].ToString(),
                CardNumber = form["cardNumber"],
                CardLastFour = form["cardLastFour"],
                Cvv = form["cvv"],
                ExpiryMonth = int.TryParse(form["expiryMonth"], out var em) ? em : null,
                ExpiryYear = int.TryParse(form["expiryYear"], out var ey) ? ey : null,
                BankSlip = form.Files.GetFile("bankSlip")
            };
        }
        else
        {
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                request = System.Text.Json.JsonSerializer.Deserialize<ConfirmBookingWorkflowRequest>(body, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
        }

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
