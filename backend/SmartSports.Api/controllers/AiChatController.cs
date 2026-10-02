using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSportsFacilityBooking.AI.Models;
using SmartSportsFacilityBooking.AI.Services;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/ai/chat")]
public class AiChatController : ControllerBase
{
    private readonly IAgenticRagService _ragService;

    public AiChatController(IAgenticRagService ragService)
    {
        _ragService = ragService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("A non-empty message is required.");
        }

        var userId = GetUserId();
        bool isPrivileged = User.IsInRole("Admin") || User.IsInRole("Manager");

        var response = await _ragService.ProcessChatAsync(request, userId, isPrivileged);
        return Ok(response);
    }

    [HttpGet("history/{conversationId}")]
    [Authorize]
    public async Task<IActionResult> GetHistory(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
        {
            return BadRequest("Conversation ID is required.");
        }

        var userId = GetUserId();
        var session = await _ragService.GetSessionHistoryAsync(conversationId, userId);

        if (session == null)
        {
            return NotFound("Conversation not found or unauthorized.");
        }

        return Ok(new
        {
            session.ConversationId,
            session.Messages,
            session.CreatedAt,
            session.UpdatedAt
        });
    }

    private int? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }
}
