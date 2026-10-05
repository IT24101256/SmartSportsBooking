namespace SmartSportsFacilityBooking.Models;

public class AiChatConversation
{
    public int Id { get; set; }
    public string ConversationId { get; set; } = Guid.NewGuid().ToString("N");
    public int? UserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<AiChatConversationMessage> Messages { get; set; } = new List<AiChatConversationMessage>();
}

public class AiChatConversationMessage
{
    public int Id { get; set; }
    public int AiChatConversationId { get; set; }
    public AiChatConversation? Conversation { get; set; }
    public string MessageId { get; set; } = Guid.NewGuid().ToString("N");
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public string SourcesJson { get; set; } = "[]";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
}
