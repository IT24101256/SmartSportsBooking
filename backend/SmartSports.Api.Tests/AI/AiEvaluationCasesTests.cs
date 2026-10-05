using System.Text.Json;

namespace SmartSports.Api.Tests.AI;

public sealed class AiEvaluationCasesTests
{
    [Fact]
    public void EvaluationCatalogContainsExpectedScenarios()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "AI", "ai-evaluation-cases.json");
        var cases = JsonSerializer.Deserialize<List<EvaluationCase>>(File.ReadAllText(path));

        Assert.NotNull(cases);
        Assert.Equal(10, cases!.Count);
        Assert.All(cases, testCase =>
        {
            Assert.False(string.IsNullOrWhiteSpace(testCase.Name));
            Assert.False(string.IsNullOrWhiteSpace(testCase.Prompt));
            Assert.False(string.IsNullOrWhiteSpace(testCase.ExpectedEvidence));
        });
    }

    private sealed record EvaluationCase(string Name, string Prompt, string ExpectedEvidence);
}
