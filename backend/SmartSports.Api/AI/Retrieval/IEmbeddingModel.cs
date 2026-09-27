namespace SmartSportsFacilityBooking.AI.Retrieval;

public interface IEmbeddingModel
{
    int Dimension { get; }
    Task<float[]> GenerateEmbeddingAsync(string text);
    Task<IReadOnlyList<float[]>> GenerateBatchEmbeddingsAsync(IReadOnlyList<string> texts);
}
