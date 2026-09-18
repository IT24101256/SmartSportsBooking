using System.Diagnostics;
using System.Text.Json;
using SmartSportsFacilityBooking.AI.Contracts;

namespace SmartSportsFacilityBooking.AI.Agents;

public class ActionExecutionAgent : IAgent
{
    private readonly IToolRegistry _toolRegistry;

    public ActionExecutionAgent(IToolRegistry toolRegistry)
    {
        _toolRegistry = toolRegistry;
    }

    public string Name => "Inventory & Action Executor";
    public string Role => AgentRoles.ActionExecutor;
    public string Responsibility => "Synthesizes booking proposal, enforces human approval gate, and commits transactional booking when authorized.";
    public IReadOnlyList<string> AllowedTools => new[] { "stage_booking_proposal", "commit_booking_action" };

    public async Task<AgentResult> ExecuteStepAsync(AgentExecutionContext context)
    {
        var sw = Stopwatch.StartNew();
        var toolCalls = new List<ToolCallRecord>();

        var proposalInfo = context.GetMemory<FacilityProposalInfo>("FacilityProposalInfo");
        var validationMatrix = context.GetMemory<DeterministicValidationMatrix>("ValidationMatrix");

        if (proposalInfo == null || validationMatrix == null || !validationMatrix.AllPassed)
        {
            sw.Stop();
            return AgentResult.Failed("Cannot stage proposal: Validation prerequisites were not satisfied.", toolCalls, sw.ElapsedMilliseconds);
        }

        // Call allow-listed tool `stage_booking_proposal`
        var stageInput = JsonSerializer.Serialize(new
        {
            FacilityId = proposalInfo.FacilityId,
            FacilityName = proposalInfo.FacilityName,
            Start = proposalInfo.Start,
            End = proposalInfo.End,
            Guests = proposalInfo.Guests,
            EstimatedCost = proposalInfo.EstimatedCost
        });

        var stageRecord = await _toolRegistry.ExecuteToolAsync("stage_booking_proposal", Role, stageInput, context);
        toolCalls.Add(stageRecord);

        sw.Stop();

        return AgentResult.Succeeded(
            $"Proposal staged successfully for {proposalInfo.FacilityName}. High-impact booking creation paused for manager review.",
            proposalInfo,
            toolCalls,
            sw.ElapsedMilliseconds
        );
    }
}
