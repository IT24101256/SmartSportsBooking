namespace SmartSportsFacilityBooking.AI.Models;

public class AiChatRequest
{
    public string Message { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
}

public class AiChatResponse
{
    public string ConversationId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public List<string> Sources { get; set; } = new();
    public List<string> SuggestedFollowUps { get; set; } = new();
    public List<string> ToolInvocations { get; set; } = new();
    public int RetrievalRetries { get; set; }
    public bool HandledByRag { get; set; }
    public bool HandledByLiveTool { get; set; }
}

public class AiChatMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Role { get; set; } = "user"; // user, assistant, system
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public List<string>? Sources { get; set; }
}

public class AiChatSession
{
    public string ConversationId { get; set; } = Guid.NewGuid().ToString("N");
    public int? UserId { get; set; }
    public List<AiChatMessage> Messages { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
