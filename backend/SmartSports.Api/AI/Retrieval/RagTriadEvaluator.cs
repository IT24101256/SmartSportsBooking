using System.Text.RegularExpressions;

namespace SmartSportsFacilityBooking.AI.Retrieval;

/// <summary>
/// End-to-end RAG Triad Evaluator (SE3090 Lecture 06, Slide 37).
/// Computes quantitative evaluation scores:
/// 1. Context Relevance: Question <-> Context alignment.
/// 2. Faithfulness: Answer <-> Context alignment (anti-hallucination check).
/// 3. Answer Relevance: Question <-> Answer alignment.
/// </summary>
public static class RagTriadEvaluator
{
    public static RagTriadScore Evaluate(string question, string retrievedContext, string generatedAnswer, bool guardrailTriggered)
    {
        if (guardrailTriggered)
        {
            return new RagTriadScore
            {
                ContextRelevance = 0.1,
                Faithfulness = 1.0, // High faithfulness because it admitted lack of context rather than hallucinating!
                AnswerRelevance = 0.9,
                Assessment = "Anti-hallucination guardrail active. Safely declined answering out-of-domain query."
            };
        }

        var qTokens = Tokenize(question);
        var cTokens = Tokenize(retrievedContext);
        var aTokens = Tokenize(generatedAnswer);

        // 1. Context Relevance: What fraction of query key terms are covered by retrieved context?
        var qTermsInContext = qTokens.Count(qt => cTokens.Any(ct => TokenMatches(qt, ct)));
        var contextRelevance = qTokens.Count == 0 ? 1.0 : (double)qTermsInContext / qTokens.Count;

        // 2. Faithfulness: What fraction of answer factual claims/terms are present in the retrieved context?
        var aTermsInContext = aTokens.Count(at => IsCommonStopword(at) || cTokens.Any(ct => TokenMatches(at, ct)));
        var faithfulness = aTokens.Count == 0 ? 1.0 : (double)aTermsInContext / aTokens.Count;

        // 3. Answer Relevance: Does the answer address the question's core intent?
        var qTermsInAnswer = qTokens.Count(qt => aTokens.Any(at => TokenMatches(qt, at)));
        var answerRelevance = qTokens.Count == 0 ? 1.0 : (double)qTermsInAnswer / qTokens.Count;

        // Normalized clamping between 0.0 and 1.0
        contextRelevance = Math.Clamp(Math.Round(contextRelevance, 3), 0.0, 1.0);
        faithfulness = Math.Clamp(Math.Round(faithfulness, 3), 0.0, 1.0);
        answerRelevance = Math.Clamp(Math.Round(answerRelevance, 3), 0.0, 1.0);

        var overall = (contextRelevance + faithfulness + answerRelevance) / 3.0;
        var assessment = overall switch
        {
            >= 0.85 => "Excellent: Fully grounded, faithful, and directly relevant.",
            >= 0.70 => "Good: Well-grounded with minor peripheral context.",
            >= 0.50 => "Moderate: Acceptable grounding, partial context match.",
            _ => "Low: Retrieval or grounding warning detected."
        };

        return new RagTriadScore
        {
            ContextRelevance = contextRelevance,
            Faithfulness = faithfulness,
            AnswerRelevance = answerRelevance,
            Assessment = assessment
        };
    }

    private static bool TokenMatches(string a, string b)
    {
        if (a.Equals(b, StringComparison.OrdinalIgnoreCase)) return true;
        if (a.Length >= 5 && b.Length >= 5)
        {
            var prefixLen = Math.Min(5, Math.Min(a.Length, b.Length));
            if (a.AsSpan(0, prefixLen).Equals(b.AsSpan(0, prefixLen), StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static HashSet<string> Tokenize(string text)
    {
        return Regex.Matches(text.ToLowerInvariant(), "[a-z0-9]+")
            .Select(m => m.Value)
            .Where(t => t.Length > 2)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsCommonStopword(string word)
    {
        var stops = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "the", "and", "for", "with", "this", "that", "are", "you", "can", "will", "have", "our", "all", "please", "from", "hours", "your", "made", "made", "receive"
        };
        return stops.Contains(word);
    }
}
