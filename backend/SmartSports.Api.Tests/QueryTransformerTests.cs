using SmartSportsFacilityBooking.AI.Retrieval;
using Xunit;

namespace SmartSports.Api.Tests;

public class QueryTransformerTests
{
    private readonly QueryTransformer _transformer = new();

    [Fact]
    public void RewriteAndCondense_ResolvesPronounUsingHistory()
    {
        // SE3090 Lecture 06, Slide 31 & 55:
        // Follow-up: "Is it cheaper?" -> resolves "it" to the facility in context
        var history = new List<(string Role, string Content)>
        {
            ("user", "Tell me about the Badminton Court amenities."),
            ("assistant", "The Badminton Court features BWF synthetic flooring and LED lighting.")
        };

        var query = "How much does it cost per hour?";
        var rewritten = _transformer.RewriteAndCondense(query, history);

        Assert.Contains("badminton", rewritten, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(" it ", $" {rewritten} ", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GenerateMultiQueries_ExpandsSynonymsAndIntent()
    {
        // SE3090 Lecture 06, Slide 31: Multi-query expansion
        var standalone = "Book badminton court this weekend";
        var expansions = _transformer.GenerateMultiQueries(standalone);

        Assert.True(expansions.Count >= 2);
        Assert.Contains(standalone, expansions);
    }
}
